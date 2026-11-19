/* Lua++ engine: lexer, parser, interpreter, and linter. Pure logic, no DOM. */
const LUA_KW = new Set(['and','break','do','else','elseif','end','false','for','function','if','in','local','nil','not','or','return','then','true','while','repeat','until']);
const LUA_BI = new Set(['print','pairs','ipairs','setmetatable','getmetatable','tostring','tonumber','type','error','assert','math','string']);
const LUA_TOK = /(--.*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)|([\s\S])/g;
function hlLua(src){
  return src.replace(LUA_TOK, (m,c,s,n,w,o) => {
    if (c) return '<span class="cm">'+esc(c)+'</span>';
    if (s) return '<span class="st">'+esc(s)+'</span>';
    if (n) return '<span class="nm">'+n+'</span>';
    if (w) return LUA_KW.has(w) ? '<span class="kw">'+w+'</span>' : (LUA_BI.has(w) ? '<span class="bi">'+w+'</span>' : esc(w));
    return esc(o);
  });
}

class LuaError extends Error { constructor(msg, line, kind){ super(msg); this.line = line; this.kind = kind || 'Runtime error'; } }
const FIX = {
  'Unclosed block':'Add the matching end keyword for this block.',
  'Mismatched bracket':'Make the closing bracket match the opening one.',
  'Unclosed bracket':'Add the matching closing bracket.',
  'Unclosed string':'Add the closing quote at the end of the string.',
  'Invalid name':'Use letters, digits, and underscores, and avoid keywords.',
  'Missing keyword':'Add the keyword the message names.',
  'Unclosed table':'Add a closing } for this table.',
  'Syntax error':'Check the code on this line.',
  'Runtime error':'Check the values used on this line.',
  'Invalid character':'Remove the character or replace it with a valid symbol.',
  'Unsupported':'Use a while loop instead.'
};
function lex(src){
  const T = []; let i = 0, line = 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '-' && src[i+1] === '-') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (/[A-Za-z_]/.test(c)) { let j = i; while (j < src.length && /\w/.test(src[j])) j++; const w = src.slice(i, j); T.push({t: LUA_KW.has(w) ? w : 'name', v: w, line}); i = j; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++; T.push({t:'num', v:parseFloat(src.slice(i,j)), line}); i = j; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c && src[j] !== '\n') {
        if (src[j] === '\\') { const n = src[j+1]; s += n === 'n' ? '\n' : n === 't' ? '\t' : n; j += 2; }
        else s += src[j++];
      }
      if (src[j] !== c) throw new LuaError('This string is never closed. Add a ' + c + ' at the end of it.', line, 'Unclosed string');
      T.push({t:'str', v:s, line}); i = j + 1; continue;
    }
    const two = src.substr(i, 2);
    if (['..','==','~=','<=','>='].includes(two)) { T.push({t:two, v:two, line}); i += 2; continue; }
    if ('+-*/%^#<>=(){}[];:,.'.includes(c)) { T.push({t:c, v:c, line}); i++; continue; }
    throw new LuaError("'" + c + "' is not a symbol Lua++ understands.", line, 'Invalid character');
  }
  T.push({t:'eof', line}); return T;
}

