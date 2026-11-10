/* Лабораторная 15. Организация приложения. Оптимизация вызовов OpenGL. */
(function () {
  var INC = "#include <GL/glut.h>\n#include <cmath>\n#include <stdio.h>\n\n";

  /* ---------- общая часть всех программ: состояние, текст, reshape, idle, FPS, main ---------- */
  function stateStruct(extra) {
    return "// Состояние сцены: всё, что меняется во времени, хранится в одном месте\n" +
      "struct State {\n" +
      "    float angle;      // угол поворота, градусы\n" +
      "    float speed;      // скорость поворота, градусов в секунду\n" +
      "    int   paused;     // 1 - анимация остановлена\n" +
      "    int   lastTime;   // время предыдущего вызова idle, мс\n" +
      "    int   w, h;       // размеры окна\n" +
      "    int   frames;     // кадров с момента последнего пересчёта FPS\n" +
      "    int   fpsTime;    // момент последнего пересчёта FPS, мс\n" +
      "    int   accMs;      // суммарное время вызовов отрисовки за интервал, мс\n" +
      "    float fps;        // кадров в секунду\n" +
      "    float ms;         // среднее время отрисовки кадра, мс\n" + (extra || "") +
      "};\nState S;\n\n";
  }
  var COMMON_FUNCS =
    "// Вывод строки в экранных координатах (пикселях) поверх сцены\n" +
    "void drawText(int x, int y, const char* s) {\n" +
    "    glPushAttrib(GL_ENABLE_BIT);              // запомнить флаги включения, чтобы вернуть их после текста\n" +
    "    glDisable(GL_LIGHTING); glDisable(GL_DEPTH_TEST); glDisable(GL_FOG); glDisable(GL_TEXTURE_2D);\n" +
    "    glMatrixMode(GL_PROJECTION); glPushMatrix(); glLoadIdentity(); gluOrtho2D(0, S.w, 0, S.h);\n" +
    "    glMatrixMode(GL_MODELVIEW);  glPushMatrix(); glLoadIdentity();\n" +
    "    glColor3f(1.0f, 1.0f, 0.6f);\n" +
    "    glRasterPos2i(x, y);\n" +
    "    for (const char* c = s; *c; c++) glutBitmapCharacter(GLUT_BITMAP_9_BY_15, *c);\n" +
    "    glPopMatrix();\n" +
    "    glMatrixMode(GL_PROJECTION); glPopMatrix(); glMatrixMode(GL_MODELVIEW);\n" +
    "    glPopAttrib();\n" +
    "}\n\n" +
    "void reshape(int w, int h) {\n" +
    "    S.w = w; S.h = (h > 0) ? h : 1;\n" +
    "    glViewport(0, 0, S.w, S.h);\n" +
    "}\n\n" +
    "// Анимация не зависит от частоты кадров: угол растёт на скорость * dt\n" +
    "void idle() {\n" +
    "    int now = glutGet(GLUT_ELAPSED_TIME);\n" +
    "    float dt = (now - S.lastTime) / 1000.0f;\n" +
    "    S.lastTime = now;\n" +
    "    if (!S.paused) S.angle += S.speed * dt;\n" +
    "    glutPostRedisplay();\n" +
    "}\n\n" +
    "// Раз в полсекунды пересчитываем FPS и среднее время отрисовки\n" +
    "void updateFps() {\n" +
    "    S.frames++;\n" +
    "    int now = glutGet(GLUT_ELAPSED_TIME);\n" +
    "    if (now - S.fpsTime >= 500) {\n" +
    "        S.fps = S.frames * 1000.0f / (now - S.fpsTime);\n" +
    "        S.ms = (float)S.accMs / S.frames;\n" +
    "        S.frames = 0; S.accMs = 0; S.fpsTime = now;\n" +
    "    }\n" +
    "}\n\n";
  function mainFn(title, extraReg) {
    return "int main(int argc, char** argv) {\n" +
      "    glutInit(&argc, argv);\n" +
      "    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH);\n" +
      "    glutInitWindowSize(480, 360);\n" +
      "    glutCreateWindow(\"" + title + "\");\n" +
      "    init();\n" +
      "    glutDisplayFunc(display);\n" +
      "    glutReshapeFunc(reshape);\n" +
      "    glutIdleFunc(idle);\n" +
      "    glutKeyboardFunc(keyboard);\n" + (extraReg || "") +
      "    glutMainLoop();\n" +
      "    return 0;\n}\n";
  }
  var STATE_INIT =
    "    S.angle = 0; S.speed = 25; S.paused = 0;\n" +
    "    S.lastTime = glutGet(GLUT_ELAPSED_TIME);\n" +
    "    S.fpsTime = S.lastTime; S.frames = 0; S.accMs = 0; S.fps = 0; S.ms = 0;\n" +
    "    S.w = 480; S.h = 360;\n";

  /* ---------- сцена «поверхность из N x N квадов» ---------- */
  var TERRAIN =
    "#define N 40          // сетка N x N квадов (1600 четырёхугольников)\n" +
    "#define SIZE 4.0f     // сторона сетки\n\n" +
    "// ---- Данные сцены: описывают поверхность и не зависят от способа рисования ----\n" +
    "int DI[4] = {0, 0, 1, 1};   // смещения углов квада по i\n" +
    "int DJ[4] = {0, 1, 1, 0};   // смещения углов квада по j (обход против часовой)\n\n" +
    "float nodeX(int i) { return -SIZE / 2 + SIZE * i / N; }\n" +
    "float height(float x, float z) { return 0.30f * sinf(2.2f * x) * cosf(2.2f * z); }\n\n" +
    "// Положение p, нормаль n и цвет c узла сетки (i, j)\n" +
    "void nodeData(int i, int j, float* p, float* n, float* c) {\n" +
    "    float x = nodeX(i), z = nodeX(j);\n" +
    "    float h = height(x, z);\n" +
    "    float t = (h + 0.3f) / 0.6f;                   // 0..1 по высоте\n" +
    "    p[0] = x; p[1] = h; p[2] = z;\n" +
    "    n[0] = -0.66f * cosf(2.2f * x) * cosf(2.2f * z);   // -dh/dx\n" +
    "    n[1] = 1.0f;\n" +
    "    n[2] =  0.66f * sinf(2.2f * x) * sinf(2.2f * z);   // -dh/dz\n" +
    "    c[0] = 0.15f + 0.75f * t; c[1] = 0.45f + 0.35f * t; c[2] = 0.85f - 0.75f * t;\n" +
    "}\n\n";
  var TERRAIN_SCENE =
    "void setupScene() {\n" +
    "    glMatrixMode(GL_PROJECTION); glLoadIdentity();\n" +
    "    gluPerspective(45.0, (double)S.w / S.h, 0.5, 60.0);\n" +
    "    glMatrixMode(GL_MODELVIEW); glLoadIdentity();\n" +
    "    gluLookAt(0.0, 3.0, 4.8,  0.0, 0.0, 0.0,  0.0, 1.0, 0.0);\n" +
    "    GLfloat pos[] = { 2.0f, 5.0f, 3.0f, 0.0f };\n" +
    "    glLightfv(GL_LIGHT0, GL_POSITION, pos);\n" +
    "    glRotatef(S.angle, 0.0f, 1.0f, 0.0f);\n" +
    "}\n\n" +
    "void initCommon() {\n" +
    "    glClearColor(0.08f, 0.10f, 0.16f, 1.0f);\n" +
    "    glEnable(GL_DEPTH_TEST);\n" +
    "    glEnable(GL_LIGHTING); glEnable(GL_LIGHT0);\n" +
    "    glEnable(GL_COLOR_MATERIAL);\n" +
    "    glEnable(GL_NORMALIZE);\n" + STATE_INIT +
    "}\n\n";
  var TERRAIN_KBD =
    "void keyboard(unsigned char key, int x, int y) {\n" +
    "    if (key == 'p') S.paused = !S.paused;\n" +
    "    if (key == '+') S.speed += 10;\n" +
    "    if (key == '-') S.speed -= 10;\n" +
    "}\n\n";
  var TERRAIN_HUD = function (extra) {
    return "    char buf[96];\n" +
      "    sprintf(buf, \"FPS: %.0f   quads: %d\", S.fps, N * N);\n" +
      "    drawText(10, S.h - 22, buf);\n" + (extra || "");
  };

  /* --- способы рисования --- */
  var P_IMM =
    "// Способ 0. Немедленный режим: 4 * N * N вызовов glVertex за кадр\n" +
    "void drawImmediate() {\n" +
    "    float p[3], n[3], c[3];\n" +
    "    glBegin(GL_QUADS);\n" +
    "    for (int i = 0; i < N; i++)\n" +
    "        for (int j = 0; j < N; j++)\n" +
    "            for (int k = 0; k < 4; k++) {\n" +
    "                nodeData(i + DI[k], j + DJ[k], p, n, c);\n" +
    "                glColor3fv(c); glNormal3fv(n); glVertex3fv(p);\n" +
    "            }\n" +
    "    glEnd();\n" +
    "}\n\n";
  var P_LIST =
    "// Способ 1. Дисплейный список: геометрия записывается один раз\n" +
    "GLuint terrainList;\n\n" +
    "void buildList() {\n" +
    "    terrainList = glGenLists(1);\n" +
    "    glNewList(terrainList, GL_COMPILE);\n" +
    "        drawImmediate();\n" +
    "    glEndList();\n" +
    "}\n\n";
  var P_ARR =
    "// Способ 2. Массивы вершин: по 4 вершины на каждый квад\n" +
    "#define AV (N * N * 4)\n" +
    "GLfloat aPos[AV * 3], aNrm[AV * 3], aCol[AV * 3];\n\n" +
    "void buildArrays() {\n" +
    "    float p[3], n[3], c[3];\n" +
    "    int v = 0;\n" +
    "    for (int i = 0; i < N; i++)\n" +
    "        for (int j = 0; j < N; j++)\n" +
    "            for (int k = 0; k < 4; k++) {\n" +
    "                nodeData(i + DI[k], j + DJ[k], p, n, c);\n" +
    "                for (int m = 0; m < 3; m++) { aPos[v*3+m] = p[m]; aNrm[v*3+m] = n[m]; aCol[v*3+m] = c[m]; }\n" +
    "                v++;\n" +
    "            }\n" +
    "}\n\n" +
    "void drawArrays() {\n" +
    "    glEnableClientState(GL_VERTEX_ARRAY);\n" +
    "    glEnableClientState(GL_NORMAL_ARRAY);\n" +
    "    glEnableClientState(GL_COLOR_ARRAY);\n" +
    "    glVertexPointer(3, GL_FLOAT, 0, aPos);\n" +
    "    glNormalPointer(GL_FLOAT, 0, aNrm);\n" +
    "    glColorPointer(3, GL_FLOAT, 0, aCol);\n" +
    "    glDrawArrays(GL_QUADS, 0, AV);\n" +
    "    glDisableClientState(GL_COLOR_ARRAY);\n" +
    "    glDisableClientState(GL_NORMAL_ARRAY);\n" +
    "    glDisableClientState(GL_VERTEX_ARRAY);\n" +
    "}\n\n";
  var P_ELEM =
    "// Способ 3. Индексированные массивы: (N+1)^2 вершин, общие для соседних квадов\n" +
    "#define EV ((N + 1) * (N + 1))\n" +
    "GLfloat ePos[EV * 3], eNrm[EV * 3], eCol[EV * 3];\n" +
    "GLuint  eIdx[N * N * 4];\n\n" +
    "void buildElements() {\n" +
    "    float p[3], n[3], c[3];\n" +
    "    for (int i = 0; i <= N; i++)\n" +
    "        for (int j = 0; j <= N; j++) {\n" +
    "            int v = i * (N + 1) + j;\n" +
    "            nodeData(i, j, p, n, c);\n" +
    "            for (int m = 0; m < 3; m++) { ePos[v*3+m] = p[m]; eNrm[v*3+m] = n[m]; eCol[v*3+m] = c[m]; }\n" +
    "        }\n" +
    "    int q = 0;\n" +
    "    for (int i = 0; i < N; i++)\n" +
    "        for (int j = 0; j < N; j++)\n" +
    "            for (int k = 0; k < 4; k++)\n" +
    "                eIdx[q++] = (i + DI[k]) * (N + 1) + (j + DJ[k]);\n" +
    "}\n\n" +
    "void drawElements() {\n" +
    "    glEnableClientState(GL_VERTEX_ARRAY);\n" +
    "    glEnableClientState(GL_NORMAL_ARRAY);\n" +
    "    glEnableClientState(GL_COLOR_ARRAY);\n" +
    "    glVertexPointer(3, GL_FLOAT, 0, ePos);\n" +
    "    glNormalPointer(GL_FLOAT, 0, eNrm);\n" +
    "    glColorPointer(3, GL_FLOAT, 0, eCol);\n" +
    "    glDrawElements(GL_QUADS, N * N * 4, GL_UNSIGNED_INT, eIdx);\n" +
    "    glDisableClientState(GL_COLOR_ARRAY);\n" +
    "    glDisableClientState(GL_NORMAL_ARRAY);\n" +
    "    glDisableClientState(GL_VERTEX_ARRAY);\n" +
    "}\n\n";
  var VBO_FILL =
    "// Чередующийся массив: на вершину 9 float = x y z | nx ny nz | r g b\n" +
    "#define EV ((N + 1) * (N + 1))\n" +
    "#define STRIDE (9 * sizeof(GLfloat))\n" +
    "GLfloat vbV[EV * 9];\n" +
    "GLuint  vbI[N * N * 4];\n" +
    "GLuint  vbo[2];             // vbo[0] - вершины, vbo[1] - индексы\n\n" +
    "void fillMesh() {\n" +
    "    float p[3], n[3], c[3];\n" +
    "    for (int i = 0; i <= N; i++)\n" +
    "        for (int j = 0; j <= N; j++) {\n" +
    "            int o = (i * (N + 1) + j) * 9;\n" +
    "            nodeData(i, j, p, n, c);\n" +
    "            for (int m = 0; m < 3; m++) { vbV[o+m] = p[m]; vbV[o+3+m] = n[m]; vbV[o+6+m] = c[m]; }\n" +
    "        }\n" +
    "    int q = 0;\n" +
    "    for (int i = 0; i < N; i++)\n" +
    "        for (int j = 0; j < N; j++)\n" +
    "            for (int k = 0; k < 4; k++)\n" +
    "                vbI[q++] = (i + DI[k]) * (N + 1) + (j + DJ[k]);\n" +
    "}\n\n";
  var VBO_BUILD =
    "// Загрузка данных в память видеокарты: один раз при инициализации\n" +
    "void buildVBO() {\n" +
    "    fillMesh();\n" +
    "    glGenBuffers(2, vbo);\n" +
    "    glBindBuffer(GL_ARRAY_BUFFER, vbo[0]);\n" +
    "    glBufferData(GL_ARRAY_BUFFER, sizeof(vbV), vbV, GL_STATIC_DRAW);\n" +
    "    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, vbo[1]);\n" +
    "    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(vbI), vbI, GL_STATIC_DRAW);\n" +
    "    glBindBuffer(GL_ARRAY_BUFFER, 0);\n" +
    "    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);\n" +
    "}\n\n";
  var VBO_DRAW =
    "// Способ 4. VBO: в glXxxPointer передаются смещения в байтах внутри буфера\n" +
    "void drawVBO() {\n" +
    "    glBindBuffer(GL_ARRAY_BUFFER, vbo[0]);\n" +
    "    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, vbo[1]);\n" +
    "    glEnableClientState(GL_VERTEX_ARRAY);\n" +
    "    glEnableClientState(GL_NORMAL_ARRAY);\n" +
    "    glEnableClientState(GL_COLOR_ARRAY);\n" +
    "    glVertexPointer(3, GL_FLOAT, STRIDE, (void*)0);\n" +
    "    glNormalPointer(GL_FLOAT, STRIDE, (void*)(3 * sizeof(GLfloat)));\n" +
    "    glColorPointer(3, GL_FLOAT, STRIDE, (void*)(6 * sizeof(GLfloat)));\n" +
    "    glDrawElements(GL_QUADS, N * N * 4, GL_UNSIGNED_INT, (void*)0);\n" +
    "    glDisableClientState(GL_COLOR_ARRAY);\n" +
    "    glDisableClientState(GL_NORMAL_ARRAY);\n" +
    "    glDisableClientState(GL_VERTEX_ARRAY);\n" +
    "    glBindBuffer(GL_ARRAY_BUFFER, 0);\n" +
    "    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);\n" +
    "}\n\n";
  var VBO_ALL = VBO_FILL + VBO_BUILD + VBO_DRAW;

  // собирает программу для сцены «поверхность»
  function terrainProg(o) {
    return INC + TERRAIN + stateStruct(o.fields) + (o.funcs || "") + COMMON_FUNCS + TERRAIN_SCENE +
      (o.initFn || "void init() {\n    initCommon();\n}\n\n") +
      (o.kbd || TERRAIN_KBD) +
      "void display() {\n" + (o.pre || "") +
      "    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);\n" +
      "    setupScene();\n" + o.draw + (o.post || "") +
      "    updateFps();\n" + (o.hud || TERRAIN_HUD()) +
      "    glutSwapBuffers();\n}\n\n" + mainFn(o.title);
  }

  /* =====================================================================
     Сцена «лес из сфер» для шагов 7-8: отсечение и уровни детализации
     ===================================================================== */
  var FOREST_DEFS =
    "#define GRID 31          // сетка GRID x GRID = 961 сфера\n" +
    "#define STEP 2.0f        // расстояние между центрами сфер\n" +
    "#define RAD  0.6f        // радиус сферы\n" +
    "#define FOVY  60.0       // вертикальный угол обзора, градусы\n" +
    "#define ZNEAR 0.5\n" +
    "#define ZFAR  30.0\n\n";
  var FOREST_FIELDS =
    "    float cH, sH;     // косинус и синус половины горизонтального угла обзора\n" +
    "    float cV, sV;     // то же для вертикального угла\n" +
    "    int   visible;    // сколько сфер нарисовано в последнем кадре\n";
  var FOREST_CAM =
    "// Камера в точке (0; 3; 0), наклонена вниз на 15°, поворачивается на угол S.angle.\n" +
    "// Заодно считаем косинусы и синусы половин углов обзора для проверки по пирамиде видимости\n" +
    "void setupCamera() {\n" +
    "    float aspect = (float)S.w / S.h;\n" +
    "    float tv = tanf(FOVY * M_PI / 360.0f);          // tg(fovy / 2)\n" +
    "    float th = tv * aspect;                          // tg(половины горизонтального угла)\n" +
    "    S.cV = 1.0f / sqrtf(1.0f + tv * tv); S.sV = tv * S.cV;\n" +
    "    S.cH = 1.0f / sqrtf(1.0f + th * th); S.sH = th * S.cH;\n" +
    "    glMatrixMode(GL_PROJECTION); glLoadIdentity();\n" +
    "    gluPerspective(FOVY, aspect, ZNEAR, ZFAR);\n" +
    "    glMatrixMode(GL_MODELVIEW); glLoadIdentity();\n" +
    "    glRotatef(15.0f, 1.0f, 0.0f, 0.0f);              // наклон взгляда вниз\n" +
    "    glRotatef(S.angle, 0.0f, 1.0f, 0.0f);\n" +
    "    glTranslatef(0.0f, -3.0f, 0.0f);\n" +
    "    GLfloat pos[] = { 0.4f, 1.0f, 0.6f, 0.0f };\n" +
    "    glLightfv(GL_LIGHT0, GL_POSITION, pos);\n" +
    "}\n\n";
  var FOREST_FLOOR =
    "void drawFloor() {\n" +
    "    glColor3f(0.22f, 0.40f, 0.22f);\n" +
    "    glNormal3f(0, 1, 0);\n" +
    "    glBegin(GL_QUADS);\n" +
    "        glVertex3f(-40, 0, -40); glVertex3f(-40, 0, 40);\n" +
    "        glVertex3f( 40, 0,  40); glVertex3f( 40, 0, -40);\n" +
    "    glEnd();\n" +
    "}\n\n";
  var FOREST_INIT = function (body) {
    return "void init() {\n" +
      "    glClearColor(0.35f, 0.45f, 0.60f, 1.0f);\n" +
      "    glEnable(GL_DEPTH_TEST);\n" +
      "    glEnable(GL_LIGHTING); glEnable(GL_LIGHT0);\n" +
      "    glEnable(GL_COLOR_MATERIAL);\n" +
      "    glEnable(GL_NORMALIZE);\n" +
      "    glEnable(GL_FOG);                       // туман скрывает дальнюю границу\n" +
      "    GLfloat fc[] = { 0.35f, 0.45f, 0.60f, 1.0f };\n" +
      "    glFogfv(GL_FOG_COLOR, fc);\n" +
      "    glFogi(GL_FOG_MODE, GL_LINEAR);\n" +
      "    glFogf(GL_FOG_START, 8.0f); glFogf(GL_FOG_END, 28.0f);\n" + STATE_INIT + body +
      "}\n\n";
  };
  var FOREST_KBD =
    "void keyboard(unsigned char key, int x, int y) {\n" +
    "    if (key == 'p') S.paused = !S.paused;\n" +
    "}\n\n";
  // проверка сферы по пирамиде видимости: решение и заготовка
  var VIS_SOL =
    "// Центр сферы в системе координат наблюдателя: матрица m хранится по столбцам\n" +
    "void toEye(float* m, float x, float y, float z, float* e) {\n" +
    "    e[0] = m[0] * x + m[4] * y + m[8]  * z + m[12];\n" +
    "    e[1] = m[1] * x + m[5] * y + m[9]  * z + m[13];\n" +
    "    e[2] = m[2] * x + m[6] * y + m[10] * z + m[14];\n" +
    "}\n\n" +
    "// 1, если сфера радиуса r с центром e (система наблюдателя) может быть видна.\n" +
    "// Плоскость пирамиды проходит через начало координат; расстояние от центра до неё\n" +
    "// меньше -r только если сфера целиком по внешнюю сторону плоскости.\n" +
    "int sphereVisible(float* e, float r) {\n" +
    "    float d = -e[2];                                  // глубина перед камерой\n" +
    "    if (d + r < ZNEAR || d - r > ZFAR) return 0;       // ближняя и дальняя плоскости\n" +
    "    if ( e[0] * S.cH + d * S.sH < -r) return 0;        // левая\n" +
    "    if (-e[0] * S.cH + d * S.sH < -r) return 0;        // правая\n" +
    "    if ( e[1] * S.cV + d * S.sV < -r) return 0;        // нижняя\n" +
    "    if (-e[1] * S.cV + d * S.sV < -r) return 0;        // верхняя\n" +
    "    return 1;\n" +
    "}\n\n";
  var VIS_TODO =
    "// Центр сферы в системе координат наблюдателя: матрица m хранится по столбцам\n" +
    "void toEye(float* m, float x, float y, float z, float* e) {\n" +
    "    e[0] = m[0] * x + m[4] * y + m[8]  * z + m[12];\n" +
    "    e[1] = m[1] * x + m[5] * y + m[9]  * z + m[13];\n" +
    "    e[2] = m[2] * x + m[6] * y + m[10] * z + m[14];\n" +
    "}\n\n" +
    "// 1, если сфера радиуса r с центром e (система наблюдателя) может быть видна.\n" +
    "int sphereVisible(float* e, float r) {\n" +
    "    float d = -e[2];                                  // глубина перед камерой\n" +
    "    // TODO: вернуть 0, если сфера целиком вне ближней или дальней плоскости\n" +
    "    //       (d + r < ZNEAR или d - r > ZFAR)\n" +
    "    // TODO: то же для левой, правой, нижней и верхней плоскостей:\n" +
    "    //       e[0] * S.cH + d * S.sH < -r  - левая плоскость, и т. д.\n" +
    "    return 1;\n" +
    "}\n\n";

  /* ===================================================================== */
  var STEPS = [];

  /* ---------------- Пример ---------------- */
  STEPS.push({
    id: "s0", kind: "example", title: "Пример: каркас приложения и счётчик FPS",
    text: "<p>Программа выводит сетку из 40×40 квадов, окрашенную по высоте. Рисование намеренно «наивное» — немедленный режим, " +
      "каждая вершина вычисляется заново в каждом кадре. Рассмотрите организацию кода:</p>" +
      "<ul><li><b>State</b> — единственное место, где хранится изменяющееся состояние (угол, время, счётчики кадров);</li>" +
      "<li><b>nodeData</b> и <b>height</b> — данные сцены, не зависящие от способа рисования;</li>" +
      "<li><b>init / reshape / idle / keyboard / display</b> — обработчики событий; <code>idle</code> считает <code>dt</code> по <code>glutGet(GLUT_ELAPSED_TIME)</code>, поэтому скорость вращения не зависит от FPS;</li>" +
      "<li><b>updateFps</b> раз в 0,5 с пересчитывает FPS, значение выводится в окне через <code>glutBitmapCharacter</code>.</li></ul>" +
      "<p>Клавиши: <b>p</b> — пауза, <b>+</b>/<b>−</b> — скорость. Запомните число FPS: далее вы будете ускорять эту сцену.</p>",
    code: terrainProg({
      title: "Lab 15 - application skeleton",
      funcs: P_IMM,
      draw: "    drawImmediate();\n"
    })
  });

  /* ---------------- Задание 1: дисплейный список ---------------- */
  var t1 = {
    id: "s1", kind: "task", title: "Задание 1: дисплейный список",
    text: "<p>Сетка не меняется от кадра к кадру, поэтому её незачем пересчитывать 60 раз в секунду. Запишите рисование сетки в дисплейный список:</p>" +
      "<ul><li>в <code>init</code> создайте список (<code>glGenLists</code>, <code>glNewList(…, GL_COMPILE)</code>, вызов <code>drawImmediate()</code>, <code>glEndList</code>);</li>" +
      "<li>в <code>display</code> вместо <code>drawImmediate()</code> вызывайте <code>glCallList</code>.</li></ul>" +
      "<p>Изображение не должно измениться, а вызовов <code>glBegin</code> за кадр должно стать 0.</p>",
    hint: "Список строят один раз, а вызывают каждый кадр. Внутри glNewList/glEndList можно вызвать готовую функцию drawImmediate().",
    check: { type: "both", calls: { "glCallList": ">=1", "glBegin": 0 } }
  };
  t1.starter = terrainProg({
    title: "Lab 15 - display list",
    funcs: P_IMM + "GLuint terrainList;\n\n",
    initFn: "void init() {\n    initCommon();\n    // TODO: создайте дисплейный список terrainList с вызовом drawImmediate()\n}\n\n",
    draw: "    drawImmediate();   // TODO: замените вызовом списка\n"
  });
  t1.solution = terrainProg({
    title: "Lab 15 - display list",
    funcs: P_IMM + P_LIST,
    initFn: "void init() {\n    initCommon();\n    buildList();\n}\n\n",
    draw: "    glCallList(terrainList);\n"
  });
  STEPS.push(t1);

  /* ---------------- Задание 2: массивы вершин ---------------- */
  var t2 = {
    id: "s2", kind: "task", title: "Задание 2: массивы вершин и glDrawArrays",
    text: "<p>Дисплейный список нельзя изменить, а его содержимое драйвер хранит по-своему. Массивы вершин — «настоящие» данные в вашей программе. " +
      "Заполните три массива (положения, нормали, цвета) — по 4 вершины на каждый из <code>N·N</code> квадов — и нарисуйте сетку одним вызовом.</p>" +
      "<ul><li>массивы заполняет <code>buildArrays</code> (вызывается из <code>init</code>);</li>" +
      "<li>в <code>drawArrays</code> включите три массива, задайте указатели и вызовите <code>glDrawArrays(GL_QUADS, …)</code>;</li>" +
      "<li>в <code>display</code> нужно 0 вызовов <code>glBegin</code> и <code>glVertex*</code>.</li></ul>",
    hint: "Функция nodeData уже умеет вычислять положение, нормаль и цвет узла. Для каждой вершины скопируйте три числа в каждый из массивов по индексу v*3.",
    check: { type: "both", calls: { "glDrawArrays": ">=1", "glBegin": 0, "glCallList": 0 } }
  };
  t2.starter = terrainProg({
    title: "Lab 15 - vertex arrays",
    funcs: "#define AV (N * N * 4)        // число вершин: 4 на квад\nGLfloat aPos[AV * 3], aNrm[AV * 3], aCol[AV * 3];\n\n" +
      "void buildArrays() {\n    float p[3], n[3], c[3];\n    int v = 0;\n" +
      "    // TODO: для каждого квада (i, j) и каждого из 4 углов k вычислите nodeData(i + DI[k], j + DJ[k], p, n, c)\n" +
      "    //       и запишите p, n, c в aPos, aNrm, aCol по индексу v*3\n}\n\n" +
      "void drawArrays() {\n    // TODO: включите массивы, задайте указатели, вызовите glDrawArrays(GL_QUADS, 0, AV), отключите массивы\n}\n\n",
    initFn: "void init() {\n    initCommon();\n    buildArrays();\n}\n\n",
    draw: "    drawArrays();\n"
  });
  t2.solution = terrainProg({
    title: "Lab 15 - vertex arrays",
    funcs: P_ARR,
    initFn: "void init() {\n    initCommon();\n    buildArrays();\n}\n\n",
    draw: "    drawArrays();\n"
  });
  STEPS.push(t2);

  /* ---------------- Задание 3: индексы ---------------- */
  var t3 = {
    id: "s3", kind: "task", title: "Задание 3: индексированная сетка и glDrawElements",
    text: "<p>В предыдущем задании каждая вершина сетки хранится четырежды (по разу на каждый из соседних квадов). " +
      "В индексированной сетке узлов всего <code>(N+1)·(N+1)</code>, а квады описываются индексами.</p>" +
      "<ul><li>заполните массивы <code>ePos, eNrm, eCol</code> (по одной записи на узел, номер узла <code>i·(N+1)+j</code>);</li>" +
      "<li>заполните массив индексов <code>eIdx</code> (по 4 индекса на квад, обход против часовой стрелки);</li>" +
      "<li>нарисуйте сетку вызовом <code>glDrawElements(GL_QUADS, …, GL_UNSIGNED_INT, eIdx)</code>.</li></ul>" +
      "<p>Во сколько раз уменьшился объём данных вершин по сравнению с заданием 2?</p>",
    hint: "Индексы четырёх углов квада (i, j): (i+DI[k])*(N+1) + (j+DJ[k]) для k = 0…3 — те же смещения, что и раньше.",
    check: { type: "both", calls: { "glDrawElements": ">=1", "glBegin": 0, "glDrawArrays": 0 } }
  };
  t3.starter = terrainProg({
    title: "Lab 15 - indexed mesh",
    funcs: "#define EV ((N + 1) * (N + 1))     // число узлов сетки\nGLfloat ePos[EV * 3], eNrm[EV * 3], eCol[EV * 3];\nGLuint  eIdx[N * N * 4];\n\n" +
      "void buildElements() {\n    float p[3], n[3], c[3];\n" +
      "    // TODO: для всех узлов (i, j) от 0 до N включительно записать nodeData в массивы по индексу v*3, v = i*(N+1)+j\n" +
      "    // TODO: заполнить eIdx: для каждого квада по 4 индекса его узлов\n}\n\n" +
      "void drawElements() {\n    // TODO: включить массивы, задать указатели и вызвать glDrawElements\n}\n\n",
    initFn: "void init() {\n    initCommon();\n    buildElements();\n}\n\n",
    draw: "    drawElements();\n"
  });
  t3.solution = terrainProg({
    title: "Lab 15 - indexed mesh",
    funcs: P_ELEM,
    initFn: "void init() {\n    initCommon();\n    buildElements();\n}\n\n",
    draw: "    drawElements();\n"
  });
  STEPS.push(t3);

  /* ---------------- Задание 4: VBO ---------------- */
  var t4 = {
    id: "s4", kind: "task", title: "Задание 4: буферные объекты вершин (VBO)",
    text: "<p>Массивы вершин при каждом вызове передаются из памяти программы в видеопамять. VBO хранит данные уже в памяти видеокарты. " +
      "Заготовка уже собирает <b>чередующийся</b> массив <code>vbV</code> (9 чисел на вершину: положение, нормаль, цвет) и массив индексов <code>vbI</code>.</p>" +
      "<ul><li>в <code>buildVBO</code> создайте два буфера (<code>glGenBuffers</code>) и загрузите данные: вершины — в <code>GL_ARRAY_BUFFER</code>, индексы — в <code>GL_ELEMENT_ARRAY_BUFFER</code> (<code>GL_STATIC_DRAW</code>);</li>" +
      "<li>в <code>drawVBO</code> привяжите буферы, задайте указатели с шагом <code>STRIDE</code> и <b>смещениями</b> <code>(void*)0</code>, <code>(void*)12</code>, <code>(void*)24</code>, вызовите <code>glDrawElements</code>.</li></ul>" +
      "<p>Загружать данные нужно один раз, а не в каждом кадре: <code>glBufferData</code> в <code>display</code> не допускается.</p>",
    hint: "С привязанным GL_ARRAY_BUFFER последний аргумент glVertexPointer — не адрес массива, а смещение в байтах от начала буфера. Смещение нормали — 3*sizeof(GLfloat).",
    check: { type: "both", calls: { "glBindBuffer": ">=2", "glDrawElements": ">=1", "glBegin": 0, "glBufferData": 0 } }
  };
  t4.starter = terrainProg({
    title: "Lab 15 - VBO",
    funcs: VBO_FILL +
      "void buildVBO() {\n    fillMesh();\n    // TODO: glGenBuffers(2, vbo); загрузить vbV и vbI через glBindBuffer + glBufferData\n}\n\n" +
      "void drawVBO() {\n    // TODO: привязать буферы, включить массивы, задать указатели-смещения, нарисовать glDrawElements\n}\n\n",
    initFn: "void init() {\n    initCommon();\n    buildVBO();\n}\n\n",
    draw: "    drawVBO();\n"
  });
  t4.solution = terrainProg({
    title: "Lab 15 - VBO",
    funcs: VBO_ALL,
    initFn: "void init() {\n    initCommon();\n    buildVBO();\n}\n\n",
    draw: "    drawVBO();\n"
  });
  STEPS.push(t4);

  /* ---------------- Задание 5: сравнение режимов ---------------- */
  var MODE_FUNCS = P_IMM + P_LIST + P_ARR + P_ELEM + VBO_FILL.replace("#define EV ((N + 1) * (N + 1))\n", "") + VBO_BUILD + VBO_DRAW +
    "const char* modeName(int m) {\n" +
    "    if (m == 0) return \"immediate\";\n" +
    "    if (m == 1) return \"display list\";\n" +
    "    if (m == 2) return \"glDrawArrays\";\n" +
    "    if (m == 3) return \"glDrawElements\";\n" +
    "    return \"VBO\";\n" +
    "}\n\n";
  var MODE_DRAW =
    "    int t0 = glutGet(GLUT_ELAPSED_TIME);        // начало измерения времени отрисовки\n" +
    "    switch (S.mode) {\n" +
    "        case 0: drawImmediate(); break;\n" +
    "        case 1: glCallList(terrainList); break;\n" +
    "        case 2: drawArrays(); break;\n" +
    "        case 3: drawElements(); break;\n" +
    "        default: drawVBO(); break;\n" +
    "    }\n" +
    "    S.accMs += glutGet(GLUT_ELAPSED_TIME) - t0;\n";
  var MODE_INIT = "void init() {\n    initCommon();\n    S.mode = 0;\n    buildList();\n    buildArrays();\n    buildElements();\n    buildVBO();\n}\n\n";
  var t5 = {
    id: "s5", kind: "task", title: "Задание 5: сравнение режимов по FPS",
    text: "<p>В программе уже есть все пять способов рисования. Доведите её до измерительного стенда:</p>" +
      "<ul><li>клавиши <b>1…5</b> переключают режим (<code>S.mode</code> = 0…4: немедленный, список, <code>glDrawArrays</code>, <code>glDrawElements</code>, VBO);</li>" +
      "<li>в <code>display</code> после <code>updateFps()</code> формируйте строку с помощью <code>sprintf</code>: название режима (<code>modeName</code>), FPS и среднее время отрисовки <code>S.ms</code> в миллисекундах, и выводите её <code>drawText</code>.</li></ul>" +
      "<p>Запишите в тетрадь значения для всех пяти режимов и число вершин, отправляемых за кадр. " +
      "Эмулятор ограничивает FPS частотой обновления экрана, поэтому ориентируйтесь на <b>время отрисовки в мс</b> — оно показывает нагрузку на процессор. " +
      "Если FPS у всех режимов одинаков, увеличьте <code>N</code> до 80.</p>",
    hint: "sprintf(buf, \"%s  FPS: %.0f  display(): %.2f ms\", modeName(S.mode), S.fps, S.ms); клавиши — в keyboard: if (key >= '1' && key <= '5') S.mode = key - '1';",
    check: { type: "calls", calls: { "glCallList|glDrawArrays|glDrawElements|glBegin": ">=1" },
      source: [{ re: "sprintf\\s*\\(", msg: "Сформируйте строку со значениями режима, FPS и времени кадра функцией sprintf" },
               { re: "'5'", msg: "Обработайте в keyboard клавиши '1'…'5'" },
               { re: "S\\.mode\\s*=[^=]", msg: "Клавиши должны менять S.mode" }] }
  };
  t5.starter = terrainProg({
    title: "Lab 15 - FPS comparison", fields: "    int   mode;       // 0 - немедленный, 1 - список, 2 - массивы, 3 - индексы, 4 - VBO\n",
    funcs: MODE_FUNCS, initFn: MODE_INIT,
    kbd: "void keyboard(unsigned char key, int x, int y) {\n    if (key == 'p') S.paused = !S.paused;\n    // TODO: клавиши 1..5 переключают S.mode\n}\n\n",
    draw: MODE_DRAW,
    hud: "    // TODO: sprintf строки \"режим, FPS, время отрисовки\" и вывод drawText(10, S.h - 22, buf)\n"
  });
  t5.solution = terrainProg({
    title: "Lab 15 - FPS comparison", fields: "    int   mode;       // 0 - немедленный, 1 - список, 2 - массивы, 3 - индексы, 4 - VBO\n",
    funcs: MODE_FUNCS, initFn: MODE_INIT,
    kbd: "void keyboard(unsigned char key, int x, int y) {\n    if (key == 'p') S.paused = !S.paused;\n    if (key >= '1' && key <= '5') S.mode = key - '1';\n}\n\n",
    draw: MODE_DRAW,
    hud: "    char buf[96];\n    sprintf(buf, \"%s   FPS: %.0f   display(): %.2f ms\", modeName(S.mode), S.fps, S.ms);\n    drawText(10, S.h - 22, buf);\n"
  });
  STEPS.push(t5);

  /* ---------------- Задание 6: сортировка по текстуре ---------------- */
  function texProg(sorted) {
    var draw = sorted ?
      "    // Рисуем по группам: текстура привязывается один раз на группу\n" +
      "    for (int t = 0; t < TEXN; t++) {\n" +
      "        useTexture(tex[t]);\n" +
      "        for (int i = 0; i < OBJ; i++)\n" +
      "            if (objTex[i] == t) drawTile(i);\n" +
      "    }\n" :
      "    // Рисуем в порядке номеров объектов\n" +
      "    for (int i = 0; i < OBJ; i++) {\n" +
      "        useTexture(tex[objTex[i]]);   // TODO: сгруппируйте объекты по текстурам, чтобы привязок было не больше 3\n" +
      "        drawTile(i);\n" +
      "    }\n";
    return INC +
      "#define OBJ 15          // 5 x 3 плиток\n#define TEXN 3          // 3 разные текстуры\n\n" +
      stateStruct("    int   binds;      // сколько раз за кадр привязывалась текстура\n") +
      "GLuint tex[TEXN];\nint objTex[OBJ];    // номер текстуры каждого объекта\n\n" +
      "GLuint loadTexture(const char* file) {\n" +
      "    int w, h, n;\n" +
      "    stbi_set_flip_vertically_on_load(1);\n" +
      "    unsigned char* data = stbi_load(file, &w, &h, &n, 3);\n" +
      "    GLuint id;\n" +
      "    glGenTextures(1, &id);\n" +
      "    glBindTexture(GL_TEXTURE_2D, id);\n" +
      "    gluBuild2DMipmaps(GL_TEXTURE_2D, GL_RGB, w, h, GL_RGB, GL_UNSIGNED_BYTE, data);\n" +
      "    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);\n" +
      "    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);\n" +
      "    stbi_image_free(data);\n" +
      "    return id;\n}\n\n" +
      "// Привязка текстуры со счётчиком: так видно, сколько смен состояния в кадре\n" +
      "void useTexture(GLuint id) {\n    glBindTexture(GL_TEXTURE_2D, id);\n    S.binds++;\n}\n\n" +
      "// Плитка i: положение в сетке 5 x 3, наклон зависит от номера\n" +
      "void drawTile(int i) {\n" +
      "    float x = (i % 5 - 2) * 1.35f, y = (1 - i / 5) * 1.35f;\n" +
      "    glPushMatrix();\n" +
      "    glTranslatef(x, y, 0.0f);\n" +
      "    glRotatef(S.angle * 0.5f + i * 20.0f, 0.0f, 1.0f, 0.0f);\n" +
      "    glBegin(GL_QUADS);\n" +
      "        glTexCoord2f(0, 0); glVertex2f(-0.55f, -0.55f);\n" +
      "        glTexCoord2f(1, 0); glVertex2f( 0.55f, -0.55f);\n" +
      "        glTexCoord2f(1, 1); glVertex2f( 0.55f,  0.55f);\n" +
      "        glTexCoord2f(0, 1); glVertex2f(-0.55f,  0.55f);\n" +
      "    glEnd();\n" +
      "    glPopMatrix();\n}\n\n" + COMMON_FUNCS +
      "void init() {\n" +
      "    glClearColor(0.10f, 0.12f, 0.18f, 1.0f);\n" +
      "    glEnable(GL_DEPTH_TEST);\n" +
      "    glEnable(GL_TEXTURE_2D);\n" + STATE_INIT +
      "    tex[0] = loadTexture(\"brick.png\");\n" +
      "    tex[1] = loadTexture(\"wood.png\");\n" +
      "    tex[2] = loadTexture(\"marble.png\");\n" +
      "    for (int i = 0; i < OBJ; i++) objTex[i] = i % TEXN;   // текстуры чередуются\n" +
      "}\n\n" +
      "void keyboard(unsigned char key, int x, int y) {\n    if (key == 'p') S.paused = !S.paused;\n}\n\n" +
      "void display() {\n" +
      "    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);\n" +
      "    glMatrixMode(GL_PROJECTION); glLoadIdentity();\n" +
      "    gluPerspective(45.0, (double)S.w / S.h, 1.0, 50.0);\n" +
      "    glMatrixMode(GL_MODELVIEW); glLoadIdentity();\n" +
      "    glTranslatef(0.0f, 0.0f, -7.0f);\n" +
      "    glColor3f(1, 1, 1);\n" +
      "    S.binds = 0;\n" + draw +
      "    updateFps();\n" +
      "    char buf[96];\n" +
      "    sprintf(buf, \"texture binds per frame: %d\", S.binds);\n" +
      "    drawText(10, S.h - 22, buf);\n" +
      "    glutSwapBuffers();\n}\n\n" + mainFn("Lab 15 - texture sorting");
  }
  STEPS.push({
    id: "s6", kind: "task", title: "Задание 6: сортировка объектов по текстуре",
    text: "<p>Смена текстуры — дорогая смена состояния. В сцене 15 плиток с тремя разными текстурами, причём текстуры чередуются, " +
      "поэтому программа выполняет 15 вызовов <code>glBindTexture</code> за кадр.</p>" +
      "<p>Измените цикл в <code>display</code> так, чтобы объекты рисовались <b>группами по текстурам</b>: внешний цикл по текстурам, " +
      "внутренний — по объектам с этой текстурой. Привязок за кадр должно быть не больше трёх, а картинка — прежней " +
      "(плитки не перекрываются, порядок рисования не влияет на результат).</p>",
    hint: "Внешний цикл for (int t = 0; t < TEXN; t++): привязать tex[t], затем во внутреннем цикле нарисовать те объекты i, у которых objTex[i] == t.",
    check: { type: "both", calls: { "glBindTexture": "<=3" } },
    starter: texProg(false), solution: texProg(true)
  });

  /* ---------------- Задание 7: отсечение по пирамиде видимости ---------------- */
  function forestProg(o) {
    return INC + FOREST_DEFS + stateStruct(FOREST_FIELDS + (o.fields || "")) +
      "GLuint sphereList[3];                    // списки сфер разной детализации\n" +
      "float PAL[4][3] = { {1.0f, 0.55f, 0.15f}, {0.9f, 0.25f, 0.25f}, {1.0f, 0.85f, 0.25f}, {0.95f, 0.95f, 0.95f} };\n" +
      (o.globals || "") + "\n" +
      FOREST_CAM + FOREST_FLOOR + o.vis + COMMON_FUNCS +
      FOREST_INIT(
        "    GLUquadric* q = gluNewQuadric();\n" +
        "    gluQuadricNormals(q, GLU_SMOOTH);\n" +
        "    int sl[3] = {20, 10, 6}, st[3] = {14, 7, 4};     // slices и stacks трёх уровней\n" +
        "    for (int k = 0; k < 3; k++) {\n" +
        "        sphereList[k] = glGenLists(1);\n" +
        "        glNewList(sphereList[k], GL_COMPILE);\n" +
        "            gluSphere(q, RAD, sl[k], st[k]);\n" +
        "        glEndList();\n" +
        "    }\n" +
        "    gluDeleteQuadric(q);\n") +
      FOREST_KBD +
      "void display() {\n" +
      "    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);\n" +
      "    setupCamera();\n" +
      "    drawFloor();\n" +
      "    GLfloat mv[16];\n" +
      "    glGetFloatv(GL_MODELVIEW_MATRIX, mv);      // матрица вида: мир -> система наблюдателя\n" +
      "    S.visible = 0;\n" + (o.counters || "") +
      "    for (int i = 0; i < GRID; i++)\n" +
      "        for (int j = 0; j < GRID; j++) {\n" +
      "            float x = (i - GRID / 2) * STEP + 1.0f, z = (j - GRID / 2) * STEP + 1.0f;\n" +
      "            float e[3];\n" +
      "            toEye(mv, x, RAD, z, e);\n" + o.body +
      "        }\n" +
      "    updateFps();\n" + o.hud +
      "    glutSwapBuffers();\n}\n\n" + mainFn(o.title);
  }
  STEPS.push({
    id: "s7", kind: "task", title: "Задание 7: отсечение невидимых объектов по сфере",
    text: "<p>В сцене 961 сфера, а камера видит лишь небольшую часть. Сейчас все они отправляются на рисование. " +
      "Реализуйте проверку «сфера — пирамида видимости» в функции <code>sphereVisible</code>.</p>" +
      "<p>Центр сферы уже переведён в систему наблюдателя (<code>e</code>, камера в начале координат, смотрит вдоль <i>−z</i>), глубина <code>d = −e[2]</code>. " +
      "Для каждой из 6 плоскостей пирамиды сфера отбрасывается, если расстояние от центра до плоскости (в сторону внутренности) меньше <i>−r</i>:</p>" +
      "<ul><li>ближняя и дальняя: <code>d + r &lt; ZNEAR</code>, <code>d − r &gt; ZFAR</code>;</li>" +
      "<li>левая и правая: <code>±e[0]·cH + d·sH &lt; −r</code>;</li>" +
      "<li>нижняя и верхняя: <code>±e[1]·cV + d·sV &lt; −r</code>.</li></ul>" +
      "<p>Число вызовов <code>glCallList</code> за кадр должно упасть примерно в шесть раз, а изображение остаться прежним.</p>",
    hint: "Каждая проверка — одна строка if (…) return 0;. Не забудьте, что знак e[0] и e[1] в левой/правой и нижней/верхней плоскостях противоположный.",
    check: { type: "both", calls: { "glCallList": "<=200" } },
    starter: forestProg({
      title: "Lab 15 - frustum culling", vis: VIS_TODO,
      body: "            if (!sphereVisible(e, RAD)) continue;     // невидимые сферы пропускаем\n" +
        "            glColor3fv(PAL[(i * 3 + j * 5) % 4]);\n" +
        "            glPushMatrix();\n" +
        "            glTranslatef(x, RAD, z);\n" +
        "            glCallList(sphereList[0]);\n" +
        "            glPopMatrix();\n" +
        "            S.visible++;\n",
      hud: "    char buf[96];\n    sprintf(buf, \"visible: %d / %d   FPS: %.0f\", S.visible, GRID * GRID, S.fps);\n    drawText(10, S.h - 22, buf);\n"
    }),
    solution: forestProg({
      title: "Lab 15 - frustum culling", vis: VIS_SOL,
      body: "            if (!sphereVisible(e, RAD)) continue;     // невидимые сферы пропускаем\n" +
        "            glColor3fv(PAL[(i * 3 + j * 5) % 4]);\n" +
        "            glPushMatrix();\n" +
        "            glTranslatef(x, RAD, z);\n" +
        "            glCallList(sphereList[0]);\n" +
        "            glPopMatrix();\n" +
        "            S.visible++;\n",
      hud: "    char buf[96];\n    sprintf(buf, \"visible: %d / %d   FPS: %.0f\", S.visible, GRID * GRID, S.fps);\n    drawText(10, S.h - 22, buf);\n"
    })
  });

  /* ---------------- Задание 8: LOD ---------------- */
  var LOD_GLOB = "int lodCount[3];                         // сколько сфер нарисовано на каждом уровне\nint lodQuads[3] = {280, 70, 24};         // четырёхугольников в сфере уровня k\n" +
    "float LODCOL[3][3] = { {1.0f, 0.55f, 0.15f}, {0.55f, 0.85f, 0.25f}, {0.60f, 0.45f, 0.95f} };   // отладочная раскраска по уровням\n";
  var LOD_BODY = function (sol) {
    return "            if (!sphereVisible(e, RAD)) continue;\n" +
      "            float dist = sqrtf(e[0] * e[0] + e[1] * e[1] + e[2] * e[2]);   // расстояние до камеры\n" +
      (sol ? "            int lod = 2;                                   // далеко: грубая модель\n" +
        "            if (dist < 8.0f) lod = 0;                      // близко: подробная\n" +
        "            else if (dist < 16.0f) lod = 1;                // средняя дистанция\n" :
        "            int lod = 0;   // TODO: 0 при dist < 8, 1 при dist < 16, иначе 2\n") +
      "            glColor3fv(LODCOL[lod]);\n" +
      "            glPushMatrix();\n" +
      "            glTranslatef(x, RAD, z);\n" +
      "            glCallList(sphereList[lod]);\n" +
      "            glPopMatrix();\n" +
      "            S.visible++; lodCount[lod]++;\n";
  };
  var LOD_HUD = "    int quads = 0;\n    for (int k = 0; k < 3; k++) quads += lodCount[k] * lodQuads[k];\n" +
    "    char buf[96];\n    sprintf(buf, \"LOD0/1/2: %d/%d/%d   quads: %d\", lodCount[0], lodCount[1], lodCount[2], quads);\n    drawText(10, S.h - 22, buf);\n";
  STEPS.push({
    id: "s8", kind: "task", title: "Задание 8: уровни детализации (LOD)",
    text: "<p>Дальняя сфера занимает на экране несколько пикселей, и 280 четырёхугольников на неё тратить незачем. " +
      "В программе три списка сфер: <code>sphereList[0]</code> — подробная (280 квадов), <code>[1]</code> — средняя (70), <code>[2]</code> — грубая (24). " +
      "Отсечение по пирамиде видимости уже работает.</p>" +
      "<p>Выберите уровень по расстоянию <code>dist</code> от камеры: <b>0</b> при <code>dist &lt; 8</code>, <b>1</b> при <code>dist &lt; 16</code>, иначе <b>2</b>. " +
      "Для наглядности уровни окрашены: оранжевый — подробный, зелёный — средний, фиолетовый — грубый. " +
      "Сравните число четырёхугольников в строке состояния до и после — это и есть выигрыш.</p>",
    hint: "Переменная lod — индекс в sphereList и в LODCOL; её нужно вычислить сравнением dist с порогами 8 и 16.",
    check: { type: "both", maxDiff: 0.02, calls: { "glCallList": "<=200" } },
    starter: forestProg({ title: "Lab 15 - level of detail", vis: VIS_SOL, globals: LOD_GLOB, counters: "    lodCount[0] = lodCount[1] = lodCount[2] = 0;\n", body: LOD_BODY(false), hud: LOD_HUD }),
    solution: forestProg({ title: "Lab 15 - level of detail", vis: VIS_SOL, globals: LOD_GLOB, counters: "    lodCount[0] = lodCount[1] = lodCount[2] = 0;\n", body: LOD_BODY(true), hud: LOD_HUD })
  });

  LAB.define({ n: 15, title: "Организация приложения. Оптимизация вызовов OpenGL", steps: STEPS });
})();
