/* LABCHECK — проверка шага лабораторной: программа студента сравнивается с эталонным решением
   (изображение кадра) и/или с требованиями к вызовам функций OpenGL. */
(function (global) {
  "use strict";
  var LAB = global.LAB = global.LAB || {};
  LAB.define = function (d) { LAB.data = d; if (LAB.onDefine) LAB.onDefine(d); };

  var refCache = {};
  function opts(step) { return { time: step.time || 1000, frames: step.frames || 0 }; }
  function reference(step) {
    var key = step.id + ":" + (step.solution || step.code || "").length;
    if (!refCache[key]) refCache[key] = Runner.render(step.solution || step.code, opts(step));
    return refCache[key];
  }
  var OPS = { ">=": function (a, b) { return a >= b; }, ">": function (a, b) { return a > b; }, "<=": function (a, b) { return a <= b; },
    "<": function (a, b) { return a < b; }, "==": function (a, b) { return a === b; }, "=": function (a, b) { return a === b; } };
  function callReq(calls, spec) { // {"glPushMatrix": ">=2", "glBegin": 0 ("не использовать")}
    var problems = [];
    Object.keys(spec || {}).forEach(function (name) {
      var r = spec[name], n = 0;
      name.split("|").forEach(function (nm) { n += calls[nm] || 0; });
      var label = name.split("|").join(" или ");
      if (typeof r === "number") { if (r === 0 && n > 0) problems.push("в этом задании не используйте " + label); else if (r > 0 && n < r) problems.push("нужно вызвать " + label + (r > 1 ? " не менее " + r + " раз за кадр" : "")); return; }
      var m = /^(>=|<=|==|=|>|<)\s*(\d+)$/.exec(String(r));
      if (m && !OPS[m[1]](n, +m[2])) problems.push(label + ": сейчас вызовов за кадр — " + n + ", требуется " + m[1] + " " + m[2]);
    });
    return problems;
  }
  function srcReq(code, spec) { // требования к тексту программы (регулярные выражения)
    var problems = [];
    (spec || []).forEach(function (r) { var re = new RegExp(r.re, r.flags || ""); var has = re.test(code); if (r.not ? has : !has) problems.push(r.msg); });
    return problems;
  }
  // проверка: возвращает {ok, msg, details[], diff, ref, stu}
  LAB.check = function (step, code) {
    var c = step.check || { type: "image" };
    return Promise.all([Runner.render(code, opts(step)), c.type === "free" || c.type === "calls" ? Promise.resolve(null) : reference(step)]).then(function (rr) {
      var stu = rr[0], ref = rr[1];
      if (!stu.ok) return { ok: false, msg: "Программа не выполнилась: " + (stu.error ? stu.error.msg : "ошибка"), line: stu.error && stu.error.line, stu: stu };
      if (!c.allowBlank && Runner.blank(stu.pixels)) return { ok: false, msg: "Окно залито одним цветом — ничего не нарисовано. Проверьте glBegin/glEnd, матрицы и glutSwapBuffers().", stu: stu };
      var probs = callReq(stu.calls || {}, c.calls).concat(srcReq(code, c.source));
      if (c.type === "image" || c.type === "both" || !c.type) {
        if (!ref || !ref.ok) return { ok: false, msg: "Эталонное решение не построено — сообщите преподавателю.", stu: stu };
        var cmp = Runner.compare(stu.pixels, ref.pixels, c.tol || 48);
        var limit = c.maxDiff !== undefined ? c.maxDiff : 0.012;
        if (cmp.reason) probs.unshift(cmp.reason);
        else if (cmp.diff > limit) probs.unshift("изображение отличается от ожидаемого: " + (cmp.diff * 100).toFixed(1) + "% пикселей (допускается " + (limit * 100).toFixed(1) + "%)");
        if (probs.length) return { ok: false, msg: "Пока не совпадает.", details: probs, diff: cmp.diff, ref: ref, stu: stu };
        return { ok: true, msg: "Верно! Результат совпадает с ожидаемым.", diff: cmp.diff, ref: ref, stu: stu };
      }
      if (c.type === "custom" && typeof step.verify === "function") {
        var v = step.verify({ calls: stu.calls || {}, info: stu.info, pixels: stu.pixels, logs: stu.logs, code: code });
        if (v !== true) probs.push(typeof v === "string" ? v : "условие задания не выполнено");
      }
      if (probs.length) return { ok: false, msg: "Пока не выполнено.", details: probs, stu: stu };
      return { ok: true, msg: c.type === "free" ? "Программа работает. Сравните результат с описанием задания и отметьте шаг." : "Верно! Требования задания выполнены.", stu: stu };
    });
  };
  LAB.reference = reference;
  LAB.renderOpts = opts;
})(window);
