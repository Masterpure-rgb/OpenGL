/* Лабораторная 13: Текстурирование и операции с пикселами в OpenGL */
(function () {

// ---------- общие фрагменты кода ----------
var CUBE_DATA = `float V[8][3] = { {-1,-1,-1}, {1,-1,-1}, {1,1,-1}, {-1,1,-1},
                  {-1,-1, 1}, {1,-1, 1}, {1,1, 1}, {-1,1, 1} };
int   F[6][4] = { {4,5,6,7}, {1,0,3,2}, {0,4,7,3}, {5,1,2,6}, {3,7,6,2}, {0,1,5,4} };
float N[6][3] = { {0,0,1}, {0,0,-1}, {-1,0,0}, {1,0,0}, {0,1,0}, {0,-1,0} };
float T[4][2] = { {0,0}, {1,0}, {1,1}, {0,1} };
`;

var CHECKER_FN = `// Процедурная текстура 8x8: шахматная доска оранжевого и кремового цветов
void makeChecker() {
    GLubyte img[8][8][3];
    for (int i = 0; i < 8; i++)
        for (int j = 0; j < 8; j++) {
            bool dark = (i + j) % 2 == 0;
            img[i][j][0] = dark ? 220 : 250;
            img[i][j][1] = dark ? 110 : 235;
            img[i][j][2] = dark ?  20 : 200;
        }
    glGenTextures(1, &tex);
    glBindTexture(GL_TEXTURE_2D, tex);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, 8, 8, 0, GL_RGB, GL_UNSIGNED_BYTE, img);
}
`;

var LOAD_FN_DONE = `// Загрузка текстуры из файла: строки переворачиваются, строятся мип-уровни
GLuint loadTexture(const char* file) {
    int w, h, n;
    stbi_set_flip_vertically_on_load(1);
    unsigned char* data = stbi_load(file, &w, &h, &n, 3);
    GLuint id;
    glGenTextures(1, &id);
    glBindTexture(GL_TEXTURE_2D, id);
    gluBuild2DMipmaps(GL_TEXTURE_2D, GL_RGB, w, h, GL_RGB, GL_UNSIGNED_BYTE, data);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    stbi_image_free(data);
    return id;
}
`;

var MAIN3D = function (title, extra) {
  return `int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH);
    glutInitWindowSize(480, 360);
    glutCreateWindow("${title}");
${extra || ""}    glutDisplayFunc(display);
    glutIdleFunc(idle);
    glutMainLoop();
    return 0;
}
`;
};

var IDLE = `void idle() { glutPostRedisplay(); }
`;

LAB.define({
  n: 13,
  title: "Текстурирование и операции с пикселами в OpenGL",
  steps: [
    // ===================== ПРИМЕР =====================
    {
      id: "s0", kind: "example", title: "Пример: текстурированный квадрат",
      text: "<p>Программа создаёт текстуру размером 8×8 текселей из массива <code>GLubyte</code>, настраивает фильтрацию и накладывает её на квадрат. Обратите внимание на порядок действий: <code>glGenTextures</code> → <code>glBindTexture</code> → параметры → <code>glTexImage2D</code>; перед рисованием нужно включить <code>GL_TEXTURE_2D</code>, а каждой вершине задать текстурные координаты <code>glTexCoord2f</code> до вызова <code>glVertex</code>.</p><p>Измените координаты в углах квадрата на (0;0)…(3;3) и добавьте <code>GL_REPEAT</code>-режим (он включён по умолчанию): шахматка повторится 3×3 раза. Затем замените фильтр <code>GL_NEAREST</code> на <code>GL_LINEAR</code> и посмотрите, как изменятся границы клеток.</p>",
      code: `#include <GL/glut.h>

GLuint tex;

` + CHECKER_FN + `
void display() {
    glClearColor(0.15f, 0.17f, 0.22f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);

    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, tex);
    glColor3f(1.0f, 1.0f, 1.0f);      // белый цвет не искажает текстуру

    glBegin(GL_QUADS);
        glTexCoord2f(0.0f, 0.0f); glVertex2f(-0.8f, -0.8f);
        glTexCoord2f(1.0f, 0.0f); glVertex2f( 0.8f, -0.8f);
        glTexCoord2f(1.0f, 1.0f); glVertex2f( 0.8f,  0.8f);
        glTexCoord2f(0.0f, 1.0f); glVertex2f(-0.8f,  0.8f);
    glEnd();
    glDisable(GL_TEXTURE_2D);
    glFlush();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);
    glutInitWindowSize(400, 400);
    glutCreateWindow("Текстура на квадрате");
    makeChecker();
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`
    },

    // ===================== ЗАДАНИЕ 1 =====================
    {
      id: "s1", kind: "task", title: "Задание 1: текстура на кубе",
      text: "<p>Куб нарисован по таблицам вершин и граней, но все вершины имеют одинаковые (нулевые) текстурные координаты, поэтому каждая грань залита одним текселем.</p><ul><li>Для каждой из шести граней задайте координаты из массива <code>T[4][2]</code> перед соответствующей вершиной (<code>glTexCoord2f</code>).</li><li>Включите <code>GL_TEXTURE_2D</code> и свяжите текстуру <code>tex</code> (в заготовке она уже создана).</li></ul>",
      hint: "Внутри цикла по вершинам грани: glTexCoord2f(T[k][0], T[k][1]); glVertex3fv(V[F[i][k]]). Текстура должна быть включена до glBegin.",
      check: { type: "both", calls: { "glTexCoord2f": ">=24", "glEnable": ">=1" }, source: [{ re: "GL_TEXTURE_2D\\s*\\)\\s*;[\\s\\S]*glBegin", msg: "Включите GL_TEXTURE_2D до glBegin" }] },
      starter: `#include <GL/glut.h>

GLuint tex;
` + CUBE_DATA + `
` + CHECKER_FN + `
void display() {
    glClearColor(0.15f, 0.17f, 0.22f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glTranslatef(0, 0, -5);
    float a = glutGet(GLUT_ELAPSED_TIME) * 0.03f;
    glRotatef(25, 1, 0, 0);
    glRotatef(a, 0, 1, 0);

    // TODO: включите текстурирование и свяжите текстуру tex
    glColor3f(1, 1, 1);
    glBegin(GL_QUADS);
    for (int i = 0; i < 6; i++)
        for (int k = 0; k < 4; k++) {
            // TODO: задайте текстурные координаты вершины из T[k]
            glVertex3fv(V[F[i][k]]);
        }
    glEnd();
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, (double)w / h, 0.1, 50.0);
}

` + IDLE + MAIN3D("Куб с текстурой", `    makeChecker();
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`),
      solution: `#include <GL/glut.h>

GLuint tex;
` + CUBE_DATA + `
` + CHECKER_FN + `
void display() {
    glClearColor(0.15f, 0.17f, 0.22f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glTranslatef(0, 0, -5);
    float a = glutGet(GLUT_ELAPSED_TIME) * 0.03f;
    glRotatef(25, 1, 0, 0);
    glRotatef(a, 0, 1, 0);

    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, tex);
    glColor3f(1, 1, 1);
    glBegin(GL_QUADS);
    for (int i = 0; i < 6; i++)
        for (int k = 0; k < 4; k++) {
            glTexCoord2f(T[k][0], T[k][1]);
            glVertex3fv(V[F[i][k]]);
        }
    glEnd();
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, (double)w / h, 0.1, 50.0);
}

` + IDLE + MAIN3D("Куб с текстурой", `    makeChecker();
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`)
    },

    // ===================== ЗАДАНИЕ 2 =====================
    {
      id: "s2", kind: "task", title: "Задание 2: изображение из файла, GL_MODULATE и GL_REPLACE",
      text: "<p>Напишите функцию загрузки текстуры из файла <code>crate.png</code> и нарисуйте два освещённых ящика.</p><ul><li>Загрузите изображение через <code>stbi_load</code> (3 компонента), включив переворот строк <code>stbi_set_flip_vertically_on_load(1)</code>; передайте данные в <code>glTexImage2D</code> и задайте фильтры <code>GL_LINEAR</code> (без мип-уровней фильтр по умолчанию делает текстуру неполной).</li><li>Левый куб рисуйте с режимом <code>GL_MODULATE</code>, правый — с <code>GL_REPLACE</code> через <code>glTexEnvi</code>. Сравните: у какого из них видно освещение?</li></ul>",
      hint: "glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_REPLACE); для загрузки: glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, w, h, 0, GL_RGB, GL_UNSIGNED_BYTE, data).",
      check: { type: "both", calls: { "glTexEnvi": ">=2" },
        source: [{ re: "glTexImage2D\\s*\\(", msg: "Передайте изображение в glTexImage2D" }, { re: "stbi_set_flip_vertically_on_load\\s*\\(\\s*1", msg: "Включите переворот строк: stbi_set_flip_vertically_on_load(1)" }, { re: "GL_REPLACE", msg: "Для правого куба нужен режим GL_REPLACE" }, { re: "GL_MODULATE", msg: "Для левого куба нужен режим GL_MODULATE" }] },
      starter: `#include <GL/glut.h>

GLuint tex;
` + CUBE_DATA + `
GLuint loadTexture(const char* file) {
    int w, h, n;
    // TODO: включите переворот строк при загрузке
    unsigned char* data = stbi_load(file, &w, &h, &n, 3);
    GLuint id;
    glGenTextures(1, &id);
    glBindTexture(GL_TEXTURE_2D, id);
    // TODO: передайте data в glTexImage2D (GL_RGB, w x h) и задайте фильтры GL_LINEAR
    stbi_image_free(data);
    return id;
}

void cube() {
    glBegin(GL_QUADS);
    for (int i = 0; i < 6; i++) {
        glNormal3fv(N[i]);
        for (int k = 0; k < 4; k++) {
            glTexCoord2f(T[k][0], T[k][1]);
            glVertex3fv(V[F[i][k]]);
        }
    }
    glEnd();
}

void display() {
    glClearColor(0.15f, 0.17f, 0.22f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glTranslatef(0, 0, -7);
    float a = glutGet(GLUT_ELAPSED_TIME) * 0.03f;

    GLfloat pos[] = { 2.0f, 3.0f, 4.0f, 0.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, pos);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, tex);
    glColor3f(1, 1, 1);

    glPushMatrix();
    glTranslatef(-1.7f, 0, 0);
    glRotatef(25, 1, 0, 0); glRotatef(a, 0, 1, 0);
    // TODO: режим GL_MODULATE
    cube();
    glPopMatrix();

    glPushMatrix();
    glTranslatef(1.7f, 0, 0);
    glRotatef(25, 1, 0, 0); glRotatef(a, 0, 1, 0);
    // TODO: режим GL_REPLACE
    cube();
    glPopMatrix();
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, (double)w / h, 0.1, 50.0);
}

` + IDLE + MAIN3D("Ящики: MODULATE и REPLACE", `    tex = loadTexture("crate.png");
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`),
      solution: `#include <GL/glut.h>

GLuint tex;
` + CUBE_DATA + `
GLuint loadTexture(const char* file) {
    int w, h, n;
    stbi_set_flip_vertically_on_load(1);
    unsigned char* data = stbi_load(file, &w, &h, &n, 3);
    GLuint id;
    glGenTextures(1, &id);
    glBindTexture(GL_TEXTURE_2D, id);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, w, h, 0, GL_RGB, GL_UNSIGNED_BYTE, data);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    stbi_image_free(data);
    return id;
}

void cube() {
    glBegin(GL_QUADS);
    for (int i = 0; i < 6; i++) {
        glNormal3fv(N[i]);
        for (int k = 0; k < 4; k++) {
            glTexCoord2f(T[k][0], T[k][1]);
            glVertex3fv(V[F[i][k]]);
        }
    }
    glEnd();
}

void display() {
    glClearColor(0.15f, 0.17f, 0.22f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glTranslatef(0, 0, -7);
    float a = glutGet(GLUT_ELAPSED_TIME) * 0.03f;

    GLfloat pos[] = { 2.0f, 3.0f, 4.0f, 0.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, pos);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, tex);
    glColor3f(1, 1, 1);

    glPushMatrix();
    glTranslatef(-1.7f, 0, 0);
    glRotatef(25, 1, 0, 0); glRotatef(a, 0, 1, 0);
    glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE);
    cube();
    glPopMatrix();

    glPushMatrix();
    glTranslatef(1.7f, 0, 0);
    glRotatef(25, 1, 0, 0); glRotatef(a, 0, 1, 0);
    glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_REPLACE);
    cube();
    glPopMatrix();
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, (double)w / h, 0.1, 50.0);
}

` + IDLE + MAIN3D("Ящики: MODULATE и REPLACE", `    tex = loadTexture("crate.png");
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`)
    },

    // ===================== ЗАДАНИЕ 3 =====================
    {
      id: "s3", kind: "task", title: "Задание 3: пол из плиток, GL_REPEAT и туман",
      text: "<p>Огромный пол растянут одной плиткой, а у горизонта виден резкий край. Исправьте это.</p><ul><li>Задайте координаты 0…8 по осям S и T, чтобы плитка <code>tiles.png</code> повторилась 8×8 раз, и установите режим <code>GL_REPEAT</code> для обеих осей (в заготовке стоит <code>GL_CLAMP_TO_EDGE</code>).</li><li>Включите линейный туман <code>GL_FOG</code> цвета фона: <code>GL_FOG_START</code> = 4, <code>GL_FOG_END</code> = 26.</li></ul>",
      hint: "Туман задаётся так: glFogi(GL_FOG_MODE, GL_LINEAR); glFogfv(GL_FOG_COLOR, цвет); glFogf(GL_FOG_START, …); glFogf(GL_FOG_END, …); glEnable(GL_FOG).",
      check: { type: "both", calls: { "glFogf": ">=2", "glFogfv": ">=1", "glFogi|glFogf": ">=3" },
        source: [{ re: "GL_REPEAT", msg: "Нужен режим повторения GL_REPEAT" }, { re: "glEnable\\s*\\(\\s*GL_FOG", msg: "Включите туман: glEnable(GL_FOG)" }] },
      starter: `#include <GL/glut.h>

GLuint tex;
` + LOAD_FN_DONE + `
void display() {
    GLfloat haze[] = { 0.70f, 0.78f, 0.88f, 1.0f };   // цвет неба и тумана
    glClearColor(haze[0], haze[1], haze[2], 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0, 1.3, 4,  0, 0.6, -10,  0, 1, 0);

    // TODO: включите линейный туман цвета haze (start = 4, end = 26)

    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, tex);
    // TODO: режим повторения GL_REPEAT по S и T
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    glColor3f(1, 1, 1);
    glBegin(GL_QUADS);
        glTexCoord2f(0, 0); glVertex3f(-12, 0,  6);
        glTexCoord2f(1, 0); glVertex3f( 12, 0,  6);
        glTexCoord2f(1, 1); glVertex3f( 12, 0, -40);   // TODO: координаты 0..8
        glTexCoord2f(0, 1); glVertex3f(-12, 0, -40);
    glEnd();
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(50.0, (double)w / h, 0.1, 100.0);
}

` + IDLE + MAIN3D("Пол из плиток", `    tex = loadTexture("tiles.png");
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`),
      solution: `#include <GL/glut.h>

GLuint tex;
` + LOAD_FN_DONE + `
void display() {
    GLfloat haze[] = { 0.70f, 0.78f, 0.88f, 1.0f };   // цвет неба и тумана
    glClearColor(haze[0], haze[1], haze[2], 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0, 1.3, 4,  0, 0.6, -10,  0, 1, 0);

    glEnable(GL_FOG);
    glFogi(GL_FOG_MODE, GL_LINEAR);
    glFogfv(GL_FOG_COLOR, haze);
    glFogf(GL_FOG_START, 4.0f);
    glFogf(GL_FOG_END, 26.0f);

    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, tex);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
    glColor3f(1, 1, 1);
    glBegin(GL_QUADS);
        glTexCoord2f(0, 0); glVertex3f(-12, 0,  6);
        glTexCoord2f(8, 0); glVertex3f( 12, 0,  6);
        glTexCoord2f(8, 8); glVertex3f( 12, 0, -40);
        glTexCoord2f(0, 8); glVertex3f(-12, 0, -40);
    glEnd();
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(50.0, (double)w / h, 0.1, 100.0);
}

` + IDLE + MAIN3D("Пол из плиток", `    tex = loadTexture("tiles.png");
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`)
    },

    // ===================== ЗАДАНИЕ 4 =====================
    {
      id: "s4", kind: "task", title: "Задание 4: фильтрация и мип-уровни",
      text: "<p>Наклонная шахматная плоскость нарисована дважды: слева — текстура с фильтром <code>GL_NEAREST</code> без мип-уровней (видны муар и шум вдали), справа должна быть та же картинка с мип-уровнями. Сейчас правая половина белая: после <code>glTexImage2D</code> текстура <b>неполная</b> — фильтр по умолчанию <code>GL_NEAREST_MIPMAP_LINEAR</code> требует цепочки мип-уровней, а их нет.</p><ul><li>Для правой текстуры вместо <code>glTexImage2D</code> вызовите <code>gluBuild2DMipmaps</code>.</li><li>Задайте <code>GL_TEXTURE_MIN_FILTER</code> = <code>GL_LINEAR_MIPMAP_LINEAR</code>, <code>GL_TEXTURE_MAG_FILTER</code> = <code>GL_LINEAR</code>.</li></ul>",
      hint: "gluBuild2DMipmaps(GL_TEXTURE_2D, GL_RGB, w, h, GL_RGB, GL_UNSIGNED_BYTE, data) заменяет glTexImage2D и создаёт все уровни до 1×1.",
      check: { type: "both", calls: { "glBindTexture": ">=2" }, source: [{ re: "gluBuild2DMipmaps\\s*\\(", msg: "Постройте мип-уровни: gluBuild2DMipmaps" }, { re: "GL_LINEAR_MIPMAP_LINEAR", msg: "Используйте минифицирующий фильтр GL_LINEAR_MIPMAP_LINEAR" }] },
      starter: `#include <GL/glut.h>

GLuint texA, texB;

void init() {
    int w, h, n;
    unsigned char* data = stbi_load("checker.png", &w, &h, &n, 3);
    glGenTextures(1, &texA);
    glBindTexture(GL_TEXTURE_2D, texA);          // левая: без мип-уровней, GL_NEAREST
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, w, h, 0, GL_RGB, GL_UNSIGNED_BYTE, data);

    glGenTextures(1, &texB);
    glBindTexture(GL_TEXTURE_2D, texB);          // правая: нужны мип-уровни
    // TODO: замените glTexImage2D на gluBuild2DMipmaps и задайте фильтры
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, w, h, 0, GL_RGB, GL_UNSIGNED_BYTE, data);
    stbi_image_free(data);
}

void plane(float x0, float x1) {
    glBegin(GL_QUADS);
        glTexCoord2f(0, 0);   glVertex3f(x0, 0,  5);
        glTexCoord2f(3, 0);   glVertex3f(x1, 0,  5);
        glTexCoord2f(3, 30);  glVertex3f(x1, 0, -60);
        glTexCoord2f(0, 30);  glVertex3f(x0, 0, -60);
    glEnd();
}

void display() {
    glClearColor(0.55f, 0.65f, 0.8f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0, 1.2, 5,  0, 0.3, -10,  0, 1, 0);
    glEnable(GL_TEXTURE_2D);
    glColor3f(1, 1, 1);
    glBindTexture(GL_TEXTURE_2D, texA);
    plane(-6, -0.05f);
    glBindTexture(GL_TEXTURE_2D, texB);
    plane(0.05f, 6);
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(55.0, (double)w / h, 0.1, 100.0);
}

` + IDLE + MAIN3D("Мип-уровни", `    init();
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`),
      solution: `#include <GL/glut.h>

GLuint texA, texB;

void init() {
    int w, h, n;
    unsigned char* data = stbi_load("checker.png", &w, &h, &n, 3);
    glGenTextures(1, &texA);
    glBindTexture(GL_TEXTURE_2D, texA);          // левая: без мип-уровней, GL_NEAREST
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, w, h, 0, GL_RGB, GL_UNSIGNED_BYTE, data);

    glGenTextures(1, &texB);
    glBindTexture(GL_TEXTURE_2D, texB);          // правая: нужны мип-уровни
    gluBuild2DMipmaps(GL_TEXTURE_2D, GL_RGB, w, h, GL_RGB, GL_UNSIGNED_BYTE, data);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    stbi_image_free(data);
}

void plane(float x0, float x1) {
    glBegin(GL_QUADS);
        glTexCoord2f(0, 0);   glVertex3f(x0, 0,  5);
        glTexCoord2f(3, 0);   glVertex3f(x1, 0,  5);
        glTexCoord2f(3, 30);  glVertex3f(x1, 0, -60);
        glTexCoord2f(0, 30);  glVertex3f(x0, 0, -60);
    glEnd();
}

void display() {
    glClearColor(0.55f, 0.65f, 0.8f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0, 1.2, 5,  0, 0.3, -10,  0, 1, 0);
    glEnable(GL_TEXTURE_2D);
    glColor3f(1, 1, 1);
    glBindTexture(GL_TEXTURE_2D, texA);
    plane(-6, -0.05f);
    glBindTexture(GL_TEXTURE_2D, texB);
    plane(0.05f, 6);
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(55.0, (double)w / h, 0.1, 100.0);
}

` + IDLE + MAIN3D("Мип-уровни", `    init();
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`)
    },

    // ===================== ЗАДАНИЕ 5 =====================
    {
      id: "s5", kind: "task", title: "Задание 5: текстура на сфере (квадрики GLU)",
      text: "<p>Превратите белую сферу в глобус.</p><ul><li>Включите генерацию текстурных координат квадрики: <code>gluQuadricTexture(q, GL_TRUE)</code>.</li><li>Включите текстурирование и свяжите текстуру <code>earth.png</code> (функция <code>loadTexture</code> уже есть). Режим <code>GL_MODULATE</code> сохранит освещение.</li><li>Ось квадрики-сферы — это <i>z</i>; поверните сферу на −90° вокруг оси <i>x</i>, чтобы полюса были сверху и снизу, и добавьте вращение вокруг её оси на угол <code>a</code>.</li></ul>",
      hint: "Порядок: glRotatef(-90, 1, 0, 0); затем glRotatef(a, 0, 0, 1) — вращение вокруг оси сферы; gluSphere(q, 1.5, 48, 32).",
      check: { type: "both", calls: { "gluSphere": ">=1", "glBindTexture": ">=1" }, source: [{ re: "gluQuadricTexture\\s*\\(\\s*\\w+\\s*,\\s*GL_TRUE", msg: "Включите gluQuadricTexture(q, GL_TRUE)" }] },
      starter: `#include <GL/glut.h>

GLuint tex;
` + LOAD_FN_DONE + `
void display() {
    glClearColor(0.02f, 0.03f, 0.08f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glTranslatef(0, 0, -5);
    float a = glutGet(GLUT_ELAPSED_TIME) * 0.02f + 150;

    GLfloat pos[] = { 1.0f, 1.0f, 4.0f, 0.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, pos);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);

    GLUquadric* q = gluNewQuadric();
    // TODO: включите текстурные координаты квадрики
    // TODO: включите текстурирование, свяжите tex, режим GL_MODULATE
    glColor3f(1, 1, 1);
    glRotatef(-90, 1, 0, 0);
    // TODO: вращение вокруг оси сферы на угол a
    gluSphere(q, 1.5, 48, 32);
    gluDeleteQuadric(q);
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, (double)w / h, 0.1, 50.0);
}

` + IDLE + MAIN3D("Глобус", `    tex = loadTexture("earth.png");
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`),
      solution: `#include <GL/glut.h>

GLuint tex;
` + LOAD_FN_DONE + `
void display() {
    glClearColor(0.02f, 0.03f, 0.08f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glTranslatef(0, 0, -5);
    float a = glutGet(GLUT_ELAPSED_TIME) * 0.02f + 150;

    GLfloat pos[] = { 1.0f, 1.0f, 4.0f, 0.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, pos);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);

    GLUquadric* q = gluNewQuadric();
    gluQuadricTexture(q, GL_TRUE);
    glEnable(GL_TEXTURE_2D);
    glBindTexture(GL_TEXTURE_2D, tex);
    glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE);
    glColor3f(1, 1, 1);
    glRotatef(-90, 1, 0, 0);
    glRotatef(a, 0, 0, 1);
    gluSphere(q, 1.5, 48, 32);
    gluDeleteQuadric(q);
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, (double)w / h, 0.1, 50.0);
}

` + IDLE + MAIN3D("Глобус", `    tex = loadTexture("earth.png");
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`)
    },

    // ===================== ЗАДАНИЕ 6 =====================
    {
      id: "s6", kind: "task", title: "Задание 6: автоматическая генерация координат (glTexGen)",
      text: "<p>У тора и сферы нет текстурных координат — их вычислит OpenGL.</p><ul><li>Тор: включите <code>GL_TEXTURE_GEN_S</code> с режимом <code>GL_OBJECT_LINEAR</code> и плоскостью <code>GL_OBJECT_PLANE</code> = (1,0,0,0)·k (используйте k = 0,8): получатся полосы вдоль оси <i>x</i>.</li><li>Сфера: включите генерацию <i>s</i> и <i>t</i> в режиме <code>GL_SPHERE_MAP</code> — имитация отражения окружения («хром»); для сферы используйте текстуру неба <code>env</code> и режим <code>GL_REPLACE</code>.</li><li>После рисования каждого объекта выключайте генерацию.</li></ul>",
      hint: "Для тора: GLfloat plane[] = {0.8f, 0, 0, 0}; glTexGeni(GL_S, GL_TEXTURE_GEN_MODE, GL_OBJECT_LINEAR); glTexGenfv(GL_S, GL_OBJECT_PLANE, plane); glEnable(GL_TEXTURE_GEN_S).",
      check: { type: "both", calls: { "glTexGeni": ">=3", "glTexGenfv": ">=1" }, source: [{ re: "GL_SPHERE_MAP", msg: "Для сферы нужен GL_SPHERE_MAP" }, { re: "GL_OBJECT_LINEAR", msg: "Для тора нужен GL_OBJECT_LINEAR" }, { re: "glDisable\\s*\\(\\s*GL_TEXTURE_GEN_S", msg: "Выключайте генерацию после объекта: glDisable(GL_TEXTURE_GEN_S)" }] },
      starter: `#include <GL/glut.h>

GLuint texStripe, texEnv;

void init() {
    GLubyte s[16][16][3];       // полосы: цвет зависит от столбца j
    for (int i = 0; i < 16; i++)
        for (int j = 0; j < 16; j++) {
            bool a = (j / 4) % 2 == 0;
            s[i][j][0] = a ? 230 : 40;
            s[i][j][1] = a ? 190 : 90;
            s[i][j][2] = a ?  30 : 160;
        }
    glGenTextures(1, &texStripe);
    glBindTexture(GL_TEXTURE_2D, texStripe);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, 16, 16, 0, GL_RGB, GL_UNSIGNED_BYTE, s);

    GLubyte e[64][64][3];       // "окружение": небо сверху, земля снизу
    for (int i = 0; i < 64; i++)
        for (int j = 0; j < 64; j++) {
            float y = (i - 32) / 32.0f, x = (j - 32) / 32.0f;
            float r = sqrtf(x * x + y * y);
            if (r > 1.0f) { e[i][j][0] = 20; e[i][j][1] = 20; e[i][j][2] = 30; continue; }
            if (y > 0) { e[i][j][0] = 60 + 120 * (1 - y); e[i][j][1] = 120 + 90 * (1 - y); e[i][j][2] = 230; }
            else       { e[i][j][0] = 110 + 60 * y; e[i][j][1] = 80 + 50 * y; e[i][j][2] = 40; }
            if (fabsf(y) < 0.04f) { e[i][j][0] = 255; e[i][j][1] = 255; e[i][j][2] = 255; }
        }
    glGenTextures(1, &texEnv);
    glBindTexture(GL_TEXTURE_2D, texEnv);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, 64, 64, 0, GL_RGB, GL_UNSIGNED_BYTE, e);
}

void display() {
    glClearColor(0.15f, 0.17f, 0.22f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glTranslatef(0, 0, -7);
    GLfloat pos[] = { 2.0f, 3.0f, 4.0f, 0.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, pos);
    glEnable(GL_LIGHT0);
    glColor3f(1, 1, 1);
    glEnable(GL_TEXTURE_2D);

    // Тор с полосами
    glPushMatrix();
    glTranslatef(-1.8f, 0, 0);
    glRotatef(60, 1, 0, 0);
    glEnable(GL_LIGHTING);
    glBindTexture(GL_TEXTURE_2D, texStripe);
    glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE);
    // TODO: GL_OBJECT_LINEAR для координаты s, плоскость (0.8, 0, 0, 0)
    glutSolidTorus(0.45, 1.1, 24, 40);
    // TODO: выключите генерацию s
    glPopMatrix();

    // Сфера "хром"
    glPushMatrix();
    glTranslatef(2.0f, 0, 0);
    glDisable(GL_LIGHTING);
    glBindTexture(GL_TEXTURE_2D, texEnv);
    glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_REPLACE);
    // TODO: GL_SPHERE_MAP для s и t
    glutSolidSphere(1.3, 40, 30);
    // TODO: выключите генерацию s и t
    glPopMatrix();
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, (double)w / h, 0.1, 50.0);
}

` + IDLE + MAIN3D("glTexGen", `    init();
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`),
      solution: `#include <GL/glut.h>

GLuint texStripe, texEnv;

void init() {
    GLubyte s[16][16][3];       // полосы: цвет зависит от столбца j
    for (int i = 0; i < 16; i++)
        for (int j = 0; j < 16; j++) {
            bool a = (j / 4) % 2 == 0;
            s[i][j][0] = a ? 230 : 40;
            s[i][j][1] = a ? 190 : 90;
            s[i][j][2] = a ?  30 : 160;
        }
    glGenTextures(1, &texStripe);
    glBindTexture(GL_TEXTURE_2D, texStripe);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, 16, 16, 0, GL_RGB, GL_UNSIGNED_BYTE, s);

    GLubyte e[64][64][3];       // "окружение": небо сверху, земля снизу
    for (int i = 0; i < 64; i++)
        for (int j = 0; j < 64; j++) {
            float y = (i - 32) / 32.0f, x = (j - 32) / 32.0f;
            float r = sqrtf(x * x + y * y);
            if (r > 1.0f) { e[i][j][0] = 20; e[i][j][1] = 20; e[i][j][2] = 30; continue; }
            if (y > 0) { e[i][j][0] = 60 + 120 * (1 - y); e[i][j][1] = 120 + 90 * (1 - y); e[i][j][2] = 230; }
            else       { e[i][j][0] = 110 + 60 * y; e[i][j][1] = 80 + 50 * y; e[i][j][2] = 40; }
            if (fabsf(y) < 0.04f) { e[i][j][0] = 255; e[i][j][1] = 255; e[i][j][2] = 255; }
        }
    glGenTextures(1, &texEnv);
    glBindTexture(GL_TEXTURE_2D, texEnv);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, 64, 64, 0, GL_RGB, GL_UNSIGNED_BYTE, e);
}

void display() {
    glClearColor(0.15f, 0.17f, 0.22f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glTranslatef(0, 0, -7);
    GLfloat pos[] = { 2.0f, 3.0f, 4.0f, 0.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, pos);
    glEnable(GL_LIGHT0);
    glColor3f(1, 1, 1);
    glEnable(GL_TEXTURE_2D);

    // Тор с полосами
    glPushMatrix();
    glTranslatef(-1.8f, 0, 0);
    glRotatef(60, 1, 0, 0);
    glEnable(GL_LIGHTING);
    glBindTexture(GL_TEXTURE_2D, texStripe);
    glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE);
    GLfloat plane[] = { 0.8f, 0.0f, 0.0f, 0.0f };
    glTexGeni(GL_S, GL_TEXTURE_GEN_MODE, GL_OBJECT_LINEAR);
    glTexGenfv(GL_S, GL_OBJECT_PLANE, plane);
    glEnable(GL_TEXTURE_GEN_S);
    glutSolidTorus(0.45, 1.1, 24, 40);
    glDisable(GL_TEXTURE_GEN_S);
    glPopMatrix();

    // Сфера "хром"
    glPushMatrix();
    glTranslatef(2.0f, 0, 0);
    glDisable(GL_LIGHTING);
    glBindTexture(GL_TEXTURE_2D, texEnv);
    glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_REPLACE);
    glTexGeni(GL_S, GL_TEXTURE_GEN_MODE, GL_SPHERE_MAP);
    glTexGeni(GL_T, GL_TEXTURE_GEN_MODE, GL_SPHERE_MAP);
    glEnable(GL_TEXTURE_GEN_S);
    glEnable(GL_TEXTURE_GEN_T);
    glutSolidSphere(1.3, 40, 30);
    glDisable(GL_TEXTURE_GEN_S);
    glDisable(GL_TEXTURE_GEN_T);
    glPopMatrix();
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, (double)w / h, 0.1, 50.0);
}

` + IDLE + MAIN3D("glTexGen", `    init();
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`)
    },

    // ===================== ЗАДАНИЕ 7 =====================
    {
      id: "s7", kind: "task", title: "Задание 7: прозрачность — glass.png, смешивание и порядок вывода",
      text: "<p>Перед кирпичной стеной стоят два стекла (RGBA-текстура <code>glass.png</code>): дальнее синеватое, ближнее красноватое. Сейчас они непрозрачны.</p><ul><li>Включите смешивание: <code>glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)</code>.</li><li>Непрозрачную стену рисуйте первой, прозрачные стёкла — после неё, <b>от дальнего к ближнему</b>.</li><li>На время вывода стёкол отключите запись в буфер глубины <code>glDepthMask(GL_FALSE)</code>, затем верните <code>GL_TRUE</code>.</li></ul>",
      hint: "Сначала стена, потом glEnable(GL_BLEND); glDepthMask(GL_FALSE); дальнее стекло (z = −1); ближнее стекло (z = +0.5); glDepthMask(GL_TRUE); glDisable(GL_BLEND).",
      check: { type: "both", calls: { "glBlendFunc": ">=1", "glDepthMask": ">=2" }, source: [{ re: "GL_ONE_MINUS_SRC_ALPHA", msg: "Коэффициенты: GL_SRC_ALPHA и GL_ONE_MINUS_SRC_ALPHA" }] },
      starter: `#include <GL/glut.h>

GLuint texWall, texGlass;

GLuint load(const char* file, int comps, GLenum fmt) {
    int w, h, n;
    stbi_set_flip_vertically_on_load(1);
    unsigned char* data = stbi_load(file, &w, &h, &n, comps);
    GLuint id;
    glGenTextures(1, &id);
    glBindTexture(GL_TEXTURE_2D, id);
    gluBuild2DMipmaps(GL_TEXTURE_2D, fmt, w, h, fmt, GL_UNSIGNED_BYTE, data);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    stbi_image_free(data);
    return id;
}

void quad(float x, float y, float z, float hw, float hh) {
    glBegin(GL_QUADS);
        glTexCoord2f(0, 0); glVertex3f(x - hw, y - hh, z);
        glTexCoord2f(1, 0); glVertex3f(x + hw, y - hh, z);
        glTexCoord2f(1, 1); glVertex3f(x + hw, y + hh, z);
        glTexCoord2f(0, 1); glVertex3f(x - hw, y + hh, z);
    glEnd();
}

void display() {
    glClearColor(0.2f, 0.22f, 0.28f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glTranslatef(0, 0, -6);
    glEnable(GL_TEXTURE_2D);

    // Ближнее стекло нарисовано первым, и смешивание выключено - исправьте
    glBindTexture(GL_TEXTURE_2D, texGlass);
    glColor4f(1.0f, 0.55f, 0.55f, 0.85f);
    quad(0.9f, 0.0f, 0.5f, 1.3f, 1.3f);

    glColor4f(0.55f, 0.7f, 1.0f, 0.85f);
    quad(-0.9f, 0.2f, -1.0f, 1.3f, 1.3f);

    glBindTexture(GL_TEXTURE_2D, texWall);
    glColor4f(1, 1, 1, 1);
    quad(0, 0, -3, 3.2f, 2.4f);
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, (double)w / h, 0.1, 50.0);
}

` + IDLE + MAIN3D("Прозрачные стёкла", `    texWall = load("brick.png", 3, GL_RGB);
    texGlass = load("glass.png", 4, GL_RGBA);
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`),
      solution: `#include <GL/glut.h>

GLuint texWall, texGlass;

GLuint load(const char* file, int comps, GLenum fmt) {
    int w, h, n;
    stbi_set_flip_vertically_on_load(1);
    unsigned char* data = stbi_load(file, &w, &h, &n, comps);
    GLuint id;
    glGenTextures(1, &id);
    glBindTexture(GL_TEXTURE_2D, id);
    gluBuild2DMipmaps(GL_TEXTURE_2D, fmt, w, h, fmt, GL_UNSIGNED_BYTE, data);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    stbi_image_free(data);
    return id;
}

void quad(float x, float y, float z, float hw, float hh) {
    glBegin(GL_QUADS);
        glTexCoord2f(0, 0); glVertex3f(x - hw, y - hh, z);
        glTexCoord2f(1, 0); glVertex3f(x + hw, y - hh, z);
        glTexCoord2f(1, 1); glVertex3f(x + hw, y + hh, z);
        glTexCoord2f(0, 1); glVertex3f(x - hw, y + hh, z);
    glEnd();
}

void display() {
    glClearColor(0.2f, 0.22f, 0.28f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glTranslatef(0, 0, -6);
    glEnable(GL_TEXTURE_2D);

    // 1. Непрозрачная стена - первой
    glBindTexture(GL_TEXTURE_2D, texWall);
    glColor4f(1, 1, 1, 1);
    quad(0, 0, -3, 3.2f, 2.4f);

    // 2. Прозрачные объекты - от дальнего к ближнему, без записи глубины
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glDepthMask(GL_FALSE);
    glBindTexture(GL_TEXTURE_2D, texGlass);
    glColor4f(0.55f, 0.7f, 1.0f, 0.85f);
    quad(-0.9f, 0.2f, -1.0f, 1.3f, 1.3f);
    glColor4f(1.0f, 0.55f, 0.55f, 0.85f);
    quad(0.9f, 0.0f, 0.5f, 1.3f, 1.3f);
    glDepthMask(GL_TRUE);
    glDisable(GL_BLEND);
    glutSwapBuffers();
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, (double)w / h, 0.1, 50.0);
}

` + IDLE + MAIN3D("Прозрачные стёкла", `    texWall = load("brick.png", 3, GL_RGB);
    texGlass = load("glass.png", 4, GL_RGBA);
    glEnable(GL_DEPTH_TEST);
    glutReshapeFunc(reshape);
`)
    },

    // ===================== ЗАДАНИЕ 8 =====================
    {
      id: "s8", kind: "task", title: "Задание 8: операции с пикселами — glDrawPixels, glPixelZoom, glPixelTransfer",
      text: "<p>Массив 5×5 пикселов (сердечко) нужно вывести на экран напрямую, минуя геометрию и текстуры.</p><ul><li>Строка массива из 5 пикселов RGB занимает 15 байт — не кратно 4. Установите <code>glPixelStorei(GL_UNPACK_ALIGNMENT, 1)</code>, иначе строки «поплывут».</li><li>Задайте растровую позицию (40, 60), увеличение <code>glPixelZoom(40, 40)</code> и выведите массив <code>glDrawPixels</code> (получится 200×200 пикселов).</li><li>Выведите тот же массив второй раз в позиции (250, 60), предварительно уменьшив зелёную компоненту: <code>glPixelTransferf(GL_GREEN_SCALE, 0.3f)</code>. Масштаб 40 сохраняется. После вывода верните GL_GREEN_SCALE = 1: преобразование действует на все последующие операции с пикселами.</li></ul>",
      hint: "Проекция gluOrtho2D(0, w, 0, h) делает единицу координат равной пикселу. glRasterPos2i(40, 60); glPixelZoom(40, 40); glDrawPixels(5, 5, GL_RGB, GL_UNSIGNED_BYTE, img).",
      check: { type: "both", calls: { "glDrawPixels": ">=2", "glRasterPos2i|glRasterPos2f": ">=2" }, source: [{ re: "GL_UNPACK_ALIGNMENT\\s*,\\s*1", msg: "Установите выравнивание строк: glPixelStorei(GL_UNPACK_ALIGNMENT, 1)" }, { re: "GL_GREEN_SCALE", msg: "Используйте glPixelTransferf(GL_GREEN_SCALE, ...)" }] },
      starter: `#include <GL/glut.h>

GLubyte heart[5][5][3];     // строки снизу вверх, как в OpenGL

void makeHeart() {
    int m[5][5] = { {0,0,1,0,0}, {0,1,1,1,0}, {1,1,1,1,1}, {1,1,1,1,1}, {0,1,0,1,0} };
    for (int i = 0; i < 5; i++)
        for (int j = 0; j < 5; j++) {
            heart[i][j][0] = m[i][j] ? 230 : 245;
            heart[i][j][1] = m[i][j] ?  40 : 245;
            heart[i][j][2] = m[i][j] ?  70 : 235;
        }
}

void display() {
    glClearColor(0.25f, 0.28f, 0.35f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluOrtho2D(0, 480, 0, 360);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();

    // TODO: выравнивание строк 1 байт
    // TODO: позиция (40, 60), glPixelZoom(40, 40), glDrawPixels

    // TODO: позиция (250, 60), GL_GREEN_SCALE = 0.3, тот же массив glDrawPixels, затем вернуть GL_GREEN_SCALE = 1

    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Операции с пикселами");
    makeHeart();
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`,
      solution: `#include <GL/glut.h>

GLubyte heart[5][5][3];     // строки снизу вверх, как в OpenGL

void makeHeart() {
    int m[5][5] = { {0,0,1,0,0}, {0,1,1,1,0}, {1,1,1,1,1}, {1,1,1,1,1}, {0,1,0,1,0} };
    for (int i = 0; i < 5; i++)
        for (int j = 0; j < 5; j++) {
            heart[i][j][0] = m[i][j] ? 230 : 245;
            heart[i][j][1] = m[i][j] ?  40 : 245;
            heart[i][j][2] = m[i][j] ?  70 : 235;
        }
}

void display() {
    glClearColor(0.25f, 0.28f, 0.35f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluOrtho2D(0, 480, 0, 360);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();

    glPixelStorei(GL_UNPACK_ALIGNMENT, 1);
    glRasterPos2i(40, 60);
    glPixelZoom(40, 40);
    glDrawPixels(5, 5, GL_RGB, GL_UNSIGNED_BYTE, heart);

    glRasterPos2i(250, 60);
    glPixelTransferf(GL_GREEN_SCALE, 0.3f);
    glDrawPixels(5, 5, GL_RGB, GL_UNSIGNED_BYTE, heart);
    glPixelTransferf(GL_GREEN_SCALE, 1.0f);

    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Операции с пикселами");
    makeHeart();
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`
    }
  ]
});
})();
