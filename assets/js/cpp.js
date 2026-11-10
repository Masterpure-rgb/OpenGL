/* CPP — перевод подмножества C/C++ (как в учебных программах OpenGL/GLUT) в JavaScript.
   Номера строк сохраняются: все замены делаются внутри строк, переводы строк не трогаются.
   Поддерживается: #include/#define (в т.ч. с параметрами), глобальные и локальные переменные,
   массивы (многомерные, со списками инициализации), struct, enum, typedef, функции и прототипы
   (с аргументами по умолчанию), приведения типов, целочисленное деление, sizeof, &x для
   выходных параметров, printf/cout, std::vector, цикл for по диапазону.
   Не поддерживается: указатели с арифметикой, классы с методами, шаблоны, перегрузка функций. */
(function (global) {
  "use strict";

  var BASE_TYPES = ["void", "bool", "char", "short", "int", "long", "float", "double", "signed", "unsigned", "size_t", "wchar_t",
    "GLfloat", "GLdouble", "GLint", "GLuint", "GLenum", "GLboolean", "GLbitfield", "GLsizei", "GLubyte", "GLbyte", "GLshort",
    "GLushort", "GLclampf", "GLclampd", "GLvoid", "GLchar", "GLsizeiptr", "GLintptr", "GLUquadric", "GLUquadricObj", "GLUtesselator",
    "uint8_t", "uint16_t", "uint32_t", "uint64_t", "int8_t", "int16_t", "int32_t", "int64_t", "string", "auto", "FILE", "time_t", "clock_t", "vector"];
  var QUALS = ["const", "static", "extern", "inline", "volatile", "register", "constexpr", "struct", "typename", "mutable", "unsigned", "signed"];
  var INT_TYPES = ["int", "short", "long", "char", "unsigned", "signed", "size_t", "GLint", "GLuint", "GLenum", "GLsizei", "GLubyte",
    "GLbyte", "GLshort", "GLushort", "GLbitfield", "uint8_t", "uint16_t", "uint32_t", "uint64_t", "int8_t", "int16_t", "int32_t", "int64_t", "time_t", "clock_t", "wchar_t"];
  var SIZES = { char: 1, bool: 1, GLboolean: 1, GLubyte: 1, GLbyte: 1, int8_t: 1, uint8_t: 1, short: 2, GLshort: 2, GLushort: 2, int16_t: 2, uint16_t: 2,
    int: 4, GLint: 4, GLuint: 4, GLenum: 4, GLsizei: 4, GLbitfield: 4, float: 4, GLfloat: 4, GLclampf: 4, unsigned: 4, long: 4, int32_t: 4, uint32_t: 4,
    double: 8, GLdouble: 8, GLclampd: 8, size_t: 8, int64_t: 8, uint64_t: 8, "long long": 8 };
  var JS_RESERVED = ["var", "let", "function", "in", "instanceof", "typeof", "with", "yield", "await", "arguments", "eval", "debugger", "export",
    "import", "interface", "implements", "package", "finally", "undefined", "NaN", "Infinity", "of", "window", "document", "self", "globalThis"];
  var PUNCT = [">>=", "<<=", "...", "->", "++", "--", "<<", ">>", "<=", ">=", "==", "!=", "&&", "||", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "::"];

  function tokenize(src) {
    var T = [], i = 0, n = src.length, lineStart = true, line = 1;
    function push(t, v) { T.push({ t: t, v: v, line: line }); }
    while (i < n) {
      var c = src[i], s = i;
      if (c === "\n") { push("nl", "\n"); i++; line++; lineStart = true; continue; }
      if (c === " " || c === "\t" || c === "\r" || c === "\f" || c === "\v") { while (i < n && /[ \t\r\f\v]/.test(src[i])) i++; push("ws", src.slice(s, i)); continue; }
      if (c === "/" && src[i + 1] === "/") { while (i < n && src[i] !== "\n") i++; push("com", src.slice(s, i)); continue; }
      if (c === "/" && src[i + 1] === "*") {
        var e = src.indexOf("*/", i + 2); if (e < 0) e = n - 2; var body = src.slice(s, e + 2); i = e + 2;
        push("com", body); line += (body.match(/\n/g) || []).length; continue;
      }
      if (c === "#" && lineStart) {
        while (i < n && src[i] !== "\n") { if (src[i] === "\\" && src[i + 1] === "\n") { i += 2; } else i++; }
        var pp = src.slice(s, i); push("pp", pp); line += (pp.match(/\n/g) || []).length; continue;
      }
      lineStart = false;
      if (c === '"') { i++; while (i < n && src[i] !== '"' && src[i] !== "\n") { if (src[i] === "\\") i++; i++; } i++; push("str", src.slice(s, i)); continue; }
      if (c === "'") { i++; while (i < n && src[i] !== "'" && src[i] !== "\n") { if (src[i] === "\\") i++; i++; } i++; push("chr", src.slice(s, i)); continue; }
      if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] || ""))) {
        var m = /^(0[xX][0-9a-fA-F]+|0[bB][01]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)[uUlLfF]*/.exec(src.slice(i));
        push("num", m[0]); i += m[0].length; continue;
      }
      if (/[A-Za-z_]/.test(c)) { while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++; push("id", src.slice(s, i)); continue; }
      var p = null;
      for (var k = 0; k < PUNCT.length; k++) if (src.substr(i, PUNCT[k].length) === PUNCT[k]) { p = PUNCT[k]; break; }
      if (!p) p = c;
      push("p", p); i += p.length;
    }
    return T;
  }

  function translate(src, opts) {
    opts = opts || {};
    var T = tokenize(src), N = T.length;
    var rep = T.map(function (t) { return t.v; }), pre = new Array(N).fill(""), post = new Array(N).fill("");
    var diags = [], warns = [];
    function D(i, msg) { diags.push({ line: T[i] ? T[i].line : 1, msg: msg }); }
    function W(i, msg) { warns.push({ line: T[i] ? T[i].line : 1, msg: msg }); }
    var sig = []; for (var i = 0; i < N; i++) if (T[i].t !== "ws" && T[i].t !== "nl" && T[i].t !== "com" && T[i].t !== "pp") sig.push(i);
    var pos = new Array(N).fill(-1); sig.forEach(function (ti, k) { pos[ti] = k; });
    function S(k) { return k >= 0 && k < sig.length ? T[sig[k]] : null; }
    function V(k) { var t = S(k); return t ? t.v : null; }
    var dead = new Array(N).fill(false);
    function R(k, v) { rep[sig[k]] = v; dead[sig[k]] = false; }
    function X(k) { rep[sig[k]] = ""; dead[sig[k]] = true; }
    function rawOf(a, b) { var o = ""; for (var j = a; j < b; j++) o += (j > a ? " " : "") + T[sig[j]].v; return o; }
    function xlate(a, b) { return a >= b ? "" : translate(rawOf(a, b), { expr: true, types: types, intTypes: intTypes, structs: structs, intVars: intVars }).js.trim(); }

    var types = new Set(BASE_TYPES), intTypes = new Set(INT_TYPES), structs = Object.create(null), typedefs = Object.create(null);
    var varType = Object.create(null), intVars = new Set(), funcDefaults = Object.create(null), funcNames = Object.create(null);
    var enumConsts = new Set();

    /* ---------- 0. препроцессор ---------- */
    var defines = [];
    T.forEach(function (t, ti) {
      if (t.t !== "pp") return;
      var nls = (t.v.match(/\n/g) || []).length, keepNl = new Array(nls + 1).join("\n");
      var body = t.v.replace(/\\\n/g, " ");
      var m = /^#\s*define\s+([A-Za-z_]\w*)(\(([^)]*)\))?\s*(.*)$/.exec(body);
      if (m) {
        var name = m[1], val = m[4].replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").trim();
        if (!val) { rep[ti] = keepNl; return; }
        var inner = translate(val, { expr: true, types: types }).js;
        if (m[2]) rep[ti] = "const " + name + " = (" + m[3] + ") => (" + inner + ");" + keepNl;
        else rep[ti] = "const " + name + " = (" + inner + ");" + keepNl;
        defines.push(name);
        return;
      }
      var inc = /^#\s*include\s*[<"]([^>"]+)[>"]/.exec(body);
      if (inc && opts.onInclude) opts.onInclude(inc[1], t.line);
      rep[ti] = keepNl; // #include, #ifdef, #pragma … — убираются
    });

    /* ---------- 1. предварительный проход: имена struct / enum / typedef ---------- */
    for (var k = 0; k < sig.length; k++) {
      var v = V(k);
      if ((v === "struct" || v === "class") && S(k + 1) && S(k + 1).t === "id" && (V(k + 2) === "{" || V(k + 2) === ";" || V(k + 2) === ":")) { types.add(V(k + 1)); structs[V(k + 1)] = true; }
      if (v === "enum") { var en = V(k + 1) === "class" ? k + 2 : k + 1; if (S(en) && S(en).t === "id" && V(en + 1) === "{") { types.add(V(en)); intTypes.add(V(en)); } }
      if (v === "typedef") {
        var e2 = k + 1, depth = 0;
        while (e2 < sig.length && !(V(e2) === ";" && depth === 0)) { if (V(e2) === "{") depth++; if (V(e2) === "}") depth--; e2++; }
        var j = e2 - 1, dims = 0;
        while (V(j) === "]") { while (V(j) !== "[") j--; j--; dims++; }
        if (S(j) && S(j).t === "id") { types.add(V(j)); typedefs[V(j)] = { start: k, end: e2 }; if (V(k + 1) === "struct") structs[V(j)] = true; }
      }
    }
    if (opts.expr) {
      if (opts.types) opts.types.forEach(function (t) { types.add(t); });
      if (opts.intTypes) opts.intTypes.forEach(function (t) { intTypes.add(t); });
      if (opts.structs) for (var sn in opts.structs) structs[sn] = true;
      if (opts.intVars) opts.intVars.forEach(function (t) { intVars.add(t); });
    }

    function isTypeTok(k) {
      var v = V(k); if (!v) return false;
      if (types.has(v) || v === "std") return true;
      return false;
    }
    // разбор спецификатора типа с позиции k; возвращает {end, base, isInt, isStruct, quals, tmplArgs} или null
    function parseType(k) {
      var start = k, quals = [], base = [], isConst = false, isStatic = false;
      while (true) {
        var v = V(k);
        if (v === "std" && V(k + 1) === "::") { X(k); X(k + 1); k += 2; continue; }
        if (QUALS.indexOf(v) >= 0 && !(v === "unsigned" || v === "signed")) { quals.push(v); if (v === "const" || v === "constexpr") isConst = true; if (v === "static") isStatic = true; k++; continue; }
        break;
      }
      var v0 = V(k);
      if (!v0 || !(types.has(v0) || v0 === "unsigned" || v0 === "signed" || v0 === "long" || v0 === "short")) return null;
      while (V(k) && (types.has(V(k)) || V(k) === "unsigned" || V(k) === "signed" || V(k) === "long" || V(k) === "short") && !(base.length && structs[V(k)])) {
        base.push(V(k)); k++;
        if (base.length && (structs[base[0]] || typedefs[base[0]] || base[0] === "string" || base[0] === "vector" || base[0] === "auto")) break;
      }
      var tmpl = null;
      if (V(k) === "<" && (base[base.length - 1] === "vector")) { var d = 0, s = k; do { if (V(k) === "<") d++; if (V(k) === ">") d--; if (V(k) === ">>") d -= 2; k++; } while (d > 0 && k < sig.length); tmpl = [s, k]; }
      while (V(k) === "const") { k++; }
      var bt = base.join(" ");
      var isInt = base.some(function (b) { return intTypes.has(b); }) && base.indexOf("float") < 0 && base.indexOf("double") < 0 && base.indexOf("bool") < 0;
      return { start: start, end: k, base: bt, last: base[base.length - 1], isInt: isInt, isStruct: !!structs[base[0]], isConst: isConst, isStatic: isStatic, tmpl: tmpl };
    }
    function match(k, open, close) { var d = 0; for (var j = k; j < sig.length; j++) { var v = V(j); if (v === open) d++; else if (v === close) { d--; if (d === 0) return j; } } return -1; }
    function clearRange(a, b) { for (var j = a; j < b; j++) X(j); }
    function ctypeOf(ti) { var b = ti.base; if (ti.isStruct) return b; if (typedefs[b]) return b; return b; }

    /* ---------- 2. основной проход ---------- */
    var braceCtx = []; // 'func' | 'block' | 'struct' | 'init' | 'enum'
    var funcDepth = 0, inForHeader = [], parenStack = [];
    var structDefs = [];

    function statementStart(k) {
      var pv = V(k - 1);
      if (k === 0) return true;
      if (pv === ";" || pv === "{" || pv === "}") return true;
      if (pv === ":" && V(k - 2) !== "?" ) { // метка case/default/public
        var j = k - 2; while (j >= 0 && V(j) !== ";" && V(j) !== "{" && V(j) !== "}" && V(j) !== "?") { if (V(j) === "case" || V(j) === "default" || V(j) === "public" || V(j) === "private" || V(j) === "protected") return true; j--; }
        return false;
      }
      if (pv === "(" && inForHeader.length && inForHeader[inForHeader.length - 1] === k - 1) return true;
      if (pv === ")" && V(k) && (types.has(V(k)))) { // после if(...)/for(...)/while(...) без фигурных скобок
        var o = matchBack(k - 1, "(", ")"); if (o > 0 && /^(if|for|while)$/.test(V(o - 1))) return true;
      }
      if (pv === "else" || pv === "do") return true;
      return false;
    }
    function matchBack(k, open, close) { var d = 0; for (var j = k; j >= 0; j--) { var v = V(j); if (v === close) d++; else if (v === open) { d--; if (d === 0) return j; } } return -1; }

    // объявление переменных, начиная с типа ti, до ';' (или ')' / ':' в заголовке for)
    var firstInit = -1, first0 = false, declStart = -1;
    function declVars(ti, k, terminators) {
      var first = true, j = k; firstInit = k; declStart = ti.start;
      var sType = ti.base;
      while (j < sig.length) {
        // указатели и ссылки
        var ptr = 0; while (V(j) === "*" || V(j) === "&" || V(j) === "&&") { if (V(j) === "*") ptr++; X(j); j++; }
        if (!S(j) || S(j).t !== "id") { D(sig[j] !== undefined ? sig[j] : sig[k], "Ожидалось имя переменной после типа «" + sType + "»."); return j; }
        var nameK = j, name = V(j); j++;
        if (JS_RESERVED.indexOf(name) >= 0) R(nameK, name + "_");
        // размеры массива
        var dims = []; while (V(j) === "[") { var c = match(j, "[", "]"); dims.push([j + 1, c]); j = c + 1; }
        varType[name] = { base: sType, ptr: ptr, dims: dims.length, isInt: ti.isInt && !ptr && !dims.length, isStruct: ti.isStruct };
        if (ti.isInt && !ptr && !dims.length) intVars.add(name);
        var dimStr = dims.map(function (d) { return d[0] === d[1] ? "null" : xlate(d[0], d[1]); }).join(", ");
        clearRange(dims.length ? dims[0][0] - 1 : j, j);
        var ctor = ti.isStruct ? "() => new " + ti.last + "()" : (sType === "string" || sType === "std string") ? '""' : (ptr ? "null" : "0");
        var td = typedefs[ti.last] && typedefs[ti.last].dims;
        R(nameK, (first ? "let " : "") + rep[sig[nameK]]);
        if (first) firstInit = j;
        if (ti.isStatic && curFunc) { var stE = statics.filter(function (x) { return x.start === declStart; })[0]; if (stE) stE.names.push(name); else statics.push({ names: [name], start: declStart, func: curFunc }); }
        // char* с ++ / * — эмуляция указателя на строку
        if (ptr === 1 && /char/.test(sType) && usesAsPointer(name, j)) { charPtrs.add(name); if (V(j) === "=") { pre[sig[j + 1]] += "__cp("; post[sig[exprEnd(j + 1, terminators) - 1]] += ")"; } }
        // инициализатор
        if (V(j) === "=" || V(j) === "{" || (V(j) === "(" && (ti.tmpl || ti.isStruct))) {
          var brace = V(j) === "{" ? j : (V(j) === "=" && V(j + 1) === "{" ? j + 1 : -1);
          if (V(j) === "(") { // vector<T> v(n, x) / Struct s(…)
            var cp = match(j, "(", ")");
            if (ti.tmpl) { R(j, " = __vec("); R(cp, ")"); } else { R(j, " = new " + ti.last + "("); }
            j = cp + 1;
          } else if (brace >= 0) {
            var cb = match(brace, "{", "}");
            for (var q = brace; q <= cb; q++) { if (V(q) === "{") R(q, "["); else if (V(q) === "}") R(q, "]"); }
            if (V(j) === "{") pre[sig[j]] += " = ";
            if (dims.length || td) { pre[sig[brace]] += "__arrInit([" + dimStr + "], " + ctypeQ(sType) + ", "; post[sig[cb]] += ", " + ctor + ")"; }
            else if (ti.isStruct) { pre[sig[brace]] += "__init(" + ti.last + ", "; post[sig[cb]] += ")"; }
            else if (ti.tmpl) { pre[sig[brace]] += "__vecFrom("; post[sig[cb]] += ")"; }
            else { // скаляр со списком {x}
              R(brace, "("); R(cb, ")");
            }
            j = cb + 1;
          } else {
            j++; var e = exprEnd(j, terminators);
            if (ti.isInt && !ptr && !dims.length && !(e === j + 1 && S(j).t === "num" && !/[.eE]/.test(V(j)))) { pre[sig[j]] += "__int("; post[sig[e - 1]] += ")"; }
            if (ti.isStruct && !ptr && !dims.length) { pre[sig[j]] += "__clone("; post[sig[e - 1]] += ")"; }
            j = e;
          }
        } else {
          if (dims.length) post[sig[nameK]] += " = __arr([" + dimStr + "], " + ctypeQ(sType) + ", " + ctor + ")";
          else if (td) post[sig[nameK]] += " = __arr([" + td + "], " + ctypeQ(typedefs[ti.last].base) + ", 0)";
          else if (ti.tmpl) post[sig[nameK]] += " = __vec()";
          else if (ti.isStruct && !ptr) post[sig[nameK]] += " = new " + ti.last + "()";
          else post[sig[nameK]] += " = " + ctor;
        }
        first = false;
        if (V(j) === ",") { j++; continue; }
        return j;
      }
      return j;
    }
    function ctypeQ(t) { return JSON.stringify(t); }
    var statics = [], charPtrs = new Set(), curFunc = null;
    function usesAsPointer(name, from) {
      for (var q = from; q < sig.length; q++) {
        if (V(q) !== name || S(q).t !== "id") continue;
        if (V(q + 1) === "++" || V(q + 1) === "--" || V(q - 1) === "++" || V(q - 1) === "--") return true;
        if (V(q - 1) === "*" && unaryPos(q - 1)) return true;
      }
      return false;
    }
    function exprEnd(k, terms) { // конец выражения на текущем уровне скобок
      var d = 0;
      for (var j = k; j < sig.length; j++) {
        var v = V(j);
        if (v === "(" || v === "[" || v === "{") d++;
        else if (v === ")" || v === "]" || v === "}") { if (d === 0) return j; d--; }
        else if (d === 0 && (v === ";" || v === "," || (terms && terms.indexOf(v) >= 0))) return j;
      }
      return sig.length;
    }
    function srcOf(a, b) { // текст значимых токенов a..b-1 (с уже сделанными заменами)
      var out = ""; for (var j = a; j < b; j++) out += (j > a ? " " : "") + pre[sig[j]] + rep[sig[j]] + post[sig[j]];
      return out;
    }

    // параметры функции → имена (с умолчаниями)
    function params(open, close, fname, isDef) {
      var list = [], j = open + 1, idx = 0;
      if (V(j) === "void" && j + 1 === close) { X(j); return list; }
      while (j < close) {
        var e = exprEnd(j, [")"]); if (e > close) e = close;
        var ti = parseType(j), name = null, nameK = -1, def = null, ptr = 0, isArr = false;
        var q = ti ? ti.end : j;
        while (V(q) === "*" || V(q) === "&" || V(q) === "&&" || V(q) === "const") { if (V(q) === "*") ptr++; q++; }
        if (q < e && S(q).t === "id") { name = V(q); nameK = q; q++; }
        while (V(q) === "[") { var c = match(q, "[", "]"); q = c + 1; isArr = true; }
        var eqk = V(q) === "=" ? q : -1;
        if (eqk >= 0) def = xlate(q + 1, e);
        if (V(j) === "...") { name = "...__va"; }
        if (!name) name = "_a" + idx;
        if (JS_RESERVED.indexOf(name) >= 0) name += "_";
        if (ti && ti.isInt && !ptr && !isArr) intVars.add(name);
        if (ti) varType[name] = { base: ti.base, ptr: ptr, dims: isArr ? 1 : 0, isInt: ti.isInt && !ptr && !isArr };
        list.push({ name: name, def: def });
        if (eqk >= 0) { clearRange(j, eqk); R(j, name + " "); } // «= значение» остаётся и обрабатывается дальше
        else { clearRange(j, e); R(j, name); }
        j = e + 1; idx++;
      }
      return list;
    }

    var pendingFunc = -1, funcHead = -1;
    for (k = 0; k < sig.length; k++) {
      if (dead[sig[k]]) continue;
      var v = V(k), t = S(k);

      // typedef … ; — убирается (типы уже собраны)
      if (v === "typedef") {
        var td = Object.keys(typedefs).filter(function (n) { return typedefs[n].start === k; })[0];
        var end = td ? typedefs[td].end : exprEnd(k + 1);
        if (td && structs[td]) { // typedef struct { … } Name;
          var ob = k + 1; while (V(ob) !== "{" && ob < end) ob++;
          if (V(ob) === "{") { emitStruct(td, ob, match(ob, "{", "}")); clearRange(k, ob); var cb2 = match(ob, "{", "}"); clearRange(cb2 + 1, end + 1); k = end; continue; }
        }
        if (td) { // typedef float vec3[3];
          var j0 = end - 1, dms = [];
          while (V(j0) === "]") { var o2 = matchBack(j0, "[", "]"); dms.unshift(xlate(o2 + 1, j0)); j0 = o2 - 1; }
          var bt = parseType(k + 1);
          typedefs[td].dims = dms.join(", "); typedefs[td].base = bt ? bt.base : "float";
          if (bt && bt.isInt && !dms.length) intTypes.add(td);
          if (!dms.length && bt) { typedefs[td].alias = bt; }
        }
        clearRange(k, end + 1); k = end; continue;
      }
      // using namespace std;
      if (v === "using") { var e3 = exprEnd(k); clearRange(k, e3 + 1); k = e3; continue; }
      // template — не поддерживается
      if (v === "template") { D(sig[k], "Шаблоны (template) в песочнице не поддерживаются."); continue; }
      // enum
      if (v === "enum") {
        var nk = k + 1; if (V(nk) === "class") nk++;
        var hasName = S(nk) && S(nk).t === "id";
        var ob2 = hasName ? nk + 1 : nk;
        if (V(ob2) === "{") {
          var cb3 = match(ob2, "{", "}"), val = 0, out = [], j1 = ob2 + 1;
          while (j1 < cb3) {
            var e4 = exprEnd(j1, ["}"]); if (e4 > cb3) e4 = cb3;
            var nm = V(j1);
            if (V(j1 + 1) === "=") { out.push(nm + " = (" + xlate(j1 + 2, e4) + ")"); val = null; enumConsts.add(nm); }
            else { out.push(nm + " = " + (val === null ? "(" + out[out.length - 1].split(" = ")[0] + " + 1)" : val)); if (val !== null) val++; enumConsts.add(nm); }
            intVars.add(nm);
            j1 = e4 + 1;
          }
          clearRange(k, cb3 + 1); R(k, "const " + out.join(", ")); // ';' после '}' остаётся
          var after = cb3 + 1;
          if (S(after) && S(after).t === "id") { // enum E {…} var;
            R(after, "; let " + V(after) + " = 0"); intVars.add(V(after));
          }
          k = cb3; continue;
        }
      }
      // struct Name { … };
      if ((v === "struct" || v === "class") && S(k + 1) && S(k + 1).t === "id" && V(k + 2) === "{") {
        var sb = k + 2, se = match(sb, "{", "}");
        emitStruct(V(k + 1), sb, se); clearRange(k, sb);
        var aft = se + 1;
        if (S(aft) && S(aft).t === "id") { // struct S {…} a, b;
          var names = []; var j2 = aft; while (S(j2) && S(j2).t === "id") { names.push(V(j2)); X(j2); if (V(j2 + 1) === ",") { X(j2 + 1); j2 += 2; } else { j2++; break; } }
          R(aft, "; let " + names.map(function (n) { return n + " = new " + V(k + 1) + "()"; }).join(", "));
        }
        k = se; continue;
      }

      if (v === "{") {
        var kind = "block";
        if (V(k - 1) === "=" || V(k - 1) === "," || V(k - 1) === "(" || V(k - 1) === "return" || V(k - 1) === "{" && braceCtx[braceCtx.length - 1] === "init") kind = "init";
        if (pendingFunc === k) { kind = "func"; funcDepth++; curFunc = { open: k, close: match(k, "{", "}"), head: funcHead }; }
        braceCtx.push(kind); continue;
      }
      if (v === "}") { var kd = braceCtx.pop(); if (kd === "func") { funcDepth--; curFunc = null; } continue; }

      // заголовок for: отметим '(' и обработаем range-for
      if (v === "for" && V(k + 1) === "(") {
        inForHeader.push(k + 1);
        var fc = match(k + 1, "(", ")");
        // for (auto& x : v)
        var colon = -1, dd = 0; for (var q2 = k + 2; q2 < fc; q2++) { if (V(q2) === "(") dd++; if (V(q2) === ")") dd--; if (dd === 0 && V(q2) === ":") { colon = q2; break; } }
        if (colon > 0) {
          var tq = parseType(k + 2), q3 = tq ? tq.end : k + 2;
          clearRange(k + 2, q3); while (V(q3) === "&" || V(q3) === "*" || V(q3) === "&&") { X(q3); q3++; }
          R(q3, "let " + V(q3)); R(colon, " of "); k = colon; inForHeader.pop(); continue;
        }
        // защита от бесконечного цикла: условие
        var s1 = -1, s2 = -1; dd = 0;
        for (q2 = k + 2; q2 < fc; q2++) { if (V(q2) === "(" || V(q2) === "{" || V(q2) === "[") dd++; if (V(q2) === ")" || V(q2) === "}" || V(q2) === "]") dd--; if (dd === 0 && V(q2) === ";") { if (s1 < 0) s1 = q2; else { s2 = q2; break; } } }
        if (s1 > 0 && s2 > 0) { if (s2 === s1 + 1) post[sig[s1]] += " __lg()"; else { pre[sig[s1 + 1]] += "__lg() && ("; post[sig[s2 - 1]] += ")"; } }
        continue;
      }
      if (v === "while" && V(k + 1) === "(") {
        var wc = match(k + 1, "(", ")"); pre[sig[k + 2]] += "__lg() && ("; post[sig[wc - 1]] += ")"; continue;
      }
      if (v === ")" && inForHeader.length && match(inForHeader[inForHeader.length - 1], "(", ")") === k) { inForHeader.pop(); continue; }

      // объявление / функция
      if (statementStart(k) && (isTypeTok(k) || QUALS.indexOf(v) >= 0 || v === "std")) {
        var ti = parseType(k);
        if (ti && !(V(ti.end) === "(" ) && !(V(ti.end) === "::") && !(V(ti.end) === ".") && !(V(ti.end) === ")")) {
          var q4 = ti.end; while (V(q4) === "*" || V(q4) === "&") q4++;
          // функция?
          if (S(q4) && S(q4).t === "id" && V(q4 + 1) === "(" && braceCtx.indexOf("func") < 0 && braceCtx.indexOf("struct") < 0) {
            var fname = V(q4), po = q4 + 1, pc = match(po, "(", ")"), after2 = pc + 1;
            while (V(after2) === "const" || V(after2) === "override" || V(after2) === "noexcept") { X(after2); after2++; }
            var plist = params(po, pc, fname, V(after2) === "{");
            if (V(after2) === "{") { // определение
              clearRange(ti.start, q4);
              var defs = funcDefaults[fname];
              if (defs) plist.forEach(function (p, ix) { if (p.def == null && defs[ix] != null) { var pk = po + 1; } });
              if (defs) { // подставим умолчания из прототипа
                var txt = plist.map(function (p, ix) { return p.name + (p.def != null ? " = " + p.def : defs[ix] != null ? " = " + defs[ix] : ""); }).join(", ");
                for (var z = po + 1; z < pc; z++) X(z); if (po + 1 < pc) R(po + 1, txt); else post[sig[po]] += txt;
              }
              R(q4, (JS_RESERVED.indexOf(fname) >= 0 ? "function " + fname + "_" : "function " + fname));
              if (funcNames[fname]) W(sig[q4], "Функция «" + fname + "» определена повторно: перегрузка функций в песочнице не поддерживается — используется последнее определение.");
              funcNames[fname] = true;
              pendingFunc = after2; funcHead = ti.start; k = po; continue;
            }
            if (V(after2) === ";") { // прототип: запомним умолчания и уберём
              funcDefaults[fname] = plist.map(function (p) { return p.def; });
              clearRange(ti.start, after2 + 1); k = after2; continue;
            }
          }
          // переменные
          clearRange(ti.start, ti.end);
          var endk = declVars(ti, ti.end, inForHeader.length && inForHeader[inForHeader.length - 1] === ti.start - 1 ? [")", ":"] : null);
          k = firstInit - 1; continue;
        }
        // функциональное приведение: float(x), int(x)
        if (ti && V(ti.end) === "(" && ti.end === k + 1) {
          var fc2 = match(k + 1, "(", ")");
          if (/(float|double|GLfloat|GLdouble)/.test(ti.base)) { R(k, "(+"); } else if (ti.isInt) R(k, "__int"); else if (ti.base === "bool") R(k, "!!"); else X(k);
          if (/(float|double|GLfloat|GLdouble)/.test(ti.base)) post[sig[fc2]] += ")";
          continue;
        }
      }
      // функциональное приведение в выражении
      if (t && t.t === "id" && V(k + 1) === "(" && (types.has(v)) && !structs[v] && V(k - 1) !== "." && !funcNames[v]) {
        var fc3 = match(k + 1, "(", ")"), tb = v;
        if (/^(float|double|GLfloat|GLdouble|GLclampf)$/.test(tb)) { R(k, "(+"); post[sig[fc3]] += ")"; }
        else if (intTypes.has(tb)) R(k, "__int"); else if (tb === "bool") R(k, "!!"); else if (tb === "string") R(k, "String");
        continue;
      }
      // приведение (T)expr
      if (v === "(" && !dead[sig[k + 1]] && (isTypeTok(k + 1) || V(k + 1) === "const" || V(k + 1) === "unsigned" || V(k + 1) === "struct")) {
        var ct = parseType(k + 1);
        if (ct) {
          var q5 = ct.end, stars = 0; while (V(q5) === "*" || V(q5) === "&") { stars++; q5++; }
          if (V(q5) === ")" && operandStarts(q5 + 1)) {
            var oe = operandEnd(q5 + 1);
            clearRange(k, q5 + 1);
            if (stars) { /* (void*)p, (GLubyte*)data — указатель: просто значение */ }
            else if (/(float|double|GLfloat|GLdouble|GLclampf)/.test(ct.base)) { R(k, "(+("); post[sig[oe]] += "))"; }
            else if (/^(unsigned char|GLubyte|uint8_t)$/.test(ct.base)) { R(k, "__u8("); post[sig[oe]] += ")"; }
            else if (ct.base === "bool" || ct.base === "GLboolean") { R(k, "!!("); post[sig[oe]] += ")"; }
            else if (ct.isInt) { R(k, "__int("); post[sig[oe]] += ")"; }
            k = q5; continue;
          }
        }
      }
      // static_cast<T>(x)
      if (/^(static|reinterpret|const|dynamic)_cast$/.test(v) && V(k + 1) === "<") {
        var gt = k + 1; while (V(gt) !== ">" && gt < sig.length) gt++;
        var tt = srcOf(k + 2, gt); clearRange(k, gt + 1);
        if (/float|double/.test(tt)) R(k, "(+"); else if (/int|unsigned|long|short|char|GLu?int|size_t|GLenum|GLsizei/.test(tt) && !/\*/.test(tt)) R(k, "__int"); else R(k, "");
        if (/float|double/.test(tt)) { var cp2 = match(gt + 1, "(", ")"); post[sig[cp2]] += ")"; }
        k = gt; continue;
      }
      // sizeof
      if (v === "sizeof") {
        if (V(k + 1) === "(") {
          var sc = match(k + 1, "(", ")"), st = parseType(k + 2);
          if (st && st.end === sc) { var sz = SIZES[st.base] || (typedefs[st.base] && typedefs[st.base].dims ? "__sizeofT(" + JSON.stringify(typedefs[st.base].base) + ", [" + typedefs[st.base].dims + "])" : null) || (structs[st.base] ? "__sizeofS(" + st.base + ")" : 4);
            var stars2 = 0, z2 = st.end; clearRange(k, sc + 1); R(k, String(sz)); k = sc; continue; }
          if (st && V(st.end) === "*") { clearRange(k, sc + 1); R(k, "8"); k = sc; continue; }
          // sizeof(arr) / sizeof(arr[0])
          var idxN = 0, q6 = k + 2;
          if (S(q6) && S(q6).t === "id") { var nmz = V(q6); q6++; while (V(q6) === "[") { q6 = match(q6, "[", "]") + 1; idxN++; } if (q6 === sc) {
            var vt = varType[nmz];
            if (vt && !vt.dims && !vt.ptr && idxN === 0) { clearRange(k, sc + 1); R(k, String(SIZES[vt.base] || 4)); k = sc; continue; }
            clearRange(k, sc + 1); R(k, "__sizeofAt(" + nmz + ", " + idxN + ", " + JSON.stringify(vt ? vt.base : "float") + ")"); k = sc; continue; } }
          R(k, "__sizeof"); continue;
        }
        R(k, "__sizeof "); continue;
      }
      // new / delete / malloc
      if (v === "new") {
        var nt = parseType(k + 1);
        if (nt && V(nt.end) === "[") { var nb = match(nt.end, "[", "]"); clearRange(k, nt.end + 1);  R(k, "__arr([" + xlate(nt.end + 1, nb) + "], " + ctypeQ(nt.base) + ", " + (nt.isStruct ? "() => new " + nt.last + "()" : "0") + ")"); clearRange(nt.end + 1, nb + 1); k = nb; continue; }
        if (nt && nt.isStruct) { continue; }
        continue;
      }
      if (v === "delete") { X(k); if (V(k + 1) === "[" && V(k + 2) === "]") { X(k + 1); X(k + 2); } R(k, "void "); continue; }
      // -> → .
      if (v === "->") { R(k, "."); continue; }
      // std::
      if (v === "std" && V(k + 1) === "::") { X(k); X(k + 1); k++; continue; }
      if (v === "::") { X(k); continue; }
      // NULL, nullptr
      if (v === "NULL" || v === "nullptr") { R(k, "null"); continue; }
      // cout << a << b;
      if ((v === "cout" || v === "cerr") && V(k + 1) === "<<") {
        var ce = exprEnd(k); R(k, "__cout("); var dd2 = 0;
        for (var q7 = k + 1; q7 < ce; q7++) { var vv = V(q7); if (vv === "(" || vv === "[") dd2++; if (vv === ")" || vv === "]") dd2--; if (vv === "<<" && dd2 === 0) R(q7, q7 === k + 1 ? "" : ","); if (vv === "endl") R(q7, '"\\n"'); }
        post[sig[ce - 1]] += ")"; continue;
      }
      if (v === "cin") { D(sig[k], "Ввод с клавиатуры через cin в песочнице недоступен: используйте glutKeyboardFunc."); continue; }
      if (v === "scanf") { D(sig[k], "scanf в песочнице недоступен: задайте значения в коде или через glutKeyboardFunc."); continue; }
      // унарный & (адрес)
      if (v === "&" && unaryPos(k) && S(k + 1) && S(k + 1).t === "id") {
        var ae = operandEnd(k + 1), aStr = xlate(k + 1, ae + 1);
        if (V(ae) === "]") { // &arr[i] → __ptr(arr, i)
          var lb = matchBack(ae, "[", "]");
          clearRange(k, ae + 1); R(k, "__ptr(" + xlate(k + 1, lb) + ", " + xlate(lb + 1, ae) + ")");
        } else { clearRange(k, ae + 1); R(k, "__ref(() => " + aStr + ", (__v) => { " + aStr + " = __v; })"); }
        k = ae; continue;
      }
      // разыменование *p (простой случай)
      if (v === "*" && unaryPos(k) && S(k + 1) && S(k + 1).t === "id" && V(k + 2) !== "(") {
        var dv = varType[V(k + 1)];
        if (charPtrs.has(V(k + 1))) { R(k, ""); post[sig[k + 1]] += ".v"; continue; }
        if (dv && dv.ptr) { R(k, ""); post[sig[k + 1]] += ".v"; W(sig[k], "Разыменование *" + V(k + 1) + ": в песочнице поддерживаются только указатели, полученные через &."); continue; }
      }
      if (t && t.t === "id" && charPtrs.has(v) && V(k - 1) !== ".") {
        if (V(k + 1) === "++" || V(k + 1) === "--" || V(k - 1) === "++" || V(k - 1) === "--") { post[sig[k]] += ".i"; continue; }
        if (V(k + 1) === "[") { var cbk = match(k + 1, "[", "]"); R(k + 1, ".at("); R(cbk, ")"); continue; }
      }
      // символьные и числовые литералы
      if (t && t.t === "chr") { R(k, String(charCode(v))); continue; }
      if (t && t.t === "num") { R(k, v.replace(/^(0[xX][0-9a-fA-F]+)[uUlL]*$/, "$1").replace(/^([^xX]*?)[uUlLfF]+$/, "$1").replace(/^0([0-7]+)$/, "0o$1").replace(/\.$/, ".0")); continue; }
      if (t && t.t === "str" && S(k + 1) && S(k + 1).t === "str") { post[sig[k]] += " +"; continue; }
      if (t && t.t === "id" && JS_RESERVED.indexOf(v) >= 0 && V(k - 1) !== "." && rep[sig[k]] === v) { R(k, v + "_"); continue; }
      if (v === "auto" && statementStart(k)) { R(k, "let"); continue; }
    }

    function charCode(lit) {
      var s = lit.slice(1, -1);
      if (s[0] === "\\") { var m = { n: 10, t: 9, r: 13, "0": 0, "\\": 92, "'": 39, '"': 34, a: 7, b: 8, f: 12, v: 11 }; if (m[s[1]] !== undefined) return m[s[1]]; if (s[1] === "x") return parseInt(s.slice(2), 16); return s.charCodeAt(1); }
      return s.charCodeAt(0) || 0;
    }
    function srcOf2(a, b) { var out = ""; for (var j = a; j < b; j++) out += pre[sig[j]] + rep[sig[j]] + post[sig[j]]; return out; }
    function unaryPos(k) {
      var pv = V(k - 1);
      if (k === 0 || pv === null) return true;
      if (/^[(,=?:;{}\[]$/.test(pv) || pv === "return" || pv === "&&" || pv === "||" || pv === "!" || /^[-+*/%<>]=?$/.test(pv) || /^(==|!=|<<|>>|\+=|-=|\*=|\/=)$/.test(pv)) return true;
      return false;
    }
    function operandStarts(k) {
      var s = S(k); if (!s) return false;
      if (s.t === "id" || s.t === "num" || s.t === "str" || s.t === "chr") return !(s.t === "id" && /^(return|else)$/.test(s.v));
      return /^(\(|-|\+|!|~|\*|&|\+\+|--)$/.test(s.v);
    }
    function operandEnd(k) { // индекс последнего токена унарного выражения, начинающегося с k
      var v = V(k);
      if (/^(-|\+|!|~|\*|&|\+\+|--)$/.test(v)) return operandEnd(k + 1);
      var j;
      if (v === "(") {
        j = match(k, "(", ")");
        // (T)x внутри — приведение: операнд после него
        var inner = parseType(k + 1);
        if (inner && (function () { var q = inner.end; while (V(q) === "*") q++; return q === j; })() && operandStarts(j + 1)) return operandEnd(j + 1);
      }
      else if (v === "sizeof") { j = V(k + 1) === "(" ? match(k + 1, "(", ")") : operandEnd(k + 1); }
      else j = k;
      while (true) {
        var n = V(j + 1);
        if (n === "(" ) { j = match(j + 1, "(", ")"); continue; }
        if (n === "[") { j = match(j + 1, "[", "]"); continue; }
        if ((n === "." || n === "->" || n === "::") && S(j + 2) && S(j + 2).t === "id") { j += 2; continue; }
        if (n === "++" || n === "--") { j++; continue; }
        break;
      }
      return j;
    }
    function emitStruct(name, ob, cb) {
      // поля: type a, b[3] = …; → constructor() { this.a = 0; … }
      var fields = [], j = ob + 1;
      while (j < cb) {
        var ti = parseType(j);
        if (!ti) { if (V(j) === "}" ) break; D(sig[j], "Неподдерживаемая конструкция в struct «" + name + "»: допустимы только поля."); j = exprEnd(j) + 1; continue; }
        var q = ti.end;
        while (q < cb) {
          var ptr = 0; while (V(q) === "*" || V(q) === "&") { ptr++; q++; }
          var fn = V(q); q++;
          if (V(q) === "(") { D(sig[q - 1], "Методы в struct (" + name + "::" + fn + ") в песочнице не поддерживаются — оформите их как обычные функции, принимающие структуру."); q = match(q, "(", ")") + 1; if (V(q) === "{") q = match(q, "{", "}"); break; }
          var dims = []; while (V(q) === "[") { var c = match(q, "[", "]"); dims.push(xlate(q + 1, c)); q = c + 1; }
          var init = null; if (V(q) === "=") { var e = exprEnd(q + 1, ["}"]); init = xlate(q + 1, e); q = e; }
          var dflt = ti.isStruct && !ptr ? "new " + ti.last + "()" : (ti.base === "string" ? '""' : "0");
          fields.push([fn, dims.length ? "__arr([" + dims.join(", ") + "], " + ctypeQ(ti.base) + ", " + (ti.isStruct ? "() => new " + ti.last + "()" : "0") + ")" : (init != null ? init : dflt), ti.isInt && !dims.length]);
          if (ti.isInt && !dims.length) intVars.add(fn);
          if (V(q) === ",") { q++; continue; }
          break;
        }
        j = q + 1;
      }
      for (var z = ob; z <= cb; z++) X(z);
      R(ob, "class " + name + " { constructor() { " + fields.map(function (f) { return "this." + f[0] + " = " + f[1] + ";"; }).join(" ") + " } static get __fields() { return " + JSON.stringify(fields.map(function (f) { return f[0]; })) + "; } }");
      if (V(cb + 1) === ";") X(cb + 1);
      structDefs.push(name);
    }

    /* ---------- 3. целочисленное деление ---------- */
    // a / b, где оба операнда целые; слева допускается цепочка из *, /, % (C вычисляет слева направо)
    function isIntOperand(tok, kk) {
      if (!tok || dead[sig[kk]]) return false;
      if (tok.t === "num") return (!/[.eE]/.test(tok.v) || /^0[xX]/.test(tok.v)) && !/[fF]$/.test(tok.v);
      if (tok.t === "id") return intVars.has(tok.v) && rep[sig[kk]] === tok.v;
      if (tok.t === "chr") return true;
      return false;
    }
    for (k = 1; k < sig.length - 1; k++) {
      if (V(k) !== "/") continue;
      var rNext = V(k + 2);
      if (!isIntOperand(S(k + 1), k + 1) || /^[([.]$|^->$|^\+\+$|^--$/.test(rNext || "")) continue;
      // идём влево по цепочке операндов и операций * / %
      var start = k - 1, allInt = true;
      while (true) {
        if (!isIntOperand(S(start), start)) { allInt = false; break; }
        var before = V(start - 1);
        if (before === "*" || before === "/" || before === "%") { start -= 2; if (start < 0) { allInt = false; break; } continue; }
        if (/^[.\])]$|^->$|^\+\+$|^--$/.test(before || "")) allInt = false; // a.b / c, f(x) / c, (expr) / c — тип неизвестен
        break;
      }
      if (!allInt) continue;
      pre[sig[start]] += "__idiv("; R(k, ","); post[sig[k + 1]] = ")" + post[sig[k + 1]];
    }

    /* ---------- 4. эвристика: пропущенная ';' ---------- */
    if (!opts.expr) checkSemicolons();
    function checkSemicolons() {
      var lines = {};
      sig.forEach(function (ti, kk) { var ln = T[ti].line; (lines[ln] = lines[ln] || []).push(kk); });
      Object.keys(lines).forEach(function (ln) {
        var ks = lines[ln], last = ks[ks.length - 1], lv = V(last), nx = S(last + 1);
        if (!nx) return;
        var firstV = V(ks[0]);
        if (/^(if|for|while|else|switch|do|case|default|struct|enum|class|typedef|template|public|private|protected)$/.test(firstV)) return;
        if (!(S(last).t === "id" || S(last).t === "num" || S(last).t === "str" || S(last).t === "chr" || lv === ")" || lv === "]" || lv === "++" || lv === "--")) return;
        if (T[sig[last + 1]].line === +ln) return;
        var nv = nx.v;
        if (/^[-+*/%=<>!&|^?:.,;)\]{}]/.test(nv) || nv === "<<" || nv === ">>" || nv === "->" || nv === "else") return;
        if (lv === ")" && (nv === "{")) return;
        // открытая скобка в строке → многострочный вызов
        var bal = 0; for (var q = 0; q < sig.length && q <= last; q++) { var vv = V(q); if (vv === "(" || vv === "[") bal++; if (vv === ")" || vv === "]") bal--; }
        if (bal > 0) return;
        // заголовок функции перед '{' на следующей строке
        if (lv === ")" && V(last + 1) === "{") return;
        var hdr = matchBack(last, "(", ")"); if (lv === ")" && hdr > 0 && /^(if|for|while|switch)$/.test(V(hdr - 1))) return;
        W(sig[last], "Возможно, пропущена точка с запятой «;» в конце строки " + ln + " (в C++ это ошибка компиляции).");
      });
    }

    /* ---------- 5. static-переменные функций выносятся наружу ---------- */
    statics.forEach(function (st, ix) {
      var f = st.func;
      // объявление: от начала (тип) до ';'
      var a = st.start, b = exprEndStmt(a);
      var txt = ""; for (var q = a; q <= b; q++) { txt += pre[sig[q]] + rep[sig[q]] + post[sig[q]] + " "; pre[sig[q]] = ""; rep[sig[q]] = ""; post[sig[q]] = ""; }
      st.names.forEach(function (nm) {
        var uniq = "__s" + ix + "_" + nm;
        txt = txt.replace(new RegExp("\\b" + nm + "\\b"), uniq);
        for (var q2 = b + 1; q2 < f.close; q2++) if (S(q2).t === "id" && V(q2) === nm && V(q2 - 1) !== "." && V(q2 - 1) !== "->") rep[sig[q2]] = rep[sig[q2]].replace(new RegExp("\\b" + nm + "\\b"), uniq);
      });
      pre[sig[f.head]] = txt.replace(/\s+/g, " ") + pre[sig[f.head]];
    });
    function exprEndStmt(a) { var d = 0; for (var j = a; j < sig.length; j++) { var vv = V(j); if (vv === "(" || vv === "{" || vv === "[") d++; if (vv === ")" || vv === "}" || vv === "]") d--; if (d === 0 && vv === ";") return j; } return sig.length - 1; }

    var out = "";
    for (i = 0; i < N; i++) out += pre[i] + rep[i] + post[i];
    return { js: out, diags: diags, warns: warns, structs: structDefs, defines: defines, intVars: intVars, funcs: Object.keys(funcNames) };
  }

  global.CPP = { translate: translate, tokenize: tokenize };
})(typeof window !== "undefined" ? window : globalThis);
