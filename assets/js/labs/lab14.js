/* Лабораторная 14. Устранение ступенчатости. Тени. Зеркальные отражения. */
LAB.define({
  n: 14,
  title: "Устранение ступенчатости. Построение теней. Зеркальные отражения",
  steps: [
    {
      id: "s0", kind: "example", title: "Пример: сцена для опытов с тенями и отражениями",
      text: "<p>Это базовая сцена, на которой строятся задания 4–8: шахматный пол, оранжевый бублик в воздухе и синий шар на полу, освещённые точечным источником. Обратите внимание на <code>glutInitDisplayMode</code>: помимо <code>GLUT_DEPTH</code> запрошен <code>GLUT_STENCIL</code> — без него буфера трафарета нет, и все операции с ним молча ничего не делают. Количество бит трафарета программа печатает функцией <code>glGetIntegerv(GL_STENCIL_BITS, …)</code>; в консоли справа должно быть 8.</p><p>Источник света задаётся один раз в <code>display</code>, <i>после</i> <code>gluLookAt</code>: положение источника преобразуется текущей модельно-видовой матрицей, поэтому он «привязан» к миру, а не к камере.</p>",
      code: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
    GLint bits = 0;
    glGetIntegerv(GL_STENCIL_BITS, &bits);
    printf("Бит в буфере трафарета: %d\\n", bits);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    drawFloor(1.0f);
    drawObjects(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Сцена для экспериментов");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`
    },
    {
      id: "s1", kind: "task", title: "Задание 1. Сглаживание линий: GL_LINE_SMOOTH и смешивание",
      text: "<p>Каркасная сцена выводится в двух половинах окна функцией <code>drawHalf</code>. Левая половина рисуется как есть — на наклонных линиях видны «ступеньки». Заставьте правую половину (параметр <code>smooth</code>) рисоваться со сглаживанием:</p><ul><li>включите <code>GL_LINE_SMOOTH</code> и подсказку <code>GL_LINE_SMOOTH_HINT</code> со значением <code>GL_NICEST</code>;</li><li>включите смешивание <code>GL_BLEND</code> с функцией <code>GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA</code> — именно через альфа-компоненту передаётся доля покрытия пикселя линией.</li></ul>",
      hint: "Сглаживание линий без смешивания не даёт эффекта: фрагмент получает альфа, равную доле покрытия пикселя, но использовать её будет только блок смешивания.",
      check: {"type": "both", "calls": {"glHint": ">=1", "glBlendFunc": ">=1"}, "source": [{"re": "glEnable\\s*\\(\\s*GL_LINE_SMOOTH", "msg": "Включите GL_LINE_SMOOTH"}]},
      starter: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

// Каркасные фигуры: икосаэдр и сфера
void drawWire() {
    glColor3f(0.85f, 0.95f, 1.0f);
    glPushMatrix();
    glRotatef(20.0f, 1.0f, 0.0f, 0.0f);
    glRotatef(35.0f, 0.0f, 1.0f, 0.0f);
    glutWireIcosahedron();
    glPopMatrix();
    glColor3f(1.0f, 0.65f, 0.2f);
    glutWireSphere(0.8, 14, 10);
}

// Подпись над половиной окна
void label(int x, const char* text) {
    glColor3f(1.0f, 1.0f, 1.0f);
    glWindowPos2i(x, glutGet(GLUT_WINDOW_HEIGHT) - 20);
    glutBitmapString(GLUT_BITMAP_HELVETICA_12, text);
}

// Одна половина окна: x - левый край области вывода, smooth - сглаживать ли линии
void drawHalf(int x, int smooth) {
    int w = glutGet(GLUT_WINDOW_WIDTH), h = glutGet(GLUT_WINDOW_HEIGHT);
    glViewport(x, 0, w / 2, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(40.0, (double)(w / 2) / h, 1.0, 20.0);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 0.0, 4.5,  0.0, 0.0, 0.0,  0.0, 1.0, 0.0);
    // TODO: если smooth, включите GL_LINE_SMOOTH, подсказку GL_LINE_SMOOTH_HINT = GL_NICEST
    //       и смешивание цветов glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
    drawWire();
    glDisable(GL_LINE_SMOOTH);
    glDisable(GL_BLEND);
    glViewport(0, 0, w, h);
    label(x + 8, smooth ? "GL_LINE_SMOOTH" : "no smoothing");
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT);
    int w = glutGet(GLUT_WINDOW_WIDTH);
    drawHalf(0, 0);          // левая половина - без сглаживания
    drawHalf(w / 2, 1);      // правая половина - со сглаживанием
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Сглаживание линий");
    glewInit();
    glClearColor(0.05f, 0.06f, 0.10f, 1.0f);
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`,
      solution: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

// Каркасные фигуры: икосаэдр и сфера
void drawWire() {
    glColor3f(0.85f, 0.95f, 1.0f);
    glPushMatrix();
    glRotatef(20.0f, 1.0f, 0.0f, 0.0f);
    glRotatef(35.0f, 0.0f, 1.0f, 0.0f);
    glutWireIcosahedron();
    glPopMatrix();
    glColor3f(1.0f, 0.65f, 0.2f);
    glutWireSphere(0.8, 14, 10);
}

// Подпись над половиной окна
void label(int x, const char* text) {
    glColor3f(1.0f, 1.0f, 1.0f);
    glWindowPos2i(x, glutGet(GLUT_WINDOW_HEIGHT) - 20);
    glutBitmapString(GLUT_BITMAP_HELVETICA_12, text);
}

// Одна половина окна: x - левый край области вывода, smooth - сглаживать ли линии
void drawHalf(int x, int smooth) {
    int w = glutGet(GLUT_WINDOW_WIDTH), h = glutGet(GLUT_WINDOW_HEIGHT);
    glViewport(x, 0, w / 2, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(40.0, (double)(w / 2) / h, 1.0, 20.0);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 0.0, 4.5,  0.0, 0.0, 0.0,  0.0, 1.0, 0.0);
    if (smooth) {
        glEnable(GL_LINE_SMOOTH);                          // сглаживание линий
        glHint(GL_LINE_SMOOTH_HINT, GL_NICEST);            // просим наилучшее качество
        glEnable(GL_BLEND);                                // доля покрытия пикселя передаётся через альфа
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    } else {
        glDisable(GL_LINE_SMOOTH);
        glDisable(GL_BLEND);
    }
    drawWire();
    glDisable(GL_LINE_SMOOTH);
    glDisable(GL_BLEND);
    glViewport(0, 0, w, h);
    label(x + 8, smooth ? "GL_LINE_SMOOTH" : "no smoothing");
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT);
    int w = glutGet(GLUT_WINDOW_WIDTH);
    drawHalf(0, 0);          // левая половина - без сглаживания
    drawHalf(w / 2, 1);      // правая половина - со сглаживанием
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Сглаживание линий");
    glewInit();
    glClearColor(0.05f, 0.06f, 0.10f, 1.0f);
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`
    },
    {
      id: "s2", kind: "task", title: "Задание 2. Мультисэмплинг: GLUT_MULTISAMPLE",
      text: "<p>Сцена из примера выводится без сглаживания: границы бублика, шара и плиток — «лесенкой». Включите мультисэмплинг, который выполняется самим растеризатором и не требует ни смешивания, ни сортировки объектов:</p><ul><li>добавьте флаг <code>GLUT_MULTISAMPLE</code> в <code>glutInitDisplayMode</code> — буфер выборок создаётся вместе с окном, включить его позже нельзя;</li><li>включите <code>glEnable(GL_MULTISAMPLE)</code> в <code>init</code>.</li></ul><p>В консоли программа печатает число буферов выборок и выборок на пиксель (<code>GL_SAMPLE_BUFFERS</code>, <code>GL_SAMPLES</code>): без флага там 0, с флагом — ненулевые значения.</p>",
      hint: "Флаги режима складываются оператором «|». Если окно создано без GLUT_MULTISAMPLE, вызов glEnable(GL_MULTISAMPLE) ничего не меняет — выборок просто нет.",
      check: {"type": "both", "source": [{"re": "GLUT_MULTISAMPLE\\s*[|)]|\\|\\s*GLUT_MULTISAMPLE", "msg": "Добавьте GLUT_MULTISAMPLE в glutInitDisplayMode"}, {"re": "glEnable\\s*\\(\\s*GL_MULTISAMPLE", "msg": "Включите GL_MULTISAMPLE"}]},
      starter: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
    // TODO: включите GL_MULTISAMPLE
    GLint buffers = 0, samples = 0;
    glGetIntegerv(GL_SAMPLE_BUFFERS, &buffers);
    glGetIntegerv(GL_SAMPLES, &samples);
    printf("Буферов выборок: %d, выборок на пиксель: %d\\n", buffers, samples);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    drawFloor(1.0f);
    drawObjects(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH      /* TODO: добавьте GLUT_MULTISAMPLE */);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Мультисэмплинг");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`,
      solution: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
    glEnable(GL_MULTISAMPLE);                  // включаем мультисэмплинг (по умолчанию он включён, если окно его поддерживает)
    GLint buffers = 0, samples = 0;
    glGetIntegerv(GL_SAMPLE_BUFFERS, &buffers);
    glGetIntegerv(GL_SAMPLES, &samples);
    printf("Буферов выборок: %d, выборок на пиксель: %d\\n", buffers, samples);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    drawFloor(1.0f);
    drawObjects(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_MULTISAMPLE);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Мультисэмплинг");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`
    },
    {
      id: "s3", kind: "task", title: "Задание 3. Полноэкранное сглаживание накопительным буфером",
      text: "<p>Окно создано с флагом <code>GLUT_ACCUM</code>, функция <code>renderPass(dx, dy)</code> рисует сцену, сдвинув проекцию на доли пикселя, а в массиве <code>jit</code> записаны 8 смещений. Заготовка выводит один несдвинутый кадр. Реализуйте усреднение восьми кадров:</p><ul><li>очистите накопительный буфер (<code>GL_ACCUM_BUFFER_BIT</code>);</li><li>в цикле по <i>i</i> = 0…7 нарисуйте проход со сдвигом <code>jit[i]</code> и добавьте его в накопительный буфер с весом 1/8 (<code>GL_ACCUM</code>);</li><li>верните сумму в буфер цвета (<code>GL_RETURN</code>, множитель 1).</li></ul>",
      hint: "Сумма весов должна равняться единице: восемь кадров с весом 1/8 дают исходную яркость, иначе картинка станет темнее или пересветится.",
      check: {"type": "both", "calls": {"glAccum": ">=9"}},
      starter: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

// Смещения центра пикселя в долях пикселя (8 выборок)
float jit[8][2] = {
    {  0.0625f, -0.1875f }, { -0.0625f,  0.1875f },
    {  0.3125f,  0.0625f }, { -0.1875f, -0.3125f },
    { -0.3125f,  0.3125f }, { -0.4375f, -0.0625f },
    {  0.1875f,  0.4375f }, {  0.4375f, -0.4375f }
};

// Один проход: сцена со сдвигом проекции на (dx, dy) пикселей
void renderPass(float dx, float dy) {
    int w = glutGet(GLUT_WINDOW_WIDTH), h = glutGet(GLUT_WINDOW_HEIGHT);
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    glTranslatef(2.0f * dx / w, 2.0f * dy / h, 0.0f);   // сдвиг в нормализованных координатах
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    drawFloor(1.0f);
    drawObjects(0);
}

void display() {
    // TODO: очистите накопительный буфер; в цикле по 8 смещениям вызовите renderPass(jit[i][0], jit[i][1])
    //       и добавьте кадр функцией glAccum(GL_ACCUM, 1.0f / 8); затем верните сумму: glAccum(GL_RETURN, 1.0f)
    renderPass(0.0f, 0.0f);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_ACCUM);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Накопительный буфер");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`,
      solution: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

// Смещения центра пикселя в долях пикселя (8 выборок)
float jit[8][2] = {
    {  0.0625f, -0.1875f }, { -0.0625f,  0.1875f },
    {  0.3125f,  0.0625f }, { -0.1875f, -0.3125f },
    { -0.3125f,  0.3125f }, { -0.4375f, -0.0625f },
    {  0.1875f,  0.4375f }, {  0.4375f, -0.4375f }
};

// Один проход: сцена со сдвигом проекции на (dx, dy) пикселей
void renderPass(float dx, float dy) {
    int w = glutGet(GLUT_WINDOW_WIDTH), h = glutGet(GLUT_WINDOW_HEIGHT);
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    glTranslatef(2.0f * dx / w, 2.0f * dy / h, 0.0f);   // сдвиг в нормализованных координатах
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    drawFloor(1.0f);
    drawObjects(0);
}

void display() {
    glClear(GL_ACCUM_BUFFER_BIT);
    for (int i = 0; i < 8; i++) {
        renderPass(jit[i][0], jit[i][1]);
        glAccum(GL_ACCUM, 1.0f / 8);       // добавляем 1/8 изображения
    }
    glAccum(GL_RETURN, 1.0f);              // результат - в буфер цвета
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_ACCUM);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Накопительный буфер");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`
    },
    {
      id: "s4", kind: "task", title: "Задание 4. Проекционная тень на пол",
      text: "<p>Постройте тень от бублика и шара. Тень — это сами объекты, спроецированные из точки света на плоскость пола. Напишите функцию <code>shadowMatrix</code>, вычисляющую матрицу <b>M</b> = (<b>n</b>·<b>L</b>)·<b>E</b> − <b>L</b>·<b>n</b><sup>T</sup> (<i>n</i> — четвёрка коэффициентов плоскости, <i>L</i> — положение света), и выведите ею тень:</p><ul><li>выключите освещение и нарисуйте тёмным цветом <code>drawObjects(1)</code> после <code>glMultMatrixf(m)</code>;</li><li>чтобы тень не «мерцала» (z-fighting) на полу, включите <code>GL_POLYGON_OFFSET_FILL</code> и вызовите <code>glPolygonOffset(-1, -1)</code>.</li></ul><p>Обратите внимание на край пола: тень бублика выходит за его границу — это будет исправлено в задании 5.</p>",
      hint: "Матрица в OpenGL хранится по столбцам: элемент строки row и столбца col лежит в m[col*4 + row]. На диагонали добавляется dot, из каждого элемента вычитается l[row]*plane[col].",
      check: {"type": "both", "calls": {"glMultMatrixf": ">=1", "glPolygonOffset": ">=1"}},
      starter: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

// Матрица проекционной тени: проецирует объекты из точки света L на плоскость plane (a, b, c, d)
void shadowMatrix(GLfloat m[16], GLfloat plane[4], GLfloat l[4]) {
    // TODO: m = dot * E - L * plane^T, где dot = plane . L (матрица хранится по столбцам)
    for (int i = 0; i < 16; i++) m[i] = (i % 5 == 0) ? 1.0f : 0.0f;   // пока единичная
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    drawFloor(1.0f);

    // тень на плоскости пола y = 0
    GLfloat plane[] = { 0.0f, 1.0f, 0.0f, 0.0f };
    GLfloat m[16];
    shadowMatrix(m, plane, lightPos);
    // TODO: выключите освещение, включите GL_POLYGON_OFFSET_FILL и glPolygonOffset(-1, -1),
    //       задайте тёмный цвет, умножьте матрицу на m (glMultMatrixf) и нарисуйте drawObjects(1)
    drawObjects(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Проекционная тень");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`,
      solution: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

// Матрица проекционной тени: проецирует объекты из точки света L на плоскость plane (a, b, c, d)
void shadowMatrix(GLfloat m[16], GLfloat plane[4], GLfloat l[4]) {
    GLfloat dot = plane[0]*l[0] + plane[1]*l[1] + plane[2]*l[2] + plane[3]*l[3];
    for (int col = 0; col < 4; col++)
        for (int row = 0; row < 4; row++)
            m[col * 4 + row] = (row == col ? dot : 0.0f) - l[row] * plane[col];
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    drawFloor(1.0f);

    // тень на плоскости пола y = 0
    GLfloat plane[] = { 0.0f, 1.0f, 0.0f, 0.0f };
    GLfloat m[16];
    shadowMatrix(m, plane, lightPos);
    glDisable(GL_LIGHTING);
    glEnable(GL_POLYGON_OFFSET_FILL);        // сдвигаем тень к наблюдателю, чтобы не мерцала на полу
    glPolygonOffset(-1.0f, -1.0f);
    glColor3f(0.05f, 0.05f, 0.08f);
    glPushMatrix();
    glMultMatrixf(m);
    drawObjects(1);
    glPopMatrix();
    glDisable(GL_POLYGON_OFFSET_FILL);
    glEnable(GL_LIGHTING);
    drawObjects(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Проекционная тень");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`
    },
    {
      id: "s5", kind: "task", title: "Задание 5. Полупрозрачная тень и буфер трафарета",
      text: "<p>Сделайте тень полупрозрачной, чтобы сквозь неё просвечивал рисунок плиток. Наивное смешивание даёт две ошибки: там, где проекции нескольких частей объекта накладываются, тень темнеет многократно («двойное смешивание»), а часть тени оказывается за краем пола. Оба дефекта устраняет буфер трафарета:</p><ul><li>при рисовании пола записывайте в трафарет единицу (<code>glStencilFunc(GL_ALWAYS, 1, 0xFF)</code>, <code>glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE)</code>);</li><li>тень выводите с <code>glStencilFunc(GL_EQUAL, 1, 0xFF)</code> и <code>glStencilOp(GL_KEEP, GL_KEEP, GL_INCR)</code> — пиксель, в который тень уже записана, получает значение 2 и повторно не закрашивается; за пределами пола трафарет равен 0, и тень там не рисуется.</li></ul>",
      hint: "Третий аргумент glStencilOp срабатывает, когда пройдены и тест трафарета, и тест глубины; именно его нужно сделать GL_INCR. Не забудьте после тени выключить GL_STENCIL_TEST.",
      check: {"type": "both", "calls": {"glStencilFunc": ">=2", "glStencilOp": ">=2"}},
      starter: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

// Матрица проекционной тени: проецирует объекты из точки света L на плоскость plane (a, b, c, d)
void shadowMatrix(GLfloat m[16], GLfloat plane[4], GLfloat l[4]) {
    GLfloat dot = plane[0]*l[0] + plane[1]*l[1] + plane[2]*l[2] + plane[3]*l[3];
    for (int col = 0; col < 4; col++)
        for (int row = 0; row < 4; row++)
            m[col * 4 + row] = (row == col ? dot : 0.0f) - l[row] * plane[col];
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    GLfloat plane[] = { 0.0f, 1.0f, 0.0f, 0.0f };
    GLfloat m[16];
    shadowMatrix(m, plane, lightPos);

    drawFloor(1.0f);

    // TODO: 1) при рисовании пола записывайте 1 в буфер трафарета (GL_ALWAYS, GL_REPLACE);
    //       2) тень рисуйте полупрозрачной (чёрный, альфа 0.55) и только где трафарет == 1 (GL_EQUAL),
    //          после вывода пикселя увеличивайте трафарет (GL_INCR)
    glDisable(GL_LIGHTING);
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glEnable(GL_POLYGON_OFFSET_FILL);
    glPolygonOffset(-1.0f, -1.0f);
    glColor4f(0.0f, 0.0f, 0.0f, 0.55f);
    glPushMatrix();
    glMultMatrixf(m);
    drawObjects(1);
    glPopMatrix();
    glDisable(GL_POLYGON_OFFSET_FILL);
    glDisable(GL_BLEND);
    glEnable(GL_LIGHTING);
    drawObjects(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Тень с трафаретом");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`,
      solution: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

// Матрица проекционной тени: проецирует объекты из точки света L на плоскость plane (a, b, c, d)
void shadowMatrix(GLfloat m[16], GLfloat plane[4], GLfloat l[4]) {
    GLfloat dot = plane[0]*l[0] + plane[1]*l[1] + plane[2]*l[2] + plane[3]*l[3];
    for (int col = 0; col < 4; col++)
        for (int row = 0; row < 4; row++)
            m[col * 4 + row] = (row == col ? dot : 0.0f) - l[row] * plane[col];
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    GLfloat plane[] = { 0.0f, 1.0f, 0.0f, 0.0f };
    GLfloat m[16];
    shadowMatrix(m, plane, lightPos);

    // 1) рисуем пол и записываем 1 в буфер трафарета на его пикселях
    glEnable(GL_STENCIL_TEST);
    glStencilFunc(GL_ALWAYS, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);
    drawFloor(1.0f);

    // 2) тень: только где трафарет == 1; после вывода пикселя он станет 2 - повторно пиксель не изменится
    glStencilFunc(GL_EQUAL, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_INCR);
    glDisable(GL_LIGHTING);
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glEnable(GL_POLYGON_OFFSET_FILL);
    glPolygonOffset(-1.0f, -1.0f);
    glColor4f(0.0f, 0.0f, 0.0f, 0.55f);
    glPushMatrix();
    glMultMatrixf(m);
    drawObjects(1);
    glPopMatrix();
    glDisable(GL_POLYGON_OFFSET_FILL);
    glDisable(GL_BLEND);
    glEnable(GL_LIGHTING);
    glDisable(GL_STENCIL_TEST);
    drawObjects(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Тень с трафаретом");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`
    },
    {
      id: "s6", kind: "task", title: "Задание 6. Зеркальный пол: отражённая копия сцены в буфере трафарета",
      text: "<p>Постройте «чёрное зеркало» на месте пола. Алгоритм из трёх шагов:</p><ul><li>нарисуйте пол <i>только в буфер трафарета</i> (единица на пикселях пола; <code>glColorMask</code> и <code>glDepthMask</code> выключены);</li><li>при <code>glStencilFunc(GL_EQUAL, 1, 0xFF)</code> нарисуйте сцену, отражённую матрицей <code>glScalef(1, -1, 1)</code>. Внутри отражения заново задайте <code>GL_POSITION</code> источника и установите <code>glFrontFace(GL_CW)</code> — иначе при включённом отсечении граней (оно включено в <code>init</code>) отразятся «изнанки» фигур;</li><li>выключите трафарет и нарисуйте настоящие объекты.</li></ul><p>Отражение видно только внутри границ пола — остальное окно трафарет не пропускает.</p>",
      hint: "Источник света, заданный до glScalef, остаётся «под полом» неотражённым; положение GL_POSITION нужно задать повторно уже при действующем отражении, а после glPopMatrix — ещё раз, чтобы реальные объекты освещались как раньше.",
      check: {"type": "both", "calls": {"glScalef": ">=1", "glFrontFace": ">=2", "glStencilFunc": ">=2"}},
      starter: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_CULL_FACE);      // отсекаем нелицевые грани - при отражении это важно
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    // TODO: 1) нарисуйте пол только в буфер трафарета: GL_ALWAYS, GL_REPLACE, glColorMask и glDepthMask выключить;
    //       2) включите проверку трафарета GL_EQUAL, затем: glPushMatrix, glScalef(1, -1, 1), заново glLightfv(GL_POSITION),
    //          glFrontFace(GL_CW), drawObjects(0), glFrontFace(GL_CCW), glPopMatrix, снова glLightfv(GL_POSITION)
    drawObjects(0);    // 3) настоящие объекты
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Зеркальный пол");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`,
      solution: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_CULL_FACE);      // отсекаем нелицевые грани - при отражении это важно
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    // 1) пол - только в буфер трафарета (цвет и глубину не трогаем)
    glEnable(GL_STENCIL_TEST);
    glStencilFunc(GL_ALWAYS, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);
    glColorMask(GL_FALSE, GL_FALSE, GL_FALSE, GL_FALSE);
    glDepthMask(GL_FALSE);
    drawFloor(1.0f);
    glColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
    glDepthMask(GL_TRUE);

    // 2) отражённая сцена - только там, где трафарет == 1
    glStencilFunc(GL_EQUAL, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_KEEP);
    glPushMatrix();
    glScalef(1.0f, -1.0f, 1.0f);                       // отражение относительно плоскости y = 0
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);       // источник света тоже отражаем
    glFrontFace(GL_CW);                                // отражение меняет порядок обхода вершин
    drawObjects(0);
    glFrontFace(GL_CCW);
    glPopMatrix();
    glDisable(GL_STENCIL_TEST);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);       // возвращаем источник на место

    // 3) настоящие объекты
    drawObjects(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Зеркальный пол");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`
    },
    {
      id: "s7", kind: "task", title: "Задание 7. Полупрозрачное зеркало: смешивание пола с отражением",
      text: "<p>Настоящий пол не должен исчезать — зеркало должно быть «глянцевым». После вывода отражения (и выключения трафарета) включите смешивание <code>GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA</code> и нарисуйте пол полупрозрачным: <code>drawFloor(0.45f)</code>. Значение 0.45 — это альфа плиток; чем оно меньше, тем отчётливее отражение.</p><p>Порядок вывода важен: полупрозрачный пол рисуется <i>после</i> отражения, но <i>до</i> настоящих объектов, иначе непрозрачные объекты окажутся под ним в буфере глубины.</p>",
      hint: "Цвет плитки задаётся через glColor4f, а при включённом GL_COLOR_MATERIAL альфа цвета становится альфой диффузного материала — поэтому освещённый пол остаётся прозрачным на 55 %.",
      check: {"type": "both", "calls": {"glBlendFunc": ">=1", "glEnable": ">=1"}, "source": [{"re": "drawFloor\\s*\\(\\s*0\\.\\d+f?\\s*\\)", "msg": "Нарисуйте пол с альфой меньше единицы: drawFloor(0.45f)"}]},
      starter: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_CULL_FACE);      // отсекаем нелицевые грани - при отражении это важно
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    // 1) пол - в буфер трафарета
    glEnable(GL_STENCIL_TEST);
    glStencilFunc(GL_ALWAYS, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);
    glColorMask(GL_FALSE, GL_FALSE, GL_FALSE, GL_FALSE);
    glDepthMask(GL_FALSE);
    drawFloor(1.0f);
    glColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
    glDepthMask(GL_TRUE);

    // 2) отражение
    glStencilFunc(GL_EQUAL, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_KEEP);
    glPushMatrix();
    glScalef(1.0f, -1.0f, 1.0f);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    glFrontFace(GL_CW);
    drawObjects(0);
    glFrontFace(GL_CCW);
    glPopMatrix();
    glDisable(GL_STENCIL_TEST);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    // TODO: 3) включите смешивание и нарисуйте пол полупрозрачным: drawFloor(0.45f)

    // 4) настоящие объекты
    drawObjects(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Полупрозрачное зеркало");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`,
      solution: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_CULL_FACE);      // отсекаем нелицевые грани - при отражении это важно
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    // 1) пол - в буфер трафарета
    glEnable(GL_STENCIL_TEST);
    glStencilFunc(GL_ALWAYS, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);
    glColorMask(GL_FALSE, GL_FALSE, GL_FALSE, GL_FALSE);
    glDepthMask(GL_FALSE);
    drawFloor(1.0f);
    glColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
    glDepthMask(GL_TRUE);

    // 2) отражение
    glStencilFunc(GL_EQUAL, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_KEEP);
    glPushMatrix();
    glScalef(1.0f, -1.0f, 1.0f);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    glFrontFace(GL_CW);
    drawObjects(0);
    glFrontFace(GL_CCW);
    glPopMatrix();
    glDisable(GL_STENCIL_TEST);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    // 3) полупрозрачный пол поверх отражения
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    drawFloor(0.45f);
    glDisable(GL_BLEND);

    // 4) настоящие объекты
    drawObjects(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Полупрозрачное зеркало");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`
    },
    {
      id: "s8", kind: "task", title: "Задание 8. Плоскость отсечения: отражение не должно торчать над полом",
      text: "<p>В сцену добавлен красный столбик, вбитый в пол: его нижняя часть находится <i>под</i> полом. Запустите заготовку: над настоящей верхушкой столбика «вырос» длинный призрак — это отражение подпольной части, которое после <code>glScalef(1, -1, 1)</code> оказывается над полом.</p><p>Уберите его плоскостью отсечения: перед отражением вызовите <code>glClipPlane(GL_CLIP_PLANE0, clip)</code> с уравнением <code>{0, -1, 0, 0}</code> (массив <code>GLdouble[4]</code>) и включите <code>GL_CLIP_PLANE0</code>; после отражения выключите её. Уравнение преобразуется модельно-видовой матрицей, действующей в момент вызова <code>glClipPlane</code>, поэтому вызывать функцию нужно <i>до</i> <code>glScalef</code>.</p>",
      hint: "Плоскость a·x + b·y + c·z + d ≥ 0 оставляет точки с неотрицательным значением. После отражения нужные точки имеют y ≤ 0, то есть −y ≥ 0 — отсюда коэффициент −1.",
      check: {"type": "both", "calls": {"glClipPlane": ">=1"}, "source": [{"re": "glEnable\\s*\\(\\s*GL_CLIP_PLANE0", "msg": "Включите GL_CLIP_PLANE0"}]},
      starter: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

// Столбик, вбитый в пол: нижняя часть (y < 0) находится под полом
void drawPost(int flat) {
    if (!flat) glColor3f(0.85f, 0.22f, 0.28f);
    glPushMatrix();
    glTranslatef(-1.7f, -1.6f, 1.0f);
    glRotatef(-90.0f, 1.0f, 0.0f, 0.0f);          // ось цилиндра - вверх
    glutSolidCylinder(0.22, 2.2, 24, 4);
    glPopMatrix();
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_CULL_FACE);      // отсекаем нелицевые грани - при отражении это важно
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    // 1) пол - в буфер трафарета
    glEnable(GL_STENCIL_TEST);
    glStencilFunc(GL_ALWAYS, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);
    glColorMask(GL_FALSE, GL_FALSE, GL_FALSE, GL_FALSE);
    glDepthMask(GL_FALSE);
    drawFloor(1.0f);
    glColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
    glDepthMask(GL_TRUE);

    // 2) отражение
    glStencilFunc(GL_EQUAL, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_KEEP);
    // TODO: задайте плоскость отсечения {0, -1, 0, 0} (glClipPlane, GLdouble[4]) и включите GL_CLIP_PLANE0
    glPushMatrix();
    glScalef(1.0f, -1.0f, 1.0f);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    glFrontFace(GL_CW);
    drawObjects(0);
    drawPost(0);
    glFrontFace(GL_CCW);
    glPopMatrix();
    glDisable(GL_STENCIL_TEST);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    // 3) полупрозрачный пол
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    drawFloor(0.45f);
    glDisable(GL_BLEND);

    // 4) настоящие объекты
    drawObjects(0);
    drawPost(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Плоскость отсечения");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`,
      solution: `#include <GL/glew.h>   // GLEW: функции OpenGL 1.2+ в Windows
#include <GL/glut.h>

GLfloat lightPos[] = { 2.5f, 4.0f, 2.0f, 1.0f };   // точечный источник света над сценой

// Пол: шахматная плита 5 x 5, плитки по 0.5 x 0.5, нормаль направлена вверх
void drawFloor(float alpha) {
    glNormal3f(0.0f, 1.0f, 0.0f);
    glBegin(GL_QUADS);
    for (int i = 0; i < 10; i++) {
        for (int j = 0; j < 10; j++) {
            if ((i + j) % 2 == 0) glColor4f(0.72f, 0.74f, 0.80f, alpha);
            else                  glColor4f(0.20f, 0.27f, 0.45f, alpha);
            float x = -2.5f + i * 0.5f, z = -2.5f + j * 0.5f;
            glVertex3f(x, 0.0f, z);
            glVertex3f(x, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z + 0.5f);
            glVertex3f(x + 0.5f, 0.0f, z);
        }
    }
    glEnd();
}

// Объекты сцены. flat = 1: цвет не задаётся (нужно для рисования тени)
void drawObjects(int flat) {
    // оранжевый бублик, парящий над полом
    if (!flat) glColor3f(0.95f, 0.55f, 0.10f);
    glPushMatrix();
    glTranslatef(-0.8f, 1.3f, 0.2f);
    glRotatef(25.0f, 0.0f, 1.0f, 0.0f);
    glRotatef(35.0f, 1.0f, 0.0f, 0.0f);
    glutSolidTorus(0.22, 0.7, 24, 36);
    glPopMatrix();
    // синий шар, лежащий на полу
    if (!flat) glColor3f(0.20f, 0.55f, 0.95f);
    glPushMatrix();
    glTranslatef(1.1f, 0.7f, -0.5f);
    glutSolidSphere(0.7, 48, 32);
    glPopMatrix();
}

// Столбик, вбитый в пол: нижняя часть (y < 0) находится под полом
void drawPost(int flat) {
    if (!flat) glColor3f(0.85f, 0.22f, 0.28f);
    glPushMatrix();
    glTranslatef(-1.7f, -1.6f, 1.0f);
    glRotatef(-90.0f, 1.0f, 0.0f, 0.0f);          // ось цилиндра - вверх
    glutSolidCylinder(0.22, 2.2, 24, 4);
    glPopMatrix();
}

void init() {
    glClearColor(0.20f, 0.25f, 0.36f, 1.0f);
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_LIGHT0);
    glEnable(GL_NORMALIZE);
    glEnable(GL_CULL_FACE);      // отсекаем нелицевые грани - при отражении это важно
    glEnable(GL_COLOR_MATERIAL);              // glColor задаёт ambient и diffuse материала
    GLfloat amb[]  = { 0.28f, 0.28f, 0.32f, 1.0f };
    GLfloat spec[] = { 0.6f, 0.6f, 0.6f, 1.0f };
    glLightfv(GL_LIGHT0, GL_AMBIENT, amb);
    glMaterialfv(GL_FRONT, GL_SPECULAR, spec);
    glMaterialf(GL_FRONT, GL_SHININESS, 40.0f);
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(38.0, (double)w / h, 1.0, 50.0);
    glMatrixMode(GL_MODELVIEW);
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);
    glLoadIdentity();
    gluLookAt(0.0, 4.8, 7.4,  0.0, 0.0, 0.3,  0.0, 1.0, 0.0);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    // 1) пол - в буфер трафарета
    glEnable(GL_STENCIL_TEST);
    glStencilFunc(GL_ALWAYS, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);
    glColorMask(GL_FALSE, GL_FALSE, GL_FALSE, GL_FALSE);
    glDepthMask(GL_FALSE);
    drawFloor(1.0f);
    glColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
    glDepthMask(GL_TRUE);

    // 2) отражение
    glStencilFunc(GL_EQUAL, 1, 0xFF);
    glStencilOp(GL_KEEP, GL_KEEP, GL_KEEP);
    // плоскость отсечения задаём ДО отражения, в мировых координатах:
    // остаётся y <= 0 (после отражения) - то есть отражается только то, что было над полом
    GLdouble clip[] = { 0.0, -1.0, 0.0, 0.0 };
    glClipPlane(GL_CLIP_PLANE0, clip);
    glEnable(GL_CLIP_PLANE0);
    glPushMatrix();
    glScalef(1.0f, -1.0f, 1.0f);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);
    glFrontFace(GL_CW);
    drawObjects(0);
    drawPost(0);
    glFrontFace(GL_CCW);
    glPopMatrix();
    glDisable(GL_CLIP_PLANE0);
    glDisable(GL_STENCIL_TEST);
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    // 3) полупрозрачный пол
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    drawFloor(0.45f);
    glDisable(GL_BLEND);

    // 4) настоящие объекты
    drawObjects(0);
    drawPost(0);
    glutSwapBuffers();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH | GLUT_STENCIL);
    glutInitWindowSize(480, 360);
    glutCreateWindow("Плоскость отсечения");
    glewInit();
    init();
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`
    }
  ]
});
