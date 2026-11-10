/* EDITOR — лёгкий редактор C++: textarea поверх подсвеченного текста, номера строк,
   отступы, Ctrl+Enter — запуск, Ctrl+/ — комментарий, подсветка строк с ошибками. */
(function (global) {
  "use strict";
  var KW = /^(if|else|for|while|do|switch|case|default|break|continue|return|struct|enum|typedef|const|static|sizeof|new|delete|true|false|NULL|nullptr|using|namespace|class|public|private|void|auto|extern|inline|unsigned|signed)$/;
  var TY = /^(int|float|double|char|bool|short|long|size_t|GL[a-z]+|GLUquadric|GLUquadricObj|std|vector|string|uint8_t|int32_t)$/;
  function hl(code) {
    var T = CPP.tokenize(code), out = "";
    for (var i = 0; i < T.length; i++) {
      var t = T[i], v = t.v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (t.t === "com") out += '<i class="c-com">' + v + "</i>";
      else if (t.t === "pp") out += '<i class="c-pp">' + v + "</i>";
      else if (t.t === "str" || t.t === "chr") out += '<i class="c-str">' + v + "</i>";
      else if (t.t === "num") out += '<i class="c-num">' + v + "</i>";
      else if (t.t === "id") {
        if (KW.test(t.v)) out += '<i class="c-kw">' + v + "</i>";
        else if (TY.test(t.v)) out += '<i class="c-ty">' + v + "</i>";
        else if (/^(gl|glu|glut|stbi_)[A-Za-z0-9_]*$/.test(t.v)) out += '<i class="c-fn">' + v + "</i>";
        else if (/^(GL|GLU|GLUT)_[A-Z0-9_]+$/.test(t.v)) out += '<i class="c-cn">' + v + "</i>";
        else out += v;
      } else out += v;
    }
    return out + "\n";
  }
  function Editor(host, opts) {
    opts = opts || {};
    var E = this;
    this.host = host;
    host.classList.add("ed");
    var gutter = document.createElement("div"); gutter.className = "ed-gut"; gutter.setAttribute("aria-hidden", "true");
    var wrap = document.createElement("div"); wrap.className = "ed-wrap";
    var pre = document.createElement("pre"); pre.className = "ed-hl"; pre.setAttribute("aria-hidden", "true");
    var marks = document.createElement("div"); marks.className = "ed-marks"; marks.setAttribute("aria-hidden", "true");
    var ta = document.createElement("textarea"); ta.className = "ed-ta"; ta.spellcheck = false; ta.autocapitalize = "off"; ta.autocomplete = "off";
    ta.setAttribute("autocorrect", "off"); ta.setAttribute("aria-label", opts.label || "Код программы на C++"); ta.wrap = "off";
    wrap.appendChild(marks); wrap.appendChild(pre); wrap.appendChild(ta);
    host.appendChild(gutter); host.appendChild(wrap);
    this.ta = ta; this.pre = pre; this.gutter = gutter; this.marks = marks; this.wrap = wrap;
    this.lineMarks = {};
    var raf = 0;
    function render() {
      raf = 0;
      var v = ta.value; pre.innerHTML = hl(v);
      var n = v.split("\n").length, g = "";
      for (var i = 1; i <= n; i++) g += '<span' + (E.lineMarks[i] ? ' class="m-' + E.lineMarks[i] + '"' : "") + ">" + i + "</span>";
      gutter.innerHTML = g;
      drawMarks();
      if (opts.onChange) opts.onChange(v);
    }
    function drawMarks() {
      var h = ""; for (var ln in E.lineMarks) h += '<div class="lm lm-' + E.lineMarks[ln] + '" style="top:calc(' + (ln - 1) + ' * var(--lh) + var(--pad))"></div>';
      marks.innerHTML = h;
    }
    this.refresh = function () { if (!raf) raf = requestAnimationFrame(render); };
    ta.addEventListener("input", function () { if (Object.keys(E.lineMarks).length) E.lineMarks = {}; E.refresh(); });
    ta.addEventListener("scroll", function () { pre.style.transform = "translate(" + -ta.scrollLeft + "px," + -ta.scrollTop + "px)"; marks.style.transform = "translateY(" + -ta.scrollTop + "px)"; gutter.scrollTop = ta.scrollTop; });
    ta.addEventListener("keydown", function (e) {
      var s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); if (opts.onRun) opts.onRun(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "/" || e.code === "Slash")) {
        e.preventDefault();
        var ls = v.lastIndexOf("\n", s - 1) + 1, le = v.indexOf("\n", en - (en > s && v[en - 1] === "\n" ? 1 : 0)); if (le < 0) le = v.length;
        var block = v.slice(ls, le), lines = block.split("\n"), all = lines.every(function (l) { return /^\s*\/\//.test(l) || !l.trim(); });
        var nb = lines.map(function (l) { return all ? l.replace(/^(\s*)\/\/ ?/, "$1") : (l.trim() ? l.replace(/^(\s*)/, "$1// ") : l); }).join("\n");
        replace(ls, le, nb, ls, ls + nb.length); return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        if (s === en && !e.shiftKey) { replace(s, en, "    ", s + 4, s + 4); return; }
        var a = v.lastIndexOf("\n", s - 1) + 1, b = v.indexOf("\n", en - 1); if (b < 0) b = v.length;
        var blk = v.slice(a, b).split("\n").map(function (l) { return e.shiftKey ? l.replace(/^ {1,4}/, "") : "    " + l; }).join("\n");
        replace(a, b, blk, a, a + blk.length); return;
      }
      if (e.key === "Enter" && !e.ctrlKey) {
        e.preventDefault();
        var lineStart = v.lastIndexOf("\n", s - 1) + 1, ind = /^\s*/.exec(v.slice(lineStart, s))[0];
        var before = v.slice(0, s).replace(/\s+$/, ""), after = v.slice(en);
        if (/\{$/.test(before)) { if (/^\s*\}/.test(after)) { var ins = "\n" + ind + "    \n" + ind; replace(s, en, ins, s + ind.length + 5, s + ind.length + 5); return; } ind += "    "; }
        replace(s, en, "\n" + ind, s + 1 + ind.length, s + 1 + ind.length); return;
      }
      if (e.key === "}" ) { var ls2 = v.lastIndexOf("\n", s - 1) + 1, pre2 = v.slice(ls2, s); if (/^\s+$/.test(pre2) && pre2.length >= 4) { e.preventDefault(); replace(s - 4, en, "}", s - 3, s - 3); return; } }
    });
    function replace(a, b, text, selA, selB) {
      ta.focus(); ta.setSelectionRange(a, b);
      var ok = false; try { ok = document.execCommand("insertText", false, text); } catch (er) { ok = false; }
      if (!ok) { ta.setRangeText(text, a, b, "end"); }
      ta.setSelectionRange(selA, selB); E.refresh();
    }
    if (opts.value) this.set(opts.value);
    render();
  }
  Editor.prototype.get = function () { return this.ta.value; };
  Editor.prototype.set = function (v) { this.ta.value = v; this.lineMarks = {}; this.refresh(); this.ta.scrollTop = 0; };
  Editor.prototype.mark = function (line, kind) { if (!line) return; this.lineMarks[line] = kind || "err"; this.refresh(); };
  Editor.prototype.clearMarks = function () { this.lineMarks = {}; this.refresh(); };
  Editor.prototype.goto = function (line) {
    var v = this.ta.value, pos = 0; for (var i = 1; i < line && pos >= 0; i++) pos = v.indexOf("\n", pos) + 1;
    this.ta.focus(); this.ta.setSelectionRange(pos, pos);
    var lh = parseFloat(getComputedStyle(this.ta).lineHeight) || 20; this.ta.scrollTop = Math.max(0, (line - 4) * lh);
  };
  global.Editor = Editor;
})(window);
