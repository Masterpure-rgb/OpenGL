/* Лабораторная 11. Рисование и преобразование геометрических объектов в OpenGL */
(function () {
  var HEAD = "#include <GL/glut.h>\n#include <cmath>\n#include <cstdio>\n\n#define PI 3.14159265f\n\n";
  var RESHAPE = `void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    glOrtho(-10.0, 10.0, -10.0, 10.0, -1.0, 1.0);   // мировые координаты: от -10 до 10
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
}
`;
  function MAIN(title, extra) {
    return `
int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB);
    glutInitWindowSize(400, 400);
    glutCreateWindow("${title}");
    glClearColor(0.08f, 0.09f, 0.14f, 1.0f);
${extra || ""}    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
`;
  }
  var NGON = `// Правильный n-угольник (filled = 1 - залитый, 0 - контур)
void ngon(float cx, float cy, float R, int n, int filled) {
    int cnt = n;
    if (filled) {
        glBegin(GL_TRIANGLE_FAN);
        glVertex2f(cx, cy);
        cnt = n + 1;
    } else {
        glBegin(GL_LINE_LOOP);
    }
    float da = 2 * PI / n;                  // угловой шаг
    for (int i = 0; i < cnt; i++) {
        float a = PI / 2 + i * da;
        glVertex2f(cx + R * cos(a), cy + R * sin(a));
    }
    glEnd();
}
`;

  /* ---------------- задание 1 ---------------- */
  var P1_COMMON = `// Вспомогательные функции
void dot(float x, float y) {
    glBegin(GL_POINTS);
        glVertex2f(x, y);
    glEnd();
}

void hline(float y) {
    glBegin(GL_LINES);
        glVertex2f(-8.0f, y);
        glVertex2f( 8.0f, y);
    glEnd();
}

`;
  var s1_starter = HEAD + P1_COMMON + `void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    // TODO 1: три жёлтые точки (x = -6, 0, 6; y = 7) размером 3, 8 и 16 пикселей
    // TODO 2: три голубые горизонтальные линии (y = 3, 1, -1) толщиной 1, 3 и 6
    // TODO 3: три оранжевые линии (y = -4, -6, -8) толщиной 3 с шаблонами
    //         (1, 0x00FF), (3, 0x00FF) и (1, 0xAAAA); не забудьте GL_LINE_STIPPLE

    glutSwapBuffers();
}

` + RESHAPE + MAIN("Точки и линии");
  var s1_solution = HEAD + P1_COMMON + `void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    // Точки разного размера
    glColor3f(1.0f, 0.9f, 0.2f);
    glPointSize(3.0f);  dot(-6.0f, 7.0f);
    glPointSize(8.0f);  dot( 0.0f, 7.0f);
    glPointSize(16.0f); dot( 6.0f, 7.0f);

    // Линии разной толщины
    glColor3f(0.3f, 0.85f, 1.0f);
    glLineWidth(1.0f); hline(3.0f);
    glLineWidth(3.0f); hline(1.0f);
    glLineWidth(6.0f); hline(-1.0f);

    // Пунктирные линии
    glColor3f(1.0f, 0.6f, 0.15f);
    glLineWidth(3.0f);
    glEnable(GL_LINE_STIPPLE);
    glLineStipple(1, 0x00FF); hline(-4.0f);
    glLineStipple(3, 0x00FF); hline(-6.0f);
    glLineStipple(1, 0xAAAA); hline(-8.0f);
    glDisable(GL_LINE_STIPPLE);

    glutSwapBuffers();
}

` + RESHAPE + MAIN("Точки и линии");

  /* ---------------- задание 2 ---------------- */
  var STARV = `// i-я вершина десятиугольной звезды: чётные - внешние, нечётные - внутренние
void starVertex(int i) {
    float a = PI / 2 + i * PI / 5;
    float r = 8.0f;
    if (i % 2 == 1) r = 3.2f;
    glVertex2f(r * cos(a), r * sin(a));
}

`;
  var s2_starter = HEAD + STARV + `void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    // TODO 1: залитая звезда веером треугольников GL_TRIANGLE_FAN:
    //         центр (0; 0) белого цвета, вершины starVertex(0..10) оранжевые
    // TODO 2: контур звезды GL_LINE_LOOP из вершин starVertex(0..9),
    //         цвет (1; 0,9; 0,3), толщина линии 3

    glutSwapBuffers();
}

` + RESHAPE + MAIN("Звезда");
  var s2_solution = HEAD + STARV + `void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    // Заливка: веер треугольников вокруг центра
    glBegin(GL_TRIANGLE_FAN);
        glColor3f(1.0f, 1.0f, 1.0f);
        glVertex2f(0.0f, 0.0f);
        glColor3f(1.0f, 0.55f, 0.1f);
        for (int i = 0; i <= 10; i++)      // вершина 10 повторяет вершину 0 и замыкает веер
            starVertex(i);
    glEnd();

    // Контур
    glColor3f(1.0f, 0.9f, 0.3f);
    glLineWidth(3.0f);
    glBegin(GL_LINE_LOOP);
        for (int i = 0; i < 10; i++)
            starVertex(i);
    glEnd();

    glutSwapBuffers();
}

` + RESHAPE + MAIN("Звезда");

  /* ---------------- задание 3 ---------------- */
  var s3_starter = HEAD + `// Правильный n-угольник (filled = 1 - залитый, 0 - контур)
void ngon(float cx, float cy, float R, int n, int filled) {
    // TODO: filled -> GL_TRIANGLE_FAN (центр + n + 1 вершин), иначе GL_LINE_LOOP (n вершин)
    //       вершина i: угол a = PI/2 + i*da, где da = 2*PI/n, точка (cx + R*cos(a); cy + R*sin(a))
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    glColor3f(1.0f, 0.3f, 0.3f); ngon(-7.5f, 6.0f, 2.3f, 3, 1);
    glColor3f(1.0f, 0.7f, 0.2f); ngon(-2.5f, 6.0f, 2.3f, 4, 1);
    glColor3f(0.4f, 0.9f, 0.4f); ngon( 2.5f, 6.0f, 2.3f, 5, 1);
    glColor3f(0.4f, 0.6f, 1.0f); ngon( 7.5f, 6.0f, 2.3f, 6, 1);

    // Окружность - многоугольник с большим числом сторон
    glColor3f(1.0f, 1.0f, 1.0f);
    glLineWidth(2.0f);
    ngon(0.0f, -3.0f, 5.5f, 64, 0);
    glColor3f(0.9f, 0.4f, 0.9f);
    ngon(0.0f, -3.0f, 2.0f, 64, 1);

    glutSwapBuffers();
}

` + RESHAPE + MAIN("Многоугольники");
  var s3_solution = HEAD + NGON + `
void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    glColor3f(1.0f, 0.3f, 0.3f); ngon(-7.5f, 6.0f, 2.3f, 3, 1);
    glColor3f(1.0f, 0.7f, 0.2f); ngon(-2.5f, 6.0f, 2.3f, 4, 1);
    glColor3f(0.4f, 0.9f, 0.4f); ngon( 2.5f, 6.0f, 2.3f, 5, 1);
    glColor3f(0.4f, 0.6f, 1.0f); ngon( 7.5f, 6.0f, 2.3f, 6, 1);

    // Окружность - многоугольник с большим числом сторон
    glColor3f(1.0f, 1.0f, 1.0f);
    glLineWidth(2.0f);
    ngon(0.0f, -3.0f, 5.5f, 64, 0);
    glColor3f(0.9f, 0.4f, 0.9f);
    ngon(0.0f, -3.0f, 2.0f, 64, 1);

    glutSwapBuffers();
}

` + RESHAPE + MAIN("Многоугольники");

  /* ---------------- задание 4 ---------------- */
  var s4_starter = HEAD + `void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    // TODO 1: цветное кольцо GL_QUAD_STRIP с центром (0; 3), радиусами 3,5 и 6,5;
    //         36 сегментов; для каждого i = 0..36 две вершины (внешняя и внутренняя)
    //         одного цвета: (0,5+0,5*cos(a); 0,5+0,5*cos(a-2,094); 0,5+0,5*cos(a+2,094))

    // TODO 2: волнистая лента GL_TRIANGLE_STRIP: для k = 0..11 вершины
    //         (-9+1,5k; -6) - голубая и (-8,25+1,5k; -9) - синяя

    glutSwapBuffers();
}

` + RESHAPE + MAIN("Полосы");
  var s4_solution = HEAD + `void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    // Кольцо: пары вершин (внешняя, внутренняя) образуют четырёхугольники полосы
    const int N = 36;
    float da = 2 * PI / N;                  // угловой шаг
    glBegin(GL_QUAD_STRIP);
    for (int i = 0; i <= N; i++) {
        float a = i * da;
        glColor3f(0.5f + 0.5f * cos(a), 0.5f + 0.5f * cos(a - 2.094f), 0.5f + 0.5f * cos(a + 2.094f));
        glVertex2f(6.5f * cos(a), 3.0f + 6.5f * sin(a));
        glVertex2f(3.5f * cos(a), 3.0f + 3.5f * sin(a));
    }
    glEnd();

    // Лента: вершины чередуются между верхним и нижним краем, каждая новая даёт треугольник
    glBegin(GL_TRIANGLE_STRIP);
    for (int k = 0; k < 12; k++) {
        glColor3f(0.3f, 0.85f, 1.0f);
        glVertex2f(-9.0f + 1.5f * k, -6.0f);
        glColor3f(0.15f, 0.3f, 0.9f);
        glVertex2f(-8.25f + 1.5f * k, -9.0f);
    }
    glEnd();

    glutSwapBuffers();
}

` + RESHAPE + MAIN("Полосы");

  /* ---------------- задание 5 ---------------- */
  var TRI = `// Треугольник с центром (cx; cy): ccw = 1 - против часовой стрелки, 0 - по часовой
void tri(float cx, float cy, int ccw) {
    glBegin(GL_TRIANGLES);
    if (ccw) {
        glVertex2f(cx - 2.2f, cy - 2.0f);
        glVertex2f(cx + 2.2f, cy - 2.0f);
        glVertex2f(cx,        cy + 2.2f);
    } else {
        glVertex2f(cx - 2.2f, cy - 2.0f);
        glVertex2f(cx,        cy + 2.2f);
        glVertex2f(cx + 2.2f, cy - 2.0f);
    }
    glEnd();
}

// Ряд из трёх треугольников: лицевой, нелицевой, лицевой
void row(float y) {
    tri(-6.0f, y, 1);
    tri( 0.0f, y, 0);
    tri( 6.0f, y, 1);
}

`;
  var s5_starter = HEAD + TRI + `void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    // TODO 1: включите отсечение нелицевых граней (GL_CULL_FACE, glCullFace(GL_BACK))
    glColor3f(0.95f, 0.45f, 0.3f);
    row(6.0f);                    // ряд 1: заливка (режим по умолчанию)

    // TODO 2: ряд 2 (y = 0) - только контуры: glPolygonMode(GL_FRONT_AND_BACK, GL_LINE), толщина 3
    glColor3f(0.4f, 0.9f, 0.5f);
    row(0.0f);

    // TODO 3: ряд 3 (y = -6) - только вершины: GL_POINT, размер точки 7;
    //         лицевыми считайте грани по часовой стрелке: glFrontFace(GL_CW)
    glColor3f(0.5f, 0.7f, 1.0f);
    row(-6.0f);

    glFrontFace(GL_CCW);          // вернуть обход по умолчанию
    glutSwapBuffers();
}

` + RESHAPE + MAIN("Режимы многоугольников");
  var s5_solution = HEAD + TRI + `void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    glEnable(GL_CULL_FACE);       // отсекаем нелицевые грани
    glCullFace(GL_BACK);

    glColor3f(0.95f, 0.45f, 0.3f);
    row(6.0f);                    // заливка: средний треугольник (обход по часовой) исчез

    glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);
    glLineWidth(3.0f);
    glColor3f(0.4f, 0.9f, 0.5f);
    row(0.0f);                    // контуры

    glPolygonMode(GL_FRONT_AND_BACK, GL_POINT);
    glPointSize(7.0f);
    glFrontFace(GL_CW);           // теперь лицевым считается обход по часовой стрелке
    glColor3f(0.5f, 0.7f, 1.0f);
    row(-6.0f);                   // видны вершины только среднего треугольника

    glFrontFace(GL_CCW);
    glutSwapBuffers();
}

` + RESHAPE + MAIN("Режимы многоугольников");

  /* ---------------- задание 6 ---------------- */
  var PETAL = `// Лепесток: ромб вдоль оси Y (цвет задаёт вызывающий код)
void petal() {
    glBegin(GL_POLYGON);
        glVertex2f( 0.0f, 0.8f);
        glVertex2f( 1.1f, 2.6f);
        glVertex2f( 0.0f, 6.0f);
        glVertex2f(-1.1f, 2.6f);
    glEnd();
}

`;
  var s6_starter = HEAD + PETAL + NGON + `
// Цветок: 12 лепестков вокруг начала координат
void flower() {
    // TODO 1: цикл i = 0..11; для каждого лепестка
    //   glPushMatrix(); glRotatef(30*i, 0, 0, 1);
    //   чётные i: масштаб 1, цвет (0,95; 0,3; 0,55); нечётные: масштаб 0,6, цвет (1; 0,75; 0,2)
    //   petal(); glPopMatrix();
    glColor3f(0.45f, 0.25f, 0.1f);
    ngon(0.0f, 0.0f, 1.1f, 24, 1);          // сердцевина
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    flower();                                // большой цветок в центре

    // TODO 2: четыре маленьких цветка в углах (+-7,2; +-7,2), каждый с масштабом 0,3:
    //   glPushMatrix(); glTranslatef(...); glScalef(0.3, 0.3, 1); flower(); glPopMatrix();

    glutSwapBuffers();
}

` + RESHAPE + MAIN("Преобразования");
  var s6_solution = HEAD + PETAL + NGON + `
// Цветок: 12 лепестков вокруг начала координат
void flower() {
    for (int i = 0; i < 12; i++) {
        glPushMatrix();
            glRotatef(30.0f * i, 0.0f, 0.0f, 1.0f);   // поворот вокруг начала координат
            if (i % 2 == 0) {
                glColor3f(0.95f, 0.3f, 0.55f);
            } else {
                glScalef(0.6f, 0.6f, 1.0f);            // уменьшаем лепесток
                glColor3f(1.0f, 0.75f, 0.2f);
            }
            petal();
        glPopMatrix();
    }
    glColor3f(0.45f, 0.25f, 0.1f);
    ngon(0.0f, 0.0f, 1.1f, 24, 1);          // сердцевина
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    flower();                                // большой цветок в центре

    // Четыре уменьшенные копии в углах
    for (int sx = -1; sx <= 1; sx += 2) {
        for (int sy = -1; sy <= 1; sy += 2) {
            glPushMatrix();
                glTranslatef(7.2f * sx, 7.2f * sy, 0.0f);
                glScalef(0.3f, 0.3f, 1.0f);
                flower();
            glPopMatrix();
        }
    }

    glutSwapBuffers();
}

` + RESHAPE + MAIN("Преобразования");

  /* ---------------- задание 7 ---------------- */
  var s7_starter = HEAD + NGON + `
void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    float t = glutGet(GLUT_ELAPSED_TIME) / 1000.0f;   // время в секундах

    // Орбиты
    glColor3f(0.35f, 0.38f, 0.5f);
    ngon(0.0f, 0.0f, 6.5f, 72, 0);

    // Солнце
    glColor3f(1.0f, 0.55f, 0.1f); ngon(0.0f, 0.0f, 2.0f, 40, 1);
    glColor3f(1.0f, 0.9f, 0.3f);  ngon(0.0f, 0.0f, 1.4f, 40, 1);

    // TODO 1: планета (радиус 1,0, цвет (0,3; 0,6; 1)) на орбите радиуса 6,5:
    //         glRotatef(t*40, 0,0,1) -> glTranslatef(6.5, 0, 0)
    // TODO 2: луна (радиус 0,4, серая) вокруг планеты на расстоянии 2,3:
    //         внутри блока планеты ещё glRotatef(t*200, 0,0,1) -> glTranslatef(2.3, 0, 0)
    //         (используйте glPushMatrix/glPopMatrix)

    glutSwapBuffers();
}

// TODO 3: функция idle() с вызовом glutPostRedisplay() и её регистрация glutIdleFunc(idle)

` + RESHAPE + MAIN("Анимация");
  var s7_solution = HEAD + NGON + `
void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    float t = glutGet(GLUT_ELAPSED_TIME) / 1000.0f;   // время в секундах

    // Орбиты
    glColor3f(0.35f, 0.38f, 0.5f);
    ngon(0.0f, 0.0f, 6.5f, 72, 0);

    // Солнце
    glColor3f(1.0f, 0.55f, 0.1f); ngon(0.0f, 0.0f, 2.0f, 40, 1);
    glColor3f(1.0f, 0.9f, 0.3f);  ngon(0.0f, 0.0f, 1.4f, 40, 1);

    // Планета: сначала поворот на угол орбиты, затем сдвиг на радиус орбиты
    glPushMatrix();
        glRotatef(t * 40.0f, 0.0f, 0.0f, 1.0f);
        glTranslatef(6.5f, 0.0f, 0.0f);
        glColor3f(0.3f, 0.6f, 1.0f);
        ngon(0.0f, 0.0f, 1.0f, 32, 1);

        // Луна - в системе координат планеты
        glPushMatrix();
            glRotatef(t * 200.0f, 0.0f, 0.0f, 1.0f);
            glTranslatef(2.3f, 0.0f, 0.0f);
            glColor3f(0.8f, 0.8f, 0.85f);
            ngon(0.0f, 0.0f, 0.4f, 24, 1);
        glPopMatrix();
    glPopMatrix();

    glutSwapBuffers();
}

void idle() {
    glutPostRedisplay();      // перерисовывать кадр непрерывно
}

` + RESHAPE + MAIN("Анимация", "    glutIdleFunc(idle);\n");

  /* ---------------- задание 8 ---------------- */
  var KEY_G = `float angle = 0.0f;       // текущий угол орбиты, градусы
float speed = 1.0f;       // множитель скорости
float orbitR = 6.5f;      // радиус орбиты планеты
int paused = 0;
int wire = 0;
int lastT = 0;

`;
  var s8_display = `void display() {
    glClear(GL_COLOR_BUFFER_BIT);

    if (wire) glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);
    else      glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);

    glColor3f(0.35f, 0.38f, 0.5f);
    ngon(0.0f, 0.0f, orbitR, 72, 0);

    glColor3f(1.0f, 0.55f, 0.1f); ngon(0.0f, 0.0f, 2.0f, 40, 1);
    glColor3f(1.0f, 0.9f, 0.3f);  ngon(0.0f, 0.0f, 1.4f, 40, 1);

    glPushMatrix();
        glRotatef(angle, 0.0f, 0.0f, 1.0f);
        glTranslatef(orbitR, 0.0f, 0.0f);
        glColor3f(0.3f, 0.6f, 1.0f);
        ngon(0.0f, 0.0f, 1.0f, 32, 1);
        glPushMatrix();
            glRotatef(angle * 5.0f, 0.0f, 0.0f, 1.0f);
            glTranslatef(2.3f, 0.0f, 0.0f);
            glColor3f(0.8f, 0.8f, 0.85f);
            ngon(0.0f, 0.0f, 0.4f, 24, 1);
        glPopMatrix();
    glPopMatrix();

    glutSwapBuffers();
}

`;
  var s8_starter = HEAD + KEY_G + NGON + `
` + s8_display + `// Анимация: угол накапливается с учётом прошедшего времени
void idle() {
    int t = glutGet(GLUT_ELAPSED_TIME);
    float dt = (t - lastT) / 1000.0f;
    lastT = t;
    if (!paused) angle += 40.0f * speed * dt;
    glutPostRedisplay();
}

// TODO 1: void keyboard(unsigned char key, int x, int y)
//   '+' - speed *= 1.25;  '-' - speed /= 1.25;  ' ' (пробел) - переключить paused;
//   'w' - переключить wire (каркас/заливка)
// TODO 2: void special(int key, int x, int y)
//   GLUT_KEY_UP - orbitR += 0.5 (не более 8);  GLUT_KEY_DOWN - orbitR -= 0.5 (не менее 3.5)
// TODO 3: зарегистрируйте обе функции в main: glutKeyboardFunc, glutSpecialFunc

` + RESHAPE + MAIN("Управление с клавиатуры", "    glutIdleFunc(idle);\n");
  var s8_solution = HEAD + KEY_G + NGON + `
` + s8_display + `// Анимация: угол накапливается с учётом прошедшего времени
void idle() {
    int t = glutGet(GLUT_ELAPSED_TIME);
    float dt = (t - lastT) / 1000.0f;
    lastT = t;
    if (!paused) angle += 40.0f * speed * dt;
    glutPostRedisplay();
}

// Обычные клавиши (коды ASCII)
void keyboard(unsigned char key, int x, int y) {
    if (key == '+') speed *= 1.25f;
    if (key == '-') speed /= 1.25f;
    if (key == ' ') paused = !paused;
    if (key == 'w') wire = !wire;
}

// Специальные клавиши (стрелки, F1...)
void special(int key, int x, int y) {
    if (key == GLUT_KEY_UP   && orbitR < 8.0f) orbitR += 0.5f;
    if (key == GLUT_KEY_DOWN && orbitR > 3.5f) orbitR -= 0.5f;
}

` + RESHAPE + MAIN("Управление с клавиатуры", "    glutIdleFunc(idle);\n    glutKeyboardFunc(keyboard);\n    glutSpecialFunc(special);\n");

  /* ---------------- пример ---------------- */
  var ex_code = `#include <GL/glut.h>
#include <cstdio>

// Функция рисования: вызывается GLUT при каждой перерисовке окна
void display() {
    glClear(GL_COLOR_BUFFER_BIT);            // очистить буфер цвета

    glBegin(GL_TRIANGLES);                   // три вершины - один треугольник
        glColor3f(1.0f, 0.0f, 0.0f); glVertex2f(-7.0f, -6.0f);
        glColor3f(0.0f, 1.0f, 0.0f); glVertex2f( 7.0f, -6.0f);
        glColor3f(0.0f, 0.0f, 1.0f); glVertex2f( 0.0f,  7.0f);
    glEnd();

    GLenum err = glGetError();               // проверка ошибок OpenGL
    if (err != GL_NO_ERROR) printf("Ошибка OpenGL: %d\\n", (int)err);

    glutSwapBuffers();                       // показать готовый кадр (двойная буферизация)
}

// Вызывается при создании окна и при изменении его размеров
void reshape(int w, int h) {
    glViewport(0, 0, w, h);                  // область вывода - всё окно
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    glOrtho(-10.0, 10.0, -10.0, 10.0, -1.0, 1.0);   // 2D-мир: x, y от -10 до 10
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);                               // инициализация GLUT
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB);         // два буфера, цвет RGB
    glutInitWindowSize(400, 400);
    glutCreateWindow("Первая программа GLUT");
    glClearColor(0.08f, 0.09f, 0.14f, 1.0f);             // цвет фона
    glutDisplayFunc(display);                            // регистрация обработчиков
    glutReshapeFunc(reshape);
    glutMainLoop();                                      // бесконечный цикл событий
    return 0;
}
`;

  LAB.define({
    n: 11,
    title: "Рисование и преобразование геометрических объектов в OpenGL",
    steps: [
      { id: "s0", kind: "example", title: "Пример: структура программы GLUT",
        text: "<p>Запустите программу и найдите в коде основные части: инициализацию GLUT (<code>glutInit</code>, <code>glutInitDisplayMode</code>), создание окна, регистрацию обработчиков и вход в цикл <code>glutMainLoop</code>. Обратите внимание, как <code>glOrtho</code> задаёт мировые координаты окна: теперь вершины заданы числами от −10 до 10, а не от −1 до 1. Цвет вершин интерполируется внутри треугольника (<code>GL_SMOOTH</code>).</p>",
        code: ex_code },
      { id: "s1", kind: "task", title: "Задание 1. Точки и линии: размер, толщина, шаблон",
        text: "<p>Нарисуйте три жёлтые точки, три голубые линии и три пунктирные оранжевые линии (координаты и параметры указаны в комментариях). Используйте <code>glPointSize</code>, <code>glLineWidth</code>, <code>glEnable(GL_LINE_STIPPLE)</code> и <code>glLineStipple</code>. Цвет в OpenGL — часть состояния: он действует на все последующие вершины, пока не изменён.</p>",
        hint: "Шаблон 0x00FF при множителе 1 даёт 8 закрашенных и 8 пропущенных пикселей; множитель 3 растягивает каждый бит в три пикселя. Шаблоны действуют только при включённом GL_LINE_STIPPLE.",
        check: { type: "both", calls: { "glPointSize": ">=3", "glLineWidth": ">=3", "glLineStipple": ">=3" } },
        starter: s1_starter, solution: s1_solution },
      { id: "s2", kind: "task", title: "Задание 2. Звезда: GL_TRIANGLE_FAN и GL_LINE_LOOP",
        text: "<p>Нарисуйте пятиконечную звезду: залитую веером треугольников (центр белый, края оранжевые — цвет плавно меняется) и обведённую контуром из замкнутой ломаной. Функция <code>starVertex(i)</code> уже вычисляет вершины на двух окружностях.</p>",
        hint: "Веер начинается с центра, затем идут вершины 0…10; вершина 10 совпадает с нулевой и замыкает веер. Для контура достаточно вершин 0…9 — GL_LINE_LOOP замкнёт ломаную сам.",
        check: { type: "both", calls: { "glBegin": ">=2" }, source: [{ re: "GL_TRIANGLE_FAN", msg: "Залитая звезда должна рисоваться примитивом GL_TRIANGLE_FAN" }, { re: "GL_LINE_LOOP", msg: "Контур звезды должен рисоваться примитивом GL_LINE_LOOP" }] },
        starter: s2_starter, solution: s2_solution },
      { id: "s3", kind: "task", title: "Задание 3. Правильные многоугольники и окружность",
        text: "<p>Реализуйте функцию <code>ngon</code>: вершины правильного n-угольника лежат на окружности радиуса <i>R</i> и вычисляются через <code>cos</code> и <code>sin</code>. Залитый многоугольник — <code>GL_TRIANGLE_FAN</code>, контур — <code>GL_LINE_LOOP</code>. Окружность — это многоугольник с большим числом сторон (здесь 64).</p>",
        hint: "Для веера первая вершина — центр (cx; cy), далее n + 1 вершин (последняя повторяет первую). Для контура нужно ровно n вершин, угол i-й вершины a = PI/2 + i·da, где da = 2·PI/n.",
        check: { type: "both", calls: { "glBegin": ">=6" }, source: [{ re: "cos", msg: "Вычисляйте координаты вершин через cos и sin" }] },
        starter: s3_starter, solution: s3_solution },
      { id: "s4", kind: "task", title: "Задание 4. Полосы: GL_QUAD_STRIP и GL_TRIANGLE_STRIP",
        text: "<p>Постройте цветное кольцо из полосы четырёхугольников (<code>GL_QUAD_STRIP</code>) и волнистую ленту из полосы треугольников (<code>GL_TRIANGLE_STRIP</code>). В полосе каждая новая пара (или одна) вершин достраивает фигуру, поэтому вершины идут не по контуру, а «зигзагом» между двумя краями.</p>",
        hint: "В цикле для каждого угла задавайте сначала внешнюю, затем внутреннюю вершину; цвет вызывайте перед ними. Чтобы кольцо замкнулось, цикл идёт до i = N включительно.",
        check: { type: "both", calls: { "glBegin": ">=2" }, source: [{ re: "GL_QUAD_STRIP", msg: "Кольцо должно рисоваться примитивом GL_QUAD_STRIP" }, { re: "GL_TRIANGLE_STRIP", msg: "Лента должна рисоваться примитивом GL_TRIANGLE_STRIP" }] },
        starter: s4_starter, solution: s4_solution },
      { id: "s5", kind: "task", title: "Задание 5. glPolygonMode, отсечение граней и порядок обхода",
        text: "<p>Функция <code>row</code> рисует ряд из трёх треугольников; средний задан обходом по часовой стрелке (нелицевой). Включите отсечение нелицевых граней и нарисуйте три ряда в разных режимах: заливка, контуры (<code>GL_LINE</code>) и точки (<code>GL_POINT</code>). В третьем ряду смените лицевую сторону через <code>glFrontFace(GL_CW)</code> и объясните, какие треугольники остались.</p>",
        hint: "Отсечение включается glEnable(GL_CULL_FACE); glCullFace(GL_BACK) указывает, какие грани отбрасывать. Режимы многоугольников задаются glPolygonMode(GL_FRONT_AND_BACK, ...) и действуют на все последующие фигуры.",
        check: { type: "both", calls: { "glPolygonMode": ">=2", "glFrontFace": ">=2" }, source: [{ re: "GL_CULL_FACE", msg: "Включите отсечение граней: glEnable(GL_CULL_FACE)" }] },
        starter: s5_starter, solution: s5_solution },
      { id: "s6", kind: "task", title: "Задание 6. Преобразования и стек матриц",
        text: "<p>Постройте цветок из 12 лепестков с помощью одной функции <code>petal()</code>: каждый лепесток поворачивается на 30°·<i>i</i> вокруг начала координат, нечётные уменьшены в 0,6 раза. Затем нарисуйте четыре уменьшенные (×0,3) копии всего цветка в углах окна. Пользуйтесь <code>glPushMatrix</code>/<code>glPopMatrix</code>, чтобы преобразования одного объекта не влияли на следующие.</p>",
        hint: "Преобразования применяются к вершинам в порядке, обратном вызовам: glTranslatef перед glScalef означает «сначала масштабировать, потом сдвинуть». Поэтому для копии в углу: Translate, затем Scale.",
        check: { type: "both", calls: { "glPushMatrix": ">=5", "glPopMatrix": ">=5", "glRotatef": ">=12", "glScalef": ">=1", "glTranslatef": ">=4" } },
        starter: s6_starter, solution: s6_solution },
      { id: "s7", kind: "task", title: "Задание 7. Анимация: система «Солнце — планета — Луна»",
        text: "<p>Оживите сцену: положение планеты и Луны зависит от времени <code>glutGet(GLUT_ELAPSED_TIME)</code>. Планета вращается вокруг Солнца, Луна — вокруг планеты, то есть в системе координат, которая уже повёрнута и сдвинута. Для непрерывной перерисовки зарегистрируйте <code>idle</code>-функцию с вызовом <code>glutPostRedisplay</code>.</p>",
        hint: "Планета: glRotatef(t*40, 0,0,1) и glTranslatef(6.5, 0, 0) внутри glPushMatrix/glPopMatrix. Луну рисуйте внутри этого же блока, вложив ещё одну пару Push/Pop.",
        check: { type: "both", calls: { "glRotatef": ">=2", "glPushMatrix": ">=2" }, source: [{ re: "glutIdleFunc\\s*\\(\\s*\\w+\\s*\\)|glutTimerFunc", msg: "Зарегистрируйте функцию анимации: glutIdleFunc или glutTimerFunc" }, { re: "glutPostRedisplay", msg: "Для перерисовки вызывайте glutPostRedisplay()" }] },
        starter: s7_starter, solution: s7_solution },
      { id: "s8", kind: "task", title: "Задание 8. Управление с клавиатуры",
        text: "<p>Добавьте интерактивность: клавиши <b>+</b>/<b>−</b> меняют скорость, <b>пробел</b> — пауза, <b>w</b> — каркасный режим (<code>glPolygonMode</code>), стрелки <b>↑</b>/<b>↓</b> — радиус орбиты планеты. Обычные клавиши принимает <code>glutKeyboardFunc</code>, стрелки — <code>glutSpecialFunc</code>. Проверьте работу в окне справа, щёлкнув по нему мышью, чтобы оно получило фокус.</p>",
        hint: "Обработчики должны иметь сигнатуры void keyboard(unsigned char key, int x, int y) и void special(int key, int x, int y); после изменения переменных кадр перерисует idle().",
        check: { type: "calls", calls: { "glRotatef": ">=2" }, source: [{ re: "glutKeyboardFunc\\s*\\(\\s*\\w+\\s*\\)", msg: "Зарегистрируйте glutKeyboardFunc(keyboard)" }, { re: "glutSpecialFunc\\s*\\(\\s*\\w+\\s*\\)", msg: "Зарегистрируйте glutSpecialFunc(special)" }, { re: "GLUT_KEY_UP", msg: "Обработайте стрелку вверх (GLUT_KEY_UP)" }] },
        starter: s8_starter, solution: s8_solution }
    ]
  });
})();
