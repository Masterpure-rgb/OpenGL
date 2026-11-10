/* CORE — общие данные и помощники сайта «Компьютерная графика. Модуль 2. OpenGL». */
(function (global) {
  "use strict";
  var src = document.currentScript && document.currentScript.src || "";
  var BASE = src.replace(/assets\/js\/core\.js.*$/, "");

  var TOPICS = [
    { n: 11, k: 1, lec: "Основы Open Graphics Library (OpenGL)", prac: "Рисование и преобразование геометрических объектов в OpenGL", short: "Основы OpenGL" },
    { n: 12, k: 2, lec: "Преобразования объектов, материалы и освещение в OpenGL", prac: "Модельно-видовые преобразования. Проекции. Описание источников света", short: "Преобразования и освещение" },
    { n: 13, k: 3, lec: "Текстурирование и операции с пикселами в OpenGL", prac: "Наложение текстуры на объекты. Управление растеризацией", short: "Текстуры и пиксели" },
    { n: 14, k: 4, lec: "Приемы работы с OpenGL", prac: "Устранение ступенчатости. Построение теней. Зеркальные отражения", short: "Сглаживание, тени, зеркала" },
    { n: 15, k: 5, lec: "Оптимизация программ с использованием OpenGL", prac: "Организация приложения. Оптимизация вызовов OpenGL", short: "Оптимизация" }
  ];
  var SRSP = [
    { n: 1, title: "Контрольная работа по теме СРС 1", after: 11 },
    { n: 2, title: "Прием и защита СРС 1", after: 14 },
    { n: 3, title: "Консультация перед проведением итогового экзамена", after: 15 }
  ];
  // занятия модуля в порядке расписания (для журнала посещаемости)
  var SESSIONS = [
    { id: "L11", label: "Л 1" }, { id: "S11", label: "ЛР 1" }, { id: "P5", label: "СРСП 1" },
    { id: "L12", label: "Л 2" }, { id: "S12", label: "ЛР 2" },
    { id: "L13", label: "Л 3" }, { id: "S13", label: "ЛР 3" },
    { id: "L14", label: "Л 4" }, { id: "S14", label: "ЛР 4" }, { id: "P6", label: "СРСП 2" },
    { id: "L15", label: "Л 5" }, { id: "S15", label: "ЛР 5" }, { id: "P7", label: "СРСП 3" }
  ];
  // работы, которые сдаются через GitHub
  var WORKS = [
    { id: "SZ11", label: "ЛР 1 — индивидуальное задание" }, { id: "SZ12", label: "ЛР 2 — индивидуальное задание" },
    { id: "SZ13", label: "ЛР 3 — индивидуальное задание" }, { id: "SZ14", label: "ЛР 4 — индивидуальное задание" },
    { id: "SZ15", label: "ЛР 5 — индивидуальное задание" }, { id: "SRS2", label: "СРС 1 — проект «Интерактивная 3D-сцена»" }
  ];
  var CFG = global.OGL_CONFIG || {};
  var REPO = CFG.repo || "Masterpure-rgb/OpenGL";

  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k]; if (v == null || v === false) continue;
      if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v; else if (k === "text") e.textContent = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") e.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v); else e.setAttribute(k, v === true ? "" : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i]; if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x != null && x !== false) e.appendChild(typeof x === "string" ? document.createTextNode(x) : x); });
      else e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    }
    return e;
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("ogl:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("ogl:" + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem("ogl:" + k); } catch (e) {} }
  };
  function topic(n) { return TOPICS.filter(function (t) { return t.n === +n; })[0]; }
  function kk(n) { var t = topic(n); return t ? t.k : n; }               // номер работы для показа (1–5)
  function tpath(kind, n) { return link(kind + "/" + kk(n) + "/"); }       // адрес страницы работы
  function link(path) { return BASE + path; }
  function fetchJSON(path) { return fetch(BASE + path, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function toast(msg, kind) {
    var t = el("div", { class: "toast " + (kind || ""), role: "status" }, msg);
    document.body.appendChild(t); requestAnimationFrame(function () { t.classList.add("in"); });
    setTimeout(function () { t.classList.remove("in"); setTimeout(function () { t.remove(); }, 300); }, 3200);
  }
  // текст с именами функций и констант OpenGL → узлы, где имена набраны моноширинным шрифтом
  var IDENT = /((?:glut|glu|gl)[A-Z]\w*\*?|(?:GLUT|GLU|GL)_[A-Z0-9_]+\*?|stbi_\w+|`[^`]+`)/;
  function rich(text) {
    return String(text == null ? "" : text).split(IDENT).map(function (part, i) {
      if (!(i % 2)) return part;
      return el("code", null, part.charAt(0) === "`" ? part.slice(1, -1) : part);
    }).filter(function (x) { return x !== ""; });
  }
  function loadScript(path) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = BASE + path; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

  // шапка и подвал
  function header(active, crumbs) {
    var nav = el("nav", { class: "nav", "aria-label": "Разделы" },
      el("a", { href: link(""), class: active === "home" ? "on" : null }, "Темы"),
      el("a", { href: link("sandbox/"), class: active === "sandbox" ? "on" : null }, "Песочница"),
      el("a", { href: link("srsp/"), class: active === "srsp" ? "on" : null }, "СРС и СРСП"),
      el("a", { href: link("me/"), class: active === "me" ? "on" : null }, "Мой кабинет"));
    var h = el("header", { class: "top" },
      el("a", { class: "brand", href: link(""), "aria-label": "На главную" },
        el("span", { class: "mark", "aria-hidden": "true" }, "GL"),
        el("span", { class: "bt" }, el("b", null, "Компьютерная графика"), el("span", null, "Модуль 2. OpenGL"))),
      nav);
    document.body.insertBefore(h, document.body.firstChild);
    if (crumbs && crumbs.length) {
      var c = el("div", { class: "crumbs" }); crumbs.forEach(function (x, i) { if (i) c.appendChild(el("span", { class: "sep", "aria-hidden": "true" }, "/")); c.appendChild(x.href ? el("a", { href: x.href }, x.text) : el("span", null, x.text)); });
      h.after(c);
    }
    return h;
  }
  function footer() {
    var f = el("footer", { class: "foot" },
      el("p", null, "Ф.М. Нуралиев, С.Н. Ибодуллаев. Компьютерная графика. Модуль 2. Графическая библиотека OpenGL: методические указания к лабораторным работам. Ташкентский университет информационных технологий имени Мухаммада аль-Хорезми, 2026."),
      el("p", null, el("a", { href: link("metodichka/OpenGL_laboratornye_raboty_2026.docx"), download: "" }, "Методичка (Word)"), el("a", { href: link("help/") }, "Как сдать работу"), el("a", { href: link("admin/") }, "Преподавателю"), el("a", { href: "https://github.com/" + REPO, rel: "noopener" }, "Репозиторий на GitHub")));
    document.body.appendChild(f);
  }
  // три ресурса темы
  function trio(n, active) {
    var t = topic(n);
    function a(kind, href, label, sub) { return el("a", { href: href, class: "tri" + (active === kind ? " on" : "") }, el("b", null, label), el("span", null, sub)); }
    return el("nav", { class: "trio", "aria-label": "Материалы работы " + kk(n) },
      a("e", tpath("e", n), "Объяснение", "≈2 минуты, аудио"),
      a("l", tpath("l", n), "Лаборатория", "код и окно OpenGL"),
      a("z", tpath("z", n), "Задания", "вопросы, варианты, сдача"));
  }

  global.OGL = { BASE: BASE, TOPICS: TOPICS, SRSP: SRSP, SESSIONS: SESSIONS, WORKS: WORKS, REPO: REPO, CFG: CFG,
    el: el, rich: rich, $: $, $$: $$, store: store, topic: topic, k: kk, tpath: tpath, link: link, fetchJSON: fetchJSON, esc: esc, toast: toast, loadScript: loadScript,
    header: header, footer: footer, trio: trio };
})(window);
