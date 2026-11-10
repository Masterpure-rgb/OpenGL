/* LAB — страница лабораторной: шаги (пример → задания), редактор, окно, автоматическая проверка. */
(function () {
  "use strict";
  var O = window.OGL, el = O.el;
  var n = +document.body.getAttribute("data-topic"), T = O.topic(n) || { n: n, prac: "Пример формата лабораторной" };
  O.header("home", [{ text: "Темы", href: O.link("") }, { text: "Тема " + O.k(n), href: O.link("#t" + n) }, { text: "Лаборатория" }]);
  var root = el("main", { class: "labpage" });
  document.body.appendChild(root);
  root.appendChild(el("div", { class: "pagehead" },
    el("p", { class: "kicker" }, "ЛР " + O.k(n) + ". Лабораторная работа"),
    el("h1", null, T.prac), O.trio(n, "l")));

  O.loadScript("assets/js/labs/lab" + n + ".js?v=" + (O.CFG.v || 1)).then(start, function () {
    root.appendChild(el("p", { class: "note" }, "Лабораторная этой темы ещё готовится."));
  });

  function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  function start() {
    var D = LAB.data, steps = D.steps, key = "lab" + n;
    var done = new Set(O.store.get(key + ":done", []));
    var cur = Math.min(O.store.get(key + ":cur", 0), steps.length - 1);

    var list = el("ol", { class: "steps" });
    var dots = el("ol", { class: "stepper", style: "--n: " + steps.length });
    var prog = el("span", { class: "prog" });
    var all = el("details", { class: "all-steps" }, el("summary", null, "Список шагов"), list);
    var stepsBox = el("nav", { class: "lab-steps", "aria-label": "Шаги лабораторной" },
      el("div", { class: "sh" }, el("h2", null, "Шаги"), prog), dots, all);
    var taskBox = el("section", { class: "task", "aria-live": "polite" });
    var ideHost = el("div");
    var tabs = el("div", { class: "tabs", role: "tablist" });
    var wrap = el("div", { class: "lab" }, el("aside", { class: "lab-side" }, stepsBox, taskBox), el("div", { class: "lab-main" }, ideHost));
    root.appendChild(tabs); root.appendChild(wrap);

    var ide = new IDE(ideHost, {
      fileName: "sz" + n + "_" + (steps[cur] && steps[cur].id),
      onCheck: function (code) { check(code); },
      onReset: function () { var s = steps[cur]; ide.editor.set(s.starter || s.code); O.store.del(key + ":" + s.id); ide.run(); },
      onSave: function (code) { var s = steps[cur]; if (code !== (s.starter || s.code)) O.store.set(key + ":" + s.id, code); },
      onRun: function (h, manual) { if (manual && window.matchMedia("(max-width: 900px)").matches) setTab("out"); }
    });

    // вкладки на телефоне
    var TABS = [["task", "Задание"], ["code", "Код"], ["out", "Окно"]];
    TABS.forEach(function (t) { tabs.appendChild(el("button", { role: "tab", type: "button", "data-tab": t[0], onclick: function () { setTab(t[0]); } }, t[1])); });
    function setTab(t) { wrap.setAttribute("data-tab", t); O.$$("button", tabs).forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-tab") === t ? "true" : "false"); }); }
    setTab("task");

    function title(s) { return cap(s.title.replace(/^(Пример|Задание)\s*\d*[:.]\s*/i, "")); }
    function renderList() {
      list.innerHTML = ""; dots.innerHTML = "";
      steps.forEach(function (s, i) {
        var lbl = s.kind === "example" ? "П" : String(stepNo(i));
        dots.appendChild(el("li", { class: (i === cur ? "cur " : "") + (done.has(s.id) ? "done" : "") },
          el("button", { type: "button", title: (s.kind === "example" ? "Пример: " : "Задание " + lbl + ": ") + title(s),
            "aria-label": (s.kind === "example" ? "Пример: " : "Задание " + lbl + ": ") + title(s) + (done.has(s.id) ? " (выполнено)" : ""),
            "aria-current": i === cur ? "step" : null, onclick: function () { go(i); } }, lbl)));
      });
      steps.forEach(function (s, i) {
        var isDone = done.has(s.id);
        list.appendChild(el("li", { class: (i === cur ? "cur " : "") + (isDone ? "done" : "") },
          el("button", { type: "button", onclick: function () { all.open = false; go(i); }, "aria-current": i === cur ? "step" : null },
            el("span", { class: "sn" }, s.kind === "example" ? "П" : String(stepNo(i))),
            el("span", { class: "st" }, title(s)),
            isDone ? el("span", { class: "ok", "aria-label": "выполнено" }, "✓") : null)));
      });
      var tasks = steps.filter(function (s) { return s.kind === "task"; }), d = tasks.filter(function (s) { return done.has(s.id); }).length;
      prog.textContent = "выполнено " + d + " из " + tasks.length;
    }
    function stepNo(i) { var k = 0; for (var j = 0; j <= i; j++) if (steps[j].kind === "task") k++; return k; }
    var result = null;
    function go(i) {
      cur = i; O.store.set(key + ":cur", i);
      var s = steps[i];
      renderList();
      taskBox.innerHTML = "";
      var head = el("div", { class: "task-h" },
        el("span", { class: "tag " + s.kind }, s.kind === "example" ? "Пример" : "Задание " + stepNo(i)),
        el("h2", null, title(s)));
      taskBox.appendChild(head);
      taskBox.appendChild(el("div", { class: "task-text", html: s.text || "" }));
      if (s.kind === "task") {
        var c = s.check || { type: "image" };
        var row = el("div", { class: "task-row" });
        if (c.type !== "free" && c.type !== "calls") {
          var fig = el("figure", { class: "expect" }, el("div", { class: "ph" }, "Строится…"), el("figcaption", null, "Ожидаемый результат"));
          row.appendChild(fig);
          LAB.reference(s).then(function (r) { if (r.pixels) fig.replaceChild(el("img", { src: Runner.toDataURL(r.pixels, 360), alt: "Ожидаемое изображение в окне" }), fig.firstChild); else fig.firstChild.textContent = "—"; });
        }
        var side = el("div", { class: "task-side" });
        if (s.hint) side.appendChild(el("details", { class: "hint" }, el("summary", null, "Подсказка"), el("p", { html: s.hint })));
        result = el("div", { class: "result", role: "status" });
        side.appendChild(result);
        side.appendChild(el("p", { class: "muted small" }, c.type === "free" ? "Этот шаг творческий: проверка отметит его, если программа работает без ошибок." : "Нажмите «Проверить»: программа запускается и её кадр сравнивается с ожидаемым."));
        row.appendChild(side);
        taskBox.appendChild(row);
      } else result = null;
      var nav = el("div", { class: "task-nav" },
        i > 0 ? el("button", { class: "btn ghost", type: "button", onclick: function () { go(i - 1); } }, "Предыдущий шаг") : null,
        i < steps.length - 1 ? el("button", { class: "btn ghost", type: "button", onclick: function () { go(i + 1); } }, s.kind === "example" ? "К первому заданию" : "Следующий шаг") :
          el("a", { class: "btn", href: O.tpath("z", n) }, "К индивидуальному заданию"));
      taskBox.appendChild(nav);
      ide.opts.fileName = "sz" + n + "_" + s.id;
      ide.editor.set(O.store.get(key + ":" + s.id, null) || s.starter || s.code);
      O.$(".check", ideHost) && (O.$(".check", ideHost).hidden = s.kind !== "task");
      ide.run();
    }
    function check(code) {
      var s = steps[cur]; if (s.kind !== "task") return;
      if (!result) return;
      result.className = "result wait"; result.innerHTML = ""; result.textContent = "Проверяю…";
      if (code !== (s.starter || s.code)) O.store.set(key + ":" + s.id, code);
      LAB.check(s, code).then(function (r) {
        result.innerHTML = "";
        result.className = "result " + (r.ok ? "good" : "bad");
        result.appendChild(el("b", null, r.msg));
        if (r.details && r.details.length) result.appendChild(el("ul", null, r.details.map(function (d) { return el("li", null, d.charAt(0).toUpperCase() + d.slice(1) + "."); })));
        if (r.line) result.appendChild(el("button", { class: "linkbtn", type: "button", onclick: function () { ide.editor.goto(r.line); setTab("code"); } }, "Перейти к строке " + r.line));
        if (r.ok) {
          done.add(s.id); O.store.set(key + ":done", Array.from(done)); renderList();
          if (cur < steps.length - 1) result.appendChild(el("button", { class: "btn small", type: "button", onclick: function () { go(cur + 1); } }, "Следующий шаг"));
          else result.appendChild(el("a", { class: "btn small", href: O.tpath("z", n) }, "К индивидуальному заданию"));
        }
        if (window.matchMedia("(max-width: 900px)").matches) setTab("task");
      });
    }
    go(cur);
  }
  O.footer();
})();
