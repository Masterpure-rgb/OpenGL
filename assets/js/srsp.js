/* SRSP — СРС 2 (проект) и СРСП 5–7: требования, варианты, вопросы. */
(function () {
  "use strict";
  var O = window.OGL, el = O.el;
  O.header("srsp", [{ text: "Темы", href: O.link("") }, { text: "СРС и СРСП" }]);
  var main = el("main", { class: "wrap doc" }); document.body.appendChild(main);
  main.appendChild(el("div", { class: "pagehead flat" }, el("p", { class: "kicker" }, "Самостоятельная работа"), el("h1", null, "СРС 2 и СРСП 5–7")));
  function ul(a, cls) { return el("ul", { class: cls || "ticks" }, (a || []).map(function (x) { return el("li", null, O.rich(x)); })); }
  function qa(list) { return el("div", { class: "qa" }, list.map(function (x, i) { return el("details", { class: "qa-i" }, el("summary", null, el("span", { class: "qn" }, String(i + 1)), el("span", null, O.rich(x.q || x.task))), el("div", { class: "qa-a" }, el("p", null, O.rich(x.a || x.solution)))); })); }
  O.fetchJSON("data/srsp.json").then(function (D) {
    var nav = el("nav", { class: "toc", "aria-label": "Разделы" },
      el("a", { href: "#srs2" }, "СРС 2. Проект"), el("a", { href: "#srsp5" }, "СРСП 5. Контрольная"), el("a", { href: "#srsp6" }, "СРСП 6. Защита"), el("a", { href: "#srsp7" }, "СРСП 7. Консультация"));
    main.appendChild(nav);
    var S = D.srs2;
    var myV = O.store.get("varSRS2", "");
    var sel = el("select", { "aria-label": "Мой вариант" }, el("option", { value: "" }, "—"), S.variants.map(function (v) { return el("option", { value: String(v.n), selected: String(v.n) === String(myV) ? true : null }, "Вариант " + v.n); }));
    var vl = el("ol", { class: "variants" });
    function paint() { vl.innerHTML = ""; S.variants.forEach(function (v) { var mine = String(v.n) === sel.value; vl.appendChild(el("li", { class: mine ? "mine" : null }, el("span", { class: "vn" }, String(v.n)), el("div", null, el("p", null, el("b", null, v.title + ". "), O.rich(v.text)), mine ? el("div", { class: "v-act" }, el("a", { class: "btn small", href: O.link("sandbox/?srs=1") }, "Открыть песочницу"), el("button", { class: "btn small run", type: "button", onclick: function () { Submit.open({ work: "SRS2", variant: v.n, code: O.store.get("sandbox:last", "") }); } }, "Сдать проект")) : null))); }); }
    sel.addEventListener("change", function () { O.store.set("varSRS2", sel.value); paint(); });
    paint();
    main.appendChild(el("section", { class: "blk", id: "srs2" }, el("h2", null, S.title), el("p", { class: "lead" }, S.goal),
      el("h3", null, "Требования к проекту"), ul(S.requirements), el("h3", null, "Что сдаётся"), ul(S.deliverables), el("h3", null, "Структура отчёта"), ul(S.report, "num"),
      el("p", null, el("b", null, "Сроки. "), O.rich(S.schedule)),
      el("div", { class: "blk-h" }, el("h3", null, "Темы проектов"), el("label", { class: "pick" }, "Мой вариант ", sel)), vl));
    var P5 = D.srsp5;
    main.appendChild(el("section", { class: "blk", id: "srsp5" }, el("h2", null, P5.title), el("p", { class: "lead" }, P5.goal), el("p", null, el("b", null, "Формат. "), O.rich(P5.format)), ul(P5.rules),
      el("h3", null, "Варианты контрольной работы"), el("ol", { class: "variants" }, P5.variants.map(function (v) { return el("li", null, el("span", { class: "vn" }, String(v.n)), el("div", null, el("ol", { class: "inner" }, v.theory.map(function (q) { return el("li", null, O.rich(q)); }), el("li", null, el("b", null, "Практическое задание. "), O.rich(v.task))))); }))));
    var P6 = D.srsp6;
    main.appendChild(el("section", { class: "blk", id: "srsp6" }, el("h2", null, P6.title), el("p", { class: "lead" }, P6.goal), el("h3", null, "Порядок защиты"), ul(P6.procedure, "num"), el("h3", null, "Что проверяет преподаватель"), ul(P6.checklist), el("h3", null, "Вопросы на защите"), qa(P6.questions)));
    var P7 = D.srsp7;
    main.appendChild(el("section", { class: "blk", id: "srsp7" }, el("h2", null, P7.title), el("p", { class: "lead" }, P7.goal), el("h3", null, "План консультации"), ul(P7.plan, "num"),
      el("h3", null, "Экзаменационные вопросы модуля 2"), el("ol", { class: "exam" }, P7.examQuestions.map(function (q) { return el("li", null, O.rich(q)); })),
      el("h3", null, "Типовые задачи с решениями"), qa(P7.problems), el("h3", null, "Как готовиться"), ul(P7.advice)));
    O.footer();
  }, function () { main.appendChild(el("p", { class: "note" }, "Материалы готовятся.")); O.footer(); });
})();
