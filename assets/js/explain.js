/* EXPLAIN — короткое аудиообъяснение темы (QR-1): плеер и текст, подсвечиваемый синхронно. */
(function () {
  "use strict";
  var O = window.OGL, el = O.el;
  var n = +document.body.getAttribute("data-topic"), T = O.topic(n);
  O.header("home", [{ text: "Темы", href: O.link("") }, { text: "Тема " + n, href: O.link("#t" + n) }, { text: "Объяснение" }]);
  var main = el("main", { class: "wrap doc" }); document.body.appendChild(main);
  main.appendChild(el("div", { class: "pagehead flat" }, el("p", { class: "kicker" }, "Л " + n + ". Объяснение темы"), el("h1", null, T.lec), O.trio(n, "e")));
  function mmss(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  O.fetchJSON("data/audio/" + n + ".json").then(render, function () { main.appendChild(el("p", { class: "note" }, "Аудиообъяснение этой темы готовится.")); O.footer(); });
  function render(D) {
    var a = new Audio(); a.preload = "metadata"; a.src = O.link(D.file);
    var btn = el("button", { class: "play", type: "button", "aria-label": "Слушать" }, el("span", { class: "ic ic-play", "aria-hidden": "true" }));
    var fill = el("i"), bar = el("div", { class: "pbar", role: "slider", tabindex: "0", "aria-label": "Позиция", "aria-valuemin": "0", "aria-valuemax": String(Math.round(D.duration)), "aria-valuenow": "0" }, fill);
    var tc = el("span", { class: "tc" }, "0:00 / " + mmss(D.duration));
    var speeds = el("div", { class: "spd", role: "group", "aria-label": "Скорость" });
    [0.75, 1, 1.25, 1.5].forEach(function (s) { var b = el("button", { type: "button", class: s === 1 ? "on" : null, onclick: function () { a.playbackRate = s; O.$$("button", speeds).forEach(function (x) { x.classList.toggle("on", x === b); }); } }, String(s).replace(".", ",") + "×"); speeds.appendChild(b); });
    main.appendChild(el("section", { class: "player" }, btn, el("div", { class: "pmid" }, el("b", null, D.title), bar, el("div", { class: "prow" }, tc, speeds))));
    var tr = el("section", { class: "transcript" }, el("h2", null, "Текст объяснения"));
    var ps = D.paragraphs.map(function (p) { var e = el("p", { tabindex: "0" }, p.text); e.addEventListener("click", function () { a.currentTime = p.start + 0.01; a.play(); }); e.addEventListener("keydown", function (ev) { if (ev.key === "Enter") e.click(); }); tr.appendChild(e); return e; });
    main.appendChild(tr);
    main.appendChild(el("section", { class: "next" }, el("p", null, "Дальше — практика: пример и задания с проверкой прямо в браузере."), el("a", { class: "btn run", href: O.link("l/" + n + "/") }, "Открыть лабораторную")));
    btn.addEventListener("click", function () { if (a.paused) a.play(); else a.pause(); });
    a.addEventListener("play", function () { btn.classList.add("on"); btn.setAttribute("aria-label", "Пауза"); });
    a.addEventListener("pause", function () { btn.classList.remove("on"); btn.setAttribute("aria-label", "Слушать"); });
    a.addEventListener("error", function () { O.toast("Не удалось загрузить аудио. Проверьте подключение к интернету.", "bad"); });
    var last = -1;
    a.addEventListener("timeupdate", function () {
      var d = a.duration || D.duration, c = a.currentTime; fill.style.width = (100 * c / d) + "%"; bar.setAttribute("aria-valuenow", String(Math.round(c)));
      tc.textContent = mmss(c) + " / " + mmss(d);
      var k = -1; D.paragraphs.forEach(function (p, i) { if (c >= p.start - 0.05) k = i; });
      if (k !== last) { ps.forEach(function (e, i) { e.classList.toggle("now", i === k); }); last = k; }
    });
    function seek(x) { var r = bar.getBoundingClientRect(); a.currentTime = Math.max(0, Math.min(1, (x - r.left) / r.width)) * (a.duration || D.duration); }
    bar.addEventListener("click", function (e) { seek(e.clientX); });
    bar.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") a.currentTime += 5; if (e.key === "ArrowLeft") a.currentTime = Math.max(0, a.currentTime - 5); });
    O.footer();
  }
})();
