/* IDE — редактор + окно OpenGL + консоль + панель состояния OpenGL. Используется лабораторными и песочницей. */
(function (global) {
  "use strict";
  var O = global.OGL, el = O.el, K = GL1.K;
  var CHIPS = [
    ["GL_DEPTH_TEST", "глубина"], ["GL_LIGHTING", "освещение"], ["GL_LIGHT0", "LIGHT0"], ["GL_LIGHT1", "LIGHT1"], ["GL_LIGHT2", "LIGHT2"],
    ["GL_COLOR_MATERIAL", "цвет-материал"], ["GL_NORMALIZE", "нормализация"], ["GL_TEXTURE_2D", "текстура"], ["GL_BLEND", "смешивание"],
    ["GL_CULL_FACE", "отсечение граней"], ["GL_FOG", "туман"], ["GL_STENCIL_TEST", "трафарет"], ["GL_ALPHA_TEST", "альфа-тест"],
    ["GL_LINE_SMOOTH", "сглаж. линий"], ["GL_POLYGON_OFFSET_FILL", "смещение полигонов"], ["GL_SCISSOR_TEST", "ножницы"], ["GL_CLIP_PLANE0", "плоскость отсечения"]
  ];
  var MODE = {}; MODE[K.GL_MODELVIEW] = "GL_MODELVIEW"; MODE[K.GL_PROJECTION] = "GL_PROJECTION"; MODE[K.GL_TEXTURE] = "GL_TEXTURE";

  function IDE(host, opts) {
    opts = opts || {};
    var I = this; this.opts = opts; this.run = run; this.stop = stop;
    host.classList.add("ide");
    var runBtn = el("button", { class: "btn run", type: "button", title: "Запустить (Ctrl+Enter)", onclick: function () { run({ manual: true }); } }, el("span", { class: "ic ic-play", "aria-hidden": "true" }), "Запустить");
    var checkBtn = opts.onCheck ? el("button", { class: "btn check", type: "button", onclick: function () { opts.onCheck(I.editor.get()); } }, el("span", { class: "ic ic-check", "aria-hidden": "true" }), "Проверить") : null;
    var resetBtn = el("button", { class: "btn ghost", type: "button", title: "Вернуть исходный код шага", onclick: function () { if (opts.onReset) opts.onReset(); } }, "Сбросить");
    var dlBtn = el("button", { class: "btn ghost", type: "button", title: "Скачать файл .cpp", onclick: download }, "Скачать .cpp");
    var shotBtn = el("button", { class: "btn ghost", type: "button", title: "Сохранить изображение окна (для отчёта)", onclick: screenshot }, "Скриншот");
    this.status = el("span", { class: "ide-status", role: "status" });
    var bar = el("div", { class: "ide-bar" }, runBtn, checkBtn, el("span", { class: "grow" }), this.status, resetBtn, dlBtn, shotBtn);
    var edHost = el("div", { class: "ide-code" });
    this.winTitle = el("span", { class: "wt" }, "Окно OpenGL");
    this.winMeta = el("span", { class: "wm" }, "");
    this.canvasHost = el("div", { class: "win-body" }, el("p", { class: "win-empty" }, "Нажмите «Запустить» — здесь откроется окно программы."));
    var win = el("div", { class: "win" }, el("div", { class: "win-bar" }, this.winTitle, this.winMeta), this.canvasHost);
    this.chips = el("div", { class: "chips", "aria-label": "Включённые возможности OpenGL" });
    this.chipEls = {};
    CHIPS.forEach(function (c) { var x = el("span", { class: "chip", title: c[0] }, c[1]); I.chipEls[c[0]] = x; I.chips.appendChild(x); });
    this.metrics = el("dl", { class: "metrics" });
    var state = el("details", { class: "state", open: opts.stateOpen === false ? null : true }, el("summary", null, "Состояние OpenGL"), this.chips, this.metrics);
    this.cons = el("div", { class: "console", "aria-live": "polite" });
    var out = el("div", { class: "ide-out" }, win, state, el("div", { class: "cons-h" }, el("span", null, "Консоль"), el("button", { class: "linkbtn", type: "button", onclick: function () { I.cons.innerHTML = ""; } }, "очистить")), this.cons);
    var main = el("div", { class: "ide-main" }, edHost, out);
    host.appendChild(bar); host.appendChild(main);
    this.editor = new Editor(edHost, { value: opts.code || "", onRun: function () { run({ manual: true }); }, onChange: opts.onChange });
    this.handle = null;
    var lastInfo = 0, outBuf = "";

    function log(kind, msg, line) {
      if (kind === "out") { outBuf += msg; var parts = outBuf.split("\n"); outBuf = parts.pop(); parts.forEach(function (p) { addLine("out", p, null); }); return; }
      addLine(kind, msg, line);
      if (line && (kind === "error" || kind === "warn")) I.editor.mark(line, kind === "error" ? "err" : "warn");
    }
    function addLine(kind, msg, line) {
      if (I.cons.childNodes.length > 300) I.cons.removeChild(I.cons.firstChild);
      var row = el("div", { class: "cl cl-" + kind },
        line ? el("button", { class: "ln", type: "button", onclick: function () { I.editor.goto(line); } }, "строка " + line) : null,
        el("span", null, msg));
      I.cons.appendChild(row); I.cons.scrollTop = I.cons.scrollHeight;
    }
    this.log = addLine;
    function stop() { if (I.handle && I.handle.rt) I.handle.rt.__destroy(); I.handle = null; }
    function run(how) {
      how = how || {};
      stop(); outBuf = "";
      I.cons.innerHTML = ""; I.editor.clearMarks();
      I.canvasHost.innerHTML = ""; I.winTitle.textContent = "Окно OpenGL"; I.winMeta.textContent = "";
      I.status.textContent = "Компиляция…"; I.status.className = "ide-status";
      var code = I.editor.get();
      if (opts.onSave) opts.onSave(code);
      return Runner.run({ code: code, host: I.canvasHost, log: log,
        onWindow: function (w) {
          I.winTitle.textContent = w.title; I.winMeta.textContent = w.w + "×" + w.h + "  " + [w.double ? "DOUBLE" : "SINGLE", w.depth && "DEPTH", w.stencil && "STENCIL", w.accum && "ACCUM", w.msaa && "MULTISAMPLE"].filter(Boolean).join(" · ");
          w.canvas.style.aspectRatio = w.w + " / " + w.h;
        },
        onTitle: function (t) { I.winTitle.textContent = t; },
        onFrame: function (info) { var now = performance.now(); if (now - lastInfo > 250) { lastInfo = now; showState(info); } },
        onError: function () { I.status.textContent = "Ошибка во время выполнения"; I.status.className = "ide-status bad"; }
      }).then(function (h) {
        I.handle = h;
        if (outBuf) { addLine("out", outBuf, null); outBuf = ""; }
        if (h.error) { I.status.textContent = h.error.line ? "Ошибка в строке " + h.error.line : "Ошибка"; I.status.className = "ide-status bad"; if (h.error.line) I.editor.mark(h.error.line, "err"); if (!h.rt || !I.canvasHost.querySelector("canvas")) I.canvasHost.appendChild(el("p", { class: "win-empty bad" }, "Программа не запущена — см. сообщение в консоли.")); }
        else { I.status.textContent = h.warnings.length ? "Работает, есть предупреждения" : "Работает"; I.status.className = "ide-status " + (h.warnings.length ? "warn" : "ok"); if (h.rt) showState(h.rt.__info()); var cv = I.canvasHost.querySelector("canvas"); if (cv && opts.focusCanvas !== false) cv.focus({ preventScroll: true }); }
        if (opts.onRun) opts.onRun(h, !!how.manual);
        return h;
      });
    }
    function showState(info) {
      var on = {}; info.caps.forEach(function (c) { on[c] = true; });
      CHIPS.forEach(function (c) { I.chipEls[c[0]].classList.toggle("on", !!on[K[c[0]]]); });
      var s = info.stats;
      I.metrics.innerHTML = "";
      [["Кадров", s.frames], ["FPS", s.fps || "—"], ["Блоков glBegin", s.blocks], ["Вершин", s.verts], ["Вызовов отрисовки", s.draws], ["Из списков", s.listBlocks],
        ["Матрица", MODE[info.matMode] || info.matMode], ["Глубина стека MV", info.mvDepth]].forEach(function (p) {
        I.metrics.appendChild(el("dt", null, p[0])); I.metrics.appendChild(el("dd", null, String(p[1])));
      });
    }
    function download() {
      var name = (opts.fileName || "program") + ".cpp", b = new Blob([I.editor.get()], { type: "text/x-c++src;charset=utf-8" });
      var a = el("a", { href: URL.createObjectURL(b), download: name }); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function screenshot() {
      if (!I.handle || !I.handle.rt) { O.toast("Сначала запустите программу.", "bad"); return; }
      var img = I.handle.rt.__screen(); if (!img) return;
      var a = el("a", { href: Runner.toDataURL(img), download: (opts.fileName || "program") + ".png" }); document.body.appendChild(a); a.click(); a.remove();
    }
  }
  global.IDE = IDE;
})(window);
