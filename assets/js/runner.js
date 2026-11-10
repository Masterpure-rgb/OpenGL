/* RUNNER — компиляция (C++ → JS), запуск программы OpenGL в окне-холсте, стандартная библиотека C,
   сообщения об ошибках с номерами строк, рендер «вслепую» для автоматической проверки. */
(function (global) {
  "use strict";
  var SCRIPT = document.currentScript && document.currentScript.src;
  var ASSETS = SCRIPT ? SCRIPT.replace(/js\/runner\.js.*$/, "") : "assets/";

  /* -------------------------------------------------------- изображения (stbi_load) */
  var TEXTURES = ["brick.png", "wood.png", "checker.png", "marble.png", "crate.png", "grass.png", "stone.png", "water.png", "earth.png", "metal.png", "glass.png", "tiles.png"];
  var images = {}, imagesReady = null;
  function loadImages() {
    if (imagesReady) return imagesReady;
    imagesReady = Promise.all(TEXTURES.map(function (n) {
      return new Promise(function (res) {
        var im = new Image(); im.crossOrigin = "anonymous";
        im.onload = function () {
          var c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
          var x = c.getContext("2d"); x.drawImage(im, 0, 0); var d = x.getImageData(0, 0, im.width, im.height);
          images[n] = { w: im.width, h: im.height, data: d.data }; res();
        };
        im.onerror = function () { res(); };
        im.src = ASSETS + "tex/" + n;
      });
    }));
    return imagesReady;
  }

  /* ------------------------------------------------------------------- printf */
  function fmt(f, args) {
    var ai = 0;
    return String(f).replace(/%([-+ 0#]*)(\d+|\*)?(?:\.(\d+|\*))?(hh|h|ll|l|L|z)?([diufFeEgGxXoscp%])/g, function (m, flags, width, prec, len, conv) {
      if (conv === "%") return "%";
      if (width === "*") width = args[ai++]; if (prec === "*") prec = args[ai++];
      var a = args[ai++], s;
      switch (conv) {
        case "d": case "i": s = String(Math.trunc(+a || 0)); break;
        case "u": s = String(Math.trunc(+a || 0) >>> 0); break;
        case "f": case "F": s = (+a).toFixed(prec === undefined ? 6 : +prec); break;
        case "e": case "E": s = (+a).toExponential(prec === undefined ? 6 : +prec).replace(/e([+-])(\d)$/, "e$10$2"); if (conv === "E") s = s.toUpperCase(); break;
        case "g": case "G": s = String(+(+a).toPrecision(prec === undefined ? 6 : Math.max(1, +prec))); break;
        case "x": s = (Math.trunc(+a) >>> 0).toString(16); break; case "X": s = (Math.trunc(+a) >>> 0).toString(16).toUpperCase(); break;
        case "o": s = (Math.trunc(+a) >>> 0).toString(8); break;
        case "c": s = typeof a === "number" ? String.fromCharCode(a) : String(a)[0] || ""; break;
        case "s": s = cstr(a); if (prec !== undefined) s = s.slice(0, +prec); break;
        case "p": s = "0x" + (Math.random() * 1e8 | 0).toString(16); break;
      }
      if (flags.indexOf("+") >= 0 && /[dieEfFgG]/.test(conv) && +a >= 0) s = "+" + s;
      var w = +width || 0;
      if (s.length < w) { if (flags.indexOf("-") >= 0) s = s + " ".repeat(w - s.length); else if (flags.indexOf("0") >= 0 && /[dieEfFgGxXou]/.test(conv)) { var neg = s[0] === "-" || s[0] === "+"; s = (neg ? s[0] : "") + "0".repeat(w - s.length) + (neg ? s.slice(1) : s); } else s = " ".repeat(w - s.length) + s; }
      return s;
    });
  }
  function cstr(a) { // char[] / строка / указатель на строку → строка JS
    if (a == null) return "(null)";
    if (typeof a === "string") return a;
    if (a.__cp) return a.str();
    if (Array.isArray(a) || ArrayBuffer.isView(a)) { var s = ""; for (var i = 0; i < a.length && a[i]; i++) s += typeof a[i] === "number" ? String.fromCharCode(a[i]) : a[i]; return s; }
    return String(a);
  }

  /* ------------------------------------------------------- стандартная библиотека */
  function makeLib(ctx) {
    var L = {}, seed = 1;
    function out(s) { ctx.write(s); }
    L.printf = function (f) { var s = fmt(f, [].slice.call(arguments, 1)); out(s); return s.length; };
    L.puts = function (s) { out(cstr(s) + "\n"); return 0; }; L.putchar = function (c) { out(String.fromCharCode(c)); return c; };
    L.fprintf = function (stream, f) { var s = fmt(f, [].slice.call(arguments, 2)); out(s); return s.length; };
    L.stdout = 1; L.stderr = 2; L.fflush = function () { return 0; };
    L.sprintf = function (buf, f) { var s = fmt(f, [].slice.call(arguments, 2)); writeStr(buf, s); return s.length; };
    L.snprintf = function (buf, n, f) { var s = fmt(f, [].slice.call(arguments, 3)).slice(0, Math.max(0, n - 1)); writeStr(buf, s); return s.length; };
    function writeStr(buf, s) { if (!buf || buf.length === undefined) return; for (var i = 0; i < s.length && i < buf.length - 1; i++) buf[i] = s.charCodeAt(i); if (i < buf.length) buf[i] = 0; }
    L.strlen = function (s) { return cstr(s).length; };
    L.strcpy = function (d, s) { writeStr(d, cstr(s)); return d; }; L.strcat = function (d, s) { writeStr(d, cstr(d) + cstr(s)); return d; };
    L.strcmp = function (a, b) { a = cstr(a); b = cstr(b); return a < b ? -1 : a > b ? 1 : 0; };
    L.__cout = function () { var s = ""; for (var i = 0; i < arguments.length; i++) { var a = arguments[i]; s += typeof a === "number" ? (Number.isInteger(a) ? String(a) : String(+a.toPrecision(6))) : typeof a === "boolean" ? (a ? "1" : "0") : cstr(a); } out(s); };
    L.endl = "\n"; L.to_string = function (x) { return typeof x === "number" && !Number.isInteger(x) ? x.toFixed(6) : String(x); };
    // математика
    ["sin", "cos", "tan", "asin", "acos", "atan", "atan2", "sqrt", "pow", "exp", "log", "log10", "log2", "floor", "ceil", "round", "hypot", "sinh", "cosh", "tanh", "cbrt", "trunc"].forEach(function (n) { L[n] = Math[n]; L[n + "f"] = Math[n]; });
    L.fabs = L.fabsf = Math.abs; L.abs = function (x) { return Math.abs(x); }; L.labs = L.abs;
    L.fmod = L.fmodf = function (a, b) { return a % b; }; L.fmin = L.fminf = Math.min; L.fmax = L.fmaxf = Math.max;
    L.min = function (a, b) { return a < b ? a : b; }; L.max = function (a, b) { return a > b ? a : b; };
    L.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    L.M_PI = Math.PI; L.M_PI_2 = Math.PI / 2; L.M_PI_4 = Math.PI / 4; L.M_E = Math.E; L.M_SQRT2 = Math.SQRT2; L.M_1_PI = 1 / Math.PI; L.M_2_PI = 2 / Math.PI;
    L.RAND_MAX = 32767; L.INT_MAX = 2147483647; L.FLT_MAX = 3.402823e38; L.FLT_EPSILON = 1.192093e-7; L.EXIT_SUCCESS = 0; L.EXIT_FAILURE = 1;
    L.CLOCKS_PER_SEC = 1000;
    L.rand = function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 16) & 32767; }; // как в MSVC/glibc: детерминированно
    L.srand = function (s) { seed = (s >>> 0) || 1; };
    L.time = function (p) { var t = ctx.fixed ? 0 : Math.floor(Date.now() / 1000); if (p && p.__ref) p.v = t; return t; };
    L.clock = function () { return ctx.fixed ? 0 : Math.floor(performance.now()); };
    L.tolower = function (c) { return typeof c === "number" ? String.fromCharCode(c).toLowerCase().charCodeAt(0) : String(c).toLowerCase(); };
    L.toupper = function (c) { return typeof c === "number" ? String.fromCharCode(c).toUpperCase().charCodeAt(0) : String(c).toUpperCase(); };
    L.isdigit = function (c) { return c >= 48 && c <= 57 ? 1 : 0; }; L.isalpha = function (c) { return /[A-Za-z]/.test(String.fromCharCode(c)) ? 1 : 0; };
    L.isspace = function (c) { return c === 32 || (c >= 9 && c <= 13) ? 1 : 0; };
    L.atoi = function (s) { return parseInt(cstr(s), 10) || 0; }; L.atof = function (s) { return parseFloat(cstr(s)) || 0; };
    L.exit = function (code) { var e = new Error("exit"); e.__exit = code | 0; throw e; };
    L.Sleep = L.usleep = L.sleep = function () {};
    L.system = function () { return 0; };
    L.malloc = function (bytes) { return new Array(Math.max(0, bytes | 0)).fill(0); };
    L.calloc = function (n, sz) { return new Array(Math.max(0, n | 0)).fill(0); };
    L.realloc = function (p, bytes) { return p; }; L.free = function () {};
    L.memset = function (arr, v, n) { (function rec(a) { for (var i = 0; i < a.length; i++) if (typeof a[i] === "object" && a[i] && a[i].length !== undefined) rec(a[i]); else a[i] = v; })(arr); return arr; };
    L.memcpy = function (d, s, n) { var f = GL1.flat(s), i = 0; (function rec(a) { for (var k = 0; k < a.length && i < f.length; k++) if (typeof a[k] === "object" && a[k] && a[k].length !== undefined) rec(a[k]); else a[k] = f[i++]; })(d); return d; };
    L.assert = function (c) { if (!c) throw new Error("assert: условие не выполнено"); };
    // служебные функции транслятора
    var SZ = { char: 1, bool: 1, GLboolean: 1, GLubyte: 1, GLbyte: 1, "unsigned char": 1, uint8_t: 1, int8_t: 1, short: 2, GLshort: 2, GLushort: 2, "unsigned short": 2,
      double: 8, GLdouble: 8, GLclampd: 8, "long long": 8, size_t: 8 };
    function esize(t) { return SZ[t] || 4; }
    function tag(a, ct) { try { Object.defineProperty(a, "__ctype", { value: ct, enumerable: false, configurable: true, writable: true }); } catch (e) {} return a; }
    L.__arr = function (dims, ct, fill) {
      dims = dims.map(function (d) { return d == null ? 0 : Math.max(0, Math.trunc(d)); });
      function mk(level) {
        var n = dims[level], a = new Array(n);
        for (var i = 0; i < n; i++) a[i] = level + 1 < dims.length ? mk(level + 1) : (typeof fill === "function" ? fill() : fill);
        return tag(a, ct);
      }
      return mk(0);
    };
    L.__arrInit = function (dims, ct, init, fill) {
      if (!Array.isArray(init)) init = [init];
      var D = dims.slice();
      if (!D.length) return tag(init.slice(), ct);
      // C допускает «плоский» список для многомерного массива
      var nested = init.some(function (x) { return Array.isArray(x); });
      if (D.length > 1 && !nested) { var inner = D.slice(1).reduce(function (a, b) { return a * (b || 1); }, 1), rows = []; for (var i = 0; i < init.length; i += inner) rows.push(init.slice(i, i + inner)); init = rows; }
      if (D[0] == null) D[0] = init.length;
      function build(level, src) {
        var n = D[level] == null ? (src ? src.length : 0) : D[level], a = new Array(n);
        for (var i = 0; i < n; i++) {
          var v = src ? src[i] : undefined;
          if (level + 1 < D.length) a[i] = build(level + 1, Array.isArray(v) ? v : (v === undefined ? null : [v]));
          else a[i] = v === undefined ? (typeof fill === "function" ? fill() : fill) : (typeof fill === "function" && Array.isArray(v) ? L.__init(fill().constructor, v) : v);
        }
        return tag(a, ct);
      }
      return build(0, init);
    };
    L.__init = function (Cls, vals) { var o = new Cls(), f = Cls.__fields || Object.keys(o); for (var i = 0; i < f.length && i < vals.length; i++) { var cur = o[f[i]]; o[f[i]] = (cur && typeof cur === "object" && cur.constructor && cur.constructor.__fields && Array.isArray(vals[i])) ? L.__init(cur.constructor, vals[i]) : vals[i]; } return o; };
    L.__clone = function (v) { if (v && typeof v === "object" && v.constructor && v.constructor.__fields) { var o = new v.constructor(); v.constructor.__fields.forEach(function (k) { o[k] = L.__clone(v[k]); }); return o; } if (Array.isArray(v)) return tag(v.map(L.__clone), v.__ctype); return v; };
    L.__ref = function (get, set) { return { __ref: true, get v() { return get(); }, set v(x) { set(x); } }; };
    L.__ptr = function (arr, off) { return off ? { __ptr: true, arr: arr, off: off | 0 } : arr; };
    L.__cp = function (s) { // char* для обхода строки
      var src = s && s.__cp ? s.src : s, start = s && s.__cp ? s.i : 0;
      function ch(k) { if (typeof src === "string") return k < src.length ? src.charCodeAt(k) : 0; var c = src ? src[k] : 0; return c === undefined ? 0 : (typeof c === "string" ? c.charCodeAt(0) : c); }
      return { __cp: true, src: src, i: start, get v() { return ch(this.i); }, at: function (k) { return ch(this.i + k); }, str: function () { var o = "", k = this.i, c; while ((c = ch(k++))) o += String.fromCharCode(c); return o; } };
    };
    L.__int = function (x) { if (typeof x === "boolean") return x ? 1 : 0; x = +x; return x >= 0 ? Math.floor(x) : Math.ceil(x); };
    L.__u8 = function (x) { return (L.__int(x) % 256 + 256) % 256; };
    L.__idiv = function (a, b) { a = L.__int(a); b = L.__int(b); if (b === 0) throw new Error("Целочисленное деление на ноль."); return L.__int(a / b); };
    L.__sizeof = function (x) { if (Array.isArray(x)) return GL1.flat(x).length * esize(x.__ctype); if (x && x.constructor && x.constructor.__fields) return L.__sizeofS(x.constructor); return 4; };
    L.__sizeofAt = function (x, k, ct) { var a = x; for (var i = 0; i < k && Array.isArray(a); i++) a = a[0]; if (Array.isArray(a)) return GL1.flat(a).length * esize(x.__ctype || ct); if (a && a.constructor && a.constructor.__fields) return L.__sizeofS(a.constructor); return esize(x && x.__ctype || ct); };
    L.__sizeofS = function (Cls) { var o = new Cls(); return (Cls.__fields || []).reduce(function (s, f) { return s + (Array.isArray(o[f]) ? L.__sizeof(o[f]) : 4); }, 0); };
    L.__sizeofT = function (ct, dims) { return dims.reduce(function (a, b) { return a * b; }, 1) * esize(ct); };
    L.__vec = function (n, v) { var a = []; if (n) for (var i = 0; i < n; i++) a.push(v === undefined ? 0 : L.__clone(v)); return vecify(a); };
    L.__vecFrom = function (arr) { return vecify(arr.slice()); };
    function vecify(a) {
      var m = { push_back: function (x) { a.push(L.__clone(x)); }, emplace_back: function (x) { a.push(x); }, pop_back: function () { a.pop(); }, size: function () { return a.length; },
        empty: function () { return a.length === 0; }, clear: function () { a.length = 0; }, back: function () { return a[a.length - 1]; }, front: function () { return a[0]; },
        data: function () { return a; }, resize: function (n, v) { while (a.length < n) a.push(v === undefined ? 0 : v); a.length = n; }, reserve: function () {}, at: function (i) { return a[i]; } };
      for (var k in m) Object.defineProperty(a, k, { value: m[k], enumerable: false });
      return a;
    }
    L.__lg = function () { // защита от бесконечного цикла
      if ((++ctx.loops & 0x3FFFF) === 0 && performance.now() - ctx.t0 > 4000) { var e = new Error("loop"); e.__loop = true; throw e; }
      return true;
    };
    L.true = true; L.false = false;
    return L;
  }

  /* ------------------------------------------------------------ ошибки и строки */
  var RU = [
    [/^Unexpected end of input/, "Неожиданный конец программы — вероятно, не хватает закрывающей «}»."],
    [/^missing \) after argument list/, "Не хватает «)» после аргументов функции."],
    [/^Unexpected token '(.)'/, "Синтаксическая ошибка: лишний или неожиданный символ «$1»."],
    [/^Unexpected token \((\d+):(\d+)\)/, "Синтаксическая ошибка: неожиданный символ."],
    [/^Unexpected token/, "Синтаксическая ошибка: неожиданный символ."],
    [/^Unexpected identifier '?(\w+)'?/, "Неожиданное имя «$1» — возможно, пропущена «;», запятая или оператор."],
    [/^Unexpected identifier/, "Неожиданное имя — возможно, пропущена «;», запятая или оператор."],
    [/^Unexpected number/, "Неожиданное число — возможно, пропущена запятая или оператор."],
    [/^Unexpected string/, "Неожиданная строка — возможно, пропущена запятая."],
    [/^Unterminated string/, "Строка не закрыта кавычкой."],
    [/^Invalid or unexpected token/, "Недопустимый символ (кавычки, обратная косая черта или кириллица в коде?)."],
    [/^Identifier '(\w+)' has already been declared/, "Имя «$1» уже объявлено в этой области видимости."],
    [/^(\w+) is not defined/, "Неизвестное имя «$1»: оно не объявлено (опечатка, или переменная объявлена в другой функции/блоке)."],
    [/^(\S+) is not a function/, "«$1» не является функцией — проверьте имя функции и скобки."],
    [/^Cannot read propert(?:y|ies) of (undefined|null) \(reading '(.+)'\)/, "Обращение к несуществующему элементу ($2): выход за границы массива или неинициализированный объект."],
    [/^Cannot set propert(?:y|ies) of (undefined|null) \(setting '(.+)'\)/, "Запись в несуществующий элемент ($2): выход за границы массива."],
    [/^Assignment to constant variable/, "Попытка изменить константу (const или #define)."],
    [/^Maximum call stack size exceeded/, "Слишком глубокая рекурсия: функция вызывает сама себя без условия выхода."],
    [/^'return' outside of function/, "return вне функции — проверьте фигурные скобки."],
    [/^Illegal return statement/, "return вне функции — проверьте фигурные скобки."],
    [/^Illegal break statement/, "break вне цикла или switch."],
    [/^Invalid left-hand side in assignment/, "Слева от «=» должна быть переменная."],
    [/^Invalid array length/, "Недопустимый размер массива."]
  ];
  function ruMsg(m) { m = String(m || ""); for (var i = 0; i < RU.length; i++) if (RU[i][0].test(m)) return m.replace(RU[i][0], RU[i][1]).replace(/ \(\d+:\d+\)$/, ""); return m; }
  function lineFromStack(e, offset) {
    var s = String(e && e.stack || ""), m = /<anonymous>:(\d+):(\d+)/.exec(s) || /program\.js:(\d+):(\d+)/.exec(s);
    return m ? Math.max(1, +m[1] - offset) : null;
  }
  var acornP = null;
  function loadAcorn() {
    if (global.acorn) return Promise.resolve(global.acorn);
    if (!acornP) acornP = new Promise(function (res) { var s = document.createElement("script"); s.src = ASSETS + "js/vendor/acorn.min.js"; s.onload = function () { res(global.acorn); }; s.onerror = function () { res(null); }; document.head.appendChild(s); });
    return acornP;
  }
  var FN_OFFSET = null; // сколько строк добавляет new Function перед телом
  function fnOffset() {
    if (FN_OFFSET !== null) return FN_OFFSET;
    try { new Function("throw new Error('x')")(); } catch (e) { var m = /<anonymous>:(\d+):/.exec(e.stack || ""); FN_OFFSET = m ? +m[1] - 1 : 2; }
    return FN_OFFSET;
  }

  /* ------------------------------------------- известные имена (для подсказок) */
  var KNOWN = null;
  function lev(a, b) {
    var m = a.length, n = b.length, d = []; for (var i = 0; i <= m; i++) { d[i] = [i]; }
    for (var j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0.5 : 1));
    return d[m][n];
  }
  function suggest(name, pool) {
    var best = null, bd = 1e9;
    pool.forEach(function (p) { if (Math.abs(p.length - name.length) > 3) return; var d = lev(name, p); if (d < bd) { bd = d; best = p; } });
    return bd <= Math.max(2, name.length / 5) ? best : null;
  }

  /* ================================================================== запуск */
  var uid = 0;
  function run(o) {
    o = o || {};
    var log = o.log || function () {};
    var res = { ok: false, rt: null, error: null, warnings: [], stop: function () { if (res.rt) res.rt.__destroy(); } };
    var src = String(o.code || "");
    var tr;
    try { tr = CPP.translate(src); } catch (e) { res.error = { line: null, msg: "Внутренняя ошибка транслятора: " + e.message }; log("error", res.error.msg, null); return Promise.resolve(res); }
    tr.warns.forEach(function (w) { res.warnings.push(w); log("warn", w.msg, w.line); });
    if (tr.diags.length) { res.error = tr.diags[0]; tr.diags.forEach(function (d) { log("error", d.msg, d.line); }); return Promise.resolve(res); }

    var ctx = { write: function (s) { log("out", s, null); }, fixed: o.fixedTime !== undefined, loops: 0, t0: performance.now() };
    var lib = makeLib(ctx);
    var rt;
    try {
      rt = GL1.create(o.host || null, { images: images, fixedTime: o.fixedTime,
        log: function (m) { log("info", m, null); }, warn: function (m) { log("warn", m, null); res.warnings.push({ msg: m }); },
        onWindow: o.onWindow, onTitle: o.onTitle, onFrame: o.onFrame,
        beforeCall: function () { ctx.t0 = performance.now(); },
        onError: function (e) { report(e); } });
    } catch (e) { res.error = { line: null, msg: e.message }; log("error", e.message, null); return Promise.resolve(res); }
    res.rt = rt;
    var env = Object.create(null); var k;
    for (k in rt) env[k] = rt[k];
    for (k in lib) env[k] = lib[k];
    // неизвестные функции/константы OpenGL — до запуска, с подсказкой
    if (!KNOWN) KNOWN = Object.keys(env).filter(function (n) { return /^(gl|glu|glut|GL_|GLU_|GLUT_)/.test(n); });
    var user = new Set(tr.funcs.concat(tr.defines));
    var toks = CPP.tokenize(src), seen = {};
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.t !== "id" || seen[t.v] || user.has(t.v)) continue;
      if (/^(gl|glu|glut)[A-Z]\w*$/.test(t.v) || /^(GL|GLU|GLUT)_[A-Z0-9_]+$/.test(t.v)) {
        if (!(t.v in env)) {
          seen[t.v] = true;
          var sg = suggest(t.v, KNOWN), msg = (/^gl/.test(t.v) ? "Неизвестная функция «" : "Неизвестная константа «") + t.v + "»" + (sg ? " — возможно, имелось в виду «" + sg + "»?" : " — в песочнице она не поддерживается или в имени опечатка.");
          res.error = res.error || { line: t.line, msg: msg }; log("error", msg, t.line);
        }
      }
    }
    if (res.error) { rt.__destroy(); return Promise.resolve(res); }

    var names = Object.keys(env).filter(function (n) { return /^[A-Za-z_$][\w$]*$/.test(n) && n !== "true" && n !== "false"; });
    var body = '"use strict"; const {' + names.join(",") + "} = __rt; {" + tr.js + "\n;return typeof main === \"function\" ? main : null; }";
    var fn;
    try { fn = new Function("__rt", body); }
    catch (e) {
      return loadAcorn().then(function (ac) {
        var line = null;
        if (ac) { try { ac.parse("function __p(){" + tr.js + "\n}", { ecmaVersion: 2022 , locations: true }); } catch (pe) { line = pe.loc ? pe.loc.line : null; } }
        res.error = { line: line, msg: ruMsg(e.message) };
        log("error", res.error.msg, line); rt.__destroy(); return res;
      });
    }
    var OFF = fnOffset();
    function report(e) {
      if (e && e.__exit !== undefined) { log("info", "Программа завершена: exit(" + e.__exit + ").", null); rt.__stop(); return; }
      if (e && e.__loop) { res.error = { line: lineFromStack(e, OFF), msg: "Программа «зависла» дольше 4 секунд — вероятно, бесконечный цикл (проверьте условие while/for)." }; }
      else res.error = { line: lineFromStack(e, OFF), msg: ruMsg(e && e.message) };
      log("error", res.error.msg, res.error.line); rt.__stop();
      if (o.onError) o.onError(res.error);
    }
    return (o.noImages ? Promise.resolve() : loadImages()).then(function () {
      var main;
      ctx.t0 = performance.now();
      try { main = fn(env); } catch (e) { report(e); return res; }
      if (!main) { res.error = { line: null, msg: "Не найдена функция main(). Программа на C++ начинается с int main(int argc, char** argv)." }; log("error", res.error.msg, null); rt.__destroy(); return res; }
      try { main(1, ["program"]); } catch (e) { report(e); return res; }
      var info = rt.__info();
      if (!info.hasDisplay && !res.error) { log("warn", "Не зарегистрирована функция отображения: вызовите glutDisplayFunc(display) в main().", null); }
      try { rt.__start(); } catch (e) { report(e); return res; }
      if (!res.error) res.ok = true;
      return res;
    });
  }

  // рендер для проверки: скрытое окно, фиксированное время, n кадров
  function render(code, opts) {
    opts = opts || {};
    var host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-10000px;top:0;width:10px;height:10px;overflow:hidden;";
    document.body.appendChild(host);
    var logs = [];
    return run({ code: code, host: host, fixedTime: opts.time || 1000, log: function (k, m, l) { logs.push({ kind: k, msg: m, line: l }); } }).then(function (r) {
      var out = { ok: r.ok, error: r.error, logs: logs, pixels: null, info: null, calls: null };
      if (r.rt) {
        try {
          if (r.ok && opts.frames) r.rt.__frame(opts.frames);
          out.pixels = r.rt.__screen(); out.info = r.rt.__info(); out.calls = Object.assign({}, r.rt.__calls());
        } catch (e) { out.error = out.error || { msg: e.message }; }
        r.rt.__destroy();
      }
      host.remove();
      return out;
    });
  }
  // сравнение двух изображений: доля заметно отличающихся пикселей
  function compare(a, b, tol) {
    if (!a || !b) return { diff: 1, same: false, reason: "нет изображения" };
    if (a.w !== b.w || a.h !== b.h) return { diff: 1, same: false, reason: "размер окна " + a.w + "×" + a.h + ", ожидается " + b.w + "×" + b.h };
    var n = a.w * a.h, bad = 0, t = tol || 48;
    for (var i = 0; i < n; i++) { var o = i * 4; if (Math.abs(a.data[o] - b.data[o]) > t || Math.abs(a.data[o + 1] - b.data[o + 1]) > t || Math.abs(a.data[o + 2] - b.data[o + 2]) > t) bad++; }
    return { diff: bad / n, same: bad / n < 0.012 };
  }
  function blank(img) { // картинка одного цвета?
    if (!img) return true; var d = img.data, r = d[0], g = d[1], b = d[2];
    for (var i = 0; i < d.length; i += 4 * 7) if (Math.abs(d[i] - r) > 8 || Math.abs(d[i + 1] - g) > 8 || Math.abs(d[i + 2] - b) > 8) return false;
    return true;
  }
  function toDataURL(img, maxW) { // для миниатюр: переворот по вертикали
    if (!img) return ""; var c = document.createElement("canvas"); c.width = img.w; c.height = img.h; var x = c.getContext("2d"), id = x.createImageData(img.w, img.h);
    for (var y = 0; y < img.h; y++) id.data.set(img.data.subarray((img.h - 1 - y) * img.w * 4, (img.h - y) * img.w * 4), y * img.w * 4);
    x.putImageData(id, 0, 0);
    if (maxW && img.w > maxW) { var c2 = document.createElement("canvas"); c2.width = maxW; c2.height = Math.round(img.h * maxW / img.w); c2.getContext("2d").drawImage(c, 0, 0, c2.width, c2.height); c = c2; }
    return c.toDataURL("image/png");
  }

  global.Runner = { run: run, render: render, compare: compare, blank: blank, toDataURL: toDataURL, loadImages: loadImages, textures: TEXTURES, fmt: fmt };
})(window);
