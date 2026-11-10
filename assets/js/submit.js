/* SUBMIT — сдача работы: форма на сайте → готовая страница «New issue» на GitHub с заполненными полями. */
(function (global) {
  "use strict";
  var O = global.OGL, el = O.el;
  var MAX_URL = 7000;
  function open(o) {
    o = o || {};
    var me = O.store.get("me", {});
    var dlg = el("dialog", { class: "dlg", "aria-labelledby": "sub-h" });
    var id = el("input", { id: "sub-id", required: true, value: me.id || "", autocomplete: "off", inputmode: "text", placeholder: "например, 2401" });
    var grp = el("input", { id: "sub-g", required: true, value: me.group || "", autocomplete: "off", placeholder: "например, 721-23" });
    var work = el("select", { id: "sub-w" }, O.WORKS.map(function (w) { return el("option", { value: w.id, selected: w.id === o.work ? true : null }, w.label); }));
    var variant = el("input", { id: "sub-v", value: o.variant || me["v" + (o.work || "")] || "", inputmode: "numeric", placeholder: "номер" });
    var code = el("textarea", { id: "sub-c", rows: 8, spellcheck: "false", class: "mono" }, o.code || "");
    var answers = el("textarea", { id: "sub-a", rows: 3, placeholder: "Кратко ответьте на 2–3 контрольных вопроса (по требованию преподавателя)" });
    var msg = el("p", { class: "dlg-msg", role: "status" });
    function field(lbl, inp, help) { return el("label", { class: "fld" }, el("span", null, lbl), inp, help ? el("small", null, help) : null); }
    var form = el("form", { method: "dialog" },
      el("h2", { id: "sub-h" }, "Сдать работу через GitHub"),
      el("p", { class: "muted small" }, "Работа отправляется преподавателю как обращение (issue) в репозитории курса. Нужен бесплатный аккаунт GitHub. Фамилию не пишите — достаточно ID из списка группы."),
      el("div", { class: "fld-row" }, field("ID студента", id), field("Группа", grp)),
      el("div", { class: "fld-row" }, field("Работа", work), field("Вариант", variant)),
      field("Код программы (.cpp)", code, "Код вставлен из редактора. Проверьте, что это окончательная версия."),
      field("Ответы на контрольные вопросы (необязательно)", answers),
      msg,
      el("div", { class: "dlg-act" },
        el("button", { class: "btn ghost", type: "button", onclick: function () { dlg.close(); } }, "Отмена"),
        el("button", { class: "btn run", type: "submit" }, "Открыть GitHub")));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!id.value.trim() || !grp.value.trim()) { msg.textContent = "Укажите ID и группу."; msg.className = "dlg-msg bad"; return; }
      if (!code.value.trim()) { msg.textContent = "Вставьте код программы."; msg.className = "dlg-msg bad"; return; }
      me.id = id.value.trim(); me.group = grp.value.trim(); me["v" + work.value] = variant.value.trim(); O.store.set("me", me);
      var W = O.WORKS.filter(function (w) { return w.id === work.value; })[0];
      var title = "[" + W.label.split(" — ")[0] + "] ID " + me.id + (variant.value ? ", вариант " + variant.value.trim() : "");
      var base = "https://github.com/" + O.REPO + "/issues/new?template=sdacha.yml";
      var q = "&title=" + encodeURIComponent(title) + "&student=" + encodeURIComponent(me.id) + "&group=" + encodeURIComponent(me.group) +
        "&work=" + encodeURIComponent(W.label) + "&variant=" + encodeURIComponent(variant.value.trim()) + (answers.value.trim() ? "&answers=" + encodeURIComponent(answers.value.trim()) : "");
      var withCode = base + q + "&code=" + encodeURIComponent(code.value);
      var url = withCode.length <= MAX_URL ? withCode : base + q;
      var copied = false;
      if (url !== withCode) {
        try { navigator.clipboard.writeText(code.value); copied = true; } catch (er) { copied = false; }
      }
      window.open(url, "_blank", "noopener");
      form.innerHTML = "";
      form.appendChild(el("h2", null, "Осталось отправить на GitHub"));
      form.appendChild(el("ol", { class: "after" },
        el("li", null, "В открывшейся вкладке войдите в GitHub (или зарегистрируйтесь)."),
        url !== withCode ? el("li", null, el("b", null, copied ? "Код скопирован в буфер обмена: " : "Код длинный — скопируйте его вручную: "), "щёлкните в поле «Код программы (.cpp)» и вставьте (Ctrl+V).") : el("li", null, "Поля уже заполнены — проверьте их."),
        el("li", null, "Перетащите в поле «Скриншот и файлы» снимок окна программы (кнопка «Скриншот» в редакторе)", W.id === "SRS2" ? " и отчёт по СРС 1." : "."),
        el("li", null, "Нажмите «Create». Статус работы появится в разделе «Мой кабинет» после проверки.")));
      if (url !== withCode && !copied) form.appendChild(el("button", { class: "btn small", type: "button", onclick: function () { try { navigator.clipboard.writeText(code.value); O.toast("Код скопирован", "good"); } catch (er) {} } }, "Скопировать код"));
      form.appendChild(el("div", { class: "dlg-act" }, el("a", { class: "btn ghost", href: url, target: "_blank", rel: "noopener" }, "Открыть GitHub ещё раз"), el("button", { class: "btn", type: "button", onclick: function () { dlg.close(); } }, "Готово")));
    });
    dlg.appendChild(form);
    dlg.addEventListener("close", function () { dlg.remove(); });
    document.body.appendChild(dlg);
    dlg.showModal();
    (me.id ? variant : id).focus();
  }
  global.Submit = { open: open };
})(window);