class Parser {
  constructor(T){ this.T = T; this.p = 0; }
  get pk(){ return this.T[this.p]; }
  nx(){ return this.T[this.p++]; }
  is(t){ return this.pk.t === t; }
  acc(t){ if (this.is(t)) return this.nx(); return null; }
  want(t, msg, kind){ if (this.is(t)) return this.nx(); throw new LuaError(msg || ("Expected '" + t + "' here."), this.pk.line, kind || 'Syntax error'); }
  name(){
    const tk = this.pk;
    if (tk.t === 'name') return this.nx().v;
    if (tk.t === 'num') throw new LuaError("'" + tk.v + "' can't start a variable name. Names must begin with a letter or _.", tk.line, 'Invalid name');
    if (LUA_KW.has(tk.t)) throw new LuaError("'" + tk.t + "' is a reserved keyword and can't be used as a name.", tk.line, 'Invalid name');
    throw new LuaError('Expected a name here.', tk.line, 'Syntax error');
  }
  chunk(){ const b = this.block(['eof']); this.want('eof', 'Unexpected code after the end of the program.'); return b; }
  block(stops){
    const out = [];
    while (!stops.includes(this.pk.t) && !this.is('eof')) { if (this.acc(';')) continue; out.push(this.stat()); }
    return out;
  }
  endBlock(line, opener){
    if (this.is('end')) { this.nx(); return; }
    if (this.is('eof')) throw new LuaError('Missing end for the ' + opener + ' block that starts on line ' + line + '.', line, 'Unclosed block');
    throw new LuaError("Expected 'end' to close the " + opener + ' on line ' + line + '.', this.pk.line, 'Unclosed block');
  }
  funcBody(line, isMethod){
    const params = isMethod ? ['self'] : [];
    this.want('(', "Expected '(' after the function name.");
    if (!this.is(')')) { do { params.push(this.name()); } while (this.acc(',')); }
    this.want(')', "Missing ')' after the parameters.");
    const body = this.block(['end']);
    this.endBlock(line, 'function');
    return {params, body, line};
  }
  stat(){
    const tk = this.pk, line = tk.line;
    switch (tk.t) {
      case 'local': {
        this.nx();
        if (this.acc('function')) { const n = this.name(); return {k:'localfn', name:n, f:this.funcBody(line, false), line}; }
        const names = [this.name()]; while (this.acc(',')) names.push(this.name());
        let exprs = []; if (this.acc('=')) exprs = this.exprList();
        return {k:'local', names, exprs, line};
      }
      case 'function': {
        this.nx();
        let target = {k:'name', name:this.name(), line}, isMethod = false;
        while (this.is('.') || this.is(':')) {
          const sep = this.nx().t, key = this.name();
          target = {k:'index', obj:target, key:{k:'lit', v:key, line}, line};
          if (sep === ':') { isMethod = true; break; }
        }
        return {k:'assign', targets:[target], exprs:[{k:'func', f:this.funcBody(line, isMethod), line}], line};
      }
      case 'if': {
        this.nx(); const clauses = [];
        const cond = this.expr();
        this.want('then', "Missing 'then': put the keyword 'then' after this if condition (line " + line + ').', 'Missing keyword');
        clauses.push({cond, body:this.block(['elseif','else','end'])});
        while (this.acc('elseif')) {
          const c2 = this.expr();
          this.want('then', "Missing 'then' after this elseif condition.", 'Missing keyword');
          clauses.push({cond:c2, body:this.block(['elseif','else','end'])});
        }
        let elseBody = null;
        if (this.acc('else')) elseBody = this.block(['end']);
        this.endBlock(line, 'if');
        return {k:'if', clauses, elseBody, line};
      }
      case 'while': {
        this.nx(); const cond = this.expr();
        this.want('do', "Missing 'do': put 'do' after the while condition (line " + line + ').', 'Missing keyword');
        const body = this.block(['end']); this.endBlock(line, 'while');
        return {k:'while', cond, body, line};
      }
      case 'for': {
        this.nx(); const n1 = this.name();
        if (this.acc('=')) {
          const start = this.expr(); this.want(',', "Missing ',' between the for values.");
          const limit = this.expr(); let step = null; if (this.acc(',')) step = this.expr();
          this.want('do', "Missing 'do' after the for loop header (line " + line + ').', 'Missing keyword');
          const body = this.block(['end']); this.endBlock(line, 'for');
          return {k:'numfor', name:n1, start, limit, step, body, line};
        }
        const names = [n1]; while (this.acc(',')) names.push(this.name());
        this.want('in', "Missing 'in' in the for loop (line " + line + ').', 'Missing keyword');
        const exprs = this.exprList();
        this.want('do', "Missing 'do' after the for loop (line " + line + ').', 'Missing keyword');
        const body = this.block(['end']); this.endBlock(line, 'for');
        return {k:'genfor', names, exprs, body, line};
      }
      case 'return': {
        this.nx(); let exprs = [];
        if (!['end','else','elseif','eof',';'].includes(this.pk.t)) exprs = this.exprList();
        this.acc(';'); return {k:'return', exprs, line};
      }
      case 'break': this.nx(); return {k:'break', line};
      case 'do': { this.nx(); const body = this.block(['end']); this.endBlock(line, 'do'); return {k:'do', body, line}; }
      default: {
        const e = this.suffixed();
        if (this.is('=') || this.is(',')) {
          const targets = [e]; while (this.acc(',')) targets.push(this.suffixed());
          this.want('=', 'Expected = in this assignment.');
          const exprs = this.exprList();
          for (const t of targets) if (t.k !== 'name' && t.k !== 'index') throw new LuaError('You can only assign to a variable or a table field.', line, 'Syntax error');
          return {k:'assign', targets, exprs, line};
        }
        if (e.k === 'call' || e.k === 'mcall') return {k:'callstat', e, line};
        throw new LuaError("This line doesn't do anything. Did you mean to call a function, like print(...)?", line, 'Syntax error');
      }
    }
  }
  exprList(){ const a = [this.expr()]; while (this.acc(',')) a.push(this.expr()); return a; }
  expr(){ return this.bin(0); }
  bin(lvl){
    const LV = [['or'],['and'],['<','>','<=','>=','~=','=='],['..'],['+','-'],['*','/','%']];
    if (lvl >= LV.length) return this.unary();
    let left = this.bin(lvl + 1);
    while (LV[lvl].includes(this.pk.t)) {
      const op = this.nx();
      const right = op.t === '..' ? this.bin(lvl) : this.bin(lvl + 1);
      left = {k:'bin', op:op.t, l:left, r:right, line:op.line};
    }
    return left;
  }
  unary(){
    if (['not','-','#'].includes(this.pk.t)) { const op = this.nx(); return {k:'un', op:op.t, e:this.unary(), line:op.line}; }
    return this.pow();
  }
  pow(){
    const b = this.suffixed();
    if (this.is('^')) { const op = this.nx(); return {k:'bin', op:'^', l:b, r:this.unary(), line:op.line}; }
    return b;
  }
  suffixed(){
    let e = this.primary();
    for (;;) {
      const tk = this.pk;
      if (tk.t === '.') { this.nx(); e = {k:'index', obj:e, key:{k:'lit', v:this.name(), line:tk.line}, line:tk.line}; }
      else if (tk.t === '[') { this.nx(); const key = this.expr(); this.want(']', "Missing ']' to close the table index."); e = {k:'index', obj:e, key, line:tk.line}; }
      else if (tk.t === ':') { this.nx(); const name = this.name(); const args = this.args(); e = {k:'mcall', obj:e, name, args, line:tk.line}; }
      else if (tk.t === '(') { const args = this.args(); e = {k:'call', fn:e, args, line:tk.line}; }
      else break;
    }
    return e;
  }
  args(){
    this.want('(', "Expected '(' to start the arguments.");
    const a = [];
    if (!this.is(')')) { do { a.push(this.expr()); } while (this.acc(',')); }
    this.want(')', "Missing ')' to close this function call. Check your parentheses.");
    return a;
  }
  primary(){
    const tk = this.pk, line = tk.line;
    switch (tk.t) {
      case 'num': case 'str': this.nx(); return {k:'lit', v:tk.v, line};
      case 'true': this.nx(); return {k:'lit', v:true, line};
      case 'false': this.nx(); return {k:'lit', v:false, line};
      case 'nil': this.nx(); return {k:'lit', v:null, line};
      case 'name': this.nx(); return {k:'name', name:tk.v, line};
      case '(': { this.nx(); const e = this.expr(); this.want(')', "Missing ')' to close the parenthesis from line " + line + '.'); return e; }
      case '{': return this.table();
      case 'function': { this.nx(); return {k:'func', f:this.funcBody(line, false), line}; }
      default: throw new LuaError("Unexpected '" + (tk.v !== undefined ? tk.v : tk.t) + "' here. Check the code just before it.", line, 'Syntax error');
    }
  }
  table(){
    const line = this.nx().line; const items = [];
    while (!this.is('}')) {
      if (this.is('eof')) throw new LuaError("Missing '}' to close the table that starts on line " + line + '.', line, 'Unclosed table');
      if (this.acc('[')) { const k = this.expr(); this.want(']'); this.want('='); items.push({key:k, val:this.expr()}); }
      else if (this.is('name') && this.T[this.p+1].t === '=') { const n = this.nx().v; this.nx(); items.push({key:{k:'lit', v:n, line}, val:this.expr()}); }
      else items.push({key:null, val:this.expr()});
      if (!this.acc(',') && !this.acc(';')) break;
    }
    this.want('}', "Missing '}' to close the table that starts on line " + line + '.', 'Unclosed table');
    return {k:'table', items, line};
  }
}

