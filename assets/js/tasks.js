/* TASKS — страница «Задания» темы: что сделать, варианты индивидуального задания, контрольные вопросы, сдача. */
(function () {
  "use strict";
  var O = window.OGL, el = O.el;
  var n = +document.body.getAttribute("data-topic"), T = O.topic(n);
  O.header("home", [{ text: "Темы", href: O.link("") }, { text: "Тема " + n, href: O.link("#t" + n) }, { text: "Задания" }]);
  var main = el("main", { class: "wrap doc" }); document.body.appendChild(main);
  main.appendChild(el("div", { class: "pagehead flat" }, el("p", { class: "kicker" }, "СЗ " + n + ". Задания и сдача"), el("h1", null, T.prac), O.trio(n, "z")));
  O.fetchJSON("data/topics/" + n + ".json").then(render, function () { main.appendChild(el("p", { class: "note" }, "Материалы темы ещё готовятся.")); O.footer(); });

  function qa(list, open) {
    return el("div", { class: "qa" }, list.map(function (x, i) {
      return el("details", { class: "qa-i", open: open ? true : null }, el("summary", null, el("span", { class: "qn" }, String(i + 1)), el("span", null, x.q)), el("div", { class: "qa-a" }, el("p", null, x.a)));
    }));
  }
  function render(D) {
    var P = D.practice, L = D.lecture;
    var labDone = (O.store.get("lab" + n + ":done", []) || []).length;
    main.appendChild(el("section", { class: "blk" },
      el("h2", null, "Порядок работы"),
      el("ol", { class: "seq" },
        el("li", null, el("b", null, "Пройдите лабораторную. "), "Пример и задания по шагам с автоматической проверкой. ", el("a", { href: O.link("l/" + n + "/") }, labDone ? "Продолжить (выполнено шагов: " + labDone + ")" : "Открыть лабораторную")),
        el("li", null, el("b", null, "Выполните индивидуальное задание своего варианта. "), "Номер варианта назначает преподаватель. Работайте в песочнице или в Visual Studio — код один и тот же."),
        el("li", null, el("b", null, "Сдайте работу через GitHub. "), "Кнопка ниже заполнит форму сдачи; останется приложить скриншот. ", el("a", { href: O.link("help/") }, "Подробнее о сдаче")),
        el("li", null, el("b", null, "Подготовьте ответы на контрольные вопросы "), "— преподаватель задаёт их при приёме работы."))));
    if (P.goal) main.appendChild(el("p", { class: "lead" }, el("b", null, "Цель занятия. "), P.goal));

    // варианты
    var myV = O.store.get("var" + n, "");
    var sel = el("select", { "aria-label": "Мой вариант" }, el("option", { value: "" }, "—"), P.variants.map(function (v) { return el("option", { value: String(v.n), selected: String(v.n) === String(myV) ? true : null }, "Вариант " + v.n); }));
    var list = el("ol", { class: "variants" });
    function paint() {
      list.innerHTML = "";
      P.variants.forEach(function (v) {
        var mine = String(v.n) === sel.value;
        list.appendChild(el("li", { class: mine ? "mine" : null, id: "v" + v.n }, el("span", { class: "vn" }, String(v.n)), el("div", null, el("p", null, v.text),
          mine ? el("div", { class: "v-act" },
            el("a", { class: "btn small", href: O.link("sandbox/?t=" + n + "&v=" + v.n) }, "Открыть в песочнице"),
            el("button", { class: "btn small run", type: "button", onclick: function () { submit(v.n); } }, "Сдать работу")) : null)));
      });
    }
    sel.addEventListener("change", function () { O.store.set("var" + n, sel.value); paint(); if (sel.value) { var t = document.getElementById("v" + sel.value); if (t) t.scrollIntoView({ block: "nearest", behavior: "smooth" }); } });
    main.appendChild(el("section", { class: "blk" },
      el("div", { class: "blk-h" }, el("h2", null, "Индивидуальные задания"), el("label", { class: "pick" }, "Мой вариант ", sel)),
      list));
    paint();

    if (P.deliverables && P.deliverables.length) main.appendChild(el("section", { class: "blk" }, el("h2", null, "Что сдаётся"), el("ul", { class: "ticks" }, P.deliverables.map(function (d) { return el("li", null, d); })),
      el("button", { class: "btn run", type: "button", onclick: function () { submit(sel.value); } }, "Сдать работу")));
    if (P.results && P.results.length) main.appendChild(el("section", { class: "blk" }, el("h2", null, "После занятия вы умеете"), el("ul", { class: "ticks" }, P.results.map(function (d) { return el("li", null, d); }))));
    main.appendChild(el("section", { class: "blk" }, el("h2", null, "Контрольные вопросы к практическому занятию"), el("p", { class: "muted small" }, "Сначала ответьте сами, затем раскройте ответ."), qa(P.questions)));
    if (L && L.selfcheck) main.appendChild(el("section", { class: "blk" }, el("h2", null, "Вопросы для самоконтроля к лекции " + n), qa(L.selfcheck)));
    O.footer();
  }
  function submit(v) {
    var code = O.store.get("sandbox:t" + n + ":v" + (v || ""), null) || O.store.get("sandbox:last", "") || "";
    Submit.open({ work: "SZ" + n, variant: v || "", code: code });
  }
})();
