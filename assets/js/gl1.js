/* GL1 — эмуляция классического OpenGL 1.x (+ GLU, GLUT) поверх WebGL2.
   Используется песочницей и лабораторными: программа на C++ (подмножество) переводится в JS
   и вызывает те же функции glBegin/glVertex/glLight/... что и в Visual Studio.
   Конвейер фиксированных функций выполняется шейдером: освещение по вершинам (Гуро), туман,
   текстуры с glTexEnv, генерация координат, альфа-тест, шаблоны, плоскости отсечения.
   Линии расширяются на CPU (ширина, шаблон, сглаживание), режимы полигонов и отсечение граней
   для GL_LINE/GL_POINT вычисляются на CPU по оконным координатам. */
(function (global) {
  "use strict";

  /* ---------------------------------------------------------------- константы */
  var K = {
    GL_FALSE: 0, GL_TRUE: 1, GL_NONE: 0,
    GL_POINTS: 0, GL_LINES: 1, GL_LINE_LOOP: 2, GL_LINE_STRIP: 3, GL_TRIANGLES: 4, GL_TRIANGLE_STRIP: 5,
    GL_TRIANGLE_FAN: 6, GL_QUADS: 7, GL_QUAD_STRIP: 8, GL_POLYGON: 9,
    GL_DEPTH_BUFFER_BIT: 0x100, GL_ACCUM_BUFFER_BIT: 0x200, GL_STENCIL_BUFFER_BIT: 0x400, GL_COLOR_BUFFER_BIT: 0x4000,
    GL_CURRENT_BIT: 0x1, GL_POINT_BIT: 0x2, GL_LINE_BIT: 0x4, GL_POLYGON_BIT: 0x8, GL_POLYGON_STIPPLE_BIT: 0x10,
    GL_PIXEL_MODE_BIT: 0x20, GL_LIGHTING_BIT: 0x40, GL_FOG_BIT: 0x80, GL_VIEWPORT_BIT: 0x800, GL_TRANSFORM_BIT: 0x1000,
    GL_ENABLE_BIT: 0x2000, GL_HINT_BIT: 0x8000, GL_EVAL_BIT: 0x10000, GL_LIST_BIT: 0x20000, GL_TEXTURE_BIT: 0x40000,
    GL_SCISSOR_BIT: 0x80000, GL_ALL_ATTRIB_BITS: 0xFFFFFFFF, GL_CLIENT_ALL_ATTRIB_BITS: 0xFFFFFFFF,
    GL_CURRENT_COLOR: 0x0B00, GL_CURRENT_NORMAL: 0x0B02, GL_POINT_SMOOTH: 0x0B10, GL_POINT_SIZE: 0x0B11,
    GL_LINE_SMOOTH: 0x0B20, GL_LINE_WIDTH: 0x0B21, GL_LINE_STIPPLE: 0x0B24, GL_POLYGON_MODE: 0x0B40,
    GL_POLYGON_SMOOTH: 0x0B41, GL_POLYGON_STIPPLE: 0x0B42, GL_CULL_FACE: 0x0B44, GL_CULL_FACE_MODE: 0x0B45,
    GL_FRONT_FACE: 0x0B46, GL_LIGHTING: 0x0B50, GL_LIGHT_MODEL_LOCAL_VIEWER: 0x0B51, GL_LIGHT_MODEL_TWO_SIDE: 0x0B52,
    GL_LIGHT_MODEL_AMBIENT: 0x0B53, GL_SHADE_MODEL: 0x0B54, GL_COLOR_MATERIAL: 0x0B57, GL_FOG: 0x0B60,
    GL_FOG_INDEX: 0x0B61, GL_FOG_DENSITY: 0x0B62, GL_FOG_START: 0x0B63, GL_FOG_END: 0x0B64, GL_FOG_MODE: 0x0B65,
    GL_FOG_COLOR: 0x0B66, GL_DEPTH_RANGE: 0x0B70, GL_DEPTH_TEST: 0x0B71, GL_DEPTH_WRITEMASK: 0x0B72,
    GL_DEPTH_CLEAR_VALUE: 0x0B73, GL_DEPTH_FUNC: 0x0B74, GL_STENCIL_TEST: 0x0B90, GL_MATRIX_MODE: 0x0BA0,
    GL_NORMALIZE: 0x0BA1, GL_VIEWPORT: 0x0BA2, GL_MODELVIEW_STACK_DEPTH: 0x0BA3, GL_PROJECTION_STACK_DEPTH: 0x0BA4,
    GL_TEXTURE_STACK_DEPTH: 0x0BA5, GL_MODELVIEW_MATRIX: 0x0BA6, GL_PROJECTION_MATRIX: 0x0BA7, GL_TEXTURE_MATRIX: 0x0BA8,
    GL_ALPHA_TEST: 0x0BC0, GL_DITHER: 0x0BD0, GL_BLEND: 0x0BE2, GL_LOGIC_OP: 0x0BF1, GL_COLOR_LOGIC_OP: 0x0BF2,
    GL_SCISSOR_BOX: 0x0C10, GL_SCISSOR_TEST: 0x0C11, GL_COLOR_CLEAR_VALUE: 0x0C22, GL_DOUBLEBUFFER: 0x0C32,
    GL_PERSPECTIVE_CORRECTION_HINT: 0x0C50, GL_POINT_SMOOTH_HINT: 0x0C51, GL_LINE_SMOOTH_HINT: 0x0C52,
    GL_POLYGON_SMOOTH_HINT: 0x0C53, GL_FOG_HINT: 0x0C54, GL_TEXTURE_GEN_S: 0x0C60, GL_TEXTURE_GEN_T: 0x0C61,
    GL_TEXTURE_GEN_R: 0x0C62, GL_TEXTURE_GEN_Q: 0x0C63, GL_UNPACK_SWAP_BYTES: 0x0CF0, GL_UNPACK_LSB_FIRST: 0x0CF1,
    GL_UNPACK_ROW_LENGTH: 0x0CF2, GL_UNPACK_SKIP_ROWS: 0x0CF3, GL_UNPACK_SKIP_PIXELS: 0x0CF4, GL_UNPACK_ALIGNMENT: 0x0CF5,
    GL_PACK_ROW_LENGTH: 0x0D02, GL_PACK_ALIGNMENT: 0x0D05, GL_RED_SCALE: 0x0D14, GL_RED_BIAS: 0x0D15, GL_ZOOM_X: 0x0D16,
    GL_ZOOM_Y: 0x0D17, GL_GREEN_SCALE: 0x0D18, GL_GREEN_BIAS: 0x0D19, GL_BLUE_SCALE: 0x0D1A, GL_BLUE_BIAS: 0x0D1B,
    GL_ALPHA_SCALE: 0x0D1C, GL_ALPHA_BIAS: 0x0D1D, GL_DEPTH_SCALE: 0x0D1E, GL_DEPTH_BIAS: 0x0D1F,
    GL_MAX_LIGHTS: 0x0D31, GL_MAX_CLIP_PLANES: 0x0D32, GL_MAX_TEXTURE_SIZE: 0x0D33, GL_MAX_MODELVIEW_STACK_DEPTH: 0x0D36,
    GL_MAX_PROJECTION_STACK_DEPTH: 0x0D38, GL_MAX_VIEWPORT_DIMS: 0x0D3A, GL_RED_BITS: 0x0D52, GL_GREEN_BITS: 0x0D53,
    GL_BLUE_BITS: 0x0D54, GL_ALPHA_BITS: 0x0D55, GL_DEPTH_BITS: 0x0D56, GL_STENCIL_BITS: 0x0D57,
    GL_AUTO_NORMAL: 0x0D80, GL_TEXTURE_1D: 0x0DE0, GL_TEXTURE_2D: 0x0DE1, GL_TEXTURE_WIDTH: 0x1000, GL_TEXTURE_HEIGHT: 0x1001,
    GL_TEXTURE_BORDER_COLOR: 0x1004, GL_DONT_CARE: 0x1100, GL_FASTEST: 0x1101, GL_NICEST: 0x1102,
    GL_AMBIENT: 0x1200, GL_DIFFUSE: 0x1201, GL_SPECULAR: 0x1202, GL_POSITION: 0x1203, GL_SPOT_DIRECTION: 0x1204,
    GL_SPOT_EXPONENT: 0x1205, GL_SPOT_CUTOFF: 0x1206, GL_CONSTANT_ATTENUATION: 0x1207, GL_LINEAR_ATTENUATION: 0x1208,
    GL_QUADRATIC_ATTENUATION: 0x1209, GL_COMPILE: 0x1300, GL_COMPILE_AND_EXECUTE: 0x1301,
    GL_BYTE: 0x1400, GL_UNSIGNED_BYTE: 0x1401, GL_SHORT: 0x1402, GL_UNSIGNED_SHORT: 0x1403, GL_INT: 0x1404,
    GL_UNSIGNED_INT: 0x1405, GL_FLOAT: 0x1406, GL_DOUBLE: 0x140A, GL_CLEAR: 0x1500, GL_AND: 0x1501, GL_COPY: 0x1503,
    GL_XOR: 0x1506, GL_INVERT: 0x150A, GL_EMISSION: 0x1600, GL_SHININESS: 0x1601, GL_AMBIENT_AND_DIFFUSE: 0x1602,
    GL_COLOR_INDEXES: 0x1603, GL_MODELVIEW: 0x1700, GL_PROJECTION: 0x1701, GL_TEXTURE: 0x1702, GL_COLOR: 0x1800,
    GL_DEPTH: 0x1801, GL_STENCIL: 0x1802, GL_COLOR_INDEX: 0x1900, GL_STENCIL_INDEX: 0x1901, GL_DEPTH_COMPONENT: 0x1902,
    GL_RED: 0x1903, GL_GREEN: 0x1904, GL_BLUE: 0x1905, GL_ALPHA: 0x1906, GL_RGB: 0x1907, GL_RGBA: 0x1908,
    GL_LUMINANCE: 0x1909, GL_LUMINANCE_ALPHA: 0x190A, GL_BITMAP: 0x1A00, GL_POINT: 0x1B00, GL_LINE: 0x1B01, GL_FILL: 0x1B02,
    GL_RENDER: 0x1C00, GL_FEEDBACK: 0x1C01, GL_SELECT: 0x1C02, GL_FLAT: 0x1D00, GL_SMOOTH: 0x1D01,
    GL_KEEP: 0x1E00, GL_REPLACE: 0x1E01, GL_INCR: 0x1E02, GL_DECR: 0x1E03, GL_VENDOR: 0x1F00, GL_RENDERER: 0x1F01,
    GL_VERSION: 0x1F02, GL_EXTENSIONS: 0x1F03, GL_S: 0x2000, GL_T: 0x2001, GL_R: 0x2002, GL_Q: 0x2003,
    GL_MODULATE: 0x2100, GL_DECAL: 0x2101, GL_TEXTURE_ENV_MODE: 0x2200, GL_TEXTURE_ENV_COLOR: 0x2201, GL_TEXTURE_ENV: 0x2300,
    GL_EYE_LINEAR: 0x2400, GL_OBJECT_LINEAR: 0x2401, GL_SPHERE_MAP: 0x2402, GL_TEXTURE_GEN_MODE: 0x2500,
    GL_OBJECT_PLANE: 0x2501, GL_EYE_PLANE: 0x2502, GL_NEAREST: 0x2600, GL_LINEAR: 0x2601,
    GL_NEAREST_MIPMAP_NEAREST: 0x2700, GL_LINEAR_MIPMAP_NEAREST: 0x2701, GL_NEAREST_MIPMAP_LINEAR: 0x2702,
    GL_LINEAR_MIPMAP_LINEAR: 0x2703, GL_TEXTURE_MAG_FILTER: 0x2800, GL_TEXTURE_MIN_FILTER: 0x2801, GL_TEXTURE_WRAP_S: 0x2802,
    GL_TEXTURE_WRAP_T: 0x2803, GL_CLAMP: 0x2900, GL_REPEAT: 0x2901, GL_POLYGON_OFFSET_UNITS: 0x2A00,
    GL_POLYGON_OFFSET_POINT: 0x2A01, GL_POLYGON_OFFSET_LINE: 0x2A02, GL_CLIP_PLANE0: 0x3000, GL_CLIP_PLANE1: 0x3001,
    GL_CLIP_PLANE2: 0x3002, GL_CLIP_PLANE3: 0x3003, GL_CLIP_PLANE4: 0x3004, GL_CLIP_PLANE5: 0x3005,
    GL_LIGHT0: 0x4000, GL_LIGHT1: 0x4001, GL_LIGHT2: 0x4002, GL_LIGHT3: 0x4003, GL_LIGHT4: 0x4004, GL_LIGHT5: 0x4005,
    GL_LIGHT6: 0x4006, GL_LIGHT7: 0x4007, GL_CONSTANT_COLOR: 0x8001, GL_ONE_MINUS_CONSTANT_COLOR: 0x8002,
    GL_CONSTANT_ALPHA: 0x8003, GL_ONE_MINUS_CONSTANT_ALPHA: 0x8004, GL_BLEND_COLOR: 0x8005, GL_FUNC_ADD: 0x8006,
    GL_MIN: 0x8007, GL_MAX: 0x8008, GL_FUNC_SUBTRACT: 0x800A, GL_FUNC_REVERSE_SUBTRACT: 0x800B,
    GL_POLYGON_OFFSET_FILL: 0x8037, GL_POLYGON_OFFSET_FACTOR: 0x8038, GL_RESCALE_NORMAL: 0x803A, GL_RGB8: 0x8051,
    GL_RGBA8: 0x8058, GL_TEXTURE_BINDING_2D: 0x8069, GL_VERTEX_ARRAY: 0x8074, GL_NORMAL_ARRAY: 0x8075,
    GL_COLOR_ARRAY: 0x8076, GL_INDEX_ARRAY: 0x8077, GL_TEXTURE_COORD_ARRAY: 0x8078, GL_EDGE_FLAG_ARRAY: 0x8079,
    GL_MULTISAMPLE: 0x809D, GL_SAMPLE_ALPHA_TO_COVERAGE: 0x809E, GL_SAMPLE_BUFFERS: 0x80A8, GL_SAMPLES: 0x80A9,
    GL_BGR: 0x80E0, GL_BGRA: 0x80E1, GL_CLAMP_TO_BORDER: 0x812D, GL_CLAMP_TO_EDGE: 0x812F, GL_GENERATE_MIPMAP: 0x8191,
    GL_LIGHT_MODEL_COLOR_CONTROL: 0x81F8, GL_SINGLE_COLOR: 0x81F9, GL_SEPARATE_SPECULAR_COLOR: 0x81FA,
    GL_MIRRORED_REPEAT: 0x8370, GL_INCR_WRAP: 0x8507, GL_DECR_WRAP: 0x8508, GL_NORMAL_MAP: 0x8511, GL_REFLECTION_MAP: 0x8512,
    GL_ARRAY_BUFFER: 0x8892, GL_ELEMENT_ARRAY_BUFFER: 0x8893, GL_STREAM_DRAW: 0x88E0, GL_STATIC_DRAW: 0x88E4,
    GL_DYNAMIC_DRAW: 0x88E8, GL_NO_ERROR: 0, GL_INVALID_ENUM: 0x0500, GL_INVALID_VALUE: 0x0501,
    GL_INVALID_OPERATION: 0x0502, GL_STACK_OVERFLOW: 0x0503, GL_STACK_UNDERFLOW: 0x0504, GL_OUT_OF_MEMORY: 0x0505,
    GL_NEVER: 0x0200, GL_LESS: 0x0201, GL_EQUAL: 0x0202, GL_LEQUAL: 0x0203, GL_GREATER: 0x0204, GL_NOTEQUAL: 0x0205,
    GL_GEQUAL: 0x0206, GL_ALWAYS: 0x0207, GL_ZERO: 0, GL_ONE: 1, GL_SRC_COLOR: 0x0300, GL_ONE_MINUS_SRC_COLOR: 0x0301,
    GL_SRC_ALPHA: 0x0302, GL_ONE_MINUS_SRC_ALPHA: 0x0303, GL_DST_ALPHA: 0x0304, GL_ONE_MINUS_DST_ALPHA: 0x0305,
    GL_DST_COLOR: 0x0306, GL_ONE_MINUS_DST_COLOR: 0x0307, GL_SRC_ALPHA_SATURATE: 0x0308, GL_FRONT_LEFT: 0x0400,
    GL_FRONT: 0x0404, GL_BACK: 0x0405, GL_LEFT: 0x0406, GL_RIGHT: 0x0407, GL_FRONT_AND_BACK: 0x0408,
    GL_CW: 0x0900, GL_CCW: 0x0901, GL_EXP: 0x0800, GL_EXP2: 0x0801, GL_ACCUM: 0x0100, GL_LOAD: 0x0101,
    GL_RETURN: 0x0102, GL_MULT: 0x0103, GL_ADD: 0x0104, GL_V2F: 0x2A20, GL_V3F: 0x2A21,
    GLU_FALSE: 0, GLU_TRUE: 1, GLU_SMOOTH: 100000, GLU_FLAT: 100001, GLU_NONE: 100002, GLU_POINT: 100010,
    GLU_LINE: 100011, GLU_FILL: 100012, GLU_SILHOUETTE: 100013, GLU_OUTSIDE: 100020, GLU_INSIDE: 100021,
    GLUT_RGB: 0, GLUT_RGBA: 0, GLUT_INDEX: 1, GLUT_SINGLE: 0, GLUT_DOUBLE: 2, GLUT_ACCUM: 4, GLUT_ALPHA: 8,
    GLUT_DEPTH: 16, GLUT_STENCIL: 32, GLUT_MULTISAMPLE: 128, GLUT_STEREO: 256,
    GLUT_LEFT_BUTTON: 0, GLUT_MIDDLE_BUTTON: 1, GLUT_RIGHT_BUTTON: 2, GLUT_DOWN: 0, GLUT_UP: 1,
    GLUT_KEY_F1: 1, GLUT_KEY_F2: 2, GLUT_KEY_F3: 3, GLUT_KEY_F4: 4, GLUT_KEY_F5: 5, GLUT_KEY_F6: 6, GLUT_KEY_F7: 7,
    GLUT_KEY_F8: 8, GLUT_KEY_F9: 9, GLUT_KEY_F10: 10, GLUT_KEY_F11: 11, GLUT_KEY_F12: 12, GLUT_KEY_LEFT: 100,
    GLUT_KEY_UP: 101, GLUT_KEY_RIGHT: 102, GLUT_KEY_DOWN: 103, GLUT_KEY_PAGE_UP: 104, GLUT_KEY_PAGE_DOWN: 105,
    GLUT_KEY_HOME: 106, GLUT_KEY_END: 107, GLUT_KEY_INSERT: 108, GLUT_ACTIVE_SHIFT: 1, GLUT_ACTIVE_CTRL: 2, GLUT_ACTIVE_ALT: 4,
    GLUT_WINDOW_X: 100, GLUT_WINDOW_Y: 101, GLUT_WINDOW_WIDTH: 102, GLUT_WINDOW_HEIGHT: 103, GLUT_SCREEN_WIDTH: 200,
    GLUT_SCREEN_HEIGHT: 201, GLUT_ELAPSED_TIME: 700, GLUT_WINDOW_DOUBLEBUFFER: 115, GLUT_ACTION_ON_WINDOW_CLOSE: 0x01F9,
    GLUT_ACTION_EXIT: 0, GLUT_ACTION_GLUTMAINLOOP_RETURNS: 1, GLUT_ACTION_CONTINUE_EXECUTION: 2,
    GLUT_CORE_PROFILE: 1, GLUT_COMPATIBILITY_PROFILE: 2, GLUT_VISIBLE: 1, GLUT_NOT_VISIBLE: 0, GLEW_OK: 0,
    GLUT_BITMAP_9_BY_15: "9x15", GLUT_BITMAP_8_BY_13: "8x13", GLUT_BITMAP_TIMES_ROMAN_10: "tr10",
    GLUT_BITMAP_TIMES_ROMAN_24: "tr24", GLUT_BITMAP_HELVETICA_10: "h10", GLUT_BITMAP_HELVETICA_12: "h12",
    GLUT_BITMAP_HELVETICA_18: "h18", GLUT_STROKE_ROMAN: "h18", GLUT_STROKE_MONO_ROMAN: "9x15"
  };
  var FONTS = { "9x15": ["15px monospace", 9, 15], "8x13": ["13px monospace", 8, 13], tr10: ["10px serif", 0, 10],
    tr24: ["24px serif", 0, 24], h10: ["10px sans-serif", 0, 10], h12: ["12px sans-serif", 0, 12], h18: ["18px sans-serif", 0, 18] };

  /* -------------------------------------------------------------------- математика */
  function m4() { var m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
  function mmul(a, b) { // a*b, столбцовый порядок
    var r = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var rr = 0; rr < 4; rr++) {
      r[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3];
    }
    return r;
  }
  function mvec(m, v) {
    var x = v[0], y = v[1], z = v[2], w = v.length > 3 ? v[3] : 1;
    return [m[0] * x + m[4] * y + m[8] * z + m[12] * w, m[1] * x + m[5] * y + m[9] * z + m[13] * w,
      m[2] * x + m[6] * y + m[10] * z + m[14] * w, m[3] * x + m[7] * y + m[11] * z + m[15] * w];
  }
  function minv(m) {
    var a = m, inv = new Float32Array(16);
    inv[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
    inv[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
    inv[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
    inv[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
    inv[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
    inv[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
    inv[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
    inv[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
    inv[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
    inv[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
    inv[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
    inv[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
    inv[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
    inv[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
    inv[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
    inv[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
    var det = a[0] * inv[0] + a[1] * inv[4] + a[2] * inv[8] + a[3] * inv[12];
    if (Math.abs(det) < 1e-30) return m4();
    for (var i = 0; i < 16; i++) inv[i] /= det;
    return inv;
  }
  function normalMat(mv) { // транспонированная обратная 3×3
    var i = minv(mv);
    return new Float32Array([i[0], i[4], i[8], i[1], i[5], i[9], i[2], i[6], i[10]]);
  }
  function rowvec(v, m) { // v (строка) * m  — для плоскостей отсечения/генерации текстур
    return [v[0] * m[0] + v[1] * m[1] + v[2] * m[2] + v[3] * m[3], v[0] * m[4] + v[1] * m[5] + v[2] * m[6] + v[3] * m[7],
      v[0] * m[8] + v[1] * m[9] + v[2] * m[10] + v[3] * m[11], v[0] * m[12] + v[1] * m[13] + v[2] * m[14] + v[3] * m[15]];
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  /* ------------------------------------------------- массивы из «C»: плоские значения */
  function flat(a, out) { // вложенные массивы → плоский список чисел
    out = out || [];
    if (a == null) return out;
    if (typeof a === "number" || typeof a === "boolean") { out.push(+a); return out; }
    if (a.__ptr) { var f = flat(a.arr); for (var i = a.off; i < f.length; i++) out.push(f[i]); return out; }
    if (ArrayBuffer.isView(a)) { for (var j = 0; j < a.length; j++) out.push(a[j]); return out; }
    for (var k = 0; k < a.length; k++) { var v = a[k]; if (typeof v === "number") out.push(v); else flat(v, out); }
    return out;
  }
  function vals(a, n) { // аргумент-указатель (массив) → n чисел
    if (a && a.__ptr) { var f = flat(a.arr); return f.slice(a.off, a.off + n); }
    if (Array.isArray(a) && a.length >= n && typeof a[0] === "number") return a.slice(0, n).map(Number);
    var f2 = flat(a); return f2.slice(0, n);
  }
  function writeFlat(target, values) { // записать значения в (вложенный) массив по порядку
    var idx = 0;
    if (target && target.__ref) { target.v = values[0]; return; }
    if (target && target.__ptr) { var base = target.off; return writeAt(target.arr, values, base); }
    (function rec(t) {
      for (var i = 0; i < t.length && idx < values.length; i++) {
        if (typeof t[i] === "object" && t[i] !== null && t[i].length !== undefined) rec(t[i]); else t[i] = values[idx++];
      }
    })(target);
  }
  function writeAt(arr, values, start) {
    var pos = 0, idx = 0;
    (function rec(t) {
      for (var i = 0; i < t.length && idx < values.length; i++) {
        if (typeof t[i] === "object" && t[i] !== null && t[i].length !== undefined) rec(t[i]);
        else { if (pos >= start) t[i] = values[idx++]; pos++; }
      }
    })(arr);
  }

  /* ------------------------------------------------------------------------ шейдеры */
  var VS = "#version 300 es\n" +
    "precision highp float;\n" +
    "in vec4 aPos; in vec4 aColor; in vec3 aNormal; in vec4 aTex; in vec4 aClip; in vec2 aLine;\n" +
    "uniform mat4 uMV, uP, uTexM; uniform mat3 uNM; uniform bool uUseClip; uniform float uPointSize;\n" +
    "uniform bool uLighting, uLocalViewer, uTwoSide, uSepSpec; uniform int uNormalize;\n" +
    "uniform bool uLOn[8]; uniform vec4 uLAmb[8], uLDif[8], uLSpe[8], uLPos[8]; uniform vec3 uLDir[8];\n" +
    "uniform float uLExp[8], uLCut[8]; uniform vec3 uLAtt[8];\n" +
    "uniform vec4 uMAmb[2], uMDif[2], uMSpe[2], uMEmi[2]; uniform float uMShi[2]; uniform vec4 uGAmb;\n" +
    "uniform int uCM; uniform int uCMFace;\n" +
    "uniform bool uTG[4]; uniform int uTGMode[4]; uniform vec4 uTGObj[4], uTGEye[4];\n" +
    "out vec4 vF, vB, vSF, vSB; flat out vec4 fF, fB, fSF, fSB; out vec4 vTex; out vec4 vEye; out vec2 vLine;\n" +
    "void light(int face, vec3 N, vec3 E, vec4 col, out vec4 res, out vec4 spec) {\n" +
    "  vec4 ma = uMAmb[face], md = uMDif[face], ms = uMSpe[face], me = uMEmi[face];\n" +
    "  bool cmf = (uCMFace == 3) || (uCMFace == 1 && face == 0) || (uCMFace == 2 && face == 1);\n" +
    "  if (uCM > 0 && cmf) { if (uCM == 1 || uCM == 5) ma = col; if (uCM == 2 || uCM == 5) md = col; if (uCM == 3) ms = col; if (uCM == 4) me = col; }\n" +
    "  vec3 c = me.rgb + uGAmb.rgb * ma.rgb; vec3 s = vec3(0.0);\n" +
    "  vec3 V = uLocalViewer ? normalize(-E) : vec3(0.0, 0.0, 1.0);\n" +
    "  for (int i = 0; i < 8; i++) {\n" +
    "    if (!uLOn[i]) continue;\n" +
    "    vec3 L; float att = 1.0; vec4 lp = uLPos[i];\n" +
    "    if (lp.w == 0.0) L = normalize(lp.xyz); else {\n" +
    "      vec3 d = lp.xyz / lp.w - E; float dist = length(d); L = d / max(dist, 1e-6);\n" +
    "      att = 1.0 / max(uLAtt[i].x + uLAtt[i].y * dist + uLAtt[i].z * dist * dist, 1e-6);\n" +
    "      if (uLCut[i] > -1.5) { float sd = dot(-L, normalize(uLDir[i])); if (sd < uLCut[i]) att = 0.0; else att *= pow(max(sd, 0.0), uLExp[i]); }\n" +
    "    }\n" +
    "    float nl = max(dot(N, L), 0.0);\n" +
    "    vec3 term = uLAmb[i].rgb * ma.rgb + nl * uLDif[i].rgb * md.rgb;\n" +
    "    vec3 sp = vec3(0.0);\n" +
    "    if (nl > 0.0) { vec3 H = normalize(L + V); float nh = max(dot(N, H), 0.0); sp = (uMShi[face] > 0.0 ? pow(nh, uMShi[face]) : 1.0) * uLSpe[i].rgb * ms.rgb; }\n" +
    "    if (uSepSpec) { c += att * term; s += att * sp; } else c += att * (term + sp);\n" +
    "  }\n" +
    "  res = vec4(clamp(c, 0.0, 1.0), md.a); spec = vec4(clamp(s, 0.0, 1.0), 0.0);\n" +
    "}\n" +
    "void main() {\n" +
    "  vec4 eye = uMV * aPos; vEye = eye;\n" +
    "  gl_Position = uUseClip ? aClip : uP * eye; gl_PointSize = uPointSize; vLine = aLine;\n" +
    "  vec3 E = eye.xyz / (eye.w == 0.0 ? 1.0 : eye.w);\n" +
    "  vec3 N = uNM * aNormal; if (uNormalize > 0) N = normalize(N);\n" +
    "  vec4 cf = aColor, cb = aColor, sf = vec4(0.0), sb = vec4(0.0);\n" +
    "  if (uLighting) { light(0, N, E, aColor, cf, sf); if (uTwoSide) light(1, -N, E, aColor, cb, sb); else { cb = cf; sb = sf; } }\n" +
    "  vF = cf; vB = cb; vSF = sf; vSB = sb; fF = cf; fB = cb; fSF = sf; fSB = sb;\n" +
    "  vec4 t = aTex;\n" +
    "  for (int k = 0; k < 4; k++) {\n" +
    "    if (!uTG[k]) continue; float g;\n" +
    "    if (uTGMode[k] == 1) g = dot(uTGObj[k], aPos);\n" +
    "    else if (uTGMode[k] == 0) g = dot(uTGEye[k], eye);\n" +
    "    else { vec3 u = normalize(E); vec3 n = normalize(N); vec3 r = reflect(u, n); float m = 2.0 * sqrt(r.x*r.x + r.y*r.y + (r.z+1.0)*(r.z+1.0)); g = (k == 0 ? r.x : r.y) / m + 0.5; }\n" +
    "    t[k] = g;\n" +
    "  }\n" +
    "  vTex = uTexM * t;\n" +
    "}\n";

  var FS = "#version 300 es\n" +
    "precision highp float; precision highp int;\n" +
    "in vec4 vF, vB, vSF, vSB; flat in vec4 fF, fB, fSF, fSB; in vec4 vTex; in vec4 vEye; in vec2 vLine;\n" +
    "uniform bool uFlat, uTwoSideSel, uIsLine, uIsPoint, uPointSmooth, uLineSmooth, uLineStip, uPolyStip;\n" +
    "uniform float uLineHalf; uniform int uStipFactor, uStipPattern; uniform highp uint uPoly[32];\n" +
    "uniform bool uTexOn; uniform sampler2D uSamp; uniform int uEnv; uniform int uTexFmt; uniform vec4 uEnvColor;\n" +
    "uniform bool uFog; uniform int uFogMode; uniform float uFogDen, uFogStart, uFogEnd; uniform vec4 uFogColor;\n" +
    "uniform bool uAlphaTest; uniform int uAlphaFunc; uniform float uAlphaRef;\n" +
    "uniform bool uClipOn[6]; uniform vec4 uClipPl[6];\n" +
    "out vec4 outColor;\n" +
    "bool cmp(int f, float a, float r) { if (f == 0) return false; if (f == 1) return a < r; if (f == 2) return a == r; if (f == 3) return a <= r; if (f == 4) return a > r; if (f == 5) return a != r; if (f == 6) return a >= r; return true; }\n" +
    "void main() {\n" +
    "  for (int i = 0; i < 6; i++) if (uClipOn[i] && dot(uClipPl[i], vEye) < 0.0) discard;\n" +
    "  if (uPolyStip && !uIsLine && !uIsPoint) { int x = int(gl_FragCoord.x) & 31; int y = int(gl_FragCoord.y) & 31; if (((uPoly[y] >> uint(31 - x)) & 1u) == 0u) discard; }\n" +
    "  bool front = (uIsLine || uIsPoint) ? true : gl_FrontFacing;\n" +
    "  vec4 c, s;\n" +
    "  if (uFlat) { c = (uTwoSideSel && !front) ? fB : fF; s = (uTwoSideSel && !front) ? fSB : fSF; }\n" +
    "  else { c = (uTwoSideSel && !front) ? vB : vF; s = (uTwoSideSel && !front) ? vSB : vSF; }\n" +
    "  if (uIsLine && uLineStip) { int b = int(floor(vLine.x / float(uStipFactor))) & 15; if (((uStipPattern >> b) & 1) == 0) discard; }\n" +
    "  if (uTexOn) {\n" +
    "    vec2 tc = vTex.q != 0.0 ? vTex.st / vTex.q : vTex.st; vec4 t = texture(uSamp, tc);\n" +
    "    if (uTexFmt == 0) t.a = 1.0; if (uTexFmt == 2) t = vec4(t.rrr, 1.0); if (uTexFmt == 3) t = vec4(t.rrr, t.a);\n" +
    "    bool hasRGB = uTexFmt != 4;\n" +
    "    if (uEnv == 0) { c = hasRGB ? c * t : vec4(c.rgb, c.a * t.a); }\n" +
    "    else if (uEnv == 1) { c = hasRGB ? (uTexFmt == 0 || uTexFmt == 2 ? vec4(t.rgb, c.a) : t) : vec4(c.rgb, t.a); }\n" +
    "    else if (uEnv == 2) { if (uTexFmt == 0) c = vec4(t.rgb, c.a); else if (uTexFmt == 1) c = vec4(mix(c.rgb, t.rgb, t.a), c.a); }\n" +
    "    else if (uEnv == 3) { c = vec4(mix(c.rgb, uEnvColor.rgb, hasRGB ? t.rgb : vec3(0.0)), (uTexFmt == 0 || uTexFmt == 2) ? c.a : c.a * t.a); }\n" +
    "    else if (uEnv == 4) { c = hasRGB ? vec4(clamp(c.rgb + t.rgb, 0.0, 1.0), (uTexFmt == 0 || uTexFmt == 2) ? c.a : c.a * t.a) : vec4(c.rgb, c.a * t.a); }\n" +
    "  }\n" +
    "  c.rgb = clamp(c.rgb + s.rgb, 0.0, 1.0);\n" +
    "  if (uIsPoint && uPointSmooth) { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; c.a *= clamp((1.0 - d) * 6.0, 0.0, 1.0); }\n" +
    "  if (uIsLine && uLineSmooth) { float cov = clamp(uLineHalf + 0.5 - abs(vLine.y), 0.0, 1.0); c.a *= cov; }\n" +
    "  if (uFog) { float z = abs(vEye.z / (vEye.w == 0.0 ? 1.0 : vEye.w)); float f;\n" +
    "    if (uFogMode == 0) f = (uFogEnd - z) / (uFogEnd - uFogStart); else if (uFogMode == 1) f = exp(-uFogDen * z); else f = exp(-(uFogDen * z) * (uFogDen * z));\n" +
    "    f = clamp(f, 0.0, 1.0); c.rgb = mix(uFogColor.rgb, c.rgb, f); }\n" +
    "  if (uAlphaTest && !cmp(uAlphaFunc, c.a, uAlphaRef)) discard;\n" +
    "  outColor = c;\n" +
    "}\n";

  /* простой шейдер для glDrawPixels / glutBitmap / накопительного буфера */
  var VS2 = "#version 300 es\nin vec2 aP; in vec2 aT; out vec2 vT; uniform vec2 uWin; uniform float uZ;\n" +
    "void main(){ vT = aT; gl_Position = vec4(aP / uWin * 2.0 - 1.0, uZ, 1.0); }\n";
  var FS2 = "#version 300 es\nprecision highp float; in vec2 vT; uniform sampler2D uS; uniform vec4 uTint; uniform bool uMask; out vec4 o;\n" +
    "void main(){ vec4 t = texture(uS, vT); if (uMask) { if (t.a < 0.5) discard; o = uTint; } else o = t; }\n";

  /* ===================================================================== создание */
  function create(host, opts) {
    opts = opts || {};
    var log = opts.log || function () {}, warn = opts.warn || log;
    var rt = {}, S, gl = null, canvas = null, prog, loc = {}, prog2, loc2 = {};
    var winW = 300, winH = 300, displayMode = 0, created = false, destroyed = false, title = "OpenGL";
    var hasDepth = false, hasStencil = false, hasAccum = false, msaa = false, doubleBuf = false;
    var fboMS = null, fboSS = null, fboResolve = null, texResolve = null, drawFbo = null;
    var cb = { display: null, reshape: null, keyboard: null, keyboardUp: null, special: null, specialUp: null, mouse: null,
      motion: null, passive: null, idle: null, wheel: null, entry: null, visibility: null, close: null };
    var timers = [], rafId = 0, redisplay = false, mainLoopStarted = false, t0 = performance.now();
    var errorFlag = 0, stats = { frames: 0, blocks: 0, verts: 0, draws: 0, fps: 0, lastFps: performance.now(), fpsFrames: 0 };
    var calls = Object.create(null), swapped = false, inDisplay = false, presentedThisFrame = false;
    var fixedTime = opts.fixedTime; // в режиме проверки время «заморожено»

    function err(code, msg) { if (!errorFlag) errorFlag = code; if (msg) warn(msg); }
    function cnt(name) { calls[name] = (calls[name] || 0) + 1; }

    /* ------------------------------------------------------------- состояние */
    function lightDefaults(i) {
      return { on: false, amb: [0, 0, 0, 1], dif: i === 0 ? [1, 1, 1, 1] : [0, 0, 0, 1], spe: i === 0 ? [1, 1, 1, 1] : [0, 0, 0, 1],
        pos: [0, 0, 1, 0], dir: [0, 0, -1], exp: 0, cut: 180, att: [1, 0, 0] };
    }
    function matDefaults() { return { amb: [0.2, 0.2, 0.2, 1], dif: [0.8, 0.8, 0.8, 1], spe: [0, 0, 0, 1], emi: [0, 0, 0, 1], shi: 0 }; }
    function freshState() {
      var L = []; for (var i = 0; i < 8; i++) L.push(lightDefaults(i));
      return {
        matMode: K.GL_MODELVIEW, mv: [m4()], pr: [m4()], tx: [m4()],
        viewport: [0, 0, winW, winH], clearColor: [0, 0, 0, 0], clearDepth: 1, clearStencil: 0,
        color: [1, 1, 1, 1], normal: [0, 0, 1], tex: [0, 0, 0, 1],
        caps: Object.create(null), lights: L,
        lm: { amb: [0.2, 0.2, 0.2, 1], local: false, two: false, sep: false },
        mat: [matDefaults(), matDefaults()], cmFace: K.GL_FRONT_AND_BACK, cmMode: K.GL_AMBIENT_AND_DIFFUSE,
        shade: K.GL_SMOOTH, frontFace: K.GL_CCW, cullFace: K.GL_BACK, polyMode: [K.GL_FILL, K.GL_FILL],
        pointSize: 1, lineWidth: 1, stipFactor: 1, stipPattern: 0xFFFF, polyStip: new Uint32Array(32).fill(0xFFFFFFFF),
        depthFunc: K.GL_LESS, depthMask: true, depthRange: [0, 1],
        blendSrc: K.GL_ONE, blendDst: K.GL_ZERO, blendSrcA: K.GL_ONE, blendDstA: K.GL_ZERO, blendEq: K.GL_FUNC_ADD, blendColor: [0, 0, 0, 0],
        alphaFunc: K.GL_ALWAYS, alphaRef: 0,
        stFunc: K.GL_ALWAYS, stRef: 0, stMask: 0xFFFFFFFF, stFail: K.GL_KEEP, stZFail: K.GL_KEEP, stZPass: K.GL_KEEP, stWMask: 0xFFFFFFFF,
        colorMask: [true, true, true, true], scissor: [0, 0, winW, winH], polyOffset: [0, 0],
        fogMode: K.GL_EXP, fogDen: 1, fogStart: 0, fogEnd: 1, fogColor: [0, 0, 0, 0],
        texBound: 0, envMode: K.GL_MODULATE, envColor: [0, 0, 0, 0],
        tg: [{ mode: K.GL_EYE_LINEAR, obj: [1, 0, 0, 0], eye: [1, 0, 0, 0] }, { mode: K.GL_EYE_LINEAR, obj: [0, 1, 0, 0], eye: [0, 1, 0, 0] },
          { mode: K.GL_EYE_LINEAR, obj: [0, 0, 0, 0], eye: [0, 0, 0, 0] }, { mode: K.GL_EYE_LINEAR, obj: [0, 0, 0, 0], eye: [0, 0, 0, 0] }],
        clip: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
        raster: { pos: [0, 0, 0, 1], valid: true, color: [1, 1, 1, 1] }, zoom: [1, 1],
        unpackAlign: 4, unpackRow: 0, packAlign: 4,
        xfer: { scale: [1, 1, 1, 1], bias: [0, 0, 0, 0] },
        listBase: 0, clearAccum: [0, 0, 0, 0]
      };
    }
    S = freshState();
    S.caps[K.GL_DITHER] = true; S.caps[K.GL_MULTISAMPLE] = true;
    var attribStack = [];
    function curStack() { return S.matMode === K.GL_PROJECTION ? S.pr : S.matMode === K.GL_TEXTURE ? S.tx : S.mv; }
    function top(st) { return st[st.length - 1]; }
    function setTop(m) { var st = curStack(); st[st.length - 1] = m; }
    function MV() { return top(S.mv); }
    function PR() { return top(S.pr); }

    /* ----------------------------------------------------------- контекст WebGL */
    function makeContext() {
      canvas = document.createElement("canvas");
      canvas.width = winW; canvas.height = winH; canvas.tabIndex = 0;
      canvas.className = "gl-canvas";
      canvas.setAttribute("aria-label", "Окно OpenGL: " + title);
      if (host) host.appendChild(canvas);
      gl = canvas.getContext("webgl2", { antialias: false, depth: false, stencil: false, alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
      if (!gl) throw new Error("Браузер не поддерживает WebGL2 — откройте страницу в свежей версии Chrome, Edge или Firefox.");
      prog = link(VS, FS);
      ["aPos", "aColor", "aNormal", "aTex", "aClip", "aLine"].forEach(function (n) { loc[n] = gl.getAttribLocation(prog, n); });
      var uni = ["uMV", "uP", "uTexM", "uNM", "uUseClip", "uPointSize", "uLighting", "uLocalViewer", "uTwoSide", "uSepSpec", "uNormalize",
        "uGAmb", "uCM", "uCMFace", "uFlat", "uTwoSideSel", "uIsLine", "uIsPoint", "uPointSmooth", "uLineSmooth", "uLineStip", "uPolyStip",
        "uLineHalf", "uStipFactor", "uStipPattern", "uPoly", "uTexOn", "uSamp", "uEnv", "uTexFmt", "uEnvColor", "uFog", "uFogMode", "uFogDen",
        "uFogStart", "uFogEnd", "uFogColor", "uAlphaTest", "uAlphaFunc", "uAlphaRef"];
      uni.forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
      ["uLOn", "uLAmb", "uLDif", "uLSpe", "uLPos", "uLDir", "uLExp", "uLCut", "uLAtt"].forEach(function (n) { loc[n] = []; for (var i = 0; i < 8; i++) loc[n].push(gl.getUniformLocation(prog, n + "[" + i + "]")); });
      ["uMAmb", "uMDif", "uMSpe", "uMEmi", "uMShi"].forEach(function (n) { loc[n] = [gl.getUniformLocation(prog, n + "[0]"), gl.getUniformLocation(prog, n + "[1]")]; });
      ["uTG", "uTGMode", "uTGObj", "uTGEye"].forEach(function (n) { loc[n] = []; for (var i = 0; i < 4; i++) loc[n].push(gl.getUniformLocation(prog, n + "[" + i + "]")); });
      ["uClipOn", "uClipPl"].forEach(function (n) { loc[n] = []; for (var i = 0; i < 6; i++) loc[n].push(gl.getUniformLocation(prog, n + "[" + i + "]")); });
      loc.uPoly = gl.getUniformLocation(prog, "uPoly[0]");
      prog2 = link(VS2, FS2);
      ["aP", "aT"].forEach(function (n) { loc2[n] = gl.getAttribLocation(prog2, n); });
      ["uWin", "uZ", "uS", "uTint", "uMask"].forEach(function (n) { loc2[n] = gl.getUniformLocation(prog2, n); });
      vbo = gl.createBuffer(); vao = gl.createVertexArray();
      whiteTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, whiteTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
      makeFbos();
      gl.useProgram(prog);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
      dirtyAll();
    }
    function link(vs, fs) {
      function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error("GL1 shader: " + gl.getShaderInfoLog(o)); return o; }
      var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("GL1 link: " + gl.getProgramInfoLog(p));
      return p;
    }
    function rb(fmt, samples) {
      var r = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, r);
      if (samples) gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, fmt, winW, winH); else gl.renderbufferStorage(gl.RENDERBUFFER, fmt, winW, winH);
      return r;
    }
    function makeFbos() {
      var dsFmt = gl.DEPTH24_STENCIL8;
      function build(samples) {
        var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb(gl.RGBA8, samples));
        if (hasDepth || hasStencil) gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rb(dsFmt, samples));
        return f;
      }
      fboSS = build(0);
      if (msaa) { var mx = gl.getParameter(gl.MAX_SAMPLES) || 4; fboMS = build(Math.min(4, mx)); }
      texResolve = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texResolve);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, winW, winH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      fboResolve = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fboResolve);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texResolve, 0);
      drawFbo = (msaa && S.caps[K.GL_MULTISAMPLE]) ? fboMS : fboSS;
      gl.bindFramebuffer(gl.FRAMEBUFFER, drawFbo);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    }
    function resolveForRead() { // цветовой буфер → fboResolve (однократная выборка)
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, drawFbo); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fboResolve);
      var sc = gl.isEnabled(gl.SCISSOR_TEST); if (sc) gl.disable(gl.SCISSOR_TEST);
      gl.blitFramebuffer(0, 0, winW, winH, 0, 0, winW, winH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      if (sc) gl.enable(gl.SCISSOR_TEST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, drawFbo);
      return fboResolve;
    }
    function present() {
      if (!gl) return;
      var src = drawFbo === fboMS ? resolveForRead() : drawFbo; // MSAA → обычный буфер того же формата, затем в окно
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      var sc = gl.isEnabled(gl.SCISSOR_TEST); if (sc) gl.disable(gl.SCISSOR_TEST);
      gl.blitFramebuffer(0, 0, winW, winH, 0, 0, winW, winH, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      if (sc) gl.enable(gl.SCISSOR_TEST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, drawFbo);
      presentedThisFrame = true;
    }

    /* ------------------------------------------------- загрузка состояния в шейдер */
    var ver = { mat: 1, light: 1, mtl: 1, tex: 1, misc: 1, clip: 1, stip: 1 }, up = { mat: 0, light: 0, mtl: 0, tex: 0, misc: 0, clip: 0, stip: 0 };
    var vbo, vao, whiteTex;
    function dirtyAll() { for (var k in ver) ver[k]++; }
    function dirty(k) { ver[k]++; }
    var ENVI = {}; ENVI[K.GL_MODULATE] = 0; ENVI[K.GL_REPLACE] = 1; ENVI[K.GL_DECAL] = 2; ENVI[K.GL_BLEND] = 3; ENVI[K.GL_ADD] = 4;
    var ALPHAI = {}; [K.GL_NEVER, K.GL_LESS, K.GL_EQUAL, K.GL_LEQUAL, K.GL_GREATER, K.GL_NOTEQUAL, K.GL_GEQUAL, K.GL_ALWAYS].forEach(function (f, i) { ALPHAI[f] = i; });
    var CMI = {}; CMI[K.GL_AMBIENT] = 1; CMI[K.GL_DIFFUSE] = 2; CMI[K.GL_SPECULAR] = 3; CMI[K.GL_EMISSION] = 4; CMI[K.GL_AMBIENT_AND_DIFFUSE] = 5;
    function on(cap) { return !!S.caps[cap]; }
    function upload(kind) { // kind: 'fill' | 'line' | 'point'
      gl.useProgram(prog);
      if (up.mat !== ver.mat) {
        gl.uniformMatrix4fv(loc.uMV, false, MV()); gl.uniformMatrix4fv(loc.uP, false, PR());
        gl.uniformMatrix4fv(loc.uTexM, false, top(S.tx)); gl.uniformMatrix3fv(loc.uNM, false, normalMat(MV()));
        up.mat = ver.mat;
      }
      if (up.light !== ver.light) {
        gl.uniform1i(loc.uLighting, on(K.GL_LIGHTING) ? 1 : 0);
        gl.uniform1i(loc.uLocalViewer, S.lm.local ? 1 : 0); gl.uniform1i(loc.uTwoSide, S.lm.two ? 1 : 0); gl.uniform1i(loc.uSepSpec, S.lm.sep ? 1 : 0);
        gl.uniform4fv(loc.uGAmb, S.lm.amb);
        gl.uniform1i(loc.uNormalize, (on(K.GL_NORMALIZE) || on(K.GL_RESCALE_NORMAL)) ? 1 : 0);
        for (var i = 0; i < 8; i++) {
          var L = S.lights[i];
          gl.uniform1i(loc.uLOn[i], on(K.GL_LIGHT0 + i) ? 1 : 0);
          gl.uniform4fv(loc.uLAmb[i], L.amb); gl.uniform4fv(loc.uLDif[i], L.dif); gl.uniform4fv(loc.uLSpe[i], L.spe);
          gl.uniform4fv(loc.uLPos[i], L.pos); gl.uniform3fv(loc.uLDir[i], L.dir); gl.uniform1f(loc.uLExp[i], L.exp);
          gl.uniform1f(loc.uLCut[i], L.cut >= 180 ? -2 : Math.cos(L.cut * Math.PI / 180)); gl.uniform3fv(loc.uLAtt[i], L.att);
        }
        gl.uniform1i(loc.uCM, on(K.GL_COLOR_MATERIAL) ? (CMI[S.cmMode] || 5) : 0);
        gl.uniform1i(loc.uCMFace, S.cmFace === K.GL_FRONT ? 1 : S.cmFace === K.GL_BACK ? 2 : 3);
        up.light = ver.light;
      }
      if (up.mtl !== ver.mtl) {
        for (var f = 0; f < 2; f++) {
          var M = S.mat[f];
          gl.uniform4fv(loc.uMAmb[f], M.amb); gl.uniform4fv(loc.uMDif[f], M.dif); gl.uniform4fv(loc.uMSpe[f], M.spe);
          gl.uniform4fv(loc.uMEmi[f], M.emi); gl.uniform1f(loc.uMShi[f], M.shi);
        }
        up.mtl = ver.mtl;
      }
      if (up.tex !== ver.tex) {
        var T = textures[S.texBound], texOn = on(K.GL_TEXTURE_2D) && T && T.ready;
        if (texOn && isMip(T.min) && !T.hasMips) { // неполная текстура: в OpenGL текстурирование отключается
          texOn = false;
          if (!warnedTex) { warnedTex = true; warn("Текстура неполная: GL_TEXTURE_MIN_FILTER по умолчанию требует мип-уровни. Задайте glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR) или используйте gluBuild2DMipmaps()."); }
        }
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texOn ? T.tex : whiteTex);
        if (texOn) applyTexParams(T);
        gl.uniform1i(loc.uSamp, 0); gl.uniform1i(loc.uTexOn, texOn ? 1 : 0);
        gl.uniform1i(loc.uEnv, ENVI[S.envMode] || 0); gl.uniform1i(loc.uTexFmt, texOn ? T.fmtCode : 1); gl.uniform4fv(loc.uEnvColor, S.envColor);
        for (var k = 0; k < 4; k++) {
          gl.uniform1i(loc.uTG[k], on(K.GL_TEXTURE_GEN_S + k) ? 1 : 0);
          var md = S.tg[k].mode; gl.uniform1i(loc.uTGMode[k], md === K.GL_OBJECT_LINEAR ? 1 : md === K.GL_SPHERE_MAP ? 2 : 0);
          gl.uniform4fv(loc.uTGObj[k], S.tg[k].obj); gl.uniform4fv(loc.uTGEye[k], S.tg[k].eye);
        }
        up.tex = ver.tex;
      }
      if (up.clip !== ver.clip) {
        for (var c = 0; c < 6; c++) { gl.uniform1i(loc.uClipOn[c], on(K.GL_CLIP_PLANE0 + c) ? 1 : 0); gl.uniform4fv(loc.uClipPl[c], S.clip[c]); }
        up.clip = ver.clip;
      }
      if (up.stip !== ver.stip) { gl.uniform1uiv(loc.uPoly, S.polyStip); up.stip = ver.stip; }
      if (up.misc !== ver.misc) {
        gl.uniform1i(loc.uFog, on(K.GL_FOG) ? 1 : 0);
        gl.uniform1i(loc.uFogMode, S.fogMode === K.GL_LINEAR ? 0 : S.fogMode === K.GL_EXP ? 1 : 2);
        gl.uniform1f(loc.uFogDen, S.fogDen); gl.uniform1f(loc.uFogStart, S.fogStart); gl.uniform1f(loc.uFogEnd, S.fogEnd); gl.uniform4fv(loc.uFogColor, S.fogColor);
        gl.uniform1i(loc.uAlphaTest, on(K.GL_ALPHA_TEST) ? 1 : 0); gl.uniform1i(loc.uAlphaFunc, ALPHAI[S.alphaFunc]); gl.uniform1f(loc.uAlphaRef, S.alphaRef);
        gl.uniform1i(loc.uFlat, S.shade === K.GL_FLAT ? 1 : 0);
        gl.uniform1i(loc.uTwoSideSel, (on(K.GL_LIGHTING) && S.lm.two) ? 1 : 0);
        gl.uniform1i(loc.uPolyStip, on(K.GL_POLYGON_STIPPLE) ? 1 : 0);
        gl.uniform1i(loc.uLineStip, on(K.GL_LINE_STIPPLE) ? 1 : 0); gl.uniform1i(loc.uStipFactor, Math.max(1, S.stipFactor | 0)); gl.uniform1i(loc.uStipPattern, S.stipPattern & 0xFFFF);
        gl.uniform1i(loc.uPointSmooth, on(K.GL_POINT_SMOOTH) ? 1 : 0); gl.uniform1i(loc.uLineSmooth, on(K.GL_LINE_SMOOTH) ? 1 : 0);
        gl.uniform1f(loc.uPointSize, S.pointSize); gl.uniform1f(loc.uLineHalf, S.lineWidth / 2);
        up.misc = ver.misc;
      }
      gl.uniform1i(loc.uUseClip, kind === "line" ? 1 : 0);
      gl.uniform1i(loc.uIsLine, kind === "line" ? 1 : 0); gl.uniform1i(loc.uIsPoint, kind === "point" ? 1 : 0);
      applyFixed(kind);
    }
    function applyFixed(kind) { // состояние растеризации WebGL
      var vp = S.viewport; gl.viewport(vp[0], vp[1], vp[2], vp[3]);
      gl.depthRange(S.depthRange[0], S.depthRange[1]);
      if (hasDepth && on(K.GL_DEPTH_TEST)) { gl.enable(gl.DEPTH_TEST); gl.depthFunc(S.depthFunc); } else gl.disable(gl.DEPTH_TEST);
      gl.depthMask(!!S.depthMask);
      if (on(K.GL_BLEND)) { gl.enable(gl.BLEND); gl.blendFuncSeparate(S.blendSrc, S.blendDst, S.blendSrcA, S.blendDstA); gl.blendEquation(S.blendEq); gl.blendColor(S.blendColor[0], S.blendColor[1], S.blendColor[2], S.blendColor[3]); }
      else gl.disable(gl.BLEND);
      if (hasStencil && on(K.GL_STENCIL_TEST)) {
        gl.enable(gl.STENCIL_TEST); gl.stencilFunc(S.stFunc, S.stRef, S.stMask >>> 0); gl.stencilOp(S.stFail, S.stZFail, S.stZPass);
      } else gl.disable(gl.STENCIL_TEST);
      gl.stencilMask(S.stWMask >>> 0);
      gl.colorMask(S.colorMask[0], S.colorMask[1], S.colorMask[2], S.colorMask[3]);
      if (on(K.GL_SCISSOR_TEST)) { gl.enable(gl.SCISSOR_TEST); gl.scissor(S.scissor[0], S.scissor[1], S.scissor[2], S.scissor[3]); } else gl.disable(gl.SCISSOR_TEST);
      if (kind === "fill" && on(K.GL_CULL_FACE)) { gl.enable(gl.CULL_FACE); gl.cullFace(S.cullFace); } else gl.disable(gl.CULL_FACE);
      gl.frontFace(S.frontFace);
      var po = (kind === "fill" && on(K.GL_POLYGON_OFFSET_FILL)) || (kind === "line" && on(K.GL_POLYGON_OFFSET_LINE));
      if (po) { gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(S.polyOffset[0], S.polyOffset[1]); } else gl.disable(gl.POLYGON_OFFSET_FILL);
      if (gl.SAMPLE_ALPHA_TO_COVERAGE) { if (on(K.GL_SAMPLE_ALPHA_TO_COVERAGE)) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE); else gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE); }
    }

    /* ------------------------------------------------------- вершины и примитивы */
    // формат вершины: pos4 color4 normal3 tex4 = 15 чисел
    var STRIDE = 15;
    function Batch() { this.d = new Float32Array(STRIDE * 64); this.n = 0; }
    Batch.prototype.push = function (p) {
      if ((this.n + 1) * STRIDE > this.d.length) { var nd = new Float32Array(this.d.length * 2); nd.set(this.d); this.d = nd; }
      var o = this.n * STRIDE, d = this.d, c = S.color, nr = S.normal, t = S.tex;
      d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = p[3];
      d[o + 4] = c[0]; d[o + 5] = c[1]; d[o + 6] = c[2]; d[o + 7] = c[3];
      d[o + 8] = nr[0]; d[o + 9] = nr[1]; d[o + 10] = nr[2];
      d[o + 11] = t[0]; d[o + 12] = t[1]; d[o + 13] = t[2]; d[o + 14] = t[3];
      this.n++;
    };
    var cur = null, curMode = -1, inBegin = false;

    // разбиение примитива на многоугольники (списки индексов) / отрезки / точки
    function polysOf(mode, n) {
      var P = [], i;
      if (mode === K.GL_TRIANGLES) for (i = 0; i + 2 < n; i += 3) P.push([i, i + 1, i + 2, i + 2]);
      else if (mode === K.GL_TRIANGLE_STRIP) for (i = 0; i + 2 < n; i++) P.push(i % 2 ? [i + 1, i, i + 2, i + 2] : [i, i + 1, i + 2, i + 2]);
      else if (mode === K.GL_TRIANGLE_FAN) for (i = 1; i + 1 < n; i++) P.push([0, i, i + 1, i + 1]);
      else if (mode === K.GL_QUADS) for (i = 0; i + 3 < n; i += 4) P.push([i, i + 1, i + 2, i + 3, i + 3]);
      else if (mode === K.GL_QUAD_STRIP) for (i = 0; i + 3 < n; i += 2) P.push([i, i + 1, i + 3, i + 2, i + 3]);
      else if (mode === K.GL_POLYGON && n >= 3) { var a = []; for (i = 0; i < n; i++) a.push(i); a.push(0); P.push(a); }
      return P; // последний элемент — «ведущая» вершина для GL_FLAT
    }
    function segsOf(mode, n) {
      var s = [], i;
      if (mode === K.GL_LINES) for (i = 0; i + 1 < n; i += 2) s.push([i, i + 1, 1]);
      else if (mode === K.GL_LINE_STRIP || mode === K.GL_LINE_LOOP) {
        for (i = 0; i + 1 < n; i++) s.push([i, i + 1, i === 0 ? 1 : 0]);
        if (mode === K.GL_LINE_LOOP && n > 2) s.push([n - 1, 0, 0]);
      }
      return s; // третий элемент — сброс шаблона
    }
    function needCpuPolys() {
      return S.polyMode[0] !== K.GL_FILL || S.polyMode[1] !== K.GL_FILL;
    }
    function winOf(d, i, mvp) {
      var o = i * STRIDE, c = mvp ? mvec(mvp, [d[o], d[o + 1], d[o + 2], d[o + 3]]) : null;
      return c;
    }
    function facing(d, poly, mvp) { // знак площади в оконных координатах → GL_FRONT / GL_BACK
      var area = 0, pts = [], n = poly.length - 1;
      for (var k = 0; k < n; k++) { var c = winOf(d, poly[k], mvp); var w = c[3] || 1e-9; pts.push([c[0] / w, c[1] / w, c[3]]); }
      for (k = 0; k < n; k++) { var a = pts[k], b = pts[(k + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
      var ccw = area > 0, front = (S.frontFace === K.GL_CCW) ? ccw : !ccw;
      return front ? 0 : 1;
    }
    function endPrimitive(b, mode, cache) {
      if (!b || b.n === 0) return;
      if (compiling && replayDepth === 0) { // запись блока в дисплейный список
        var g = new Batch(); g.d = new Float32Array(b.d.subarray(0, b.n * STRIDE)); g.n = b.n;
        compiling.push({ geo: g, mode: mode, hasC: S.color !== listSent.c, hasN: S.normal !== listSent.n, hasT: S.tex !== listSent.t });
        if (!compileExec) return;
      }
      stats.blocks++; stats.verts += b.n;
      if (mode === K.GL_POINTS) { drawPoints(b, null); return; }
      if (mode === K.GL_LINES || mode === K.GL_LINE_STRIP || mode === K.GL_LINE_LOOP) { drawLines(b, segsOf(mode, b.n)); return; }
      if (cache && cache.out && cache.shade === S.shade && !needCpuPolys()) { drawFillOut(cache.out, false, cache); return; }
      var polys = polysOf(mode, b.n);
      if (!needCpuPolys()) {
        var out = buildFill(b, polys);
        if (cache) { cache.out = out; cache.shade = S.shade; cache.glb = null; drawFillOut(out, false, cache); } else drawFillOut(out, false, null);
        return;
      }
      var mvp = mmul(PR(), MV()), fill = [], segs = [], pts = [];
      var cull = on(K.GL_CULL_FACE);
      for (var i = 0; i < polys.length; i++) {
        var P = polys[i], face = facing(b.d, P, mvp);
        if (cull && (S.cullFace === K.GL_FRONT_AND_BACK || (S.cullFace === K.GL_FRONT && face === 0) || (S.cullFace === K.GL_BACK && face === 1))) continue;
        var pm = S.polyMode[face], n = P.length - 1;
        if (pm === K.GL_FILL) fill.push(P);
        else if (pm === K.GL_LINE) for (var k = 0; k < n; k++) segs.push([P[k], P[(k + 1) % n], 1]);
        else for (k = 0; k < n; k++) pts.push(P[k]);
      }
      if (fill.length) drawFillOut(buildFill(b, fill), true, null);
      if (segs.length) drawLines(b, segs);
      if (pts.length) drawPoints(b, pts);
    }
    function bindAttribs(stride, hasClip, buf) {
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf || vbo);
      var B = stride * 4;
      function a(name, size, off) { var l = loc[name]; if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, B, off * 4); }
      a("aPos", 4, 0); a("aColor", 4, 4); a("aNormal", 3, 8); a("aTex", 4, 11);
      if (hasClip) { a("aClip", 4, 15); a("aLine", 2, 19); }
      else { if (loc.aClip >= 0) { gl.disableVertexAttribArray(loc.aClip); gl.vertexAttrib4f(loc.aClip, 0, 0, 0, 1); } if (loc.aLine >= 0) { gl.disableVertexAttribArray(loc.aLine); gl.vertexAttrib2f(loc.aLine, 0, 0); } }
    }
    function buildFill(b, polys) { // треугольники; для GL_FLAT цвет и нормаль ведущей вершины копируются в последнюю вершину
      var flatMode = S.shade === K.GL_FLAT, d = b.d, nt = 0, i, k, z;
      for (i = 0; i < polys.length; i++) nt += Math.max(0, polys[i].length - 3);
      var out = new Float32Array(nt * 3 * STRIDE), q = 0;
      for (i = 0; i < polys.length; i++) {
        var P = polys[i], n = P.length - 1, pv = P[n];
        for (k = 1; k + 1 < n; k++) {
          var t0 = P[0] * STRIDE, t1 = P[k] * STRIDE, t2 = P[k + 1] * STRIDE;
          out.set(d.subarray(t0, t0 + STRIDE), q); q += STRIDE;
          out.set(d.subarray(t1, t1 + STRIDE), q); q += STRIDE;
          out.set(d.subarray(t2, t2 + STRIDE), q);
          if (flatMode && P[k + 1] !== pv) for (z = 4; z < 11; z++) out[q + z] = d[pv * STRIDE + z];
          q += STRIDE;
        }
      }
      return out;
    }
    function drawFillOut(out, noCull, cache) {
      if (!out.length) return;
      upload("fill");
      if (noCull) gl.disable(gl.CULL_FACE);
      if (cache) {
        if (!cache.glb) { cache.glb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cache.glb); gl.bufferData(gl.ARRAY_BUFFER, out, gl.STATIC_DRAW); }
        bindAttribs(STRIDE, false, cache.glb);
      } else { bindAttribs(STRIDE, false); gl.bufferData(gl.ARRAY_BUFFER, out, gl.STREAM_DRAW); }
      gl.drawArrays(gl.TRIANGLES, 0, out.length / STRIDE); stats.draws++;
    }
    function drawPoints(b, idx) {
      var d = b.d, n = idx ? idx.length : b.n, out = new Float32Array(n * STRIDE);
      for (var i = 0; i < n; i++) { var s = idx ? idx[i] : i; out.set(d.subarray(s * STRIDE, s * STRIDE + STRIDE), i * STRIDE); }
      upload("point"); bindAttribs(STRIDE, false);
      gl.bufferData(gl.ARRAY_BUFFER, out, gl.STREAM_DRAW);
      gl.drawArrays(gl.POINTS, 0, n); stats.draws++;
    }
    function drawLines(b, segs) {
      if (!segs.length) return;
      var d = b.d, mvp = mmul(PR(), MV()), vp = S.viewport;
      var lw = Math.max(1, S.lineWidth), smooth = on(K.GL_LINE_SMOOTH), half = lw / 2 + (smooth ? 1 : 0);
      var LS = STRIDE + 6, out = new Float32Array(segs.length * 6 * LS), q = 0, acc = 0;
      function attr(i) { return d.subarray(i * STRIDE, i * STRIDE + STRIDE); }
      for (var s = 0; s < segs.length; s++) {
        var ia = segs[s][0], ib = segs[s][1]; if (segs[s][2]) acc = 0;
        var A = attr(ia), B = attr(ib);
        var ca = mvec(mvp, [A[0], A[1], A[2], A[3]]), cb2 = mvec(mvp, [B[0], B[1], B[2], B[3]]);
        // отсечение ближней плоскостью (w > eps)
        var eps = 1e-5, ta = 0, tb = 1;
        if (ca[3] < eps && cb2[3] < eps) continue;
        var Aa = A, Bb = B;
        if (ca[3] < eps || cb2[3] < eps) {
          var t = (eps - ca[3]) / (cb2[3] - ca[3]);
          var mix = function (P, Q, u) { var r = new Float32Array(STRIDE); for (var z = 0; z < STRIDE; z++) r[z] = P[z] + (Q[z] - P[z]) * u; return r; };
          var cm = [ca[0] + (cb2[0] - ca[0]) * t, ca[1] + (cb2[1] - ca[1]) * t, ca[2] + (cb2[2] - ca[2]) * t, eps];
          if (ca[3] < eps) { Aa = mix(A, B, t); ca = cm; } else { Bb = mix(A, B, t); cb2 = cm; }
        }
        var wa = [vp[0] + (ca[0] / ca[3] + 1) * vp[2] / 2, vp[1] + (ca[1] / ca[3] + 1) * vp[3] / 2];
        var wb = [vp[0] + (cb2[0] / cb2[3] + 1) * vp[2] / 2, vp[1] + (cb2[1] / cb2[3] + 1) * vp[3] / 2];
        var dx = wb[0] - wa[0], dy = wb[1] - wa[1], len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-6) { dx = 1; dy = 0; len = 0; }
        var nx = -dy / (len || 1), ny = dx / (len || 1);
        if (len === 0) { nx = 0; ny = 1; }
        var ex = (len ? dx / len : 1) * 0.5, ey = (len ? dy / len : 0) * 0.5; // небольшое продление концов
        var corners = [[wa, -1, ca, Aa, acc], [wa, 1, ca, Aa, acc], [wb, 1, cb2, Bb, acc + len], [wa, -1, ca, Aa, acc], [wb, 1, cb2, Bb, acc + len], [wb, -1, cb2, Bb, acc + len]];
        for (var k = 0; k < 6; k++) {
          var C = corners[k], w = C[0], side = C[1], clip = C[2], src = C[3], isA = (C[0] === wa);
          var px = w[0] + nx * half * side + (isA ? -ex : ex), py = w[1] + ny * half * side + (isA ? -ey : ey);
          var ndx = (px - vp[0]) / vp[2] * 2 - 1, ndy = (py - vp[1]) / vp[3] * 2 - 1;
          out.set(src, q); out[q + 15] = ndx * clip[3]; out[q + 16] = ndy * clip[3]; out[q + 17] = clip[2]; out[q + 18] = clip[3];
          out[q + 19] = C[4]; out[q + 20] = side * half; q += LS;
        }
        acc += len;
      }
      if (!q) return;
      upload("line"); bindAttribs(LS, true);
      gl.bufferData(gl.ARRAY_BUFFER, out.subarray(0, q), gl.STREAM_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, q / LS); stats.draws++;
    }

    /* --------------------------------------------------------------- дисплейные списки */
    var lists = Object.create(null), nextList = 1, compiling = null, compileExec = false, recDepth = 0, replayDepth = 0;
    var listSent = { c: null, n: null, t: null }, listSaved = null;
    var DRAWING = { glClear: 1, glDrawPixels: 1, glCopyPixels: 1, glBitmap: 1, glAccum: 1, glutBitmapCharacter: 1 };
    var ATTR = /^gl(Color|Normal|TexCoord)/;
    function rec(name, fn) { // команда, которая записывается в дисплейный список
      return function () {
        cnt(name);
        if (compiling && recDepth === 0 && replayDepth === 0 && !(inBegin && ATTR.test(name))) {
          compiling.push([fn, Array.prototype.map.call(arguments, copyArg), name]);
          if (!compileExec && DRAWING[name]) return;
        }
        recDepth++;
        try { return fn.apply(null, arguments); } finally { recDepth--; }
      };
    }
    function comp(name, fn) { return function () { cnt(name); return fn.apply(null, arguments); }; } // составная/геометрия: записывается результатом
    function copyArg(a) {
      if (a && typeof a === "object" && !a.__ref && !a.__img && (Array.isArray(a) || ArrayBuffer.isView(a) || a.__ptr)) return flat(a);
      return a;
    }
    function imm(name, fn) { return function () { cnt(name); return fn.apply(null, arguments); }; } // не записывается
    function cloneState() {
      var o = {};
      for (var k in S) {
        var v = S[k];
        if (k === "mv" || k === "pr" || k === "tx") o[k] = v.map(function (m) { return new Float32Array(m); });
        else if (k === "polyStip") o[k] = new Uint32Array(v);
        else if (k === "caps") o[k] = Object.assign(Object.create(null), v);
        else o[k] = JSON.parse(JSON.stringify(v));
      }
      return o;
    }
    /* -------------------------------------------------------------------- текстуры */
    var textures = Object.create(null), nextTex = 1;
    textures[0] = null;
    function texObj(name) {
      if (!textures[name]) {
        var t = { tex: gl.createTexture(), w: 0, h: 0, ready: false, fmtCode: 1, min: K.GL_NEAREST_MIPMAP_LINEAR, mag: K.GL_LINEAR,
          wrapS: K.GL_REPEAT, wrapT: K.GL_REPEAT, border: [0, 0, 0, 0], genMip: false, levels: 0, hasMips: false };
        textures[name] = t;
      }
      return textures[name];
    }
    function wrapGL(w) { return w === K.GL_REPEAT ? gl.REPEAT : w === K.GL_MIRRORED_REPEAT ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE; }
    function isMip(f) { return f === K.GL_NEAREST_MIPMAP_NEAREST || f === K.GL_LINEAR_MIPMAP_NEAREST || f === K.GL_NEAREST_MIPMAP_LINEAR || f === K.GL_LINEAR_MIPMAP_LINEAR; }
    function applyTexParams(T) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, T.mag === K.GL_NEAREST ? gl.NEAREST : gl.LINEAR);
      var m = { 0x2600: gl.NEAREST, 0x2601: gl.LINEAR, 0x2700: gl.NEAREST_MIPMAP_NEAREST, 0x2701: gl.LINEAR_MIPMAP_NEAREST, 0x2702: gl.NEAREST_MIPMAP_LINEAR, 0x2703: gl.LINEAR_MIPMAP_LINEAR }[T.min];
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, m || gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapGL(T.wrapS)); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapGL(T.wrapT));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, T.hasMips ? 1000 : 0);
    }
    function fmtCode(f) { return f === K.GL_RGB || f === 3 || f === K.GL_RGB8 || f === K.GL_BGR ? 0 : f === K.GL_LUMINANCE || f === 1 ? 2 : f === K.GL_LUMINANCE_ALPHA || f === 2 ? 3 : f === K.GL_ALPHA ? 4 : 1; }
    function comps(format) {
      return { 0x1907: 3, 0x80E0: 3, 0x1908: 4, 0x80E1: 4, 0x1909: 1, 0x190A: 2, 0x1906: 1, 0x1903: 1, 0x1904: 1, 0x1905: 1, 0x1902: 1, 0x1901: 1 }[format] || 4;
    }
    // данные «из C» → RGBA8 с учётом GL_UNPACK_ALIGNMENT и glPixelTransfer
    function toRGBA(w, h, format, type, data, align, rowLen, xfer) {
      var nc = comps(format), src = data && data.__img ? data.data : flat(data);
      var isFloat = type === K.GL_FLOAT || type === K.GL_DOUBLE;
      var bpc = isFloat ? 4 : (type === K.GL_UNSIGNED_SHORT || type === K.GL_SHORT ? 2 : 1);
      var rl = rowLen > 0 ? rowLen : w, rowBytes = rl * nc * bpc, a = align || 1;
      var stride = Math.ceil(rowBytes / a) * a / bpc; // элементов на строку с выравниванием
      var out = new Uint8Array(w * h * 4);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var si = y * stride + x * nc, oi = (y * w + x) * 4, v = [0, 0, 0, 1];
        for (var c = 0; c < nc; c++) {
          var raw = src[si + c]; if (raw === undefined || raw === null || isNaN(raw)) raw = 0;
          var f = isFloat ? raw : type === K.GL_UNSIGNED_SHORT ? raw / 65535 : type === K.GL_BYTE ? raw / 127 : (raw & 255) / 255;
          v[c] = f;
        }
        var r, g, b, al;
        if (format === K.GL_RGB || format === K.GL_RGBA) { r = v[0]; g = v[1]; b = v[2]; al = nc === 4 ? v[3] : 1; }
        else if (format === K.GL_BGR || format === K.GL_BGRA) { r = v[2]; g = v[1]; b = v[0]; al = nc === 4 ? v[3] : 1; }
        else if (format === K.GL_LUMINANCE) { r = g = b = v[0]; al = 1; }
        else if (format === K.GL_LUMINANCE_ALPHA) { r = g = b = v[0]; al = v[1]; }
        else if (format === K.GL_ALPHA) { r = g = b = 0; al = v[0]; }
        else if (format === K.GL_RED) { r = v[0]; g = b = 0; al = 1; } else if (format === K.GL_GREEN) { g = v[0]; r = b = 0; al = 1; }
        else if (format === K.GL_BLUE) { b = v[0]; r = g = 0; al = 1; } else { r = v[0]; g = v[1]; b = v[2]; al = v[3]; }
        if (xfer) { r = r * xfer.scale[0] + xfer.bias[0]; g = g * xfer.scale[1] + xfer.bias[1]; b = b * xfer.scale[2] + xfer.bias[2]; al = al * xfer.scale[3] + xfer.bias[3]; }
        out[oi] = clamp01(r) * 255 + 0.5 | 0; out[oi + 1] = clamp01(g) * 255 + 0.5 | 0; out[oi + 2] = clamp01(b) * 255 + 0.5 | 0; out[oi + 3] = clamp01(al) * 255 + 0.5 | 0;
      }
      return out;
    }
    function texImage(level, ifmt, w, h, format, type, data) {
      var T = texObj(S.texBound);
      var px = toRGBA(w, h, format, type, data, S.unpackAlign, S.unpackRow, null);
      gl.bindTexture(gl.TEXTURE_2D, T.tex);
      gl.texImage2D(gl.TEXTURE_2D, level, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
      if (level === 0) { T.w = w; T.h = h; T.ready = true; T.fmtCode = fmtCode(ifmt); T.hasMips = false; T.levels = 1; }
      else { T.levels = Math.max(T.levels, level + 1); var full = Math.floor(Math.log2(Math.max(T.w, T.h))) + 1; if (T.levels >= full) T.hasMips = true; }
      if (level === 0 && T.genMip) { gl.generateMipmap(gl.TEXTURE_2D); T.hasMips = true; }
      dirty("tex");
    }

    /* ----------------------------------------------- массивы вершин и буферы (VBO) */
    var client = { v: null, c: null, n: null, t: null }, clientOn = {}, buffers = Object.create(null), nextBuf = 1;
    var boundArray = 0, boundElem = 0;
    function makePtr(size, type, stride, pointer) {
      var buf = boundArray ? buffers[boundArray] : null;
      return { size: size, type: type, stride: stride, ptr: pointer, buf: buf };
    }
    function typedFromType(type, arr) {
      var f = arr && arr.__ptr ? flat(arr.arr).slice(arr.off) : (ArrayBuffer.isView(arr) ? arr : flat(arr));
      switch (type) {
        case K.GL_UNSIGNED_BYTE: return new Uint8Array(f); case K.GL_BYTE: return new Int8Array(f);
        case K.GL_UNSIGNED_SHORT: return new Uint16Array(f); case K.GL_SHORT: return new Int16Array(f);
        case K.GL_UNSIGNED_INT: return new Uint32Array(f); case K.GL_INT: return new Int32Array(f);
        case K.GL_DOUBLE: return new Float64Array(f); default: return new Float32Array(f);
      }
    }
    function bpe(type) { return { 0x1400: 1, 0x1401: 1, 0x1402: 2, 0x1403: 2, 0x1404: 4, 0x1405: 4, 0x1406: 4, 0x140A: 8 }[type] || 4; }
    function readAttr(P, i, defaults) { // значение атрибута i-й вершины из клиентского массива или VBO
      var src, offB, el = bpe(P.type), stride = P.stride || P.size * el;
      if (P.buf) { src = P.buf.view(P.type); offB = (+P.ptr || 0) + i * stride; }
      else { if (!P.cache || P.cacheSrc !== P.ptr) { P.cache = typedFromType(P.type, P.ptr); P.cacheSrc = P.ptr; } src = P.cache; offB = i * stride; }
      var base = offB / el, r = defaults.slice();
      for (var k = 0; k < P.size; k++) {
        var v = src[base + k]; if (v === undefined) v = 0;
        if (P.type === K.GL_UNSIGNED_BYTE && P === client.c) v /= 255;
        r[k] = v;
      }
      return r;
    }
    function arraysToBatch(indices) {
      var b = new Batch(), keepC = S.color, keepN = S.normal, keepT = S.tex;
      for (var j = 0; j < indices.length; j++) {
        var i = indices[j];
        if (clientOn.c && client.c) S.color = readAttr(client.c, i, [0, 0, 0, 1]);
        if (clientOn.n && client.n) S.normal = readAttr(client.n, i, [0, 0, 0]);
        if (clientOn.t && client.t) S.tex = readAttr(client.t, i, [0, 0, 0, 1]);
        b.push(readAttr(client.v, i, [0, 0, 0, 1]));
      }
      if (clientOn.c && client.c) keepC = S.color; // по спецификации текущий цвет становится неопределённым — оставляем последний
      S.color = keepC; S.normal = keepN; S.tex = keepT;
      return b;
    }

    /* ------------------------------------------------------------ накопит. буфер */
    var accum = null;
    function readRGBA() {
      var f = resolveForRead(); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, f);
      var px = new Uint8Array(winW * winH * 4); gl.readPixels(0, 0, winW, winH, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.bindFramebuffer(gl.FRAMEBUFFER, drawFbo);
      return px;
    }
    var tmpTex = null, quadBuf = null;
    function drawImage(px, w, h, x, y, zx, zy, z, maskColor) { // RGBA8 → прямоугольник в окне
      if (!tmpTex) { tmpTex = gl.createTexture(); quadBuf = gl.createBuffer(); }
      gl.useProgram(prog2);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tmpTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var x2 = x + w * zx, y2 = y + h * zy;
      var q = new Float32Array([x, y, 0, 0, x2, y, 1, 0, x2, y2, 1, 1, x, y, 0, 0, x2, y2, 1, 1, x, y2, 0, 1]);
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.bufferData(gl.ARRAY_BUFFER, q, gl.STREAM_DRAW);
      for (var i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
      gl.enableVertexAttribArray(loc2.aP); gl.vertexAttribPointer(loc2.aP, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(loc2.aT); gl.vertexAttribPointer(loc2.aT, 2, gl.FLOAT, false, 16, 8);
      gl.uniform2f(loc2.uWin, winW, winH); gl.uniform1f(loc2.uZ, z * 2 - 1); gl.uniform1i(loc2.uS, 0);
      gl.uniform1i(loc2.uMask, maskColor ? 1 : 0); gl.uniform4fv(loc2.uTint, maskColor || [1, 1, 1, 1]);
      applyFixed("image"); gl.viewport(0, 0, winW, winH); gl.disable(gl.CULL_FACE);
      gl.drawArrays(gl.TRIANGLES, 0, 6); stats.draws++;
      gl.useProgram(prog); dirty("tex");
    }

    /* ---------------------------------------------------------------- шрифты GLUT */
    var glyphCache = {};
    function glyph(font, ch) {
      var key = font + ":" + ch; if (glyphCache[key]) return glyphCache[key];
      var F = FONTS[font] || FONTS.h12, c2 = document.createElement("canvas"), x = c2.getContext("2d");
      x.font = F[0]; var w = F[1] || Math.ceil(x.measureText(ch).width) || 1, h = F[2] + 4;
      c2.width = w; c2.height = h; x.font = F[0]; x.textBaseline = "alphabetic"; x.fillStyle = "#fff"; x.fillText(ch, 0, F[2]);
      var id = x.getImageData(0, 0, w, h), px = new Uint8Array(w * h * 4);
      for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) { // переворот по Y (OpenGL — снизу вверх), порог как у растрового шрифта
        var s = ((h - 1 - yy) * w + xx) * 4, o = (yy * w + xx) * 4, a = id.data[s + 3] > 100 ? 255 : 0;
        px[o] = px[o + 1] = px[o + 2] = 255; px[o + 3] = a;
      }
      return (glyphCache[key] = { px: px, w: w, h: h, adv: w, desc: 4 });
    }

    /* =========================================================== API: OpenGL 1.x */
    var A = rt;
    function def(name, fn, record) { A[name] = record === false ? imm(name, fn) : record === "comp" ? comp(name, fn) : rec(name, fn); }
    function needCtx() { if (!gl) throw new Error("Окно не создано: вызовите glutCreateWindow() перед командами OpenGL."); }

    def("glBegin", function (mode) {
      needCtx();
      if (inBegin) { err(K.GL_INVALID_OPERATION, "glBegin внутри glBegin/glEnd — пропущен glEnd()."); return; }
      if (mode < 0 || mode > 9) { err(K.GL_INVALID_ENUM, "glBegin: неизвестный тип примитива."); return; }
      inBegin = true; curMode = mode; cur = new Batch();
    }, "comp");
    def("glEnd", function () {
      if (!inBegin) { err(K.GL_INVALID_OPERATION, "glEnd без glBegin."); return; }
      inBegin = false; endPrimitive(cur, curMode); cur = null;
    }, "comp");
    function vtx(x, y, z, w) {
      if (!inBegin) { if (!warnedVtx) { warnedVtx = true; warn("glVertex вызван вне пары glBegin()/glEnd() — вершина пропущена."); } return; }
      cur.push([+x, +y, z === undefined ? 0 : +z, w === undefined ? 1 : +w]);
    }
    ["f", "d", "i", "s"].forEach(function (t) {
      def("glVertex2" + t, function (x, y) { vtx(x, y, 0, 1); }, "comp");
      def("glVertex3" + t, function (x, y, z) { vtx(x, y, z, 1); }, "comp");
      def("glVertex4" + t, function (x, y, z, w) { vtx(x, y, z, w); }, "comp");
      def("glVertex2" + t + "v", function (v) { var a = vals(v, 2); vtx(a[0], a[1], 0, 1); }, "comp");
      def("glVertex3" + t + "v", function (v) { var a = vals(v, 3); vtx(a[0], a[1], a[2], 1); }, "comp");
      def("glVertex4" + t + "v", function (v) { var a = vals(v, 4); vtx(a[0], a[1], a[2], a[3]); }, "comp");
      def("glNormal3" + t, function (x, y, z) { S.normal = [+x, +y, +z]; });
      def("glNormal3" + t + "v", function (v) { S.normal = vals(v, 3); });
      def("glTexCoord1" + t, function (s) { S.tex = [+s, 0, 0, 1]; });
      def("glTexCoord2" + t, function (s, t2) { S.tex = [+s, +t2, 0, 1]; });
      def("glTexCoord3" + t, function (s, t2, r) { S.tex = [+s, +t2, +r, 1]; });
      def("glTexCoord4" + t, function (s, t2, r, q) { S.tex = [+s, +t2, +r, +q]; });
      def("glTexCoord2" + t + "v", function (v) { var a = vals(v, 2); S.tex = [a[0], a[1], 0, 1]; });
      def("glRasterPos2" + t, function (x, y) { rasterPos(x, y, 0, 1); });
      def("glRasterPos3" + t, function (x, y, z) { rasterPos(x, y, z, 1); });
      def("glRasterPos2" + t + "v", function (v) { var a = vals(v, 2); rasterPos(a[0], a[1], 0, 1); });
      def("glWindowPos2" + t, function (x, y) { S.raster = { pos: [+x, +y, 0, 1], valid: true, color: S.color.slice() }; });
      def("glRect" + t, function (x1, y1, x2, y2) { A.glBegin(K.GL_POLYGON); vtx(x1, y1); vtx(x2, y1); vtx(x2, y2); vtx(x1, y2); A.glEnd(); }, "comp");
    });
    function setColor(r, g, b, a, scale) {
      S.color = [r / scale, g / scale, b / scale, a === undefined ? 1 : a / scale];
    }
    def("glColor3f", function (r, g, b) { setColor(+r, +g, +b, 1, 1); }); def("glColor3d", A.glColor3f);
    def("glColor4f", function (r, g, b, a) { setColor(+r, +g, +b, +a, 1); }); def("glColor4d", A.glColor4f);
    def("glColor3ub", function (r, g, b) { setColor(r & 255, g & 255, b & 255, 255, 255); });
    def("glColor4ub", function (r, g, b, a) { setColor(r & 255, g & 255, b & 255, a & 255, 255); });
    def("glColor3i", function (r, g, b) { setColor(r / 2147483647, g / 2147483647, b / 2147483647, 1, 1); });
    def("glColor3fv", function (v) { var a = vals(v, 3); setColor(a[0], a[1], a[2], 1, 1); }); def("glColor3dv", A.glColor3fv);
    def("glColor4fv", function (v) { var a = vals(v, 4); setColor(a[0], a[1], a[2], a[3], 1); }); def("glColor4dv", A.glColor4fv);
    def("glColor3ubv", function (v) { var a = vals(v, 3); setColor(a[0], a[1], a[2], 255, 255); });
    def("glColor4ubv", function (v) { var a = vals(v, 4); setColor(a[0], a[1], a[2], a[3], 255); });
    def("glEdgeFlag", function () {});
    def("glIndexi", function () {});

    // матрицы
    def("glMatrixMode", function (m) {
      if (m !== K.GL_MODELVIEW && m !== K.GL_PROJECTION && m !== K.GL_TEXTURE) { err(K.GL_INVALID_ENUM, "glMatrixMode: допустимы GL_MODELVIEW, GL_PROJECTION, GL_TEXTURE."); return; }
      S.matMode = m;
    });
    def("glLoadIdentity", function () { setTop(m4()); dirty("mat"); });
    def("glLoadMatrixf", function (v) { setTop(new Float32Array(vals(v, 16))); dirty("mat"); }); def("glLoadMatrixd", A.glLoadMatrixf);
    def("glMultMatrixf", function (v) { setTop(mmul(top(curStack()), new Float32Array(vals(v, 16)))); dirty("mat"); }); def("glMultMatrixd", A.glMultMatrixf);
    def("glLoadTransposeMatrixf", function (v) { var a = vals(v, 16), t = new Float32Array(16); for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) t[c * 4 + r] = a[r * 4 + c]; setTop(t); dirty("mat"); });
    def("glPushMatrix", function () {
      var st = curStack(), lim = S.matMode === K.GL_MODELVIEW ? 32 : 4;
      if (st.length >= lim) { err(K.GL_STACK_OVERFLOW, "glPushMatrix: переполнение стека матриц (" + (S.matMode === K.GL_MODELVIEW ? "GL_MODELVIEW, 32" : "GL_PROJECTION/GL_TEXTURE, 4") + "). Проверьте парность glPushMatrix/glPopMatrix."); return; }
      st.push(new Float32Array(top(st)));
    });
    def("glPopMatrix", function () {
      var st = curStack();
      if (st.length <= 1) { err(K.GL_STACK_UNDERFLOW, "glPopMatrix: стек матриц пуст — лишний вызов glPopMatrix()."); return; }
      st.pop(); dirty("mat");
    });
    function mulTop(m) { setTop(mmul(top(curStack()), m)); dirty("mat"); }
    function translate(x, y, z) { var m = m4(); m[12] = +x; m[13] = +y; m[14] = +z; mulTop(m); }
    function scale(x, y, z) { var m = m4(); m[0] = +x; m[5] = +y; m[10] = +z; mulTop(m); }
    function rotate(a, x, y, z) {
      var l = Math.sqrt(x * x + y * y + z * z); if (l === 0) return; x /= l; y /= l; z /= l;
      var r = a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), t = 1 - c, m = m4();
      m[0] = x * x * t + c; m[1] = y * x * t + z * s; m[2] = x * z * t - y * s;
      m[4] = x * y * t - z * s; m[5] = y * y * t + c; m[6] = y * z * t + x * s;
      m[8] = x * z * t + y * s; m[9] = y * z * t - x * s; m[10] = z * z * t + c;
      mulTop(m);
    }
    def("glTranslatef", translate); def("glTranslated", translate);
    def("glScalef", scale); def("glScaled", scale);
    def("glRotatef", rotate); def("glRotated", rotate);
    function ortho(l, r, b, t, n, f) {
      if (l === r || b === t || n === f) { err(K.GL_INVALID_VALUE, "glOrtho: границы объёма не должны совпадать."); return; }
      var m = m4(); m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n); m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); mulTop(m);
    }
    function frustum(l, r, b, t, n, f) {
      if (n <= 0 || f <= 0 || l === r || b === t || n === f) { err(K.GL_INVALID_VALUE, "glFrustum: near и far должны быть > 0 и различны."); return; }
      var m = new Float32Array(16);
      m[0] = 2 * n / (r - l); m[5] = 2 * n / (t - b); m[8] = (r + l) / (r - l); m[9] = (t + b) / (t - b); m[10] = -(f + n) / (f - n); m[11] = -1; m[14] = -2 * f * n / (f - n);
      mulTop(m);
    }
    def("glOrtho", ortho); def("glFrustum", frustum);
    def("glViewport", function (x, y, w, h) { S.viewport = [x | 0, y | 0, Math.max(0, w | 0), Math.max(0, h | 0)]; });
    def("glDepthRange", function (n, f) { S.depthRange = [clamp01(n), clamp01(f)]; });

    // включение возможностей
    var KNOWN_CAPS = {};
    [K.GL_DEPTH_TEST, K.GL_CULL_FACE, K.GL_LIGHTING, K.GL_TEXTURE_2D, K.GL_BLEND, K.GL_ALPHA_TEST, K.GL_FOG, K.GL_NORMALIZE, K.GL_RESCALE_NORMAL,
      K.GL_COLOR_MATERIAL, K.GL_STENCIL_TEST, K.GL_SCISSOR_TEST, K.GL_LINE_SMOOTH, K.GL_POINT_SMOOTH, K.GL_POLYGON_SMOOTH, K.GL_LINE_STIPPLE,
      K.GL_POLYGON_STIPPLE, K.GL_POLYGON_OFFSET_FILL, K.GL_POLYGON_OFFSET_LINE, K.GL_POLYGON_OFFSET_POINT, K.GL_MULTISAMPLE, K.GL_DITHER,
      K.GL_TEXTURE_GEN_S, K.GL_TEXTURE_GEN_T, K.GL_TEXTURE_GEN_R, K.GL_TEXTURE_GEN_Q, K.GL_AUTO_NORMAL, K.GL_TEXTURE_1D, K.GL_COLOR_LOGIC_OP,
      K.GL_SAMPLE_ALPHA_TO_COVERAGE].forEach(function (c) { KNOWN_CAPS[c] = 1; });
    for (var li = 0; li < 8; li++) KNOWN_CAPS[K.GL_LIGHT0 + li] = 1;
    for (var ci = 0; ci < 6; ci++) KNOWN_CAPS[K.GL_CLIP_PLANE0 + ci] = 1;
    function setCap(cap, v) {
      if (!KNOWN_CAPS[cap]) { err(K.GL_INVALID_ENUM, (v ? "glEnable" : "glDisable") + ": неизвестная константа (" + cap + ")."); return; }
      if (cap === K.GL_STENCIL_TEST && v && !hasStencil && !warnedStencil) { warnedStencil = true; warn("GL_STENCIL_TEST включён, но буфер трафарета не создан: добавьте GLUT_STENCIL в glutInitDisplayMode()."); }
      if (cap === K.GL_DEPTH_TEST && v && !hasDepth && !warnedDepth) { warnedDepth = true; warn("GL_DEPTH_TEST включён, но буфер глубины не создан: добавьте GLUT_DEPTH в glutInitDisplayMode()."); }
      S.caps[cap] = !!v; dirtyAll();
    }
    var warnedStencil = false, warnedDepth = false, warnedVtx = false, warnedTex = false;
    def("glEnable", function (c) { setCap(c, true); }); def("glDisable", function (c) { setCap(c, false); });
    def("glIsEnabled", function (c) { return S.caps[c] ? 1 : 0; }, false);
    def("glEnableClientState", function (a) { var k = { 0x8074: "v", 0x8075: "n", 0x8076: "c", 0x8078: "t" }[a]; if (k) clientOn[k] = true; }, false);
    def("glDisableClientState", function (a) { var k = { 0x8074: "v", 0x8075: "n", 0x8076: "c", 0x8078: "t" }[a]; if (k) clientOn[k] = false; }, false);

    // очистка
    def("glClearColor", function (r, g, b, a) { S.clearColor = [clamp01(r), clamp01(g), clamp01(b), clamp01(a)]; });
    def("glClearDepth", function (d) { S.clearDepth = clamp01(d); }); def("glClearDepthf", A.glClearDepth);
    def("glClearStencil", function (s) { S.clearStencil = s | 0; });
    def("glClearAccum", function (r, g, b, a) { S.clearAccum = [r, g, b, a]; });
    def("glClear", function (mask) {
      needCtx();
      if (inBegin) { err(K.GL_INVALID_OPERATION, "glClear внутри glBegin/glEnd."); return; }
      var want = (msaa && S.caps[K.GL_MULTISAMPLE]) ? fboMS : fboSS;
      if (want !== drawFbo && (mask & K.GL_COLOR_BUFFER_BIT)) { drawFbo = want; gl.bindFramebuffer(gl.FRAMEBUFFER, drawFbo); }
      applyFixed("fill");
      gl.disable(gl.CULL_FACE);
      var m = 0;
      if (mask & K.GL_COLOR_BUFFER_BIT) { gl.clearColor(S.clearColor[0], S.clearColor[1], S.clearColor[2], S.clearColor[3]); m |= gl.COLOR_BUFFER_BIT; }
      if ((mask & K.GL_DEPTH_BUFFER_BIT) && hasDepth) { gl.depthMask(S.depthMask); gl.clearDepth(S.clearDepth); m |= gl.DEPTH_BUFFER_BIT; }
      if ((mask & K.GL_STENCIL_BUFFER_BIT) && hasStencil) { gl.clearStencil(S.clearStencil); m |= gl.STENCIL_BUFFER_BIT; }
      if (mask & K.GL_ACCUM_BUFFER_BIT) { if (!accum) accum = new Float32Array(winW * winH * 4); for (var i = 0; i < accum.length; i += 4) { accum[i] = S.clearAccum[0]; accum[i + 1] = S.clearAccum[1]; accum[i + 2] = S.clearAccum[2]; accum[i + 3] = S.clearAccum[3]; } }
      if (m) gl.clear(m);
      stats.clears = (stats.clears || 0) + 1;
    });

    // рёбра, точки, линии, полигоны
    def("glPointSize", function (s) { if (s <= 0) { err(K.GL_INVALID_VALUE, "glPointSize: размер должен быть > 0."); return; } S.pointSize = +s; dirty("misc"); });
    def("glLineWidth", function (w) { if (w <= 0) { err(K.GL_INVALID_VALUE, "glLineWidth: толщина должна быть > 0."); return; } S.lineWidth = +w; dirty("misc"); });
    def("glLineStipple", function (f, p) { S.stipFactor = Math.max(1, Math.min(256, f | 0)); S.stipPattern = p & 0xFFFF; dirty("misc"); });
    def("glPolygonStipple", function (mask) {
      var b = flat(mask), rows = new Uint32Array(32);
      for (var r = 0; r < 32; r++) rows[r] = ((b[r * 4] & 255) << 24 | (b[r * 4 + 1] & 255) << 16 | (b[r * 4 + 2] & 255) << 8 | (b[r * 4 + 3] & 255)) >>> 0;
      S.polyStip = rows; dirty("stip");
    });
    def("glPolygonMode", function (face, mode) {
      if (face === K.GL_FRONT || face === K.GL_FRONT_AND_BACK) S.polyMode[0] = mode;
      if (face === K.GL_BACK || face === K.GL_FRONT_AND_BACK) S.polyMode[1] = mode;
    });
    def("glCullFace", function (f) { S.cullFace = f; });
    def("glFrontFace", function (f) { S.frontFace = f; });
    def("glShadeModel", function (m) { S.shade = m; dirty("misc"); });
    def("glPolygonOffset", function (f, u) { S.polyOffset = [+f, +u]; });
    def("glHint", function () {});
    def("glFlush", function () { if (!doubleBuf) present(); }, false);
    def("glFinish", function () { if (!doubleBuf) present(); }, false);
    def("glGetError", function () { var e = errorFlag; errorFlag = 0; return e; }, false);
    def("glGetString", function (n) {
      return n === K.GL_VERSION ? "1.5 (эмуляция OpenGL в браузере, WebGL2)" : n === K.GL_VENDOR ? "TUIT OpenGL Lab" : n === K.GL_RENDERER ? "GL1/WebGL2" : n === K.GL_EXTENSIONS ? "GL_ARB_multisample GL_ARB_vertex_buffer_object" : "";
    }, false);

    // глубина, смешивание, трафарет, маски
    def("glDepthFunc", function (f) { S.depthFunc = f; }); def("glDepthMask", function (m) { S.depthMask = !!m; });
    def("glBlendFunc", function (s, d) { S.blendSrc = S.blendSrcA = s; S.blendDst = S.blendDstA = d; });
    def("glBlendFuncSeparate", function (s, d, sa, da) { S.blendSrc = s; S.blendDst = d; S.blendSrcA = sa; S.blendDstA = da; });
    def("glBlendEquation", function (e) { S.blendEq = e; }); def("glBlendColor", function (r, g, b, a) { S.blendColor = [r, g, b, a]; });
    def("glAlphaFunc", function (f, r) { S.alphaFunc = f; S.alphaRef = clamp01(r); dirty("misc"); });
    def("glStencilFunc", function (f, r, m) { S.stFunc = f; S.stRef = r | 0; S.stMask = m >>> 0; });
    def("glStencilOp", function (a, b, c) { S.stFail = a; S.stZFail = b; S.stZPass = c; });
    def("glStencilMask", function (m) { S.stWMask = m >>> 0; });
    def("glColorMask", function (r, g, b, a) { S.colorMask = [!!r, !!g, !!b, !!a]; });
    def("glScissor", function (x, y, w, h) { S.scissor = [x | 0, y | 0, w | 0, h | 0]; });
    def("glLogicOp", function () {});

    // освещение и материалы
    function lightIdx(l) { var i = l - K.GL_LIGHT0; if (i < 0 || i > 7) { err(K.GL_INVALID_ENUM, "glLight: допустимы GL_LIGHT0 … GL_LIGHT7."); return -1; } return i; }
    function lightv(l, p, v) {
      var i = lightIdx(l); if (i < 0) return; var L = S.lights[i];
      if (p === K.GL_AMBIENT) L.amb = vals(v, 4); else if (p === K.GL_DIFFUSE) L.dif = vals(v, 4); else if (p === K.GL_SPECULAR) L.spe = vals(v, 4);
      else if (p === K.GL_POSITION) L.pos = mvec(MV(), vals(v, 4)); // позиция запоминается в координатах наблюдателя!
      else if (p === K.GL_SPOT_DIRECTION) { var d = vals(v, 3), m = MV(); L.dir = [m[0] * d[0] + m[4] * d[1] + m[8] * d[2], m[1] * d[0] + m[5] * d[1] + m[9] * d[2], m[2] * d[0] + m[6] * d[1] + m[10] * d[2]]; }
      else lightf(l, p, vals(v, 1)[0]);
      dirty("light");
    }
    function lightf(l, p, x) {
      var i = lightIdx(l); if (i < 0) return; var L = S.lights[i];
      if (p === K.GL_SPOT_EXPONENT) L.exp = Math.max(0, Math.min(128, +x));
      else if (p === K.GL_SPOT_CUTOFF) { if (!(x === 180 || (x >= 0 && x <= 90))) { err(K.GL_INVALID_VALUE, "GL_SPOT_CUTOFF: допустимо 0…90 или 180."); return; } L.cut = +x; }
      else if (p === K.GL_CONSTANT_ATTENUATION) L.att[0] = +x; else if (p === K.GL_LINEAR_ATTENUATION) L.att[1] = +x; else if (p === K.GL_QUADRATIC_ATTENUATION) L.att[2] = +x;
      else { err(K.GL_INVALID_ENUM, "glLightf: параметр должен быть скалярным (GL_SPOT_CUTOFF, GL_CONSTANT_ATTENUATION, …)."); return; }
      dirty("light");
    }
    def("glLightfv", lightv); def("glLightiv", lightv); def("glLightf", lightf); def("glLighti", lightf);
    function lmodel(p, v) {
      var a = vals(v, 4);
      if (p === K.GL_LIGHT_MODEL_AMBIENT) S.lm.amb = a; else if (p === K.GL_LIGHT_MODEL_LOCAL_VIEWER) S.lm.local = !!a[0];
      else if (p === K.GL_LIGHT_MODEL_TWO_SIDE) S.lm.two = !!a[0]; else if (p === K.GL_LIGHT_MODEL_COLOR_CONTROL) S.lm.sep = a[0] === K.GL_SEPARATE_SPECULAR_COLOR;
      dirty("light"); dirty("misc");
    }
    def("glLightModelfv", lmodel); def("glLightModeliv", lmodel);
    def("glLightModelf", function (p, x) { lmodel(p, [x]); }); def("glLightModeli", A.glLightModelf);
    function material(face, p, v) {
      var fs = face === K.GL_FRONT ? [0] : face === K.GL_BACK ? [1] : [0, 1];
      fs.forEach(function (f) {
        var M = S.mat[f];
        if (p === K.GL_AMBIENT) M.amb = vals(v, 4); else if (p === K.GL_DIFFUSE) M.dif = vals(v, 4); else if (p === K.GL_SPECULAR) M.spe = vals(v, 4);
        else if (p === K.GL_EMISSION) M.emi = vals(v, 4); else if (p === K.GL_AMBIENT_AND_DIFFUSE) { M.amb = vals(v, 4); M.dif = vals(v, 4); }
        else if (p === K.GL_SHININESS) { var s = vals(v, 1)[0]; if (s < 0 || s > 128) err(K.GL_INVALID_VALUE, "GL_SHININESS: допустимо 0…128."); M.shi = Math.max(0, Math.min(128, s)); }
      });
      if (inBegin) { var b = cur; endPrimitive(b, curMode); cur = new Batch(); } // смена материала внутри glBegin — разбиваем блок
      dirty("mtl");
    }
    def("glMaterialfv", material); def("glMaterialiv", material);
    def("glMaterialf", function (f, p, x) { material(f, p, [x]); }); def("glMateriali", A.glMaterialf);
    def("glColorMaterial", function (face, mode) { S.cmFace = face; S.cmMode = mode; dirty("light"); });

    // туман
    function fog(p, v) {
      var a = vals(v, 4);
      if (p === K.GL_FOG_MODE) S.fogMode = a[0]; else if (p === K.GL_FOG_DENSITY) { if (a[0] < 0) { err(K.GL_INVALID_VALUE); return; } S.fogDen = a[0]; }
      else if (p === K.GL_FOG_START) S.fogStart = a[0]; else if (p === K.GL_FOG_END) S.fogEnd = a[0]; else if (p === K.GL_FOG_COLOR) S.fogColor = a;
      dirty("misc");
    }
    def("glFogfv", fog); def("glFogiv", fog); def("glFogf", function (p, x) { fog(p, [x]); }); def("glFogi", A.glFogf);

    // плоскости отсечения
    def("glClipPlane", function (p, eq) { var i = p - K.GL_CLIP_PLANE0; if (i < 0 || i > 5) { err(K.GL_INVALID_ENUM); return; } S.clip[i] = rowvec(vals(eq, 4), minv(MV())); dirty("clip"); });

    // текстуры
    def("glGenTextures", function (n, out) { needCtx(); var ids = []; for (var i = 0; i < n; i++) { ids.push(nextTex); texObj(nextTex); nextTex++; } writeFlat(out, ids); }, false);
    def("glDeleteTextures", function (n, ids) { vals(ids, n).forEach(function (i) { if (textures[i]) { gl.deleteTexture(textures[i].tex); delete textures[i]; } }); dirty("tex"); }, false);
    def("glBindTexture", function (target, name) { needCtx(); if (target !== K.GL_TEXTURE_2D) { if (target !== K.GL_TEXTURE_1D) err(K.GL_INVALID_ENUM); return; } S.texBound = name >>> 0; if (name) texObj(name); dirty("tex"); });
    def("glIsTexture", function (n) { return textures[n] ? 1 : 0; }, false);
    def("glTexImage2D", function (target, level, ifmt, w, h, border, format, type, data) {
      if (target !== K.GL_TEXTURE_2D) { err(K.GL_INVALID_ENUM, "glTexImage2D: поддерживается GL_TEXTURE_2D."); return; }
      if (w <= 0 || h <= 0) { err(K.GL_INVALID_VALUE, "glTexImage2D: размеры должны быть > 0."); return; }
      if (data == null) data = [];
      texImage(level | 0, ifmt, w | 0, h | 0, format, type, data);
    });
    def("glTexSubImage2D", function (target, level, x, y, w, h, format, type, data) {
      var T = texObj(S.texBound), px = toRGBA(w, h, format, type, data, S.unpackAlign, S.unpackRow, null);
      gl.bindTexture(gl.TEXTURE_2D, T.tex); gl.texSubImage2D(gl.TEXTURE_2D, level, x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); dirty("tex");
    });
    def("glTexImage1D", function () { warn("glTexImage1D: одномерные текстуры в песочнице не поддерживаются."); });
    def("glCopyTexImage2D", function (target, level, ifmt, x, y, w, h) {
      var T = texObj(S.texBound), f = resolveForRead(); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, f);
      gl.bindTexture(gl.TEXTURE_2D, T.tex); gl.copyTexImage2D(gl.TEXTURE_2D, level, gl.RGBA8, x, y, w, h, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, drawFbo);
      if (!level) { T.w = w; T.h = h; T.ready = true; T.fmtCode = fmtCode(ifmt); T.hasMips = false; } dirty("tex");
    });
    function texParam(target, p, v) {
      var T = texObj(S.texBound), a = vals(v, 4), x = a[0];
      if (p === K.GL_TEXTURE_MIN_FILTER) T.min = x; else if (p === K.GL_TEXTURE_MAG_FILTER) T.mag = x;
      else if (p === K.GL_TEXTURE_WRAP_S) T.wrapS = x; else if (p === K.GL_TEXTURE_WRAP_T) T.wrapT = x;
      else if (p === K.GL_TEXTURE_BORDER_COLOR) T.border = a; else if (p === K.GL_GENERATE_MIPMAP) T.genMip = !!x;
      dirty("tex");
    }
    def("glTexParameteri", function (t, p, x) { texParam(t, p, [x]); }); def("glTexParameterf", A.glTexParameteri);
    def("glTexParameteriv", texParam); def("glTexParameterfv", texParam);
    function texEnv(t, p, v) { var a = vals(v, 4); if (p === K.GL_TEXTURE_ENV_MODE) S.envMode = a[0]; else if (p === K.GL_TEXTURE_ENV_COLOR) S.envColor = a; dirty("tex"); }
    def("glTexEnvi", function (t, p, x) { texEnv(t, p, [x]); }); def("glTexEnvf", A.glTexEnvi); def("glTexEnvfv", texEnv); def("glTexEnviv", texEnv);
    function texGen(c, p, v) {
      var i = c - K.GL_S; if (i < 0 || i > 3) { err(K.GL_INVALID_ENUM); return; } var a = vals(v, 4);
      if (p === K.GL_TEXTURE_GEN_MODE) S.tg[i].mode = a[0];
      else if (p === K.GL_OBJECT_PLANE) S.tg[i].obj = a;
      else if (p === K.GL_EYE_PLANE) S.tg[i].eye = rowvec(a, minv(MV()));
      dirty("tex");
    }
    def("glTexGeni", function (c, p, x) { texGen(c, p, [x]); }); def("glTexGenf", A.glTexGeni); def("glTexGenfv", texGen); def("glTexGeniv", texGen);
    def("glGenerateMipmap", function () { var T = texObj(S.texBound); gl.bindTexture(gl.TEXTURE_2D, T.tex); gl.generateMipmap(gl.TEXTURE_2D); T.hasMips = true; dirty("tex"); });

    // пиксели
    def("glPixelStorei", function (p, x) {
      if (p === K.GL_UNPACK_ALIGNMENT || p === K.GL_PACK_ALIGNMENT) { if ([1, 2, 4, 8].indexOf(x) < 0) { err(K.GL_INVALID_VALUE, "glPixelStorei: выравнивание 1, 2, 4 или 8."); return; } }
      if (p === K.GL_UNPACK_ALIGNMENT) S.unpackAlign = x; else if (p === K.GL_PACK_ALIGNMENT) S.packAlign = x; else if (p === K.GL_UNPACK_ROW_LENGTH) S.unpackRow = x;
    }, false);
    def("glPixelStoref", A.glPixelStorei, false);
    def("glPixelTransferf", function (p, x) {
      var m = { 0x0D14: ["scale", 0], 0x0D15: ["bias", 0], 0x0D18: ["scale", 1], 0x0D19: ["bias", 1], 0x0D1A: ["scale", 2], 0x0D1B: ["bias", 2], 0x0D1C: ["scale", 3], 0x0D1D: ["bias", 3] }[p];
      if (m) S.xfer[m[0]][m[1]] = +x;
    }); def("glPixelTransferi", A.glPixelTransferf);
    def("glPixelZoom", function (x, y) { S.zoom = [+x, +y]; });
    function rasterPos(x, y, z, w) {
      var c = mvec(PR(), mvec(MV(), [+x, +y, +z, +w])), vp = S.viewport;
      if (c[3] <= 0 || Math.abs(c[0]) > c[3] * 1.0001 || Math.abs(c[1]) > c[3] * 1.0001 || Math.abs(c[2]) > c[3] * 1.0001) { S.raster = { pos: [0, 0, 0, 1], valid: false, color: S.color.slice() }; return; }
      S.raster = { pos: [vp[0] + (c[0] / c[3] + 1) * vp[2] / 2, vp[1] + (c[1] / c[3] + 1) * vp[3] / 2, (c[2] / c[3] + 1) / 2, 1], valid: true, color: S.color.slice() };
    }
    def("glBitmap", function (w, h, xo, yo, xm, ym, bits) {
      if (S.raster.valid && bits && w > 0 && h > 0) {
        var b = flat(bits), px = new Uint8Array(w * h * 4), rowB = Math.ceil(w / 8), stride = Math.ceil(rowB / S.unpackAlign) * S.unpackAlign;
        for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) { var on2 = (b[yy * stride + (xx >> 3)] >> (7 - (xx & 7))) & 1; px[(yy * w + xx) * 4 + 3] = on2 ? 255 : 0; }
        drawImage(px, w, h, Math.floor(S.raster.pos[0] - xo), Math.floor(S.raster.pos[1] - yo), 1, 1, S.raster.pos[2], S.raster.color);
      }
      S.raster.pos[0] += xm; S.raster.pos[1] += ym;
    });
    def("glDrawPixels", function (w, h, format, type, data) {
      if (!S.raster.valid) return;
      var px = toRGBA(w, h, format, type, data, S.unpackAlign, S.unpackRow, S.xfer);
      drawImage(px, w, h, S.raster.pos[0], S.raster.pos[1], S.zoom[0], S.zoom[1], S.raster.pos[2], null);
    });
    def("glReadPixels", function (x, y, w, h, format, type, out) {
      needCtx();
      if (format === K.GL_DEPTH_COMPONENT || format === K.GL_STENCIL_INDEX) { warn("glReadPixels: чтение глубины/трафарета в песочнице не поддерживается."); return; }
      var all = readRGBA(), nc = comps(format), isF = type === K.GL_FLOAT, res = [];
      var rowEl = w * nc, stride = isF ? rowEl : Math.ceil(rowEl / S.packAlign) * S.packAlign;
      for (var yy = 0; yy < h; yy++) {
        for (var xx = 0; xx < w; xx++) {
          var sx = x + xx, sy = y + yy, o = (sy * winW + sx) * 4;
          var r = all[o], g = all[o + 1], b = all[o + 2], a = all[o + 3];
          if (sx < 0 || sy < 0 || sx >= winW || sy >= winH) r = g = b = a = 0;
          var v = format === K.GL_RGB ? [r, g, b] : format === K.GL_BGR ? [b, g, r] : format === K.GL_LUMINANCE ? [Math.min(255, r + g + b)] : format === K.GL_RED ? [r] : format === K.GL_ALPHA ? [a] : [r, g, b, a];
          for (var c = 0; c < nc; c++) res.push(isF ? v[c] / 255 : v[c]);
        }
        for (var pad = rowEl; pad < stride; pad++) res.push(0);
      }
      writeFlat(out, res);
    }, false);
    def("glCopyPixels", function (x, y, w, h, type) {
      if (type !== K.GL_COLOR) { warn("glCopyPixels: в песочнице поддерживается только GL_COLOR."); return; }
      if (!S.raster.valid) return;
      var all = readRGBA(), px = new Uint8Array(w * h * 4), X = S.xfer;
      for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
        var s = ((y + yy) * winW + x + xx) * 4, o = (yy * w + xx) * 4;
        for (var c = 0; c < 4; c++) px[o + c] = clamp01((all[s + c] || 0) / 255 * X.scale[c] + X.bias[c]) * 255 + 0.5 | 0; // glPixelTransfer действует и на копирование
      }
      drawImage(px, w, h, S.raster.pos[0], S.raster.pos[1], S.zoom[0], S.zoom[1], S.raster.pos[2], null);
    });
    def("glReadBuffer", function () {}); def("glDrawBuffer", function () {});

    // накопительный буфер
    def("glAccum", function (op, value) {
      if (!hasAccum) { err(K.GL_INVALID_OPERATION, "glAccum: нет накопительного буфера — добавьте GLUT_ACCUM в glutInitDisplayMode()."); return; }
      if (!accum) accum = new Float32Array(winW * winH * 4);
      if (op === K.GL_RETURN) {
        var px = new Uint8Array(winW * winH * 4);
        for (var i = 0; i < accum.length; i++) px[i] = clamp01(accum[i] * value) * 255 + 0.5 | 0;
        var keepB = S.caps[K.GL_BLEND], keepD = S.caps[K.GL_DEPTH_TEST]; S.caps[K.GL_BLEND] = false; S.caps[K.GL_DEPTH_TEST] = false;
        drawImage(px, winW, winH, 0, 0, 1, 1, 0, null); S.caps[K.GL_BLEND] = keepB; S.caps[K.GL_DEPTH_TEST] = keepD;
        return;
      }
      if (op === K.GL_MULT) { for (i = 0; i < accum.length; i++) accum[i] *= value; return; }
      if (op === K.GL_ADD) { for (i = 0; i < accum.length; i++) accum[i] += value; return; }
      var col = readRGBA();
      if (op === K.GL_LOAD) for (i = 0; i < accum.length; i++) accum[i] = col[i] / 255 * value;
      else if (op === K.GL_ACCUM) for (i = 0; i < accum.length; i++) accum[i] += col[i] / 255 * value;
    });

    // атрибуты
    def("glPushAttrib", function (mask) {
      if (attribStack.length >= 16) { err(K.GL_STACK_OVERFLOW, "glPushAttrib: стек атрибутов переполнен."); return; }
      attribStack.push(JSON.parse(JSON.stringify(stateSnapshot())));
    });
    def("glPopAttrib", function () {
      if (!attribStack.length) { err(K.GL_STACK_UNDERFLOW, "glPopAttrib: стек атрибутов пуст."); return; }
      var s = attribStack.pop(); for (var k in s) S[k] = s[k]; S.polyStip = new Uint32Array(s.polyStip); dirtyAll();
    });
    function stateSnapshot() {
      var o = {}; for (var k in S) if (k !== "mv" && k !== "pr" && k !== "tx" && k !== "matMode" && k !== "raster") o[k] = k === "polyStip" ? Array.from(S.polyStip) : S[k];
      o.caps = Object.assign({}, S.caps); return o;
    }

    // запросы состояния
    function getv(p) {
      switch (p) {
        case K.GL_MODELVIEW_MATRIX: return Array.from(MV()); case K.GL_PROJECTION_MATRIX: return Array.from(PR()); case K.GL_TEXTURE_MATRIX: return Array.from(top(S.tx));
        case K.GL_VIEWPORT: return S.viewport.slice(); case K.GL_CURRENT_COLOR: return S.color.slice(); case K.GL_CURRENT_NORMAL: return S.normal.slice();
        case K.GL_COLOR_CLEAR_VALUE: return S.clearColor.slice(); case K.GL_LINE_WIDTH: return [S.lineWidth]; case K.GL_POINT_SIZE: return [S.pointSize];
        case K.GL_MATRIX_MODE: return [S.matMode]; case K.GL_MODELVIEW_STACK_DEPTH: return [S.mv.length]; case K.GL_PROJECTION_STACK_DEPTH: return [S.pr.length];
        case K.GL_TEXTURE_STACK_DEPTH: return [S.tx.length];
        case K.GL_MAX_LIGHTS: return [8]; case K.GL_MAX_CLIP_PLANES: return [6]; case K.GL_MAX_TEXTURE_SIZE: return [gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 4096];
        case K.GL_MAX_MODELVIEW_STACK_DEPTH: return [32]; case K.GL_MAX_PROJECTION_STACK_DEPTH: return [4];
        case K.GL_DEPTH_BITS: return [hasDepth ? 24 : 0]; case K.GL_STENCIL_BITS: return [hasStencil ? 8 : 0];
        case K.GL_RED_BITS: case K.GL_GREEN_BITS: case K.GL_BLUE_BITS: case K.GL_ALPHA_BITS: return [8];
        case K.GL_SAMPLE_BUFFERS: return [msaa ? 1 : 0]; case K.GL_SAMPLES: return [msaa ? 4 : 0]; case K.GL_DOUBLEBUFFER: return [doubleBuf ? 1 : 0];
        case K.GL_TEXTURE_BINDING_2D: return [S.texBound]; case K.GL_SHADE_MODEL: return [S.shade]; case K.GL_DEPTH_FUNC: return [S.depthFunc];
        case K.GL_SCISSOR_BOX: return S.scissor.slice(); case K.GL_LIGHT_MODEL_AMBIENT: return S.lm.amb.slice();
        default: return [S.caps[p] ? 1 : 0];
      }
    }
    def("glGetFloatv", function (p, out) { writeFlat(out, getv(p)); }, false); def("glGetDoublev", A.glGetFloatv, false);
    def("glGetIntegerv", function (p, out) { writeFlat(out, getv(p).map(function (x) { return Math.round(x); })); }, false);
    def("glGetBooleanv", function (p, out) { writeFlat(out, getv(p).map(function (x) { return x ? 1 : 0; })); }, false);
    def("glGetLightfv", function (l, p, out) { var L = S.lights[l - K.GL_LIGHT0]; if (!L) return; writeFlat(out, p === K.GL_POSITION ? L.pos : p === K.GL_DIFFUSE ? L.dif : p === K.GL_SPECULAR ? L.spe : p === K.GL_AMBIENT ? L.amb : [0]); }, false);

    // дисплейные списки
    def("glGenLists", function (n) { var f = nextList; nextList += Math.max(1, n | 0); return f; }, false);
    def("glNewList", function (id, mode) {
      if (compiling) { err(K.GL_INVALID_OPERATION, "glNewList внутри glNewList — пропущен glEndList()."); return; }
      if (inBegin) { err(K.GL_INVALID_OPERATION, "glNewList внутри glBegin/glEnd."); return; }
      compileExec = mode === K.GL_COMPILE_AND_EXECUTE;
      listSaved = compileExec ? null : cloneState();
      S.color = S.color.slice(); S.normal = S.normal.slice(); S.tex = S.tex.slice();
      listSent = { c: S.color, n: S.normal, t: S.tex };
      compiling = []; compiling.id = id;
    }, false);
    def("glEndList", function () {
      if (!compiling) { err(K.GL_INVALID_OPERATION, "glEndList без glNewList."); return; }
      if (inBegin) { err(K.GL_INVALID_OPERATION, "glEndList внутри glBegin/glEnd — пропущен glEnd()."); inBegin = false; cur = null; }
      lists[compiling.id] = compiling; compiling = null;
      if (listSaved) { S = listSaved; listSaved = null; dirtyAll(); } // GL_COMPILE не меняет текущее состояние
      compileExec = false;
    }, false);
    function callList(id) {
      var L = lists[id]; if (!L) return;
      if (compiling && replayDepth === 0) { compiling.push([callList, [id], "glCallList"]); if (!compileExec) return; }
      if (replayDepth > 64) { err(K.GL_INVALID_OPERATION, "glCallList: слишком глубокая вложенность списков (рекурсия?)."); return; }
      replayDepth++;
      try {
        for (var i = 0; i < L.length; i++) { var op = L[i]; if (op.geo) playGeo(op); else op[0].apply(null, op[1]); }
      } finally { replayDepth--; }
    }
    function playGeo(op) { // блок из списка: цвет/нормаль/текст. коорд., не заданные в списке, берутся текущие
      var b = op.geo, baked = op.hasC && op.hasN && op.hasT;
      if (!baked) {
        var c = new Batch(); c.d = new Float32Array(b.d); c.n = b.n;
        for (var i = 0; i < c.n; i++) {
          var o = i * STRIDE;
          if (!op.hasC) { c.d[o + 4] = S.color[0]; c.d[o + 5] = S.color[1]; c.d[o + 6] = S.color[2]; c.d[o + 7] = S.color[3]; }
          if (!op.hasN) { c.d[o + 8] = S.normal[0]; c.d[o + 9] = S.normal[1]; c.d[o + 10] = S.normal[2]; }
          if (!op.hasT) { c.d[o + 11] = S.tex[0]; c.d[o + 12] = S.tex[1]; c.d[o + 13] = S.tex[2]; c.d[o + 14] = S.tex[3]; }
        }
        b = c;
      }
      var lo = (b.n - 1) * STRIDE;
      if (op.hasC) S.color = [b.d[lo + 4], b.d[lo + 5], b.d[lo + 6], b.d[lo + 7]];
      if (op.hasN) S.normal = [b.d[lo + 8], b.d[lo + 9], b.d[lo + 10]];
      stats.listBlocks = (stats.listBlocks || 0) + 1;
      if (baked) { if (!op.cache) op.cache = {}; endPrimitive(b, op.mode, op.cache); } else endPrimitive(b, op.mode);
    }
    A.glCallList = function (id) { cnt("glCallList"); callList(id); };
    A.glCallLists = function (n, type, ids) { cnt("glCallLists"); vals(ids, n).forEach(function (i) { callList(S.listBase + i); }); };
    A.glListBase = function (b) { S.listBase = b | 0; };
    def("glDeleteLists", function (id, n) { for (var i = 0; i < n; i++) delete lists[id + i]; }, false);
    def("glIsList", function (id) { return lists[id] ? 1 : 0; }, false);

    // массивы вершин и VBO
    def("glVertexPointer", function (size, type, stride, p) { client.v = makePtr(size, type, stride, p); }, false);
    def("glColorPointer", function (size, type, stride, p) { client.c = makePtr(size, type, stride, p); }, false);
    def("glNormalPointer", function (type, stride, p) { client.n = makePtr(3, type, stride, p); }, false);
    def("glTexCoordPointer", function (size, type, stride, p) { client.t = makePtr(size, type, stride, p); }, false);
    def("glInterleavedArrays", function (fmt, stride, p) {
      if (fmt === K.GL_V3F) { client.v = makePtr(3, K.GL_FLOAT, stride, p); clientOn.v = true; }
      else warn("glInterleavedArrays: поддерживается GL_V3F; используйте glVertexPointer/glColorPointer.");
    }, false);
    def("glArrayElement", function (i) { if (!inBegin || !client.v) return; var b = arraysToBatch([i]); S.color = [b.d[4], b.d[5], b.d[6], b.d[7]]; S.normal = [b.d[8], b.d[9], b.d[10]]; S.tex = [b.d[11], b.d[12], b.d[13], b.d[14]]; cur.push([b.d[0], b.d[1], b.d[2], b.d[3]]); }, "comp");
    function drawIndices(mode, idx) {
      if (!clientOn.v || !client.v) { err(K.GL_INVALID_OPERATION, "glDrawArrays/glDrawElements: не включён GL_VERTEX_ARRAY (glEnableClientState) или не задан glVertexPointer."); return; }
      if (!compiling) { var fast = tryFastPath(mode, idx); if (fast) return; }
      var b = arraysToBatch(idx); endPrimitive(b, mode);
    }
    def("glDrawArrays", function (mode, first, count) { var idx = new Array(count); for (var i = 0; i < count; i++) idx[i] = first + i; drawIndices(mode, idx); }, "comp");
    def("glDrawElements", function (mode, count, type, indices) {
      var src;
      if (boundElem && buffers[boundElem]) { var v = buffers[boundElem].view(type), off = (+indices || 0) / bpe(type); src = Array.prototype.slice.call(v, off, off + count); }
      else src = flat(indices).slice(0, count);
      drawIndices(mode, src);
    }, "comp");
    def("glDrawRangeElements", function (mode, s, e, count, type, indices) { A.glDrawElements(mode, count, type, indices); }, "comp");
    function Buf() { this.glb = gl.createBuffer(); this.bytes = new Uint8Array(0); this.ver = 0; this.views = {}; }
    Buf.prototype.view = function (type) {
      var k = type + ":" + this.ver; if (this.views[k]) return this.views[k];
      var ab = this.bytes.buffer.slice(this.bytes.byteOffset, this.bytes.byteOffset + this.bytes.byteLength), v;
      switch (type) { case K.GL_UNSIGNED_BYTE: v = new Uint8Array(ab); break; case K.GL_UNSIGNED_SHORT: v = new Uint16Array(ab, 0, ab.byteLength >> 1); break;
        case K.GL_UNSIGNED_INT: v = new Uint32Array(ab, 0, ab.byteLength >> 2); break; case K.GL_INT: v = new Int32Array(ab, 0, ab.byteLength >> 2); break;
        case K.GL_SHORT: v = new Int16Array(ab, 0, ab.byteLength >> 1); break; case K.GL_BYTE: v = new Int8Array(ab); break; default: v = new Float32Array(ab, 0, ab.byteLength >> 2); }
      this.views = {}; this.views[k] = v; return v;
    };
    def("glGenBuffers", function (n, out) { needCtx(); var ids = []; for (var i = 0; i < n; i++) { buffers[nextBuf] = new Buf(); ids.push(nextBuf++); } writeFlat(out, ids); }, false);
    def("glDeleteBuffers", function (n, ids) { vals(ids, n).forEach(function (i) { if (buffers[i]) { gl.deleteBuffer(buffers[i].glb); delete buffers[i]; } }); }, false);
    def("glBindBuffer", function (target, id) { if (target === K.GL_ARRAY_BUFFER) boundArray = id; else if (target === K.GL_ELEMENT_ARRAY_BUFFER) boundElem = id; else err(K.GL_INVALID_ENUM); }, false);
    def("glIsBuffer", function (i) { return buffers[i] ? 1 : 0; }, false);
    function bufferData(target, size, data, usage) {
      var id = target === K.GL_ARRAY_BUFFER ? boundArray : boundElem, B = buffers[id];
      if (!B) { err(K.GL_INVALID_OPERATION, "glBufferData: не привязан буфер (glBindBuffer)."); return; }
      var bytes = new Uint8Array(size | 0);
      if (data != null) {
        var t = data.__elemType || (target === K.GL_ELEMENT_ARRAY_BUFFER ? (data.__ctype === "GLubyte" ? K.GL_UNSIGNED_BYTE : data.__ctype === "GLuint" || data.__ctype === "unsigned int" ? K.GL_UNSIGNED_INT : K.GL_UNSIGNED_SHORT) : K.GL_FLOAT);
        if (data.__ctype) t = ({ GLfloat: K.GL_FLOAT, float: K.GL_FLOAT, double: K.GL_FLOAT, GLdouble: K.GL_FLOAT, GLubyte: K.GL_UNSIGNED_BYTE, "unsigned char": K.GL_UNSIGNED_BYTE,
          GLushort: K.GL_UNSIGNED_SHORT, "unsigned short": K.GL_UNSIGNED_SHORT, GLuint: K.GL_UNSIGNED_INT, "unsigned int": K.GL_UNSIGNED_INT, GLint: K.GL_INT, int: K.GL_INT, GLshort: K.GL_SHORT })[data.__ctype] || t;
        var typed = typedFromType(t, data); bytes.set(new Uint8Array(typed.buffer, typed.byteOffset, Math.min(typed.byteLength, bytes.length)));
      }
      B.bytes = bytes; B.ver++; B.views = {};
      var tgt = target === K.GL_ARRAY_BUFFER ? gl.ARRAY_BUFFER : gl.ELEMENT_ARRAY_BUFFER;
      if (tgt === gl.ARRAY_BUFFER) { gl.bindBuffer(gl.ARRAY_BUFFER, B.glb); gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.STATIC_DRAW); }
    }
    def("glBufferData", bufferData, false); def("glBufferDataARB", bufferData, false);
    def("glBufferSubData", function (target, off, size, data) {
      var id = target === K.GL_ARRAY_BUFFER ? boundArray : boundElem, B = buffers[id]; if (!B) return;
      var typed = typedFromType(data.__ctype === "GLubyte" ? K.GL_UNSIGNED_BYTE : K.GL_FLOAT, data);
      B.bytes.set(new Uint8Array(typed.buffer, 0, Math.min(size, typed.byteLength)), off); B.ver++; B.views = {};
      if (target === K.GL_ARRAY_BUFFER) { gl.bindBuffer(gl.ARRAY_BUFFER, B.glb); gl.bufferData(gl.ARRAY_BUFFER, B.bytes, gl.STATIC_DRAW); }
    }, false);
    def("glGenBuffersARB", A.glGenBuffers, false); def("glBindBufferARB", A.glBindBuffer, false);
    // быстрый путь: все массивы в VBO, заливка, без CPU-обработки
    var quadIdxCache = {};
    function tryFastPath(mode, idx) {
      var arr = [client.v, clientOn.c ? client.c : null, clientOn.n ? client.n : null, clientOn.t ? client.t : null];
      if (!client.v.buf) return false;
      for (var i = 1; i < 4; i++) if (arr[i] && !arr[i].buf) return false;
      if (needCpuPolys() || S.shade === K.GL_FLAT) return false;
      if (mode !== K.GL_TRIANGLES && mode !== K.GL_TRIANGLE_STRIP && mode !== K.GL_TRIANGLE_FAN && mode !== K.GL_QUADS) return false;
      var list = idx;
      if (mode === K.GL_QUADS) { var t = []; for (i = 0; i + 3 < idx.length; i += 4) t.push(idx[i], idx[i + 1], idx[i + 2], idx[i], idx[i + 2], idx[i + 3]); list = t; mode = K.GL_TRIANGLES; }
      upload("fill");
      gl.bindVertexArray(vao);
      function attr(name, P, size, def4) {
        var l = loc[name]; if (l < 0) return;
        if (!P) { gl.disableVertexAttribArray(l); gl.vertexAttrib4f(l, def4[0], def4[1], def4[2], def4[3]); return; }
        gl.bindBuffer(gl.ARRAY_BUFFER, P.buf.glb); gl.enableVertexAttribArray(l);
        var glType = { 0x1406: gl.FLOAT, 0x1401: gl.UNSIGNED_BYTE, 0x1400: gl.BYTE, 0x1402: gl.SHORT, 0x1403: gl.UNSIGNED_SHORT, 0x1404: gl.INT, 0x1405: gl.UNSIGNED_INT }[P.type] || gl.FLOAT;
        gl.vertexAttribPointer(l, P.size, glType, P.type === K.GL_UNSIGNED_BYTE && name === "aColor", P.stride || 0, +P.ptr || 0);
      }
      attr("aPos", client.v, client.v.size, [0, 0, 0, 1]);
      attr("aColor", arr[1], 4, [S.color[0], S.color[1], S.color[2], S.color[3]]);
      attr("aNormal", arr[2], 3, [S.normal[0], S.normal[1], S.normal[2], 0]);
      attr("aTex", arr[3], 4, [S.tex[0], S.tex[1], S.tex[2], S.tex[3]]);
      if (loc.aClip >= 0) { gl.disableVertexAttribArray(loc.aClip); gl.vertexAttrib4f(loc.aClip, 0, 0, 0, 1); }
      if (loc.aLine >= 0) { gl.disableVertexAttribArray(loc.aLine); gl.vertexAttrib2f(loc.aLine, 0, 0); }
      if (!fastIdx) fastIdx = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fastIdx);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(list), gl.STREAM_DRAW);
      var gm = mode === K.GL_TRIANGLES ? gl.TRIANGLES : mode === K.GL_TRIANGLE_STRIP ? gl.TRIANGLE_STRIP : gl.TRIANGLE_FAN;
      gl.drawElements(gm, list.length, gl.UNSIGNED_INT, 0); stats.draws++; stats.verts += list.length; stats.blocks++;
      gl.bindVertexArray(vao); // восстановление
      return true;
    }
    var fastIdx = null;

    /* ======================================================================= GLU */
    def("gluPerspective", function (fovy, aspect, n, f) {
      if (n <= 0) { err(K.GL_INVALID_VALUE, "gluPerspective: zNear должен быть > 0 (сейчас " + n + ")."); return; }
      var t = Math.tan(fovy * Math.PI / 360) * n, r = t * aspect; frustum(-r, r, -t, t, n, f);
    });
    def("gluOrtho2D", function (l, r, b, t) { ortho(l, r, b, t, -1, 1); });
    def("gluLookAt", function (ex, ey, ez, cx, cy, cz, ux, uy, uz) {
      var f = [cx - ex, cy - ey, cz - ez], fl = Math.hypot(f[0], f[1], f[2]) || 1; f = [f[0] / fl, f[1] / fl, f[2] / fl];
      var u = [ux, uy, uz], s = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]], sl = Math.hypot(s[0], s[1], s[2]) || 1;
      s = [s[0] / sl, s[1] / sl, s[2] / sl]; u = [s[1] * f[2] - s[2] * f[1], s[2] * f[0] - s[0] * f[2], s[0] * f[1] - s[1] * f[0]];
      var m = m4(); m[0] = s[0]; m[4] = s[1]; m[8] = s[2]; m[1] = u[0]; m[5] = u[1]; m[9] = u[2]; m[2] = -f[0]; m[6] = -f[1]; m[10] = -f[2];
      mulTop(m); translate(-ex, -ey, -ez);
    });
    def("gluPickMatrix", function (x, y, w, h, vp) { var v = vals(vp, 4); translate((v[2] - 2 * (x - v[0])) / w, (v[3] - 2 * (y - v[1])) / h, 0); scale(v[2] / w, v[3] / h, 1); });
    def("gluProject", function (ox, oy, oz, mv, pr, vp, wx, wy, wz) {
      var c = mvec(new Float32Array(vals(pr, 16)), mvec(new Float32Array(vals(mv, 16)), [ox, oy, oz, 1])), v = vals(vp, 4);
      if (!c[3]) return 0; writeFlat(wx, [v[0] + (c[0] / c[3] + 1) * v[2] / 2]); writeFlat(wy, [v[1] + (c[1] / c[3] + 1) * v[3] / 2]); writeFlat(wz, [(c[2] / c[3] + 1) / 2]); return 1;
    }, false);
    def("gluUnProject", function (wx, wy, wz, mv, pr, vp, ox, oy, oz) {
      var v = vals(vp, 4), inv = minv(mmul(new Float32Array(vals(pr, 16)), new Float32Array(vals(mv, 16))));
      var p = mvec(inv, [(wx - v[0]) / v[2] * 2 - 1, (wy - v[1]) / v[3] * 2 - 1, 2 * wz - 1, 1]); if (!p[3]) return 0;
      writeFlat(ox, [p[0] / p[3]]); writeFlat(oy, [p[1] / p[3]]); writeFlat(oz, [p[2] / p[3]]); return 1;
    }, false);
    def("gluBuild2DMipmaps", function (target, ifmt, w, h, format, type, data) {
      var T = texObj(S.texBound), px = toRGBA(w, h, format, type, data, S.unpackAlign, S.unpackRow, null);
      gl.bindTexture(gl.TEXTURE_2D, T.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.generateMipmap(gl.TEXTURE_2D); T.w = w; T.h = h; T.ready = true; T.fmtCode = fmtCode(ifmt); T.hasMips = true; dirty("tex"); return 0;
    });
    def("gluErrorString", function (e) {
      return ({ 0: "нет ошибок", 0x0500: "неверное перечисление (GL_INVALID_ENUM)", 0x0501: "недопустимое значение (GL_INVALID_VALUE)", 0x0502: "недопустимая операция (GL_INVALID_OPERATION)",
        0x0503: "переполнение стека (GL_STACK_OVERFLOW)", 0x0504: "стек пуст (GL_STACK_UNDERFLOW)", 0x0505: "нехватка памяти" })[e] || "неизвестная ошибка";
    }, false);
    // квадрики
    def("gluNewQuadric", function () { return { draw: K.GLU_FILL, normals: K.GLU_SMOOTH, tex: false, orient: K.GLU_OUTSIDE }; }, false);
    def("gluDeleteQuadric", function () {}, false);
    def("gluQuadricDrawStyle", function (q, s) { q.draw = s; }); def("gluQuadricNormals", function (q, n) { q.normals = n; });
    def("gluQuadricTexture", function (q, t) { q.tex = !!t; }); def("gluQuadricOrientation", function (q, o) { q.orient = o; });
    function qn(q, x, y, z) { if (q.normals !== K.GLU_NONE) { var s = q.orient === K.GLU_INSIDE ? -1 : 1; S.normal = [x * s, y * s, z * s]; } }
    function qt(q, s, t) { if (q.tex) S.tex = [s, t, 0, 1]; }
    def("gluSphere", function (q, r, slices, stacks) {
      slices = Math.max(3, slices | 0); stacks = Math.max(2, stacks | 0);
      var lineMode = q.draw === K.GLU_LINE || q.draw === K.GLU_SILHOUETTE, pointMode = q.draw === K.GLU_POINT;
      for (var i = 0; i < stacks; i++) {
        var p0 = Math.PI * i / stacks, p1 = Math.PI * (i + 1) / stacks;
        A.glBegin(lineMode ? K.GL_LINE_STRIP : pointMode ? K.GL_POINTS : K.GL_QUAD_STRIP);
        for (var j = 0; j <= slices; j++) {
          var th = 2 * Math.PI * j / slices, ct = Math.sin(th), st = Math.cos(th); // как в GLU: s = 0 на оси +y
          var a = [Math.sin(p0) * ct, Math.sin(p0) * st, Math.cos(p0)], b = [Math.sin(p1) * ct, Math.sin(p1) * st, Math.cos(p1)];
          if (q.orient === K.GLU_INSIDE) { var tmp = a; a = b; b = tmp; }
          qn(q, b[0], b[1], b[2]); qt(q, j / slices, 1 - (q.orient === K.GLU_INSIDE ? i : i + 1) / stacks); vtx(b[0] * r, b[1] * r, b[2] * r);
          qn(q, a[0], a[1], a[2]); qt(q, j / slices, 1 - (q.orient === K.GLU_INSIDE ? i + 1 : i) / stacks); vtx(a[0] * r, a[1] * r, a[2] * r);
        }
        A.glEnd();
      }
    }, "comp");
    def("gluCylinder", function (q, base, topR, h, slices, stacks) {
      slices = Math.max(3, slices | 0); stacks = Math.max(1, stacks | 0);
      var nz = (base - topR) / h, lineMode = q.draw === K.GLU_LINE || q.draw === K.GLU_SILHOUETTE;
      for (var i = 0; i < stacks; i++) {
        var z0 = h * i / stacks, z1 = h * (i + 1) / stacks, r0 = base + (topR - base) * i / stacks, r1 = base + (topR - base) * (i + 1) / stacks;
        A.glBegin(lineMode ? K.GL_LINES : q.draw === K.GLU_POINT ? K.GL_POINTS : K.GL_QUAD_STRIP);
        for (var j = 0; j <= slices; j++) {
          var th = 2 * Math.PI * j / slices, c = Math.sin(th), s = Math.cos(th), l = Math.hypot(c, s, nz);
          qn(q, c / l, s / l, nz / l);
          qt(q, j / slices, i / stacks); vtx(r0 * c, r0 * s, z0);
          qt(q, j / slices, (i + 1) / stacks); vtx(r1 * c, r1 * s, z1);
        }
        A.glEnd();
      }
    }, "comp");
    def("gluDisk", function (q, inner, outer, slices, loops) { A.gluPartialDisk(q, inner, outer, slices, loops, 0, 360); }, "comp");
    def("gluPartialDisk", function (q, inner, outer, slices, loops, start, sweep) {
      slices = Math.max(3, slices | 0); loops = Math.max(1, loops | 0);
      qn(q, 0, 0, 1);
      for (var l = 0; l < loops; l++) {
        var r0 = inner + (outer - inner) * l / loops, r1 = inner + (outer - inner) * (l + 1) / loops;
        A.glBegin(q.draw === K.GLU_LINE ? K.GL_LINE_STRIP : K.GL_QUAD_STRIP);
        for (var j = 0; j <= slices; j++) {
          var a = (start + sweep * j / slices) * Math.PI / 180, s = Math.sin(a), c = Math.cos(a);
          qt(q, 0.5 + s * r1 / outer / 2, 0.5 + c * r1 / outer / 2); vtx(r1 * s, r1 * c, 0);
          qt(q, 0.5 + s * r0 / outer / 2, 0.5 + c * r0 / outer / 2); vtx(r0 * s, r0 * c, 0);
        }
        A.glEnd();
      }
    }, "comp");

    /* ====================================================================== GLUT */
    def("glutInit", function () {}, false);
    def("glutInitDisplayMode", function (m) { displayMode = m >>> 0; }, false);
    def("glutInitWindowSize", function (w, h) { winW = Math.max(16, Math.min(1280, w | 0)); winH = Math.max(16, Math.min(1024, h | 0)); }, false);
    def("glutInitWindowPosition", function () {}, false);
    def("glutInitContextVersion", function () {}, false); def("glutInitContextProfile", function () {}, false);
    def("glutSetOption", function () {}, false);
    // GLEW: в Windows нужен для функций OpenGL 1.2+; в браузере всё доступно сразу — glewInit() ничего не делает
    def("glewInit", function () { return 0; }, false);
    def("glutCreateWindow", function (t) {
      if (created) { warn("Песочница поддерживает одно окно: повторный glutCreateWindow() игнорируется."); return 1; }
      title = String(t || "OpenGL"); doubleBuf = !!(displayMode & K.GLUT_DOUBLE); hasDepth = !!(displayMode & K.GLUT_DEPTH);
      hasStencil = !!(displayMode & K.GLUT_STENCIL); hasAccum = !!(displayMode & K.GLUT_ACCUM); msaa = !!(displayMode & K.GLUT_MULTISAMPLE);
      S.viewport = [0, 0, winW, winH]; S.scissor = [0, 0, winW, winH];
      makeContext(); created = true;
      if (opts.onWindow) opts.onWindow({ title: title, w: winW, h: winH, canvas: canvas, double: doubleBuf, depth: hasDepth, stencil: hasStencil, accum: hasAccum, msaa: msaa });
      bindInput();
      return 1;
    }, false);
    def("glutSetWindowTitle", function (t) { title = String(t); if (opts.onTitle) opts.onTitle(title); }, false);
    def("glutReshapeWindow", function (w, h) {}, false); def("glutPositionWindow", function () {}, false); def("glutFullScreen", function () {}, false);
    def("glutDestroyWindow", function () { rt.__stop(); }, false); def("glutLeaveMainLoop", function () { rt.__stop(); }, false);
    ["Display", "Reshape", "Keyboard", "KeyboardUp", "Special", "SpecialUp", "Mouse", "Motion", "PassiveMotion", "Idle", "MouseWheel", "Entry", "Visibility", "Close", "WMClose"].forEach(function (n) {
      var k = { Display: "display", Reshape: "reshape", Keyboard: "keyboard", KeyboardUp: "keyboardUp", Special: "special", SpecialUp: "specialUp", Mouse: "mouse",
        Motion: "motion", PassiveMotion: "passive", Idle: "idle", MouseWheel: "wheel", Entry: "entry", Visibility: "visibility", Close: "close", WMClose: "close" }[n];
      A["glut" + n + "Func"] = function (f) { cnt("glut" + n + "Func"); cb[k] = typeof f === "function" ? f : null; };
    });
    A.glutTimerFunc = function (ms, f, v) { cnt("glutTimerFunc"); if (fixedTime !== undefined) return; var id = setTimeout(function () { timers = timers.filter(function (x) { return x !== id; }); safeCall(f, [v]); }, Math.max(0, ms | 0)); timers.push(id); };
    A.glutPostRedisplay = function () { cnt("glutPostRedisplay"); redisplay = true; };
    A.glutSwapBuffers = function () { cnt("glutSwapBuffers"); if (gl) { if (compiling) return; present(); swapped = true; } };
    A.glutGet = function (what) {
      if (what === K.GLUT_ELAPSED_TIME) return fixedTime !== undefined ? fixedTime : Math.floor(performance.now() - t0);
      if (what === K.GLUT_WINDOW_WIDTH) return winW; if (what === K.GLUT_WINDOW_HEIGHT) return winH;
      if (what === K.GLUT_SCREEN_WIDTH) return screen.width; if (what === K.GLUT_SCREEN_HEIGHT) return screen.height;
      if (what === K.GLUT_WINDOW_DOUBLEBUFFER) return doubleBuf ? 1 : 0; return 0;
    };
    A.glutGetModifiers = function () { return modifiers; };
    A.glutMainLoop = function () { cnt("glutMainLoop"); mainLoopStarted = true; };
    A.glutBitmapCharacter = rec("glutBitmapCharacter", function (font, ch) {
      var c = typeof ch === "number" ? String.fromCharCode(ch) : String(ch);
      if (!S.raster.valid || !gl) return;
      var g = glyph(font, c);
      drawImage(g.px, g.w, g.h, Math.floor(S.raster.pos[0]), Math.floor(S.raster.pos[1]) - g.desc, 1, 1, S.raster.pos[2], S.raster.color);
      S.raster.pos[0] += g.adv;
    });
    function cstring(s) { // char[] / const char* / строка → строка JS
      if (s == null) return "";
      if (typeof s === "string") return s;
      if (s.__cp) return s.str();
      if (s.__ptr) s = flat(s.arr).slice(s.off);
      if (Array.isArray(s) || ArrayBuffer.isView(s)) { var o = ""; for (var i = 0; i < s.length; i++) { var c = s[i]; if (!c) break; o += typeof c === "number" ? String.fromCharCode(c) : String(c); } return o; }
      return String(s);
    }
    A.glutBitmapString = function (font, s) { cstring(s).split("").forEach(function (c) { A.glutBitmapCharacter(font, c); }); };
    A.glutBitmapWidth = function (font, ch) { return glyph(font, typeof ch === "number" ? String.fromCharCode(ch) : ch).adv; };
    A.glutBitmapLength = function (font, s) { return cstring(s).split("").reduce(function (a, c) { return a + A.glutBitmapWidth(font, c); }, 0); };
    A.glutStrokeCharacter = function () {}; A.glutStrokeString = function () {};
    A.glutSetCursor = function () {}; A.glutWarpPointer = function () {};
    A.glutCreateMenu = function () { return 1; }; A.glutAddMenuEntry = function () {}; A.glutAttachMenu = function () {}; A.glutAddSubMenu = function () {};

    // фигуры GLUT (формы как во freeglut)
    function shapeFaces(faces, normals, solid) {
      faces.forEach(function (f, i) {
        A.glBegin(solid ? K.GL_POLYGON : K.GL_LINE_LOOP);
        if (normals) S.normal = normals[i];
        f.forEach(function (p) { vtx(p[0], p[1], p[2]); });
        A.glEnd();
      });
    }
    function cube(sz, solid) {
      var h = sz / 2, V = [[-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h], [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]];
      var F = [[1, 2, 6, 5], [0, 4, 7, 3], [3, 7, 6, 2], [0, 1, 5, 4], [4, 5, 6, 7], [0, 3, 2, 1]];
      var N = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      shapeFaces(F.map(function (f) { return f.map(function (i) { return V[i]; }); }), N, solid);
    }
    A.glutSolidCube = function (s) { cnt("glutSolidCube"); cube(+s, true); }; A.glutWireCube = function (s) { cnt("glutWireCube"); cube(+s, false); };
    function sphere(r, sl, st, solid) {
      sl = Math.max(3, sl | 0); st = Math.max(2, st | 0);
      if (solid) {
        for (var i = 0; i < st; i++) {
          var a0 = Math.PI * i / st, a1 = Math.PI * (i + 1) / st;
          A.glBegin(K.GL_QUAD_STRIP);
          for (var j = 0; j <= sl; j++) {
            var t = 2 * Math.PI * j / sl, c = Math.cos(t), s = Math.sin(t);
            S.normal = [Math.sin(a0) * c, Math.sin(a0) * s, Math.cos(a0)]; vtx(r * S.normal[0], r * S.normal[1], r * S.normal[2]);
            S.normal = [Math.sin(a1) * c, Math.sin(a1) * s, Math.cos(a1)]; vtx(r * S.normal[0], r * S.normal[1], r * S.normal[2]);
          }
          A.glEnd();
        }
      } else {
        for (i = 1; i < st; i++) { var a = Math.PI * i / st; A.glBegin(K.GL_LINE_LOOP); for (j = 0; j < sl; j++) { t = 2 * Math.PI * j / sl; S.normal = [Math.sin(a) * Math.cos(t), Math.sin(a) * Math.sin(t), Math.cos(a)]; vtx(r * S.normal[0], r * S.normal[1], r * S.normal[2]); } A.glEnd(); }
        for (j = 0; j < sl; j++) { t = 2 * Math.PI * j / sl; A.glBegin(K.GL_LINE_STRIP); for (i = 0; i <= st; i++) { a = Math.PI * i / st; S.normal = [Math.sin(a) * Math.cos(t), Math.sin(a) * Math.sin(t), Math.cos(a)]; vtx(r * S.normal[0], r * S.normal[1], r * S.normal[2]); } A.glEnd(); }
      }
    }
    A.glutSolidSphere = function (r, a, b) { cnt("glutSolidSphere"); sphere(+r, a, b, true); }; A.glutWireSphere = function (r, a, b) { cnt("glutWireSphere"); sphere(+r, a, b, false); };
    function torus(ri, ro, sides, rings, solid) {
      sides = Math.max(3, sides | 0); rings = Math.max(3, rings | 0);
      function P(i, j) { var u = 2 * Math.PI * i / rings, v = 2 * Math.PI * j / sides, cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
        return { n: [cu * cv, su * cv, sv], p: [(ro + ri * cv) * cu, (ro + ri * cv) * su, ri * sv] }; }
      for (var i = 0; i < rings; i++) {
        A.glBegin(solid ? K.GL_QUAD_STRIP : K.GL_LINE_STRIP);
        for (var j = 0; j <= sides; j++) {
          var a = P(i, j), b = P(i + 1, j);
          S.normal = a.n; vtx(a.p[0], a.p[1], a.p[2]); S.normal = b.n; vtx(b.p[0], b.p[1], b.p[2]);
        }
        A.glEnd();
      }
    }
    A.glutSolidTorus = function (a, b, c, d) { cnt("glutSolidTorus"); torus(+a, +b, c, d, true); }; A.glutWireTorus = function (a, b, c, d) { cnt("glutWireTorus"); torus(+a, +b, c, d, false); };
    function cone(base, h, sl, st, solid) {
      sl = Math.max(3, sl | 0); st = Math.max(1, st | 0);
      var l = Math.hypot(base, h), nz = base / l, nr = h / l;
      A.glBegin(solid ? K.GL_TRIANGLE_FAN : K.GL_LINE_LOOP); S.normal = [0, 0, -1]; if (solid) vtx(0, 0, 0);
      for (var j = solid ? sl : sl - 1; j >= 0; j--) { var t = 2 * Math.PI * j / sl; vtx(base * Math.cos(t), base * Math.sin(t), 0); } A.glEnd();
      for (var i = 0; i < st; i++) {
        var z0 = h * i / st, z1 = h * (i + 1) / st, r0 = base * (1 - i / st), r1 = base * (1 - (i + 1) / st);
        A.glBegin(solid ? K.GL_QUAD_STRIP : K.GL_LINES);
        for (j = 0; j <= sl; j++) { t = 2 * Math.PI * j / sl; var c = Math.cos(t), s = Math.sin(t); S.normal = [c * nr, s * nr, nz]; vtx(r1 * c, r1 * s, z1); vtx(r0 * c, r0 * s, z0); }
        A.glEnd();
      }
    }
    A.glutSolidCone = function (b, h, s, t) { cnt("glutSolidCone"); cone(+b, +h, s, t, true); }; A.glutWireCone = function (b, h, s, t) { cnt("glutWireCone"); cone(+b, +h, s, t, false); };
    A.glutSolidCylinder = function (r, h, sl, st) { cnt("glutSolidCylinder"); var q = A.gluNewQuadric(); A.gluCylinder(q, r, r, h, sl, st); A.glPushMatrix(); A.glRotatef(180, 1, 0, 0); A.gluDisk(q, 0, r, sl, 1); A.glPopMatrix(); A.glPushMatrix(); A.glTranslatef(0, 0, h); A.gluDisk(q, 0, r, sl, 1); A.glPopMatrix(); };
    A.glutWireCylinder = function (r, h, sl, st) { var q = A.gluNewQuadric(); q.draw = K.GLU_LINE; A.gluCylinder(q, r, r, h, sl, st); };
    function poly(Vs, Fs, solid) {
      var faces = Fs.map(function (f) { return f.map(function (i) { return Vs[i]; }); });
      var N = faces.map(function (f) { var a = f[0], b = f[1], c = f[2], u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        var n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(n[0], n[1], n[2]) || 1; return [n[0] / l, n[1] / l, n[2] / l]; });
      shapeFaces(faces, N, solid);
    }
    var OCT = [[[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], [[0, 2, 4], [0, 5, 2], [0, 4, 3], [0, 3, 5], [1, 4, 2], [1, 2, 5], [1, 3, 4], [1, 5, 3]]];
    var r3 = 1 / Math.sqrt(3);
    var TET = [[[r3, r3, r3], [r3, -r3, -r3], [-r3, r3, -r3], [-r3, -r3, r3]], [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]]];
    var gr = (1 + Math.sqrt(5)) / 2, ic = 1 / Math.sqrt(1 + gr * gr);
    var ICO = [[[0, ic, gr * ic], [0, ic, -gr * ic], [0, -ic, gr * ic], [0, -ic, -gr * ic], [ic, gr * ic, 0], [ic, -gr * ic, 0], [-ic, gr * ic, 0], [-ic, -gr * ic, 0], [gr * ic, 0, ic], [-gr * ic, 0, ic], [gr * ic, 0, -ic], [-gr * ic, 0, -ic]],
      [[0, 2, 8], [0, 9, 2], [0, 4, 6], [0, 8, 4], [0, 6, 9], [1, 6, 4], [1, 4, 10], [1, 10, 3], [1, 3, 11], [1, 11, 6], [2, 5, 8], [2, 9, 7], [2, 7, 5], [3, 10, 5], [3, 5, 7], [3, 7, 11], [4, 8, 10], [5, 10, 8], [6, 11, 9], [7, 9, 11]]];
    function fixWinding(P) { // нормали наружу
      return [P[0], P[1].map(function (f) { var a = P[0][f[0]], b = P[0][f[1]], c = P[0][f[2]];
        var n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
        var m = [(a[0] + b[0] + c[0]), (a[1] + b[1] + c[1]), (a[2] + b[2] + c[2])];
        return (n[0] * m[0] + n[1] * m[1] + n[2] * m[2]) < 0 ? [f[0], f[2], f[1]] : f; })];
    }
    OCT = fixWinding(OCT); TET = fixWinding(TET); ICO = fixWinding(ICO);
    A.glutSolidOctahedron = function () { poly(OCT[0], OCT[1], true); }; A.glutWireOctahedron = function () { poly(OCT[0], OCT[1], false); };
    A.glutSolidTetrahedron = function () { poly(TET[0], TET[1], true); }; A.glutWireTetrahedron = function () { poly(TET[0], TET[1], false); };
    A.glutSolidIcosahedron = function () { poly(ICO[0], ICO[1], true); }; A.glutWireIcosahedron = function () { poly(ICO[0], ICO[1], false); };
    // чайник (данные freeglut)
    var teapotCache = {};
    function teapotMesh(n) {
      if (teapotCache[n]) return teapotCache[n];
      var D = global.GL1_TEAPOT; if (!D) return null;
      var verts = [], norms = [], tcs = [], idx = [];
      function bern(i, x) { var ix = 1 - x; return [ix * ix * ix, 3 * x * ix * ix, 3 * x * x * ix, x * x * x][i]; }
      function dbern(i, x) { var ix = 1 - x; return [-3 * ix * ix, 3 * ix * ix - 6 * x * ix, 6 * x * ix - 3 * x * x, 3 * x * x][i]; }
      for (var p = 0; p < 10; p++) {
        var flag = p < 6 ? 4 : 2, fix = p === 3 ? 1 : p === 5 ? 2 : 0, cp = [];
        for (var i = 0; i < 16; i++) { var c = D.cp.slice(D.patches[p * 16 + i] * 3, D.patches[p * 16 + i] * 3 + 3); cp.push([c[0] / 2, (c[2] - 1.575) / 2, -c[1] / 2]); }
        var V = [], N = [];
        for (var u = 0; u < n; u++) for (var v = 0; v < n; v++) {
          var x = u / (n - 1), y = v / (n - 1), pt = [0, 0, 0], t1 = [0, 0, 0], t2 = [0, 0, 0];
          for (i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
            var P = cp[i * 4 + j], b0 = bern(i, x) * bern(j, y), b1 = bern(i, x) * dbern(j, y), b2 = dbern(i, x) * bern(j, y);
            for (var k = 0; k < 3; k++) { pt[k] += b0 * P[k]; t1[k] += b1 * P[k]; t2[k] += b2 * P[k]; }
          }
          var nn = [t1[1] * t2[2] - t1[2] * t2[1], t1[2] * t2[0] - t1[0] * t2[2], t1[0] * t2[1] - t1[1] * t2[0]], l = Math.hypot(nn[0], nn[1], nn[2]) || 1;
          nn = [nn[0] / l, nn[1] / l, nn[2] / l];
          if (fix && u === 0) nn = [0, fix === 1 ? 1 : -1, 0];
          V.push(pt); N.push(nn);
        }
        var copies = [];
        if (flag === 4) {
          copies.push([V, N]);
          copies.push([V.map(function (q) { return [q[2], q[1], -q[0]]; }), N.map(function (q) { return [q[2], q[1], -q[0]]; })]);
          copies.push([V.map(function (q) { return [-q[0], q[1], -q[2]]; }), N.map(function (q) { return [-q[0], q[1], -q[2]]; })]);
          copies.push([V.map(function (q) { return [-q[2], q[1], q[0]]; }), N.map(function (q) { return [-q[2], q[1], q[0]]; })]);
        } else {
          copies.push([V, N]);
          var V2 = [], N2 = [];
          for (u = 0; u < n; u++) for (v = 0; v < n; v++) { var s = (n - u - 1) * n + v; V2.push([V[s][0], V[s][1], -V[s][2]]); N2.push([N[s][0], N[s][1], -N[s][2]]); }
          copies.push([V2, N2]);
        }
        copies.forEach(function (cpy) {
          var base = verts.length;
          for (var q = 0; q < cpy[0].length; q++) { verts.push(cpy[0][q]); norms.push(cpy[1][q]); tcs.push([Math.floor(q / n) / (n - 1), (q % n) / (n - 1)]); }
          for (var r = 0; r < n - 1; r++) for (var cc = 0; cc < n - 1; cc++) { var r1 = base + r * n + cc, r2 = r1 + n; idx.push(r1, r2, r2 + 1, r1, r2 + 1, r1 + 1); }
        });
      }
      return (teapotCache[n] = { v: verts, n: norms, t: tcs, i: idx });
    }
    function teapot(size, solid) {
      var M = teapotMesh(solid ? 8 : 10); if (!M) { warn("Данные чайника не загружены."); return; }
      A.glPushMatrix(); A.glScalef(size, size, size);
      if (solid) {
        A.glBegin(K.GL_TRIANGLES);
        for (var i = 0; i < M.i.length; i++) { var k = M.i[i]; S.normal = M.n[k]; S.tex = [M.t[k][0], M.t[k][1], 0, 1]; vtx(M.v[k][0], M.v[k][1], M.v[k][2]); }
        A.glEnd();
      } else {
        var n = 10, patches = M.v.length / (n * n);
        for (var p = 0; p < patches; p++) for (var r = 0; r < n; r++) {
          A.glBegin(K.GL_LINE_STRIP); for (var c = 0; c < n; c++) { var a = p * n * n + r * n + c; S.normal = M.n[a]; vtx(M.v[a][0], M.v[a][1], M.v[a][2]); } A.glEnd();
          A.glBegin(K.GL_LINE_STRIP); for (c = 0; c < n; c++) { a = p * n * n + c * n + r; S.normal = M.n[a]; vtx(M.v[a][0], M.v[a][1], M.v[a][2]); } A.glEnd();
        }
      }
      A.glPopMatrix();
    }
    A.glutSolidTeapot = function (s) { cnt("glutSolidTeapot"); teapot(+s, true); };
    A.glutWireTeapot = function (s) { cnt("glutWireTeapot"); teapot(+s, false); };

    /* --------------------------------------------- изображения (stbi_load / SOIL) */
    var images = opts.images || {};
    A.stbi_load = function (name, w, h, n, req) {
      var key = String(name).split(/[\\/]/).pop().toLowerCase(), im = images[key];
      if (!im) { warn("stbi_load: файл «" + name + "» не найден. В песочнице доступны: " + Object.keys(images).join(", ") + "."); return null; }
      var comp = req || 3; writeFlat(w, [im.w]); writeFlat(h, [im.h]); writeFlat(n, [4]);
      var out = new Uint8Array(im.w * im.h * comp);
      for (var y = 0; y < im.h; y++) for (var x = 0; x < im.w; x++) { // stbi отдаёт строки сверху вниз
        var s = (y * im.w + x) * 4, o = (y * im.w + x) * comp;
        for (var c = 0; c < comp; c++) out[o + c] = im.data[s + c];
      }
      return { __img: true, data: out, w: im.w, h: im.h };
    };
    A.stbi_image_free = function () {}; A.stbi_set_flip_vertically_on_load = function (f) { flipLoad = !!f; };
    var flipLoad = false;
    var origStbi = A.stbi_load;
    A.stbi_load = function (name, w, h, n, req) {
      var r = origStbi(name, w, h, n, req); if (!r || !flipLoad) return r;
      var comp = req || 3, row = r.w * comp, out = new Uint8Array(r.data.length);
      for (var y = 0; y < r.h; y++) out.set(r.data.subarray(y * row, y * row + row), (r.h - 1 - y) * row);
      r.data = out; return r;
    };

    /* ============================================================ ввод и цикл */
    var modifiers = 0, mouseDown = false, inputBound = false;
    function mpos(e) { var r = canvas.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * winW), Math.floor((e.clientY - r.top) / r.height * winH)]; }
    function mods(e) { modifiers = (e.shiftKey ? 1 : 0) | (e.ctrlKey ? 2 : 0) | (e.altKey ? 4 : 0); }
    var SPECIAL = { F1: 1, F2: 2, F3: 3, F4: 4, F5: 5, F6: 6, F7: 7, F8: 8, F9: 9, F10: 10, F11: 11, F12: 12, ArrowLeft: 100, ArrowUp: 101, ArrowRight: 102, ArrowDown: 103,
      PageUp: 104, PageDown: 105, Home: 106, End: 107, Insert: 108 };
    var lastMouse = [0, 0];
    function bindInput() {
      if (inputBound || fixedTime !== undefined) return; inputBound = true;
      canvas.addEventListener("keydown", function (e) {
        mods(e);
        if (SPECIAL[e.key] !== undefined) { if (cb.special) { e.preventDefault(); safeCall(cb.special, [SPECIAL[e.key], lastMouse[0], lastMouse[1]]); } return; }
        var ch = e.key === "Escape" ? 27 : e.key === "Enter" ? 13 : e.key === "Backspace" ? 8 : e.key === "Tab" ? 9 : e.key === "Delete" ? 127 : e.key.length === 1 ? e.key.charCodeAt(0) : -1;
        if (ch >= 0 && cb.keyboard) { e.preventDefault(); safeCall(cb.keyboard, [ch, lastMouse[0], lastMouse[1]]); }
      });
      canvas.addEventListener("keyup", function (e) {
        mods(e);
        if (SPECIAL[e.key] !== undefined) { if (cb.specialUp) safeCall(cb.specialUp, [SPECIAL[e.key], lastMouse[0], lastMouse[1]]); return; }
        var ch = e.key.length === 1 ? e.key.charCodeAt(0) : e.key === "Escape" ? 27 : -1;
        if (ch >= 0 && cb.keyboardUp) safeCall(cb.keyboardUp, [ch, lastMouse[0], lastMouse[1]]);
      });
      canvas.addEventListener("mousedown", function (e) { canvas.focus(); mods(e); mouseDown = true; var p = mpos(e); lastMouse = p; if (cb.mouse) safeCall(cb.mouse, [e.button, K.GLUT_DOWN, p[0], p[1]]); });
      window.addEventListener("mouseup", onUp);
      canvas.addEventListener("mousemove", function (e) { var p = mpos(e); lastMouse = p; if (mouseDown && cb.motion) safeCall(cb.motion, [p[0], p[1]]); else if (!mouseDown && cb.passive) safeCall(cb.passive, [p[0], p[1]]); });
      canvas.addEventListener("contextmenu", function (e) { if (cb.mouse) e.preventDefault(); });
      canvas.addEventListener("wheel", function (e) {
        var p = mpos(e), dir = e.deltaY < 0 ? 1 : -1;
        if (cb.wheel) { e.preventDefault(); safeCall(cb.wheel, [0, dir, p[0], p[1]]); }
        else if (cb.mouse) { e.preventDefault(); safeCall(cb.mouse, [dir > 0 ? 3 : 4, K.GLUT_DOWN, p[0], p[1]]); }
      }, { passive: false });
      canvas.addEventListener("touchstart", function (e) { var t = e.touches[0]; if (!t) return; mouseDown = true; var p = mpos(t); lastMouse = p; if (cb.mouse) { e.preventDefault(); safeCall(cb.mouse, [0, K.GLUT_DOWN, p[0], p[1]]); } }, { passive: false });
      canvas.addEventListener("touchmove", function (e) { var t = e.touches[0]; if (!t) return; var p = mpos(t); lastMouse = p; if (cb.motion) { e.preventDefault(); safeCall(cb.motion, [p[0], p[1]]); } }, { passive: false });
      canvas.addEventListener("touchend", function (e) { mouseDown = false; if (cb.mouse) safeCall(cb.mouse, [0, K.GLUT_UP, lastMouse[0], lastMouse[1]]); });
    }
    function onUp(e) { if (!mouseDown) return; mouseDown = false; var p = canvas ? mpos(e) : [0, 0]; if (cb.mouse) safeCall(cb.mouse, [e.button, K.GLUT_UP, p[0], p[1]]); }

    var stopped = false;
    function safeCall(f, args) {
      if (stopped || destroyed) return;
      if (opts.beforeCall) opts.beforeCall();
      try { f.apply(null, args || []); }
      catch (e) { stopped = true; if (opts.onError) opts.onError(e); else throw e; }
    }
    function runDisplay() {
      if (!cb.display) return;
      swapped = false; presentedThisFrame = false; inDisplay = true;
      for (var k in calls) calls[k] = 0;
      stats.blocks = 0; stats.verts = 0; stats.draws = 0; stats.listBlocks = 0;
      safeCall(cb.display);
      inDisplay = false;
      if (inBegin) { warn("Кадр закончился внутри glBegin/glEnd — не хватает glEnd()."); inBegin = false; cur = null; }
      if (doubleBuf && !swapped && !warnedSwap) { warnedSwap = true; warn("Режим GLUT_DOUBLE: в конце display() вызовите glutSwapBuffers(), иначе кадр не появится на экране."); }
      if (!doubleBuf && !presentedThisFrame) present();
      stats.frames++; stats.fpsFrames++;
      var now = performance.now(); if (now - stats.lastFps > 500) { stats.fps = Math.round(stats.fpsFrames * 1000 / (now - stats.lastFps)); stats.fpsFrames = 0; stats.lastFps = now; }
      if (opts.onFrame) opts.onFrame(rt.__info());
    }
    var warnedSwap = false;
    function loop() {
      rafId = 0; if (stopped || destroyed) return;
      if (cb.idle) safeCall(cb.idle);
      if (redisplay) { redisplay = false; runDisplay(); }
      rafId = requestAnimationFrame(loop);
    }
    rt.__start = function () { // после main(): как glutMainLoop — reshape, display, далее цикл событий
      if (!created) { if (cb.display) throw new Error("Окно не создано: вызовите glutCreateWindow() в main()."); return; }
      if (cb.reshape) safeCall(cb.reshape, [winW, winH]); else S.viewport = [0, 0, winW, winH];
      runDisplay();
      if (fixedTime === undefined && !stopped) rafId = requestAnimationFrame(loop);
    };
    rt.__frame = function (n) { // режим проверки: n дополнительных кадров с idle
      for (var i = 0; i < (n || 1); i++) { if (cb.idle) safeCall(cb.idle); runDisplay(); }
    };
    rt.__stop = function () { stopped = true; if (rafId) cancelAnimationFrame(rafId); rafId = 0; timers.forEach(clearTimeout); timers = []; };
    rt.__destroy = function () {
      rt.__stop(); destroyed = true; window.removeEventListener("mouseup", onUp);
      if (gl) { var lc = gl.getExtension("WEBGL_lose_context"); if (lc) lc.loseContext(); }
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
    rt.__pixels = function () { if (!gl) return null; var f = resolveForRead(); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, f); var px = new Uint8Array(winW * winH * 4); gl.readPixels(0, 0, winW, winH, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, drawFbo); return { w: winW, h: winH, data: px }; };
    rt.__screen = function () { // то, что реально показано в окне (после glutSwapBuffers)
      if (!gl) return null; gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); var px = new Uint8Array(winW * winH * 4);
      gl.readPixels(0, 0, winW, winH, gl.RGBA, gl.UNSIGNED_BYTE, px); gl.bindFramebuffer(gl.FRAMEBUFFER, drawFbo); return { w: winW, h: winH, data: px };
    };
    rt.__canvas = function () { return canvas; };
    rt.__calls = function () { return calls; };
    rt.__info = function () {
      var caps = []; for (var k in S.caps) if (S.caps[k]) caps.push(+k);
      return { caps: caps, matMode: S.matMode, mvDepth: S.mv.length, prDepth: S.pr.length, tex: S.texBound, lists: Object.keys(lists).length,
        stats: { blocks: stats.blocks, verts: stats.verts, draws: stats.draws, fps: stats.fps, frames: stats.frames, listBlocks: stats.listBlocks || 0 },
        win: { w: winW, h: winH, title: title, double: doubleBuf, depth: hasDepth, stencil: hasStencil, accum: hasAccum, msaa: msaa },
        hasIdle: !!cb.idle, hasDisplay: !!cb.display, calls: calls, error: errorFlag };
    };
    rt.__K = K;
    for (var kk in K) rt[kk] = K[kk];
    return rt;
  }

  global.GL1 = { create: create, K: K, flat: flat };
})(window);