class Table {
  constructor(){ this.m = new Map(); this.meta = null; }
  get(k){
    if (k === null || k === undefined) return null;
    if (this.m.has(k)) return this.m.get(k);
    if (this.meta) {
      const idx = this.meta.m.get('__index');
      if (idx instanceof Table) return idx.get(k);
      if (idx) return callFn(idx, [this, k]);
    }
    return null;
  }
  set(k, v){
    if (k === null || k === undefined) throw new LuaError("A table key can't be nil.", CUR_LINE, 'Runtime error');
    if (v === null || v === undefined) this.m.delete(k); else this.m.set(k, v);
  }
  len(){ let n = 0; while (this.m.has(n + 1)) n++; return n; }
}
class LFunc { constructor(def, env){ this.def = def; this.env = env; } }
class Env { constructor(p){ this.v = new Map(); this.p = p; } find(n){ let e = this; while (e) { if (e.v.has(n)) return e; e = e.p; } return null; } }

let OUT = [], STEPS = 0, CUR_LINE = 1, GLOBAL = null, IDS = 0;
const STEP_LIMIT = 200000;
function tick(){ if (++STEPS > STEP_LIMIT) throw new LuaError('Stopped after 200,000 steps. This usually means an infinite loop: check your while condition.', CUR_LINE, 'Runtime error'); }
function typeName(v){
  if (v === null || v === undefined) return 'nil';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'boolean') return 'boolean';
  if (v instanceof Table) return 'table';
  return 'function';
}
function tstr(v){
  if (v === null || v === undefined) return 'nil';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(+v.toFixed(6));
  if (typeof v === 'string') return v;
  if (v instanceof Table) {
    const ts = v.meta && v.meta.m.get('__tostring');
    if (ts) return tstr(callFn(ts, [v]));
    if (!v.id) v.id = '0x' + (++IDS).toString(16).padStart(6, '0');
    return 'table: ' + v.id;
  }
  return 'function';
}
function truthy(v){ return v !== null && v !== undefined && v !== false; }
function num(v, op){
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(+v)) return +v;
  throw new LuaError("Can't use '" + op + "' with a " + typeName(v) + ' value. Make sure the variable holds a number.', CUR_LINE, 'Runtime error');
}
function binop(op, a, b){
  switch (op) {
    case '+': return num(a, op) + num(b, op);
    case '-': return num(a, op) - num(b, op);
    case '*': return num(a, op) * num(b, op);
    case '/': return num(a, op) / num(b, op);
    case '%': { const x = num(a, op), y = num(b, op); return x - Math.floor(x / y) * y; }
    case '^': return Math.pow(num(a, op), num(b, op));
    case '..': return tstr(a) + tstr(b);
    case '==': return a === b;
    case '~=': return a !== b;
    case '<': case '>': case '<=': case '>=': {
      if (typeof a !== typeof b || (typeof a !== 'number' && typeof a !== 'string')) throw new LuaError("Can't compare a " + typeName(a) + ' with a ' + typeName(b) + '.', CUR_LINE, 'Runtime error');
      return op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b;
    }
  }
  throw new LuaError('Unknown operator ' + op, CUR_LINE, 'Runtime error');
}
function callFn(fn, args, line){
  if (typeof fn === 'function') return fn(args);
  if (!(fn instanceof LFunc)) throw new LuaError("Can't call this: it is a " + typeName(fn) + ' value, not a function.', line || CUR_LINE, 'Runtime error');
  tick();
  const env = new Env(fn.env);
  fn.def.params.forEach((p, i) => env.v.set(p, args[i] === undefined ? null : args[i]));
  const sig = execBlock(fn.def.body, env);
  return sig && sig.t === 'ret' ? sig.v : null;
}
function ev(n, env){
  if (n.line) CUR_LINE = n.line;
  switch (n.k) {
    case 'lit': return n.v;
    case 'name': { const s = env.find(n.name); return s ? s.v.get(n.name) : null; }
    case 'index': {
      const o = ev(n.obj, env), k = ev(n.key, env);
      if (!(o instanceof Table)) throw new LuaError("Can't read a field from a " + typeName(o) + ' value. Check the variable name for typos.', n.line, 'Runtime error');
      return o.get(k);
    }
    case 'call': case 'mcall': return callNode(n, env);
    case 'bin': {
      if (n.op === 'and') { const a = ev(n.l, env); return truthy(a) ? ev(n.r, env) : a; }
      if (n.op === 'or') { const a = ev(n.l, env); return truthy(a) ? a : ev(n.r, env); }
      return binop(n.op, ev(n.l, env), ev(n.r, env));
    }
    case 'un': {
      const v = ev(n.e, env);
      if (n.op === 'not') return !truthy(v);
      if (n.op === '-') return -num(v, '-');
      if (typeof v === 'string') return v.length;
      if (v instanceof Table) return v.len();
      throw new LuaError("Can't use '#' on a " + typeName(v) + ' value.', n.line, 'Runtime error');
    }
    case 'table': {
      const t = new Table(); let i = 1;
      for (const it of n.items) { if (it.key) t.set(ev(it.key, env), ev(it.val, env)); else t.set(i++, ev(it.val, env)); }
      return t;
    }
    case 'func': return new LFunc(n.f, env);
  }
  throw new LuaError('Unknown expression.', n.line, 'Runtime error');
}
function callNode(n, env){
  let fn, args;
  if (n.k === 'mcall') {
    const o = ev(n.obj, env);
    if (!(o instanceof Table)) throw new LuaError("Can't call the method '" + n.name + "' on a " + typeName(o) + ' value.', n.line, 'Runtime error');
    fn = o.get(n.name); args = [o, ...n.args.map(a => ev(a, env))];
  } else {
    fn = ev(n.fn, env); args = n.args.map(a => ev(a, env));
  }
  if (fn === null || fn === undefined || (typeof fn !== 'function' && !(fn instanceof LFunc))) {
    throw new LuaError("Can't call this: it is a " + typeName(fn) + ' value, not a function. Check the spelling of the name.', n.line, 'Runtime error');
  }
  return callFn(fn, args, n.line);
}
function execBlock(stmts, env){
  for (const s of stmts) { const sig = exec(s, env); if (sig) return sig; }
  return null;
}
function assignTo(t, v, env){
  if (t.k === 'name') { const sc = env.find(t.name); (sc || GLOBAL).v.set(t.name, v); return; }
  const o = ev(t.obj, env), k = ev(t.key, env);
  if (!(o instanceof Table)) throw new LuaError("Can't store a field in a " + typeName(o) + ' value.', t.line, 'Runtime error');
  o.set(k, v);
}
function exec(s, env){
  CUR_LINE = s.line; tick();
  switch (s.k) {
    case 'local': {
      const vals = s.exprs.map(e => ev(e, env));
      s.names.forEach((nm, i) => env.v.set(nm, vals[i] === undefined ? null : vals[i]));
      return null;
    }
    case 'localfn': { env.v.set(s.name, null); env.v.set(s.name, new LFunc(s.f, env)); return null; }
    case 'assign': {
      const vals = s.exprs.map(e => ev(e, env));
      s.targets.forEach((t, i) => assignTo(t, vals[i] === undefined ? null : vals[i], env));
      return null;
    }
    case 'if': {
      for (const c of s.clauses) if (truthy(ev(c.cond, env))) return execBlock(c.body, new Env(env));
      if (s.elseBody) return execBlock(s.elseBody, new Env(env));
      return null;
    }
    case 'while': {
      while (truthy(ev(s.cond, env))) {
        tick();
        const sig = execBlock(s.body, new Env(env));
        if (sig) { if (sig.t === 'brk') break; return sig; }
      }
      return null;
    }
    case 'numfor': {
      const a = num(ev(s.start, env), 'for'), b = num(ev(s.limit, env), 'for');
      const st = s.step ? num(ev(s.step, env), 'for') : 1;
      if (st === 0) throw new LuaError("The 'for' step can't be 0.", s.line, 'Runtime error');
      for (let v = a; st > 0 ? v <= b : v >= b; v += st) {
        tick();
        const e2 = new Env(env); e2.v.set(s.name, v);
        const sig = execBlock(s.body, e2);
        if (sig) { if (sig.t === 'brk') break; return sig; }
      }
      return null;
    }
    case 'genfor': {
      const vals = [];
      s.exprs.forEach(e => { const v = ev(e, env); if (Array.isArray(v)) vals.push(...v); else vals.push(v); });
      const f = vals[0], st = vals[1] === undefined ? null : vals[1];
      let ctl = vals[2] === undefined ? null : vals[2];
      if (typeof f !== 'function' && !(f instanceof LFunc)) throw new LuaError('The for loop needs pairs(...) or ipairs(...) after in.', s.line, 'Runtime error');
      for (;;) {
        tick();
        const r = callFn(f, [st, ctl], s.line);
        const arr = Array.isArray(r) ? r : [r];
        if (arr[0] === null || arr[0] === undefined) break;
        ctl = arr[0];
        const e2 = new Env(env);
        s.names.forEach((nm, i) => e2.v.set(nm, arr[i] === undefined ? null : arr[i]));
        const sig = execBlock(s.body, e2);
        if (sig) { if (sig.t === 'brk') break; return sig; }
      }
      return null;
    }
    case 'return': return { t:'ret', v: s.exprs.length ? ev(s.exprs[0], env) : null };
    case 'break': return { t:'brk' };
    case 'do': return execBlock(s.body, new Env(env));
    case 'callstat': ev(s.e, env); return null;
  }
  throw new LuaError('Unknown statement.', s.line, 'Runtime error');
}
function installGlobals(g){
  const set = (n, v) => g.v.set(n, v);
  set('print', a => { OUT.push({t:'out', s: a.map(tstr).join('\t')}); return null; });
  set('type', a => typeName(a[0]));
  set('tostring', a => tstr(a[0]));
  set('tonumber', a => { const n = parseFloat(a[0]); return isNaN(n) ? null : n; });
  set('error', a => { throw new LuaError(tstr(a[0]), CUR_LINE, 'Error'); });
  set('assert', a => { if (!truthy(a[0])) throw new LuaError(a[1] !== undefined ? tstr(a[1]) : 'Assertion failed!', CUR_LINE, 'Assertion failed'); return a[0]; });
  set('setmetatable', a => { if (!(a[0] instanceof Table)) throw new LuaError('setmetatable needs a table as its first value.', CUR_LINE, 'Runtime error'); a[0].meta = a[1] || null; return a[0]; });
  set('getmetatable', a => (a[0] instanceof Table && a[0].meta) ? a[0].meta : null);
  set('pairs', a => {
    const t = a[0];
    if (!(t instanceof Table)) throw new LuaError('pairs needs a table, but got a ' + typeName(t) + '.', CUR_LINE, 'Runtime error');
    const entries = [...t.m.entries()]; let i = 0;
    return [() => { if (i >= entries.length) return null; const e = entries[i++]; return [e[0], e[1]]; }, t, null];
  });
  set('ipairs', a => {
    const t = a[0];
    if (!(t instanceof Table)) throw new LuaError('ipairs needs a table, but got a ' + typeName(t) + '.', CUR_LINE, 'Runtime error');
    let i = 0;
    return [() => { i++; const v = t.get(i); return v === null ? null : [i, v]; }, t, null];
  });
  const num1 = (a, op) => num(a[0], op);
  const M = new Table();
  M.set('pi', Math.PI);
  M.set('floor', a => Math.floor(num1(a, 'floor')));
  M.set('ceil', a => Math.ceil(num1(a, 'ceil')));
  M.set('abs', a => Math.abs(num1(a, 'abs')));
  M.set('sqrt', a => Math.sqrt(num1(a, 'sqrt')));
  M.set('max', a => Math.max(...a.map(x => num(x, 'max'))));
  M.set('min', a => Math.min(...a.map(x => num(x, 'min'))));
  M.set('random', () => Math.random());
  set('math', M);
  const SS = new Table();
  SS.set('len', a => String(a[0]).length);
  SS.set('upper', a => String(a[0]).toUpperCase());
  SS.set('lower', a => String(a[0]).toLowerCase());
  SS.set('rep', a => String(a[0]).repeat(num(a[1], 'rep')));
  set('string', SS);
}

