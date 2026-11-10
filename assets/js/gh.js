/* GH — GitHub REST API (токен преподавателя) и шифрование журнала (WebCrypto: PBKDF2 + AES-GCM).
   Репозиторий публичный, поэтому журнал и личные карточки студентов хранятся зашифрованными:
   data/journal.json — весь журнал (ключ из пароля преподавателя),
   data/s/<хеш ID>.json — карточка студента (ключ из ID и кода доступа студента). */
(function (global) {
  "use strict";
  var O = global.OGL, API = "https://api.github.com";
  var enc = new TextEncoder(), dec = new TextDecoder();
  function b64(buf) { var s = "", b = new Uint8Array(buf); for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
  function unb64(s) { var bin = atob(s), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }
  function b64utf8(str) { return b64(enc.encode(str)); }
  function utf8b64(s) { return dec.decode(unb64(s.replace(/\s/g, ""))); }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }

  var C = {
    sha: function (s) { return crypto.subtle.digest("SHA-256", enc.encode(s)).then(hex); },
    key: function (secret, salt, iter) {
      return crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]).then(function (k) {
        return crypto.subtle.deriveKey({ name: "PBKDF2", salt: typeof salt === "string" ? enc.encode(salt) : salt, iterations: iter || 150000, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      });
    },
    seal: function (obj, secret, saltStr) { // → {v, salt, iv, data}
      var salt = saltStr ? enc.encode(saltStr) : crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
      return C.key(secret, salt).then(function (k) { return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, enc.encode(JSON.stringify(obj))); })
        .then(function (ct) { return { v: 1, salt: saltStr ? null : b64(salt), iv: b64(iv), data: b64(ct) }; });
    },
    open: function (box, secret, saltStr) {
      var salt = saltStr ? enc.encode(saltStr) : unb64(box.salt);
      return C.key(secret, salt).then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, k, unb64(box.data)); })
        .then(function (pt) { return JSON.parse(dec.decode(pt)); });
    },
    // карточка студента: имя файла и ключ из ID + кода
    studentFile: function (id) { return C.sha("ogl-student|" + String(id).trim().toLowerCase()).then(function (h) { return "data/s/" + h.slice(0, 24) + ".json"; }); },
    studentSecret: function (id, code) { return String(code).trim().toUpperCase() + "|" + String(id).trim().toLowerCase(); },
    newCode: function () { var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = crypto.getRandomValues(new Uint8Array(6)), s = ""; for (var i = 0; i < 6; i++) s += A[r[i] % A.length]; return s; }
  };

  function GH(token, repo) { this.token = token; this.repo = repo || O.REPO; }
  GH.prototype.req = function (method, path, body) {
    var h = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (this.token) h.Authorization = "Bearer " + this.token;
    if (body) h["Content-Type"] = "application/json";
    return fetch(API + path.replace("{repo}", this.repo), { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, cache: "no-store" }).then(function (r) {
      if (r.status === 204) return null;
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!r.ok) { var e = new Error((j && j.message) || ("HTTP " + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  };
  GH.prototype.me = function () { return this.req("GET", "/user"); };
  GH.prototype.repoInfo = function () { return this.req("GET", "/repos/{repo}"); };
  GH.prototype.getFile = function (path) { // → {text, sha} | null
    return this.req("GET", "/repos/{repo}/contents/" + path + "?ref=main").then(function (j) { return { text: utf8b64(j.content), sha: j.sha }; })
      .catch(function (e) { if (e.status === 404) return null; throw e; });
  };
  // один коммит с несколькими файлами: files = [{path, text}] (text === null — удалить)
  GH.prototype.commit = function (files, message) {
    var G = this, head;
    return G.req("GET", "/repos/{repo}/git/ref/heads/main").then(function (ref) { head = ref.object.sha; return G.req("GET", "/repos/{repo}/git/commits/" + head); })
      .then(function (c) {
        return G.req("POST", "/repos/{repo}/git/trees", { base_tree: c.tree.sha, tree: files.map(function (f) {
          return f.text === null ? { path: f.path, mode: "100644", type: "blob", sha: null } : { path: f.path, mode: "100644", type: "blob", content: f.text };
        }) });
      })
      .then(function (t) { return G.req("POST", "/repos/{repo}/git/commits", { message: message, tree: t.sha, parents: [head] }); })
      .then(function (nc) { return G.req("PATCH", "/repos/{repo}/git/refs/heads/main", { sha: nc.sha }); });
  };
  GH.prototype.issues = function (label) {
    var G = this, all = [], page = 1;
    function next() {
      return G.req("GET", "/repos/{repo}/issues?state=all&per_page=100&page=" + page + (label ? "&labels=" + encodeURIComponent(label) : "")).then(function (list) {
        all = all.concat(list.filter(function (i) { return !i.pull_request; }));
        if (list.length === 100 && page < 20) { page++; return next(); }
        return all;
      });
    }
    return next();
  };
  GH.prototype.comment = function (num, text) { return this.req("POST", "/repos/{repo}/issues/" + num + "/comments", { body: text }); };
  GH.prototype.setLabels = function (num, labels) { return this.req("PUT", "/repos/{repo}/issues/" + num + "/labels", { labels: labels }); };
  GH.prototype.setState = function (num, state) { return this.req("PATCH", "/repos/{repo}/issues/" + num, { state: state }); };
  GH.prototype.ensureLabel = function (name, color, desc) {
    var G = this; return G.req("GET", "/repos/{repo}/labels/" + encodeURIComponent(name)).catch(function (e) { if (e.status === 404) return G.req("POST", "/repos/{repo}/labels", { name: name, color: color, description: desc || "" }); throw e; });
  };

  // разбор тела issue, созданного формой «Сдача работы»
  function parseIssue(body) {
    var out = {}, re = /^###\s+(.+?)\s*$/gm, m, keys = [], idx = [];
    while ((m = re.exec(body || ""))) { keys.push(m[1]); idx.push([m.index, re.lastIndex]); }
    for (var i = 0; i < keys.length; i++) {
      var v = (body.slice(idx[i][1], i + 1 < keys.length ? idx[i + 1][0] : body.length) || "").trim();
      if (v === "_No response_") v = "";
      out[keys[i]] = v;
    }
    var code = (out["Код программы (.cpp)"] || "").replace(/^```[a-z+]*\s*\n?/i, "").replace(/\n?```\s*$/, "");
    return { student: (out["ID студента"] || "").trim(), group: (out["Группа"] || "").trim(), work: (out["Работа"] || "").trim(),
      variant: (out["Вариант"] || "").trim(), code: code, files: out["Скриншот и файлы"] || "", answers: out["Ответы на контрольные вопросы"] || "" };
  }

  // чтение карточки студента без токена (raw.githubusercontent → сайт)
  function readPublic(path) {
    var urls = ["https://raw.githubusercontent.com/" + O.REPO + "/main/" + path + "?t=" + Date.now(), O.BASE + path + "?t=" + Date.now()];
    function tryAt(i) {
      if (i >= urls.length) return Promise.resolve(null);
      return fetch(urls[i], { cache: "no-store" }).then(function (r) { if (r.ok) return r.json(); if (r.status === 404) return tryAt(i + 1); throw new Error("HTTP " + r.status); })
        .catch(function () { return tryAt(i + 1); });
    }
    return tryAt(0);
  }

  global.GHApi = { GH: GH, C: C, parseIssue: parseIssue, readPublic: readPublic, b64utf8: b64utf8 };
})(window);
