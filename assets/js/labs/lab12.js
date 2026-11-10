/* Лабораторная 12: Преобразования объектов, материалы и освещение в OpenGL */
(function () {
  const HEAD = `#define _USE_MATH_DEFINES   // M_PI в Visual Studio
#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>
#include <cmath>

`;
  const RESHAPE = `void reshape(int w, int h) {
    if (h == 0) h = 1;                       // защита от деления на ноль
    glViewport(0, 0, w, h);                  // вся область окна
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, (double)w / h, 1.0, 60.0);   // угол, пропорции, near, far
    glMatrixMode(GL_MODELVIEW);
}

`;
  const IDLE = `void idle() {
    glutPostRedisplay();
}

`;
  const MAIN = (title, reshape, idle) => `
int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH);
    glutInitWindowSize(480, 360);
    glutCreateWindow("${title}");
    glewInit();
    init();
    glutDisplayFunc(display);
${reshape ? "    glutReshapeFunc(reshape);\n" : ""}${idle ? "    glutIdleFunc(idle);\n" : ""}    glutMainLoop();
    return 0;
}
`;
  const INIT_STD = `void init() {
    glClearColor(0.10f, 0.12f, 0.18f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);       // glColor задаёт фоновый и рассеянный цвета материала
}

`;
  const AXES = `// Оси координат: красная - X, зелёная - Y, синяя - Z (без освещения)
void axes(float L) {
    glDisable(GL_LIGHTING);
    glLineWidth(2.0f);
    glBegin(GL_LINES);
        glColor3f(1.0f, 0.3f, 0.3f); glVertex3f(0, 0, 0); glVertex3f(L, 0, 0);
        glColor3f(0.3f, 1.0f, 0.3f); glVertex3f(0, 0, 0); glVertex3f(0, L, 0);
        glColor3f(0.4f, 0.5f, 1.0f); glVertex3f(0, 0, 0); glVertex3f(0, 0, L);
    glEnd();
    glEnable(GL_LIGHTING);
}

`;

  /* ---------- Пример ---------- */
  const ex = HEAD + INIT_STD.replace("    glEnable(GL_COLOR_MATERIAL);       // glColor задаёт фоновый и рассеянный цвета материала\n",
`    glEnable(GL_COLOR_MATERIAL);       // glColor задаёт фоновый и рассеянный цвета материала
    GLfloat white[] = { 1.0f, 1.0f, 1.0f, 1.0f };
    glMaterialfv(GL_FRONT, GL_SPECULAR, white);      // белый блик
    glMaterialf(GL_FRONT, GL_SHININESS, 60.0f);      // показатель блеска
`) + RESHAPE + `void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 2.5, 8.0,   0.0, 0.0, 0.0,   0.0, 1.0, 0.0);   // камера

    // Положение источника преобразуется текущей модельно-видовой матрицей,
    // поэтому его задают ПОСЛЕ gluLookAt: источник закреплён в мировых координатах
    GLfloat lightPos[] = { 4.0f, 5.0f, 5.0f, 1.0f };               // w = 1 - точечный
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    float t = glutGet(GLUT_ELAPSED_TIME) / 1000.0f;

    glPushMatrix();
        glTranslatef(-1.8f, -0.2f, 0.0f);
        glRotatef(30.0f * t, 0.0f, 1.0f, 0.0f);                    // вращение чайника
        glColor3f(0.85f, 0.25f, 0.20f);
        glutSolidTeapot(1.2);
    glPopMatrix();

    glPushMatrix();
        glTranslatef(2.0f, 0.2f, 0.0f);
        glColor3f(0.20f, 0.50f, 0.90f);
        glutSolidSphere(1.0, 40, 30);
    glPopMatrix();

    glutSwapBuffers();
}

` + IDLE + MAIN("Освещённая сцена", true, true);

  /* ---------- Шаг 1: порядок преобразований ---------- */
  const s1 = (s) => HEAD + INIT_STD + AXES + RESHAPE +
`// Окружность радиуса r в плоскости XZ (без освещения)
void circleXZ(float r) {
    glDisable(GL_LIGHTING);
    glLineWidth(2.0f);
    glColor3f(0.45f, 0.5f, 0.6f);
    glBegin(GL_LINE_LOOP);
    for (int i = 0; i < 72; i++) {
        float a = 2.0f * (float)M_PI * i / 72.0f;
        glVertex3f(r * cosf(a), 0.0f, -r * sinf(a));
    }
    glEnd();
    glEnable(GL_LIGHTING);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 5.0, 8.0,   0.0, 0.0, 0.0,   0.0, 1.0, 0.0);
    GLfloat lightPos[] = { 2.0f, 5.0f, 6.0f, 0.0f };      // направленный источник
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    axes(4.5f);
    circleXZ(3.0f);

    // Красный чайник: сдвиг на 3 по X, затем поворот на 60 градусов вокруг оси Y
    glPushMatrix();
${s ? `        glTranslatef(3.0f, 0.0f, 0.0f);
        glRotatef(60.0f, 0.0f, 1.0f, 0.0f);
` : `        // TODO: glTranslatef(3, 0, 0), затем glRotatef(60, 0, 1, 0)
`}        glColor3f(0.90f, 0.20f, 0.20f);
        glutSolidTeapot(1.0);
    glPopMatrix();

    // Зелёный чайник: те же две команды, но в обратном порядке
    glPushMatrix();
${s ? `        glRotatef(60.0f, 0.0f, 1.0f, 0.0f);
        glTranslatef(3.0f, 0.0f, 0.0f);
` : `        // TODO: те же команды в обратном порядке (сначала поворот, потом сдвиг)
`}        glColor3f(0.20f, 0.80f, 0.30f);
        glutSolidTeapot(1.0);
    glPopMatrix();

    glutSwapBuffers();
}
` + MAIN("Порядок преобразований", true, false);

  /* ---------- Шаг 2: иерархия Солнце-Земля-Луна ---------- */
  const s2 = (s) => HEAD + `void init() {
    glClearColor(0.02f, 0.02f, 0.06f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);
}

` + RESHAPE + `void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 7.0, 9.0,   0.0, 0.0, 0.0,   0.0, 1.0, 0.0);

    GLfloat sunPos[] = { 0.0f, 0.0f, 0.0f, 1.0f };   // источник света - в центре Солнца
    glLightfv(GL_LIGHT0, GL_POSITION, sunPos);

    float t = glutGet(GLUT_ELAPSED_TIME) / 1000.0f;
    float year  = 60.0f * t;          // угол орбиты Земли
    float day   = 300.0f * t;             // вращение Земли вокруг оси
    float month = 200.0f * t;             // угол орбиты Луны вокруг Земли

    // Орбита Земли (без освещения)
    glDisable(GL_LIGHTING);
    glLineWidth(2.0f);
    glColor3f(0.3f, 0.35f, 0.5f);
    glBegin(GL_LINE_LOOP);
    for (int i = 0; i < 90; i++) {
        float a = 2.0f * (float)M_PI * i / 90.0f;
        glVertex3f(4.0f * cosf(a), 0.0f, 4.0f * sinf(a));
    }
    glEnd();

    // Солнце: светится само, освещение отключено
    glColor3f(1.0f, 0.85f, 0.10f);
    glutSolidSphere(1.0, 32, 24);
    glEnable(GL_LIGHTING);

${s ? `    glPushMatrix();
        glRotatef(year, 0.0f, 1.0f, 0.0f);        // движение по орбите
        glTranslatef(4.0f, 0.0f, 0.0f);           // расстояние до Солнца

        glPushMatrix();                           // суточное вращение - только для Земли
            glRotatef(day, 0.0f, 1.0f, 0.0f);
            glRotatef(23.5f, 0.0f, 0.0f, 1.0f);   // наклон оси
            glColor3f(0.20f, 0.45f, 1.0f);
            glutSolidSphere(0.6, 32, 24);
            glDisable(GL_LIGHTING);               // сетка, чтобы вращение было видно
            glColor3f(0.75f, 0.85f, 1.0f);
            glutWireSphere(0.62, 12, 8);
            glEnable(GL_LIGHTING);
        glPopMatrix();

        glRotatef(month, 0.0f, 1.0f, 0.0f);       // орбита Луны - относительно Земли
        glTranslatef(1.3f, 0.0f, 0.0f);
        glColor3f(0.80f, 0.80f, 0.80f);
        glutSolidSphere(0.2, 20, 16);
    glPopMatrix();
` : `    // TODO: Земля (радиус 0.6, синяя) на орбите радиусом 4 вокруг Солнца,
    //       Луна (радиус 0.2, серая) на орбите радиусом 1.3 вокруг Земли.
    //       Используйте glPushMatrix / glPopMatrix, углы year, day, month заданы выше.
`}
    glutSwapBuffers();
}

` + IDLE + MAIN("Солнце - Земля - Луна", true, true);

  /* ---------- Шаг 3: камера и проекции ---------- */
  const s3 = (s) => HEAD + `void init() {
    glClearColor(0.10f, 0.12f, 0.18f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);
}

// Сцена: пол-сетка и три ряда кубов, уходящих вдаль по оси -Z
void drawScene() {
    GLfloat lightPos[] = { 0.4f, 1.0f, 0.8f, 0.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);   // камера уже установлена

    glDisable(GL_LIGHTING);
    glLineWidth(2.0f);
    glColor3f(0.35f, 0.40f, 0.50f);
    glBegin(GL_LINES);
    for (int x = -4; x <= 4; x += 2) { glVertex3f(x, 0, -12); glVertex3f(x, 0, 2); }
    for (int z = -12; z <= 2; z += 2) { glVertex3f(-4, 0, z); glVertex3f(4, 0, z); }
    glEnd();
    glEnable(GL_LIGHTING);

    for (int row = -1; row <= 1; row++) {
        for (int i = 0; i < 5; i++) {
            float c = i / 4.0f;
            glPushMatrix();
                glTranslatef(2.4f * row, 0.5f, -2.5f * i);
                glColor3f(1.0f - c, 0.45f, c);
                glutSolidCube(1.0);
            glPopMatrix();
        }
    }
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    int w = glutGet(GLUT_WINDOW_WIDTH);
    int h = glutGet(GLUT_WINDOW_HEIGHT);
    double aspect = (double)(w / 2) / h;           // пропорции ОДНОЙ половины окна

${s ? `    // Левая половина: ортографическая проекция
    glViewport(0, 0, w / 2, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    glOrtho(-8.0 * aspect, 8.0 * aspect, -8.0, 8.0, 0.5, 60.0);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(4.0, 3.5, 7.0,   0.0, 0.0, -5.0,   0.0, 1.0, 0.0);
    drawScene();

    // Правая половина: перспективная проекция, та же камера
    glViewport(w / 2, 0, w / 2, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(60.0, aspect, 0.5, 60.0);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(4.0, 3.5, 7.0,   0.0, 0.0, -5.0,   0.0, 1.0, 0.0);
    drawScene();
` : `    // TODO 1: левая половина окна - glViewport, glOrtho(-8*aspect, 8*aspect, -8, 8, 0.5, 60),
    //         камера gluLookAt(4, 3.5, 7,  0, 0, -5,  0, 1, 0), затем drawScene()
    // TODO 2: правая половина - glViewport, gluPerspective(60, aspect, 0.5, 60),
    //         та же камера, затем drawScene()
    drawScene();
`}
    // Подписи (координаты окна, без освещения)
    glDisable(GL_LIGHTING);
    glColor3f(1.0f, 1.0f, 1.0f);
    glWindowPos2i(10, 10);
    glutBitmapString(GLUT_BITMAP_HELVETICA_12, "glOrtho");
    glWindowPos2i(w / 2 + 10, 10);
    glutBitmapString(GLUT_BITMAP_HELVETICA_12, "gluPerspective");
    glEnable(GL_LIGHTING);

    glutSwapBuffers();
}
` + MAIN("Ортографическая и перспективная проекции", false, false);

  /* ---------- Шаг 4: нормали ---------- */
  const s4 = (s) => HEAD + `void init() {
    glClearColor(0.10f, 0.12f, 0.18f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
${s ? "    glEnable(GL_NORMALIZE);            // нормали вида (0, 2, 3) не единичные\n" : "    // TODO: нормали (0, 2, 3) не единичны - включите их нормализацию\n"}    glEnable(GL_COLOR_MATERIAL);
}

` + RESHAPE + `// Куб со стороной 2 (GL_QUADS, обход против часовой стрелки снаружи)
void cube() {
    glBegin(GL_QUADS);
${s ? "        glNormal3f(0, 0, 1);   " : "        // TODO: normal (0, 0, 1)\n        "}glVertex3f(-1, -1,  1); glVertex3f( 1, -1,  1); glVertex3f( 1,  1,  1); glVertex3f(-1,  1,  1);
${s ? "        glNormal3f(0, 0, -1);  " : "        // TODO: normal (0, 0, -1)\n        "}glVertex3f( 1, -1, -1); glVertex3f(-1, -1, -1); glVertex3f(-1,  1, -1); glVertex3f( 1,  1, -1);
${s ? "        glNormal3f(1, 0, 0);   " : "        // TODO: normal (1, 0, 0)\n        "}glVertex3f( 1, -1,  1); glVertex3f( 1, -1, -1); glVertex3f( 1,  1, -1); glVertex3f( 1,  1,  1);
${s ? "        glNormal3f(-1, 0, 0);  " : "        // TODO: normal (-1, 0, 0)\n        "}glVertex3f(-1, -1, -1); glVertex3f(-1, -1,  1); glVertex3f(-1,  1,  1); glVertex3f(-1,  1, -1);
${s ? "        glNormal3f(0, 1, 0);   " : "        // TODO: normal (0, 1, 0)\n        "}glVertex3f(-1,  1,  1); glVertex3f( 1,  1,  1); glVertex3f( 1,  1, -1); glVertex3f(-1,  1, -1);
${s ? "        glNormal3f(0, -1, 0);  " : "        // TODO: normal (0, -1, 0)\n        "}glVertex3f(-1, -1, -1); glVertex3f( 1, -1, -1); glVertex3f( 1, -1,  1); glVertex3f(-1, -1,  1);
    glEnd();
}

// Четырёхугольная пирамида: основание - квадрат со стороной 2, высота 1.5
void pyramid() {
    glBegin(GL_TRIANGLES);
${s ? "        glNormal3f(0, 2, 3);   " : "        // TODO: normal (0, 2, 3)\n        "}glVertex3f(-1, 0,  1); glVertex3f( 1, 0,  1); glVertex3f(0, 1.5f, 0);
${s ? "        glNormal3f(3, 2, 0);   " : "        // TODO: normal (3, 2, 0)\n        "}glVertex3f( 1, 0,  1); glVertex3f( 1, 0, -1); glVertex3f(0, 1.5f, 0);
${s ? "        glNormal3f(0, 2, -3);  " : "        // TODO: normal (0, 2, -3)\n        "}glVertex3f( 1, 0, -1); glVertex3f(-1, 0, -1); glVertex3f(0, 1.5f, 0);
${s ? "        glNormal3f(-3, 2, 0);  " : "        // TODO: normal (-3, 2, 0)\n        "}glVertex3f(-1, 0, -1); glVertex3f(-1, 0,  1); glVertex3f(0, 1.5f, 0);
    glEnd();
    glBegin(GL_QUADS);
${s ? "        glNormal3f(0, -1, 0);  " : "        // TODO: normal (0, -1, 0)\n        "}glVertex3f(-1, 0,  1); glVertex3f(-1, 0, -1); glVertex3f( 1, 0, -1); glVertex3f( 1, 0,  1);
    glEnd();
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 3.5, 9.0,   0.0, 0.0, 0.0,   0.0, 1.0, 0.0);
    GLfloat lightPos[] = { 1.0f, 1.5f, 1.0f, 0.0f };     // направленный: сверху справа спереди
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    glPushMatrix();
        glTranslatef(-2.4f, 0.0f, 0.0f);
        glRotatef(35.0f, 0.0f, 1.0f, 0.0f);
        glColor3f(0.95f, 0.55f, 0.15f);
        cube();
    glPopMatrix();

    glPushMatrix();
        glTranslatef(2.4f, -1.0f, 0.0f);
        glRotatef(35.0f, 0.0f, 1.0f, 0.0f);
        glScalef(1.4f, 1.4f, 1.4f);
        glColor3f(0.20f, 0.75f, 0.70f);
        pyramid();
    glPopMatrix();

    glutSwapBuffers();
}
` + MAIN("Нормали куба и пирамиды", true, false);

  /* ---------- Шаг 5: GL_FLAT и GL_SMOOTH ---------- */
  const s5 = (s) => HEAD + `#define N 12      // число граней конуса

void init() {
    glClearColor(0.10f, 0.12f, 0.18f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);             // нормали (2cos, 1, 2sin) не единичные
    glEnable(GL_COLOR_MATERIAL);
    GLfloat spec[] = { 0.7f, 0.7f, 0.7f, 1.0f };
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

` + RESHAPE + `// Боковая поверхность конуса: радиус 1, высота 2, ось Y, основание y = -1.
// Нормаль боковой поверхности в точке с углом a пропорциональна (2*cos a, 1, 2*sin a).
// Последняя вершина каждого треугольника - вершина конуса; в режиме GL_FLAT
// цвет грани берётся именно по ней, поэтому её нормаль - нормаль грани (угол am).
void cone() {
    glBegin(GL_TRIANGLES);
    for (int i = 0; i < N; i++) {
        float a0 = 2.0f * (float)M_PI * i / N;
        float a1 = 2.0f * (float)M_PI * (i + 1) / N;
        float am = 0.5f * (a0 + a1);
${s ? `        glNormal3f(2.0f * cosf(a1), 1.0f, 2.0f * sinf(a1));
        glVertex3f(cosf(a1), -1.0f, sinf(a1));
        glNormal3f(2.0f * cosf(a0), 1.0f, 2.0f * sinf(a0));
        glVertex3f(cosf(a0), -1.0f, sinf(a0));
        glNormal3f(2.0f * cosf(am), 1.0f, 2.0f * sinf(am));
        glVertex3f(0.0f, 1.0f, 0.0f);
` : `        // TODO: перед каждой из трёх вершин задайте glNormal3f(2cos a, 1, 2sin a)
        //       с углом a1, a0 и am соответственно
        glVertex3f(cosf(a1), -1.0f, sinf(a1));
        glVertex3f(cosf(a0), -1.0f, sinf(a0));
        glVertex3f(0.0f, 1.0f, 0.0f);
`}    }
    glEnd();
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 3.0, 8.0,   0.0, 0.0, 0.0,   0.0, 1.0, 0.0);
    GLfloat lightPos[] = { 1.0f, 1.0f, 1.0f, 0.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    glColor3f(0.95f, 0.55f, 0.15f);

    glPushMatrix();
        glTranslatef(-2.2f, 0.0f, 0.0f);
${s ? "        glShadeModel(GL_FLAT);\n" : "        // TODO: glShadeModel(GL_FLAT)\n"}        cone();
    glPopMatrix();

    glPushMatrix();
        glTranslatef(2.2f, 0.0f, 0.0f);
${s ? "        glShadeModel(GL_SMOOTH);\n" : "        // TODO: glShadeModel(GL_SMOOTH)\n"}        cone();
    glPopMatrix();

    glDisable(GL_LIGHTING);
    glColor3f(1.0f, 1.0f, 1.0f);
    glWindowPos2i(70, 20);
    glutBitmapString(GLUT_BITMAP_HELVETICA_18, "GL_FLAT");
    glWindowPos2i(300, 20);
    glutBitmapString(GLUT_BITMAP_HELVETICA_18, "GL_SMOOTH");
    glEnable(GL_LIGHTING);

    glutSwapBuffers();
}
` + MAIN("GL_FLAT и GL_SMOOTH", true, false);

  /* ---------- Шаг 6: несколько источников ---------- */
  const FLOOR_SPHERES = (n, half) => `// Пол из мелких четырёхугольников: освещение считается в вершинах,
// поэтому для заметного пятна света пол нужно разбить на много ячеек
void floorGrid() {
    const int n = ${n};
    float step = ${(2 * half).toFixed(1)}f / n;
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) {
            float x = -${half.toFixed(1)}f + i * step;
            float z = -${half.toFixed(1)}f + j * step;
            glVertex3f(x, 0.0f, z + step);
            glVertex3f(x + step, 0.0f, z + step);
            glVertex3f(x + step, 0.0f, z);
            glVertex3f(x, 0.0f, z);
        }
    }
    glEnd();
}

`;
  const s6 = (s) => HEAD + `void init() {
    glClearColor(0.05f, 0.06f, 0.09f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);
}

` + RESHAPE + FLOOR_SPHERES(24, 8.0) + `void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 5.0, 9.0,   0.0, 0.0, 0.0,   0.0, 1.0, 0.0);

    // Положения источников задаются после камеры - они закреплены в мире
${s ? `    GLfloat sunDir[]   = { -0.5f, 1.0f, 0.3f, 0.0f };      // w = 0: направленный
    GLfloat sunCol[]   = {  0.35f, 0.35f, 0.35f, 1.0f };   // слабый белый
    GLfloat redPos[]   = { -3.0f, 1.5f, 1.0f, 1.0f };      // w = 1: точечный
    GLfloat redCol[]   = {  1.0f, 0.15f, 0.15f, 1.0f };
    GLfloat bluePos[]  = {  3.0f, 1.5f, 1.0f, 1.0f };
    GLfloat blueCol[]  = {  0.2f, 0.3f, 1.0f, 1.0f };

    glEnable(GL_LIGHT0);
    glLightfv(GL_LIGHT0, GL_POSITION, sunDir);
    glLightfv(GL_LIGHT0, GL_DIFFUSE, sunCol);

    glEnable(GL_LIGHT1);
    glLightfv(GL_LIGHT1, GL_POSITION, redPos);
    glLightfv(GL_LIGHT1, GL_DIFFUSE, redCol);
    glLightf(GL_LIGHT1, GL_CONSTANT_ATTENUATION, 1.0f);    // 1 / (kc + kl*d + kq*d^2)
    glLightf(GL_LIGHT1, GL_LINEAR_ATTENUATION, 0.1f);
    glLightf(GL_LIGHT1, GL_QUADRATIC_ATTENUATION, 0.05f);

    glEnable(GL_LIGHT2);
    glLightfv(GL_LIGHT2, GL_POSITION, bluePos);
    glLightfv(GL_LIGHT2, GL_DIFFUSE, blueCol);
    glLightf(GL_LIGHT2, GL_CONSTANT_ATTENUATION, 1.0f);
    glLightf(GL_LIGHT2, GL_LINEAR_ATTENUATION, 0.1f);
    glLightf(GL_LIGHT2, GL_QUADRATIC_ATTENUATION, 0.05f);
` : `    // TODO: GL_LIGHT0 - направленный (w = 0), слабый белый (0.35, 0.35, 0.35), направление (-0.5, 1, 0.3)
    // TODO: GL_LIGHT1 - точечный красный (1, 0.15, 0.15) в точке (-3, 1.5, 1), затухание kc=1, kl=0.1, kq=0.05
    // TODO: GL_LIGHT2 - точечный синий (0.2, 0.3, 1) в точке (3, 1.5, 1), то же затухание
    // Не забудьте glEnable для каждого источника
`}
    glColor3f(0.85f, 0.85f, 0.85f);
    floorGrid();
    for (int k = -1; k <= 1; k++) {
        glPushMatrix();
            glTranslatef(2.5f * k, 0.7f, -0.5f);
            glutSolidSphere(0.7, 32, 24);
        glPopMatrix();
    }

    // Маркеры источников: маленькие светящиеся шарики (без освещения)
    glDisable(GL_LIGHTING);
    glColor3f(1.0f, 0.3f, 0.3f);
    glPushMatrix(); glTranslatef(-3.0f, 1.5f, 1.0f); glutSolidSphere(0.12, 12, 8); glPopMatrix();
    glColor3f(0.4f, 0.5f, 1.0f);
    glPushMatrix(); glTranslatef(3.0f, 1.5f, 1.0f); glutSolidSphere(0.12, 12, 8); glPopMatrix();
    glEnable(GL_LIGHTING);

    glutSwapBuffers();
}
` + MAIN("Несколько источников света", true, false);

  /* ---------- Шаг 7: прожектор ---------- */
  const s7 = (s) => HEAD + `void init() {
    glClearColor(0.03f, 0.03f, 0.05f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);
    GLfloat amb[] = { 0.08f, 0.08f, 0.10f, 1.0f };
    glLightModelfv(GL_LIGHT_MODEL_AMBIENT, amb);       // тусклый общий фон
}

` + RESHAPE + FLOOR_SPHERES(48, 6.0) + `void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 6.0, 9.0,   0.0, 0.0, 0.0,   0.0, 1.0, 0.0);

${s ? `    GLfloat pos[]  = { -2.0f, 5.0f, 3.0f, 1.0f };      // лампа над сценой (w = 1)
    GLfloat dir[]  = {  2.0f, -5.0f, -3.0f };          // направление на точку (0, 0, 0)
    GLfloat col[]  = {  1.0f, 0.95f, 0.8f, 1.0f };

    glEnable(GL_LIGHT0);
    glLightfv(GL_LIGHT0, GL_POSITION, pos);
    glLightfv(GL_LIGHT0, GL_SPOT_DIRECTION, dir);
    glLightf(GL_LIGHT0, GL_SPOT_CUTOFF, 22.0f);        // половина угла при вершине конуса
    glLightf(GL_LIGHT0, GL_SPOT_EXPONENT, 15.0f);      // концентрация света к оси
    glLightfv(GL_LIGHT0, GL_DIFFUSE, col);
` : `    // TODO: GL_LIGHT0 - прожектор в точке (-2, 5, 3), направленный на начало координат:
    //       GL_SPOT_DIRECTION (2, -5, -3), GL_SPOT_CUTOFF 22, GL_SPOT_EXPONENT 15,
    //       цвет GL_DIFFUSE (1, 0.95, 0.8). Включите источник (glEnable).
`}
    glColor3f(0.8f, 0.8f, 0.8f);
    floorGrid();

    glColor3f(0.9f, 0.3f, 0.2f);
    glPushMatrix();
        glTranslatef(0.0f, 0.6f, 0.0f);
        glutSolidCube(1.2);
    glPopMatrix();
    glColor3f(0.3f, 0.6f, 0.95f);
    glPushMatrix();
        glTranslatef(-2.0f, 0.5f, 0.5f);
        glutSolidSphere(0.5, 32, 24);
    glPopMatrix();
    glColor3f(0.4f, 0.85f, 0.4f);
    glPushMatrix();
        glTranslatef(2.0f, 0.4f, -0.5f);
        glRotatef(90.0f, 1.0f, 0.0f, 0.0f);
        glutSolidTorus(0.2, 0.5, 20, 32);
    glPopMatrix();

    glutSwapBuffers();
}
` + MAIN("Прожектор", true, false);

  /* ---------- Шаг 8: материалы ---------- */
  const s8 = (s) => HEAD + `void init() {
    glClearColor(0.12f, 0.13f, 0.18f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);               // белый источник, диффузный и зеркальный цвет (1,1,1,1)
    glEnable(GL_NORMALIZE);
}

// Параметры материалов (стандартная таблица материалов OpenGL)
GLfloat goldA[] = { 0.24725f, 0.1995f, 0.0745f, 1.0f };
GLfloat goldD[] = { 0.75164f, 0.60648f, 0.22648f, 1.0f };
GLfloat goldS[] = { 0.628281f, 0.555802f, 0.366065f, 1.0f };
GLfloat plasA[] = { 0.0f, 0.0f, 0.0f, 1.0f };
GLfloat plasD[] = { 0.5f, 0.0f, 0.0f, 1.0f };
GLfloat plasS[] = { 0.7f, 0.6f, 0.6f, 1.0f };
GLfloat rubA[]  = { 0.0f, 0.05f, 0.0f, 1.0f };
GLfloat rubD[]  = { 0.4f, 0.5f, 0.4f, 1.0f };
GLfloat rubS[]  = { 0.04f, 0.7f, 0.04f, 1.0f };
GLfloat white[] = { 1.0f, 1.0f, 1.0f, 1.0f };

` + RESHAPE + `void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 1.5, 9.0,   0.0, 0.0, 0.0,   0.0, 1.0, 0.0);
    GLfloat lightPos[] = { -3.0f, 4.0f, 6.0f, 1.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    // 1. Золото
    glPushMatrix();
        glTranslatef(-3.45f, 0.0f, 0.0f);
${s ? `        glMaterialfv(GL_FRONT, GL_AMBIENT, goldA);
        glMaterialfv(GL_FRONT, GL_DIFFUSE, goldD);
        glMaterialfv(GL_FRONT, GL_SPECULAR, goldS);
        glMaterialf(GL_FRONT, GL_SHININESS, 51.2f);
` : `        // TODO: золото: ambient goldA, diffuse goldD, specular goldS, shininess 51.2
`}        glutSolidSphere(1.0, 40, 30);
    glPopMatrix();

    // 2. Красный пластик
    glPushMatrix();
        glTranslatef(-1.15f, 0.0f, 0.0f);
${s ? `        glMaterialfv(GL_FRONT, GL_AMBIENT, plasA);
        glMaterialfv(GL_FRONT, GL_DIFFUSE, plasD);
        glMaterialfv(GL_FRONT, GL_SPECULAR, plasS);
        glMaterialf(GL_FRONT, GL_SHININESS, 32.0f);
` : `        // TODO: красный пластик: plasA, plasD, plasS, shininess 32
`}        glutSolidSphere(1.0, 40, 30);
    glPopMatrix();

    // 3. Зелёная резина
    glPushMatrix();
        glTranslatef(1.15f, 0.0f, 0.0f);
${s ? `        glMaterialfv(GL_FRONT, GL_AMBIENT, rubA);
        glMaterialfv(GL_FRONT, GL_DIFFUSE, rubD);
        glMaterialfv(GL_FRONT, GL_SPECULAR, rubS);
        glMaterialf(GL_FRONT, GL_SHININESS, 10.0f);
` : `        // TODO: зелёная резина: rubA, rubD, rubS, shininess 10
`}        glutSolidSphere(1.0, 40, 30);
    glPopMatrix();

    // 4. Глянцевый синий шар: цвет из glColor через GL_COLOR_MATERIAL
    glPushMatrix();
        glTranslatef(3.45f, 0.0f, 0.0f);
${s ? `        glMaterialfv(GL_FRONT, GL_SPECULAR, white);       // блик и блеск задаём явно
        glMaterialf(GL_FRONT, GL_SHININESS, 80.0f);
        glEnable(GL_COLOR_MATERIAL);
        glColorMaterial(GL_FRONT, GL_AMBIENT_AND_DIFFUSE);
        glColor3f(0.20f, 0.40f, 0.90f);
` : `        // TODO: белый блик (white), shininess 80; затем GL_COLOR_MATERIAL с режимом
        //       GL_AMBIENT_AND_DIFFUSE и цвет glColor3f(0.2, 0.4, 0.9)
`}        glutSolidSphere(1.0, 40, 30);
        glDisable(GL_COLOR_MATERIAL);
    glPopMatrix();

    glutSwapBuffers();
}
` + MAIN("Материалы", true, false);

  LAB.define({
    n: 12,
    title: "Преобразования объектов, материалы и освещение в OpenGL",
    steps: [
      {
        id: "s0", kind: "example", title: "Пример: освещённая сцена",
        text: "<p>Запустите программу. Чайник вращается, шар неподвижен; оба освещены точечным источником. Обратите внимание на структуру: <code>reshape</code> задаёт матрицу проекции (<code>gluPerspective</code>), а <code>display</code> — камеру (<code>gluLookAt</code>), положение источника и преобразования объектов в блоках <code>glPushMatrix</code>/<code>glPopMatrix</code>.</p><ul><li>Положение источника задано <b>после</b> <code>gluLookAt</code>, поэтому он закреплён в мире, а не на камере.</li><li>Цвет объектов берётся из <code>glColor</code> благодаря <code>GL_COLOR_MATERIAL</code>; белый блик и показатель блеска заданы один раз в <code>init</code>.</li></ul>",
        code: ex
      },
      {
        id: "s1", kind: "task", title: "Задание 1: порядок преобразований",
        text: "<p>Два чайника получают одни и те же команды — <code>glTranslatef(3, 0, 0)</code> и <code>glRotatef(60, 0, 1, 0)</code>, но в разном порядке. Красному (T·R) задайте сначала сдвиг, затем поворот; зелёному (R·T) — сначала поворот, затем сдвиг.</p><p>Сравните положения: какой из чайников остался на оси X, а какой «переехал» по окружности?</p>",
        hint: "Матрица, объявленная последней, применяется к вершинам первой. Поэтому «сдвиг, потом поворот» в коде означает: сначала объект поворачивается вокруг собственного центра, а затем переносится.",
        check: { type: "both", calls: { "glTranslatef": ">=2", "glRotatef": ">=2", "glPushMatrix": ">=2" } },
        starter: s1(false), solution: s1(true)
      },
      {
        id: "s2", kind: "task", title: "Задание 2: иерархия «Солнце — Земля — Луна»",
        text: "<p>Солнце уже нарисовано. Добавьте Землю, вращающуюся вокруг Солнца по орбите радиусом 4, и Луну, вращающуюся вокруг Земли по орбите радиусом 1.3.</p><ul><li>Суточное вращение (<code>day</code>) должно касаться только Земли, но не Луны — сохраните матрицу <code>glPushMatrix</code> и восстановите <code>glPopMatrix</code>.</li><li>Орбита Луны задаётся <b>относительно Земли</b>: преобразования Земли (орбитальные) остаются в силе.</li></ul>",
        hint: "Порядок: glRotatef(year) → glTranslatef(4,0,0) → [push: glRotatef(day), нарисовать Землю, pop] → glRotatef(month) → glTranslatef(1.3,0,0) → нарисовать Луну.",
        check: { type: "both", calls: { "glPushMatrix": ">=2", "glPopMatrix": ">=2", "glutSolidSphere": ">=3" } },
        starter: s2(false), solution: s2(true)
      },
      {
        id: "s3", kind: "task", title: "Задание 3: камера и проекции",
        text: "<p>Разделите окно на две части с помощью <code>glViewport</code>. Слева сцену нужно показать в ортографической проекции (<code>glOrtho</code>), справа — в перспективной (<code>gluPerspective</code>). Камера в обеих частях одна и та же: <code>gluLookAt(4, 3.5, 7,  0, 0, -5,  0, 1, 0)</code>.</p><p>Пропорции <code>aspect</code> считаются по <b>половине</b> окна. Сравните: как изменяются размеры одинаковых кубов с удалением?</p>",
        hint: "В каждой половине повторите последовательность: glViewport → glMatrixMode(GL_PROJECTION), glLoadIdentity, проекция → glMatrixMode(GL_MODELVIEW), glLoadIdentity, gluLookAt → drawScene().",
        check: { type: "both", calls: { "glViewport": ">=2", "glOrtho": ">=1", "gluPerspective": ">=1", "gluLookAt": ">=2" } },
        starter: s3(false), solution: s3(true)
      },
      {
        id: "s4", kind: "task", title: "Задание 4: нормали куба и пирамиды",
        text: "<p>Куб и пирамида заданы вершинами, но без нормалей, поэтому все грани освещены одинаково (нормаль по умолчанию — (0, 0, 1)). Задайте <code>glNormal3f</code> для каждой грани (значения указаны в комментариях). Пирамида нарисована с <code>glScalef</code>, а нормали (0, 2, 3) и т. п. не единичны — включите <code>GL_NORMALIZE</code>.</p>",
        hint: "glNormal3f вызывается ПЕРЕД вершинами грани и действует на все последующие вершины, пока не будет задана новая нормаль.",
        check: { type: "both", calls: { "glNormal3f": ">=11" }, source: [{ re: "GL_NORMALIZE", msg: "Включите нормализацию нормалей: glEnable(GL_NORMALIZE)" }] },
        starter: s4(false), solution: s4(true)
      },
      {
        id: "s5", kind: "task", title: "Задание 5: GL_FLAT и GL_SMOOTH",
        text: "<p>Конус из 12 граней нарисован дважды. Задайте нормали в вершинах (формула в комментарии: в вершинах основания — нормаль гладкой поверхности, в вершине конуса — нормаль грани), а затем включите <code>GL_FLAT</code> для левого и <code>GL_SMOOTH</code> для правого конуса.</p><p>Объясните, почему в режиме <code>GL_FLAT</code> грани видны, а цвет каждой грани постоянен.</p>",
        hint: "Нормаль для угла a: glNormal3f(2*cosf(a), 1, 2*sinf(a)). Углы: a1 — первая вершина, a0 — вторая, am — вершина конуса.",
        check: { type: "both", calls: { "glShadeModel": ">=2", "glNormal3f": ">=36" } },
        starter: s5(false), solution: s5(true)
      },
      {
        id: "s6", kind: "task", title: "Задание 6: несколько источников света",
        text: "<p>Освещение выключено — сцена почти чёрная. Настройте три источника: слабый белый направленный (<code>GL_LIGHT0</code>), красный точечный (<code>GL_LIGHT1</code>) и синий точечный (<code>GL_LIGHT2</code>) с затуханием. Включите каждый источник.</p><p>Обратите внимание: у <code>GL_LIGHT1</code> и <code>GL_LIGHT2</code> диффузный цвет по умолчанию чёрный, поэтому без <code>glLightfv(…, GL_DIFFUSE, …)</code> они ничего не осветят.</p>",
        hint: "У направленного источника w = 0, у точечного w = 1. Затухание: glLightf(GL_LIGHT1, GL_CONSTANT_ATTENUATION | GL_LINEAR_ATTENUATION | GL_QUADRATIC_ATTENUATION, значение).",
        check: { type: "both", calls: { "glLightfv": ">=6", "glLightf": ">=6" } },
        starter: s6(false), solution: s6(true)
      },
      {
        id: "s7", kind: "task", title: "Задание 7: прожектор",
        text: "<p>Сделайте из <code>GL_LIGHT0</code> прожектор: расположите его в точке (−2, 5, 3), направьте на начало координат, задайте угол отсечения 22° и показатель концентрации 15, цвет — тёплый белый.</p><p>Дополнительно (без автопроверки): перенесите вызовы <code>glLightfv</code> выше <code>gluLookAt</code> и объясните, почему «фонарик» теперь движется вместе с камерой.</p>",
        hint: "GL_SPOT_DIRECTION задаётся вектором из трёх компонент через glLightfv, GL_SPOT_CUTOFF и GL_SPOT_EXPONENT — одним числом через glLightf.",
        check: { type: "both", calls: { "glLightfv": ">=3", "glLightf": ">=2" } },
        starter: s7(false), solution: s7(true)
      },
      {
        id: "s8", kind: "task", title: "Задание 8: материалы и glColorMaterial",
        text: "<p>Четыре шара пока одинаковые. Первым трём задайте материалы «золото», «красный пластик» и «зелёная резина» с помощью <code>glMaterialfv</code> (<code>GL_AMBIENT</code>, <code>GL_DIFFUSE</code>, <code>GL_SPECULAR</code>) и <code>glMaterialf(GL_SHININESS)</code>; массивы параметров уже объявлены.</p><p>Четвёртый шар сделайте глянцевым синим: белый блик и <code>GL_SHININESS = 80</code> задайте явно, а фоновый и рассеянный цвета получите из <code>glColor3f(0.2, 0.4, 0.9)</code> через <code>glEnable(GL_COLOR_MATERIAL)</code> и <code>glColorMaterial(GL_FRONT, GL_AMBIENT_AND_DIFFUSE)</code>.</p>",
        hint: "Материал, заданный glMaterial*, действует на все последующие вершины, пока не будет изменён. Режим GL_COLOR_MATERIAL перехватывает только указанные компоненты (здесь — ambient и diffuse), остальные остаются прежними.",
        check: { type: "both", calls: { "glMaterialfv": ">=10", "glMaterialf": ">=4", "glColorMaterial": ">=1" } },
        starter: s8(false), solution: s8(true)
      }
    ]
  });
})();