function runLua(src){
  OUT = []; STEPS = 0; CUR_LINE = 1; IDS = 0;
  GLOBAL = new Env(null);
  installGlobals(GLOBAL);
  const ast = new Parser(lex(src)).chunk();
  execBlock(ast, GLOBAL);
  return OUT;
}

const CLOSE_OF = {'(':')','[':']','{':'}'};
function issue(line, type, msg){ return {line, type, msg, fix: FIX[type] || FIX['Syntax error']}; }
function lintLua(src){
  const out = [];
  let T;
  try { T = lex(src); }
  catch (e) { if (e instanceof LuaError) return [issue(e.line, e.kind, e.message)]; throw e; }
  const open = [], pairs = {')':'(', ']':'[', '}':'{'};
  for (const tk of T) {
    if (tk.t === '(' || tk.t === '[' || tk.t === '{') open.push(tk);
    else if (pairs[tk.t]) {
      const top = open[open.length - 1];
      if (!top) out.push(issue(tk.line, 'Mismatched bracket', "'" + tk.t + "' has no matching opening bracket."));
      else {
        if (top.t !== pairs[tk.t]) out.push(issue(tk.line, 'Mismatched bracket', "'" + tk.t + "' doesn't match the '" + top.t + "' from line " + top.line + '. Use ' + CLOSE_OF[top.t] + ' there.'));
        open.pop();
      }
    }
  }
  for (const tk of open) out.push(issue(tk.line, 'Unclosed bracket', "'" + tk.t + "' on line " + tk.line + ' is never closed.'));
  try { new Parser(T).chunk(); }
  catch (e) {
    if (!(e instanceof LuaError)) throw e;
    if (!out.some(x => x.line === e.line && x.msg === e.message)) out.push(issue(e.line, e.kind, e.message));
  }
  return out.sort((a, b) => a.line - b.line);
}
