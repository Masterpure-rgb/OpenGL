/* HOME — главная: живое окно OpenGL с программой, список тем модуля, порядок работы, авторы. */
(function () {
  "use strict";
  var O = window.OGL, el = O.el, K = GL1.K;
  var DOC = "metodichka/OpenGL_metodicheskie_ukazaniya_2026.docx";
  O.header("home");
  var DEMO = [
    "#include <GL/glut.h>",
    "",
    "float angle = 0;",
    "",
    "void display() {",
    "    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);",
    "    glLoadIdentity();",
    "    gluLookAt(0, 2.2, 5.5,  0, 0.4, 0,  0, 1, 0);",
    "    GLfloat light[] = { 2.5f, 4.0f, 2.0f, 1.0f };",
    "    glLightfv(GL_LIGHT0, GL_POSITION, light);",
    "    // пол",
    "    glDisable(GL_LIGHTING);",
    "    glBegin(GL_QUADS);",
    "    for (int i = -4; i < 4; i++)",
    "        for (int j = -4; j < 4; j++) {",
    "            if ((i + j) % 2) glColor3f(0.86f, 0.87f, 0.9f); else glColor3f(0.74f, 0.76f, 0.8f);",
    "            glVertex3f(i, 0, j); glVertex3f(i, 0, j + 1); glVertex3f(i + 1, 0, j + 1); glVertex3f(i + 1, 0, j);",
    "        }",
    "    glEnd();",
    "    // тень: проекция на плоскость y = 0",
    "    GLfloat s[16] = { light[1],0,0,0,  -light[0],0,-light[2],-1,  0,0,light[1],0,  0,0,0,light[1] };",
    "    glEnable(GL_BLEND); glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);",
    "    glEnable(GL_STENCIL_TEST);                 // каждый пиксель тени — один раз",
    "    glStencilFunc(GL_EQUAL, 0, 0xFF); glStencilOp(GL_KEEP, GL_KEEP, GL_INCR);",
    "    glEnable(GL_POLYGON_OFFSET_FILL); glPolygonOffset(-1, -1);",
    "    glColor4f(0.1f, 0.1f, 0.15f, 0.35f);",
    "    glPushMatrix(); glMultMatrixf(s); glTranslatef(0, 0.75f, 0); glRotatef(angle, 0, 1, 0); glutSolidTeapot(0.7); glPopMatrix();",
    "    glDisable(GL_POLYGON_OFFSET_FILL); glDisable(GL_STENCIL_TEST); glDisable(GL_BLEND);",
    "    // чайник",
    "    glEnable(GL_LIGHTING);",
    "    GLfloat red[] = { 0.76f, 0.12f, 0.2f, 1 }, white[] = { 1, 1, 1, 1 };",
    "    glMaterialfv(GL_FRONT, GL_AMBIENT_AND_DIFFUSE, red);",
    "    glMaterialfv(GL_FRONT, GL_SPECULAR, white);",
    "    glMaterialf(GL_FRONT, GL_SHININESS, 64);",
    "    glPushMatrix(); glTranslatef(0, 0.75f, 0); glRotatef(angle, 0, 1, 0); glutSolidTeapot(0.7); glPopMatrix();",
    "    glutSwapBuffers();",
    "}",
    "",
    "void idle() { angle = glutGet(GLUT_ELAPSED_TIME) * 0.03f; glutPostRedisplay(); }",
    "",
    "void reshape(int w, int h) {",
    "    glViewport(0, 0, w, h);",
    "    glMatrixMode(GL_PROJECTION); glLoadIdentity();",
    "    gluPerspective(40, (double)w / h, 0.5, 50);",
    "    glMatrixMode(GL_MODELVIEW);",
    "}",
    "",
    "int main(int argc, char** argv) {",
    "    glutInit(&argc, argv);",
    "    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL | GLUT_MULTISAMPLE);",
    "    glutInitWindowSize(560, 400);",
    "    glutCreateWindow(\"Чайник Юта\");",
    "    glEnable(GL_DEPTH_TEST); glEnable(GL_LIGHTING); glEnable(GL_LIGHT0); glEnable(GL_NORMALIZE);",
    "    glClearColor(0.13f, 0.15f, 0.19f, 1);",
    "    glutDisplayFunc(display); glutReshapeFunc(reshape); glutIdleFunc(idle);",
    "    glutMainLoop();",
    "}"
  ].join("\n");

  var main = el("main", { class: "home" }); document.body.appendChild(main);
  var winHost = el("div", { class: "win-body" });
  var chips = el("div", { class: "chips" });
  var CH = [["GL_DEPTH_TEST", "глубина"], ["GL_LIGHTING", "освещение"], ["GL_LIGHT0", "LIGHT0"], ["GL_NORMALIZE", "нормализация"], ["GL_BLEND", "смешивание"], ["GL_POLYGON_OFFSET_FILL", "смещение полигонов"], ["GL_STENCIL_TEST", "трафарет"], ["GL_TEXTURE_2D", "текстура"]];
  var chipEls = CH.map(function (c) { var x = el("span", { class: "chip", title: c[0] }, c[1]); chips.appendChild(x); return x; });
  var fps = el("span", { class: "wm" });
  var hero = el("section", { class: "hero" },
    el("div", { class: "hero-t" },
      el("p", { class: "kicker" }, "Ташкентский университет информационных технологий имени Мухаммада аль-Хорезми"),
      el("h1", null, "Компьютерная графика", el("span", null, "Модуль 2. Графическая библиотека OpenGL")),
      el("p", { class: "lead" }, "Методические указания к лекциям, практическим занятиям и СРСП. Каждая тема — короткое объяснение, лаборатория с кодом на C++, который работает прямо в браузере, и индивидуальные задания со сдачей через GitHub."),
      el("div", { class: "cta" }, el("a", { class: "btn run", href: O.link("l/11/") }, "Начать с темы 11"), el("a", { class: "btn ghost", href: O.link("sandbox/") }, "Открыть песочницу"),
        el("a", { class: "btn ghost doc-dl", href: O.link(DOC), download: "" }, "Методичка (Word)")),
      el("p", { class: "muted small" }, "В окне — работающая программа на OpenGL 1.x и GLUT. Фишки под окном обновляются в каждом кадре и показывают, какие возможности OpenGL сейчас включены.")),
    el("figure", { class: "hero-w" },
      el("div", { class: "win" }, el("div", { class: "win-bar" }, el("span", { class: "wt" }, "Чайник Юта"), fps), winHost),
      chips,
      el("figcaption", null, el("a", { href: O.link("sandbox/?demo=1") }, "Открыть код этой программы в песочнице"))));
  main.appendChild(hero);
  var handle = null;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function runDemo() {
    var code = reduce ? DEMO.replace("glutIdleFunc(idle);", "") : DEMO;
    Runner.run({ code: code, host: winHost, noImages: true, onFrame: function (info) {
      var on = {}; info.caps.forEach(function (c) { on[c] = 1; });
      CH.forEach(function (c, i) { chipEls[i].classList.toggle("on", !!on[K[c[0]]]); });
      fps.textContent = info.stats.fps ? info.stats.fps + " кадров/с" : "";
    } }).then(function (h) { handle = h; var cv = winHost.querySelector("canvas"); if (cv) cv.tabIndex = -1; });
  }
  if ("IntersectionObserver" in window) {
    var started = false; new IntersectionObserver(function (es) { if (es[0].isIntersecting && !started) { started = true; runDemo(); } }).observe(winHost);
  } else runDemo();
  O.store.set("demo", DEMO);

  // темы модуля
  var list = el("section", { class: "topics", id: "temy", "aria-label": "Темы модуля 2" }, el("h2", null, "Темы модуля"));
  function srspRow(s) {
    return el("article", { class: "trow srsp", id: "srsp" + s.n }, el("div", { class: "tn" }, el("span", null, "СРСП"), String(s.n)),
      el("div", { class: "tt" }, el("b", null, s.title), el("span", null, s.n === 5 ? "Темы 11–13, требования к проекту СРС 2" : s.n === 6 ? "Демонстрация проекта, разбор кода, вопросы" : "Экзаменационные вопросы и типовые задачи модуля")),
      el("div", { class: "tl" }, el("a", { class: "tri", href: O.link("srsp/#srsp" + s.n) }, el("b", null, "Материалы"))));
  }
  O.TOPICS.forEach(function (t) {
    var done = (O.store.get("lab" + t.n + ":done", []) || []).length;
    list.appendChild(el("article", { class: "trow", id: "t" + t.n },
      el("div", { class: "tn" }, el("span", null, "Тема"), String(t.n)),
      el("div", { class: "tt" },
        el("p", null, el("span", { class: "lbl" }, "Лекция " + t.n), t.lec),
        el("p", null, el("span", { class: "lbl" }, "Практика " + t.n), t.prac),
        done ? el("p", { class: "done" }, "Шагов лаборатории выполнено: " + done) : null),
      el("div", { class: "tl" },
        el("a", { class: "tri", href: O.link("e/" + t.n + "/") }, el("b", null, "Объяснение"), el("span", null, "аудио")),
        el("a", { class: "tri", href: O.link("l/" + t.n + "/") }, el("b", null, "Лаборатория"), el("span", null, "код и окно")),
        el("a", { class: "tri", href: O.link("z/" + t.n + "/") }, el("b", null, "Задания"), el("span", null, "варианты, сдача")))));
    O.SRSP.forEach(function (s) { if (s.after === t.n) list.appendChild(srspRow(s)); });
  });
  main.appendChild(list);

  main.appendChild(el("section", { class: "how" }, el("h2", null, "Как устроено занятие"),
    el("ol", { class: "flow" },
      el("li", null, el("b", null, "Лекция и объяснение"), el("span", null, "В методичке у каждой темы есть QR-код с двухминутным аудиообъяснением и текстом.")),
      el("li", null, el("b", null, "Лаборатория"), el("span", null, "Второй QR-код открывает пример и задания. Код C++ запускается в браузере и проверяется автоматически.")),
      el("li", null, el("b", null, "Индивидуальное задание"), el("span", null, "Вариант назначает преподаватель. Работать можно в песочнице или в Visual Studio 2022 с freeglut.")),
      el("li", null, el("b", null, "Сдача через GitHub"), el("span", null, "Кнопка «Сдать работу» заполняет форму. Посещаемость и статусы работ видны в «Моём кабинете».")))));

  main.appendChild(el("section", { class: "authors" }, el("h2", null, "Авторы"),
    el("div", { class: "au-row" },
      el("figure", { class: "au" }, el("img", { src: O.link("assets/img/authors/nuraliyev.jpg"), alt: "Ф.М. Нуралиев", loading: "lazy" }), el("figcaption", null, el("b", null, "Ф.М. Нуралиев"), el("span", null, "доктор технических наук, профессор"))),
      el("figure", { class: "au" }, el("img", { src: O.link("assets/img/authors/ibodullayev.jpg"), alt: "С.Н. Ибодуллаев", loading: "lazy", style: "object-position: 50% 24%" }), el("figcaption", null, el("b", null, "С.Н. Ибодуллаев"), el("span", null, "старший преподаватель"))))));
  O.footer();
})();
