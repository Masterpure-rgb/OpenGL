/* ME — кабинет студента: вход по ID и коду доступа; посещаемость и статусы работ из зашифрованной карточки. */
(function () {
  "use strict";
  var O = window.OGL, el = O.el, C = GHApi.C;
  O.header("me", [{ text: "Темы", href: O.link("") }, { text: "Мой кабинет" }]);
  var main = el("main", { class: "wrap doc" }); document.body.appendChild(main);
  main.appendChild(el("div", { class: "pagehead flat" }, el("p", { class: "kicker" }, "Мой кабинет"), el("h1", null, "Посещаемость и статус работ")));
  var me = O.store.get("me", {});
  var id = el("input", { id: "me-id", value: me.id || "", autocomplete: "username", required: true });
  var code = el("input", { id: "me-code", type: "password", autocomplete: "current-password", required: true, placeholder: "6 символов" });
  var msg = el("p", { class: "dlg-msg", role: "status" });
  var out = el("div");
  var form = el("form", { class: "login" },
    el("label", { class: "fld" }, el("span", null, "ID студента"), id),
    el("label", { class: "fld" }, el("span", null, "Код доступа"), code, el("small", null, "Код выдаёт преподаватель. Данные хранятся в зашифрованном виде: без кода их не прочитать.")),
    el("button", { class: "btn run", type: "submit" }, "Войти"), msg);
  main.appendChild(form); main.appendChild(out);
  var ST = { p: ["был", "p"], l: ["опоздал", "l"], a: ["не был", "a"] };
  var WS = { sent: "отправлено", accepted: "принято", rework: "на доработку" };
  form.addEventListener("submit", function (e) {
    e.preventDefault(); msg.textContent = "Загружаю…"; msg.className = "dlg-msg"; out.innerHTML = "";
    var sid = id.value.trim(), sc = code.value.trim();
    C.studentFile(sid).then(GHApi.readPublic).then(function (box) {
      if (!box) throw new Error("none");
      return C.open(box, C.studentSecret(sid, sc), "ogl|" + sid.toLowerCase());
    }).then(function (card) {
      me.id = sid; O.store.set("me", me); msg.textContent = ""; render(card);
    }).catch(function (err) {
      msg.className = "dlg-msg bad";
      msg.textContent = err.message === "none" ? "Карточка не найдена: преподаватель ещё не внёс вас в журнал или ID набран с ошибкой." : "Неверный код доступа (или ID). Проверьте раскладку клавиатуры.";
    });
  });
  function render(c) {
    out.appendChild(el("section", { class: "blk" }, el("h2", null, c.name || ("ID " + c.id)), el("p", { class: "muted" }, "Группа " + (c.group || "—") + ". Обновлено: " + (c.updated ? new Date(c.updated).toLocaleString("ru-RU") : "—"))));
    var sess = c.sessions || [];
    var cnt = { p: 0, l: 0, a: 0 }; sess.forEach(function (s) { if (cnt[s.s] !== undefined) cnt[s.s]++; });
    out.appendChild(el("section", { class: "blk" }, el("h2", null, "Посещаемость"),
      el("p", null, "Был: " + cnt.p + ". Опоздал: " + cnt.l + ". Не был: " + cnt.a + "."),
      el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, el("th", null, "Занятие"), el("th", null, "Дата"), el("th", null, "Отметка"))),
        el("tbody", null, sess.length ? sess.map(function (s) { var t = ST[s.s] || ["—", ""]; return el("tr", null, el("td", null, s.label), el("td", null, s.date || "—"), el("td", null, el("span", { class: "mk mk-" + t[1] }, t[0] + (s.s === "l" && s.m ? " на " + s.m + " мин" : "")))); }) : el("tr", null, el("td", { colspan: "3", class: "muted" }, "Отметок пока нет.")))))));
    var works = c.works || [];
    out.appendChild(el("section", { class: "blk" }, el("h2", null, "Работы"),
      el("div", { class: "tbl-wrap" }, el("table", { class: "tbl" }, el("thead", null, el("tr", null, el("th", null, "Работа"), el("th", null, "Вариант"), el("th", null, "Статус"), el("th", null, "Комментарий преподавателя"))),
        el("tbody", null, works.length ? works.map(function (w) { return el("tr", null, el("td", null, w.url ? el("a", { href: w.url, target: "_blank", rel: "noopener" }, w.label) : w.label), el("td", null, w.variant || "—"), el("td", null, el("span", { class: "ws ws-" + w.status }, WS[w.status] || w.status)), el("td", null, w.comment || "")); }) : el("tr", null, el("td", { colspan: "4", class: "muted" }, "Сданных работ пока нет.")))))));
  }
  O.footer();
})();
