/* SANDBOX — свободный редактор: шаблоны, сохранение черновика, сдача работы. */
(function () {
  "use strict";
  var O = window.OGL, el = O.el;
  O.header("sandbox", [{ text: "Темы", href: O.link("") }, { text: "Песочница" }]);
  var qs = new URLSearchParams(location.search), t = qs.get("t"), v = qs.get("v");
  var key = t ? "sandbox:t" + t + ":v" + (v || "") : "sandbox:last";
  var main = el("main", { class: "sandpage" }); document.body.appendChild(main);
  var head = el("div", { class: "pagehead" }, el("p", { class: "kicker" }, t ? "ЛР " + O.k(t) + (v ? ". Вариант " + v : "") : "Песочница"), el("h1", null, t ? (O.topic(t) || {}).prac || "Индивидуальное задание" : "Свободная программа на OpenGL"));
  main.appendChild(head);
  var taskP = el("p", { class: "lead sand-task" });
  if (t) head.appendChild(taskP);
  var BLANK = ["#include <GL/glut.h>", "", "void display() {", "    glClear(GL_COLOR_BUFFER_BIT);", "", "    // рисуйте здесь", "", "    glFlush();", "}", "",
    "int main(int argc, char** argv) {", "    glutInit(&argc, argv);", "    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);", "    glutInitWindowSize(480, 360);",
    "    glutCreateWindow(\"Моя программа\");", "    glClearColor(0.1f, 0.12f, 0.16f, 1.0f);", "    glutDisplayFunc(display);", "    glutMainLoop();", "    return 0;", "}", ""].join("\n");
  var BLANK3D = ["#include <GL/glut.h>", "", "float angle = 0;", "", "void display() {", "    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);", "    glLoadIdentity();",
    "    gluLookAt(0, 2, 6, 0, 0, 0, 0, 1, 0);", "    glRotatef(angle, 0, 1, 0);", "    glutSolidTeapot(1.0);", "    glutSwapBuffers();", "}", "",
    "void reshape(int w, int h) {", "    glViewport(0, 0, w, h);", "    glMatrixMode(GL_PROJECTION);", "    glLoadIdentity();", "    gluPerspective(45, (double)w / h, 0.5, 100);", "    glMatrixMode(GL_MODELVIEW);", "}", "",
    "void idle() {", "    angle = glutGet(GLUT_ELAPSED_TIME) * 0.05f;", "    glutPostRedisplay();", "}", "",
    "int main(int argc, char** argv) {", "    glutInit(&argc, argv);", "    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH);", "    glutInitWindowSize(480, 360);",
    "    glutCreateWindow(\"3D-сцена\");", "    glEnable(GL_DEPTH_TEST);", "    glEnable(GL_LIGHTING);", "    glEnable(GL_LIGHT0);", "    glutDisplayFunc(display);", "    glutReshapeFunc(reshape);", "    glutIdleFunc(idle);", "    glutMainLoop();", "    return 0;", "}", ""].join("\n");
  var ideHost = el("div", { class: "sand" });
  var tpl = el("select", { "aria-label": "Шаблон" }, el("option", { value: "" }, "Шаблон…"), el("option", { value: "2d" }, "Пустая 2D-программа"), el("option", { value: "3d" }, "3D-сцена с освещением"),
    O.TOPICS.map(function (x) { return el("option", { value: "lab" + x.n }, "Пример ЛР " + x.k); }));
  var bar = el("div", { class: "sand-bar" }, tpl,
    el("button", { class: "btn run", type: "button", onclick: function () { Submit.open({ work: t ? "SZ" + t : "SRS2", variant: v || "", code: ide.editor.get() }); } }, "Сдать работу"));
  main.appendChild(el("div", { class: "sand-wrap" }, bar, ideHost));
  var ide = new IDE(ideHost, { fileName: t ? "sz" + t + (v ? "_v" + v : "") : "program", onSave: function (c) { O.store.set(key, c); }, onReset: function () { if (confirm("Вернуть шаблон? Текущий код будет заменён.")) { ide.editor.set(startCode); ide.run(); } } });
  var startCode = BLANK;
  function exampleOf(n) { return O.loadScript("assets/js/labs/lab" + n + ".js?v=" + (O.CFG.v || 1)).then(function () { var s = LAB.data.steps.filter(function (x) { return x.kind === "example"; })[0] || LAB.data.steps[0]; return s.code || s.starter; }); }
  tpl.addEventListener("change", function () {
    var val = tpl.value; tpl.value = ""; if (!val) return;
    if (ide.editor.get().trim() && !confirm("Заменить текущий код шаблоном?")) return;
    var p = val === "2d" ? Promise.resolve(BLANK) : val === "3d" ? Promise.resolve(BLANK3D) : exampleOf(val.slice(3));
    p.then(function (c) { ide.editor.set(c); ide.run({ manual: true }); });
  });
  var saved = O.store.get(key, null), handoff = null;
  try { handoff = sessionStorage.getItem("ogl:open"); if (handoff) sessionStorage.removeItem("ogl:open"); } catch (e) {}
  var first;
  if (handoff) first = Promise.resolve(handoff);
  else if (qs.get("demo")) first = Promise.resolve(O.store.get("demo", BLANK3D));
  else if (saved) first = Promise.resolve(saved);
  else if (t) first = exampleOf(t).then(function (c) { return c; }, function () { return BLANK; });
  else first = Promise.resolve(BLANK);
  if (t) O.fetchJSON("data/topics/" + t + ".json").then(function (D) {
    var V = (D.practice.variants || []).filter(function (x) { return String(x.n) === String(v); })[0];
    if (V) taskP.textContent = V.text; else taskP.remove();
    if (!saved && V) first.then(function (c) { if (ide.editor.get() === c) { ide.editor.set("// СЗ " + t + ", вариант " + v + ":\n// " + V.text.replace(/(.{1,90})(\s|$)/g, "$1\n// ").replace(/\n\/\/ $/, "") + "\n\n" + c); } });
  }, function () { taskP.remove(); });
  first.then(function (c) { startCode = c; ide.editor.set(c); ide.run(); });
  O.footer();
})();
