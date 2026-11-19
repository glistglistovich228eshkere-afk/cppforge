/* App logic: editor, lessons, playground, settings, Android bridge. */
const APP_VERSION = window.AndroidBridge ? window.AndroidBridge.getVersion() : 'web preview';
const LH = 22;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const store = {
  get(k, d){ try { const v = localStorage.getItem('cf.' + k); return v === null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem('cf.' + k, JSON.stringify(v)); } catch(e){} }
};
const SETTINGS_DEFAULT = { theme:'obsidian', blur:'balanced', orbs:true, font:14, lineNums:true, autoClose:true, lint:true, tab:4 };
let S = Object.assign({}, SETTINGS_DEFAULT, store.get('settings', {}));
function saveSettings(){ store.set('settings', S); }

const CPP_KW = new Set(['include','int','double','float','bool','char','auto','void','return','if','else','for','while','class','struct','public','private','const','using','namespace','enum']);
const CPP_TOK = /(\/\/.*)|("(?:\\.|[^"\\])*")|(#\w+)|(\b\w+\b)|([\s\S])/g;
function hlCpp(src){
  return src.replace(CPP_TOK, (m,c,s,p,w,o) => {
    if (c) return '<span class="cm">'+esc(c)+'</span>';
    if (s) return '<span class="st">'+esc(s)+'</span>';
    if (p) return '<span class="pp">'+esc(p)+'</span>';
    if (w) return CPP_KW.has(w) ? '<span class="kw">'+w+'</span>' : esc(w);
    return esc(o);
  });
}

function makeEditor(mount, opts){
  mount.innerHTML = '<div class="ed"><div class="gut"></div><div class="wrap"><div class="band"></div><div class="uls"></div><pre class="hl" aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Code editor"></textarea></div></div>';
  const gut = mount.querySelector('.gut'), wrap = mount.querySelector('.wrap');
  const band = mount.querySelector('.band'), uls = mount.querySelector('.uls'), hl = mount.querySelector('.hl'), ta = mount.querySelector('textarea');
  mount.style.setProperty('--fs', S.font + 'px');
  mount.style.setProperty('--tab', S.tab);
  let errLines = new Set();

  function refresh(){
    const src = ta.value, n = src.split('\n').length;
    hl.innerHTML = opts.hl(src) + '\n';
    const h = n * LH + 24 + 'px';
    ta.style.height = hl.style.height = wrap.style.height = h;
    gut.innerHTML = Array.from({length:n}, (_,i) => '<div class="' + (errLines.has(i+1) ? 'e' : '') + '" data-l="' + (i+1) + '">' + (i+1) + '</div>').join('');
    uls.innerHTML = Array.from(errLines).map(l => '<div class="uline" style="top:' + (12 + (l-1)*LH) + 'px"></div>').join('');
    moveBand();
    if (opts.onChange) opts.onChange(src);
  }
  function cursor(){
    const s = ta.selectionStart, before = ta.value.slice(0, s);
    return { line: before.split('\n').length, col: s - (before.lastIndexOf('\n') + 1) + 1 };
  }
  function moveBand(){
    const c = cursor();
    band.style.top = (12 + (c.line-1) * LH) + 'px';
    gut.querySelectorAll('div').forEach(d => d.classList.toggle('on', +d.dataset.l === c.line));
    if (opts.onCursor) opts.onCursor(c.line, c.col);
  }
  function setValue(v){ ta.value = v; ta.selectionStart = ta.selectionEnd = 0; refresh(); }
  function setCaret(pos){ ta.selectionStart = ta.selectionEnd = pos; moveBand(); }
  function edit(v, caret){ ta.value = v; setCaret(caret); refresh(); }
  const indentUnit = () => ' '.repeat(S.tab);

  const PAIRS = {'(':')','[':']','{':'}','"':'"',"'":"'"};
  const CLOSERS = [')',']','}','"',"'"];
  ta.addEventListener('keydown', e => {
    const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (opts.onRun) opts.onRun(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (opts.onSave) opts.onSave(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        const m = v.slice(ls).match(new RegExp('^ {1,' + S.tab + '}'));
        if (m) edit(v.slice(0, ls) + v.slice(ls + m[0].length), Math.max(ls, s - m[0].length));
      } else edit(v.slice(0, s) + indentUnit() + v.slice(en), s + S.tab);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      const indent = v.slice(ls).match(/^ */)[0];
      const before = v[s-1], after = v[en];
      if (before === '{' && after === '}') {
        const ins = '\n' + indent + indentUnit() + '\n' + indent;
        edit(v.slice(0, s) + ins + v.slice(en), s + 1 + indent.length + S.tab);
      } else {
        const extra = (before === '{' || /\b(then|do|function)$/.test(v.slice(0, s).trimEnd())) ? indentUnit() : '';
        const ins = '\n' + indent + extra;
        edit(v.slice(0, s) + ins + v.slice(en), s + ins.length);
      }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (CLOSERS.includes(e.key) && s === en && v[s] === e.key) { e.preventDefault(); setCaret(s + 1); return; }
    if (S.autoClose && PAIRS[e.key]) {
      e.preventDefault();
      if (s !== en) {
        edit(v.slice(0, s) + e.key + v.slice(s, en) + PAIRS[e.key] + v.slice(en), s + 1);
        ta.selectionStart = s + 1; ta.selectionEnd = en + 1; moveBand();
      } else edit(v.slice(0, s) + e.key + PAIRS[e.key] + v.slice(en), s + 1);
    }
  });
  ta.addEventListener('input', refresh);
  ['click','keyup','select'].forEach(ev => ta.addEventListener(ev, moveBand));
  gut.addEventListener('click', e => { const d = e.target.closest('div[data-l]'); if (d && errLines.has(+d.dataset.l) && opts.onGutterError) opts.onGutterError(+d.dataset.l); });
  gut.classList.toggle('off', !S.lineNums);

  return {
    get value(){ return ta.value; }, setValue,
    focus(){ ta.focus(); },
    goto(line){
      const lines = ta.value.split('\n'); let pos = 0;
      for (let i = 0; i < Math.min(line - 1, lines.length); i++) pos += lines[i].length + 1;
      ta.focus(); ta.selectionStart = ta.selectionEnd = pos; moveBand();
      const scroller = mount.closest('.editor') || mount;
      scroller.scrollTop = Math.max(0, (line - 3) * LH);
    },
    setErrors(lines){ errLines = new Set(lines); refresh(); },
    setFont(px){ mount.style.setProperty('--fs', px + 'px'); },
    setTab(n){ mount.style.setProperty('--tab', n); },
    setLineNums(on){ gut.classList.toggle('off', !on); }
  };
}

function cppLint(code){
  const issues = [], c = code.replace(/"(?:\\.|[^"\\])*"/g,'""').replace(/\/\/.*/g,''), lines = c.split('\n');
  const cnt = (s, ch) => s.split(ch).length - 1;
  [['(',')'],['[',']'],['{','}']].forEach(([a,b]) => { if (cnt(c,a) !== cnt(c,b)) issues.push(issue(1, 'Unclosed bracket', 'Brackets "' + a + b + '" are not balanced. Check that each opening bracket has a closing one.')); });
  lines.forEach((ln, i) => {
    const s = ln.trim();
    if (!s || s.startsWith('#') || /[;{}:,]$/.test(s)) return;
    if (/^(if|for|while|else|switch|class|struct|namespace)\b/.test(s) || /[(=+\-<&|]$/.test(s)) return;
    const nxt = (lines.slice(i+1).find(l => l.trim()) || '').trim();
    if (nxt.startsWith('{')) return;
    issues.push(issue(i+1, 'Syntax error', "Did you forget a ';' at the end of this line?"));
  });
  [['std::cout','iostream'],['std::cin','iostream'],['std::vector','vector'],['std::string','string'],['std::map','map'],['std::unique_ptr','memory'],['std::make_unique','memory'],['std::thread','thread']].forEach(([t,h]) => {
    if (code.includes(t) && !code.includes('<' + h + '>')) issues.push(issue(1, 'Syntax error', 'You use ' + t + ' but have no #include <' + h + '>.'));
  });
  return issues;
}
function missing(code, must){ const sq = s => s.replace(/\s+/g,''); const c = sq(code); return must.filter(m => !c.includes(sq(m))); }

function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2400);
}
function copyText(text, msg){
  const ok = () => toast(msg || 'Copied');
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, () => fallbackCopy(text, ok));
  else fallbackCopy(text, ok);
}
function fallbackCopy(text, cb){
  const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
  try { document.execCommand('copy'); } catch(e){} t.remove(); cb();
}
function twoStep(btn, onConfirm){
  if (!btn.classList.contains('armed')) {
    btn.classList.add('armed'); clearTimeout(btn._t);
    btn._t = setTimeout(() => btn.classList.remove('armed'), 3000);
    return;
  }
  btn.classList.remove('armed'); clearTimeout(btn._t); onConfirm();
}
function openModal(id){ $('scrim').classList.add('show'); $(id).classList.add('show'); }
function closeAll(){ document.querySelectorAll('.modal,.sheet').forEach(m => m.classList.remove('show')); $('scrim').classList.remove('show'); }

function applySettings(){
  const root = document.documentElement;
  root.dataset.theme = S.theme;
  root.dataset.blur = S.blur;
  root.classList.toggle('still', !S.orbs);
  document.querySelectorAll('[data-theme-pick]').forEach(b => b.classList.toggle('on', b.dataset.themePick === S.theme));
  $('glassControls').style.display = S.theme === 'glass' ? 'block' : 'none';
  $('blurSel').value = S.blur; $('orbToggle').checked = S.orbs;
  $('fsRange').value = S.font; $('fsLabel').textContent = S.font + 'px';
  $('tabSel').value = String(S.tab);
  $('lnToggle').checked = S.lineNums; $('acToggle').checked = S.autoClose; $('lintToggle').checked = S.lint;
  [lessonEd, playEd].forEach(ed => { if (ed) { ed.setFont(S.font); ed.setTab(S.tab); ed.setLineNums(S.lineNums); } });
}

/* Lessons: C++ and Lua tracks */
let track = store.get('track', 'cpp');
const doneSets = { cpp: new Set(store.get('done', [])), lua: new Set(store.get('doneLua', [])) };
const LESSONS = () => track === 'lua' ? LUA_LESSONS : CPP_LESSONS;
const D = () => doneSets[track];
let cur = 0;
let lessonEd = null;
let saveT = null;
const codeKey = () => 'code.' + track + '.' + LESSONS()[cur].id;
function unlocked(i){ return i === 0 || D().has(i-1) || D().has(i); }
function saveDone(){ store.set(track === 'lua' ? 'doneLua' : 'done', [...D()]); }
function saveLessonCode(){ if (lessonEd) store.set(codeKey(), lessonEd.value); }
function firstOpen(){
  const list = LESSONS();
  const i = list.findIndex((L, idx) => unlocked(idx) && !D().has(idx));
  return i < 0 ? list.length - 1 : i;
}
function mountLessonEditor(){
  const lua = track === 'lua';
  lessonEd = makeEditor($('lEd'), {
    hl: lua ? hlLua : hlCpp,
    onChange: () => { clearTimeout(saveT); saveT = setTimeout(saveLessonCode, 400); }
  });
}
function loadLessonCode(){
  lessonEd.setValue(store.get(codeKey(), track === 'lua' ? LUA_STARTER : DEFAULT_STARTER));
}
function renderList(){
  const list = LESSONS();
  let html = '', last = '';
  list.forEach((L, i) => {
    if (L.sec !== last) { html += '<div class="sec">' + esc(L.sec) + '</div>'; last = L.sec; }
    const ok = unlocked(i), isDone = D().has(i);
    html += '<button class="item ' + (isDone ? 'done ' : '') + (i === cur ? 'cur' : '') + '" data-i="' + i + '" ' + (ok ? '' : 'disabled') + '>' +
      '<span class="dot">' + (isDone ? '\u2713' : (ok ? (i+1) : '\u2022')) + '</span><span>' + esc(L.title) + '</span></button>';
  });
  $('list').innerHTML = html;
  $('progText').textContent = D().size + '/' + list.length;
  $('barFill').style.width = Math.round(100 * D().size / list.length) + '%';
  $('list').querySelectorAll('.item').forEach(b => b.onclick = () => { select(+b.dataset.i); if (isNarrow()) $('lessonView').classList.add('collapsed'); });
  $('tCpp').classList.toggle('on', track === 'cpp');
  $('tLua').classList.toggle('on', track === 'lua');
}
function renderReader(){
  const list = LESSONS(), L = list[cur], isDone = D().has(cur), hasNext = cur + 1 < list.length;
  const hl = track === 'lua' ? hlLua : hlCpp;
  $('reader').innerHTML = '<div class="kicker">' + (track === 'lua' ? 'Lua' : 'C++') + ' \u00b7 ' + esc(L.sec) + ' \u00b7 Lesson ' + (cur+1) + ' of ' + list.length + '</div>' +
    '<h1>' + esc(L.title) + '</h1><p class="lead">' + esc(L.intro) + '</p>' +
    '<div class="codebox"><pre>' + hl(L.code) + '</pre><button class="copy-mini" id="copyExample">Copy</button></div>' +
    '<div class="challenge"><h3>Challenge / Goal</h3><p>' + esc(L.goal) + '</p>' +
    '<div class="status ' + (isDone ? 'done' : '') + '">' + (isDone ? '\u2726 Completed' : 'Write your solution in the editor, then press Run.') + '</div></div>' +
    '<div class="nav-row">' + (hasNext && isDone ? '<button class="btn primary" id="nextBtn">Next lesson \u2192</button>' : '') + '</div>';
  $('copyExample').onclick = () => copyText(L.code, 'Example copied');
  const nb = $('nextBtn'); if (nb) nb.onclick = () => select(cur + 1);
}
function select(i){
  if (!unlocked(i)) return;
  saveLessonCode();
  cur = i;
  loadLessonCode();
  $('lDrawer').hidden = true; $('lHintText').textContent = ''; $('lSolText').hidden = true;
  renderList(); renderReader(); lOut.clear();
  lOut.line('Lesson loaded. Write your code and press Run.', 'info');
}
function setTrack(t){
  saveLessonCode();
  track = t; store.set('track', t);
  cur = firstOpen();
  mountLessonEditor(); loadLessonCode(); applySettings();
  renderList(); renderReader();
  lOut.clear(); lOut.line((t === 'lua' ? 'Lua' : 'C++') + ' track. Press Run to check your code.', 'info');
  $('sheetTitle').textContent = (t === 'lua' ? 'Lua' : 'C++') + ' quick reference';
  renderCheat($('cheatSearch').value);
}
const lOut = {
  clear(){ $('lOut').innerHTML = ''; },
  line(text, kind){ const d = document.createElement('div'); d.className = 'ln ' + (kind || 'info'); d.textContent = text; $('lOut').appendChild(d); $('lOut').scrollTop = 1e6; }
};
function runLesson(){
  const L = LESSONS()[cur], code = lessonEd.value;
  lOut.clear(); lOut.line('$ check ' + L.title, 'info');
  if (track === 'lua') {
    const issues = lintLua(code);
    if (issues.length) {
      issues.forEach(i => lOut.line('! Line ' + i.line + ': ' + i.msg, 'err'));
      lOut.line('Fix these first, then run again.', 'info');
      return;
    }
    lOut.line('No syntax errors found.', 'ok');
    const t0 = performance.now();
    try {
      const out = runLua(code);
      out.forEach(o => lOut.line(o.s, 'out'));
      if (!out.length) lOut.line('(no output)', 'info');
      lOut.line('Finished in ' + (performance.now() - t0).toFixed(2) + ' ms', 'info');
    } catch (e) {
      if (!(e instanceof LuaError)) throw e;
      lOut.line('! Line ' + e.line + ': ' + e.message, 'err');
      return;
    }
  } else {
    const issues = cppLint(code);
    if (issues.length) issues.forEach(i => lOut.line('! Line ' + i.line + ': ' + i.msg, 'err'));
    else lOut.line('No obvious problems found.', 'ok');
  }
  const miss = missing(code, L.must);
  if (miss.length === 0) {
    lOut.line('\u2726 Challenge passed!', 'ok');
    if (!D().has(cur)) {
      D().add(cur); saveDone();
      toast('Challenge complete. Next lesson unlocked.');
      const idx = cur;
      renderList(); renderReader();
      setTimeout(() => { const b = document.querySelector('.item[data-i="' + (idx+1) + '"]'); if (b) b.classList.add('unlock'); }, 150);
    }
  } else lOut.line('Not there yet. Keep going, or open the Hint.', 'err');
  if (track === 'cpp') lOut.line('Note: C++ is checked here, not compiled.', 'info');
}

/* Playground (Lua++) */
let playEd = null, playTimer = null, lastIssues = [];
const pOut = {
  clear(){ $('consoleOut').innerHTML = ''; },
  line(text, kind){ const d = document.createElement('div'); d.className = 'ln ' + (kind || 'info'); d.textContent = text; $('consoleOut').appendChild(d); }
};
function setProblems(list){
  lastIssues = list;
  const b = $('probBadge');
  b.textContent = list.length; b.classList.toggle('zero', list.length === 0);
  if (playEd) playEd.setErrors(list.map(i => i.line));
  renderProblems();
}
function renderProblems(){
  const box = $('probList');
  if (!lastIssues.length) { box.innerHTML = '<div class="empty">No problems. Nice work.</div>'; return; }
  box.innerHTML = lastIssues.map(p =>
    '<div class="card-err"><div class="top"><span class="type">' + esc(p.type) + '</span><span class="ln-no">Line ' + p.line + '</span></div>' +
    '<p>' + esc(p.msg) + '</p><div class="fix">' + esc(p.fix) + '</div>' +
    '<button class="btn sm" data-jump="' + p.line + '">Jump to line</button></div>').join('');
  box.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => playEd.goto(+b.dataset.jump));
}
function showTab(which){
  $('tabConsole').classList.toggle('on', which === 'console');
  $('tabProblems').classList.toggle('on', which === 'problems');
  $('paneConsole').hidden = which !== 'console';
  $('paneProblems').hidden = which !== 'problems';
}
function lintNow(){ const issues = lintLua(playEd.value); setProblems(issues); return issues; }
function scheduleLint(){
  if (!S.lint) return;
  clearTimeout(playTimer);
  playTimer = setTimeout(lintNow, 400);
}
function runPlayground(){
  const src = playEd.value;
  pOut.clear();
  const issues = lintLua(src);
  setProblems(issues);
  if (issues.length) {
    pOut.line('Not run: fix the ' + issues.length + ' problem' + (issues.length > 1 ? 's' : '') + ' first.', 'err');
    showTab('problems');
    return;
  }
  const t0 = performance.now();
  try {
    const out = runLua(src);
    out.forEach(o => pOut.line(o.s, 'out'));
    if (!out.length) pOut.line('(no output)', 'info');
    pOut.line('Finished in ' + (performance.now() - t0).toFixed(2) + ' ms', 'ok');
    showTab('console');
  } catch (e) {
    if (!(e instanceof LuaError)) throw e;
    pOut.line('Line ' + e.line + ': ' + e.message, 'err');
    pOut.line('Stopped after ' + (performance.now() - t0).toFixed(2) + ' ms', 'info');
    setProblems([issue(e.line, e.kind, e.message)]);
    showTab('problems');
  }
}
let saveTP = null;
function setupPlayground(){
  playEd = makeEditor($('pEd'), {
    hl: hlLua,
    onChange: () => { scheduleLint(); clearTimeout(saveTP); saveTP = setTimeout(() => store.set('pg.code', playEd.value), 400); },
    onCursor: (l, c) => { $('coords').textContent = 'Ln ' + l + ' : Col ' + c; },
    onRun: runPlayground,
    onSave: () => { store.set('pg.code', playEd.value); toast('Progress saved'); },
    onGutterError: l => { showTab('problems'); playEd.goto(l); }
  });
  playEd.setValue(store.get('pg.code', TEMPLATES.hello));
  setProblems(lintLua(playEd.value));
}

/* Mode, panels, overlays */
function setMode(m){
  document.documentElement.dataset.mode = m;
  $('app').dataset.mode = m;
  $('modeLessons').classList.toggle('on', m === 'lessons');
  $('modePlay').classList.toggle('on', m === 'play');
  store.set('mode', m);
  if (m === 'play' && playEd) setTimeout(() => playEd.focus(), 50);
}
const isNarrow = () => window.matchMedia('(max-width: 899px)').matches;
function renderCheat(q){
  const t = q.trim().toLowerCase(), src = track === 'lua' ? LUA_CHEAT : CPP_CHEAT;
  const rows = src.filter(r => !t || (r[0] + ' ' + r[1] + ' ' + r[2]).toLowerCase().includes(t));
  $('cheatList').innerHTML = rows.map(r => '<div class="c"><code>' + esc(r[1]) + '</code><span>' + esc(r[0]) + ' \u00b7 ' + esc(r[2]) + '</span></div>').join('') || '<div class="c"><span>No matches.</span></div>';
}

/* Account (Android bridge) */
function renderAccount(){
  const a = window.__acct || {};
  if (a.email) $('acctLine').textContent = 'Signed in as ' + (a.name || a.email);
  else if (a.status === 'waiting') $('acctLine').textContent = 'Open ' + a.url + ' and enter ' + a.code;
  else if (a.status === 'error') $('acctLine').textContent = a.message;
  else $('acctLine').textContent = 'Not signed in';
  $('signInBtn').disabled = !window.AndroidBridge;
  $('signOutBtn').disabled = !window.AndroidBridge || !a.email;
  $('updBtn').disabled = !window.AndroidBridge;
  if (!window.AndroidBridge) $('settingsNote').textContent = 'Sign-in and updates work in the Android app.';
}
window.setAccount = function (o){ window.__acct = o || {}; renderAccount(); };

/* Init and event wiring */
$('verLabel').textContent = 'v' + APP_VERSION;
$('aboutVer').textContent = APP_VERSION;
$('verSmall').textContent = 'Version ' + APP_VERSION;

cur = 0;
mountLessonEditor();
cur = firstOpen();
renderList(); renderReader(); loadLessonCode();
lOut.line('Welcome to cppforge. Press Ctrl+Enter to run your code.', 'info');

setupPlayground();
showTab('console');
pOut.line('Lua++ playground ready. Press Ctrl+Enter to run.', 'info');
$('pTpl').onchange = e => {
  const k = e.target.value; if (!k) return;
  playEd.setValue(TEMPLATES[k]); store.set('pg.code', TEMPLATES[k]); setProblems(lintLua(TEMPLATES[k]));
  pOut.clear(); pOut.line('Loaded template: ' + e.target.options[e.target.selectedIndex].text, 'info');
  e.target.value = '';
};

$('modeLessons').onclick = () => setMode('lessons');
$('modePlay').onclick = () => setMode('play');
setMode(store.get('mode', 'lessons'));

$('tCpp').onclick = () => { if (track !== 'cpp') setTrack('cpp'); };
$('tLua').onclick = () => { if (track !== 'lua') setTrack('lua'); };

$('lRun').onclick = runLesson;
$('lReset').onclick = () => twoStep($('lReset'), () => { lessonEd.setValue(track === 'lua' ? LUA_STARTER : DEFAULT_STARTER); saveLessonCode(); toast('Reset to starter code'); });
$('lCopy').onclick = () => copyText(lessonEd.value, 'Code copied');
$('lHint').onclick = () => { const d = $('lDrawer'); d.hidden = !d.hidden; };
$('lShowHint').onclick = () => { $('lHintText').textContent = 'Hint: ' + LESSONS()[cur].hint; };
$('lShowSol').onclick = () => { $('lSolText').textContent = LESSONS()[cur].solution; $('lSolText').hidden = false; };
$('lFm').onclick = () => { S.font = Math.max(12, S.font - 1); saveSettings(); applySettings(); };
$('lFp').onclick = () => { S.font = Math.min(20, S.font + 1); saveSettings(); applySettings(); };

$('pRun').onclick = runPlayground;
$('pCheck').onclick = () => {
  const issues = lintNow();
  if (issues.length === 0) { toast('No syntax errors found'); pOut.line('\u2713 No syntax errors found.', 'ok'); showTab('console'); }
  else showTab('problems');
};
$('pClear').onclick = () => pOut.clear();
$('pCopy').onclick = () => copyText(playEd.value, 'Code copied');
$('pReset').onclick = () => twoStep($('pReset'), () => { playEd.setValue(TEMPLATES.hello); store.set('pg.code', TEMPLATES.hello); setProblems(lintLua(TEMPLATES.hello)); toast('Reset to starter code'); });
$('pFm').onclick = () => { S.font = Math.max(12, S.font - 1); saveSettings(); applySettings(); };
$('pFp').onclick = () => { S.font = Math.min(20, S.font + 1); saveSettings(); applySettings(); };
$('tabConsole').onclick = () => showTab('console');
$('tabProblems').onclick = () => showTab('problems');

const lv = $('lessonView');
$('sideBtn').onclick = () => { lv.classList.toggle('collapsed'); if (!isNarrow()) store.set('collapsed', lv.classList.contains('collapsed')); };
if (isNarrow()) lv.classList.add('collapsed'); else if (store.get('collapsed', false)) lv.classList.add('collapsed');
const split = $('split'); let dragging = false;
split.addEventListener('pointerdown', e => { dragging = true; split.setPointerCapture(e.pointerId); });
split.addEventListener('pointermove', e => { if (!dragging) return; const w = Math.min(Math.max(window.innerWidth - e.clientX, 300), window.innerWidth * 0.6); lv.style.setProperty('--playW', w + 'px'); });
split.addEventListener('pointerup', () => { dragging = false; store.set('playW', parseInt(getComputedStyle(lv).getPropertyValue('--playW')) || 440); });
const savedW = store.get('playW', 0); if (savedW && !isNarrow()) lv.style.setProperty('--playW', savedW + 'px');

$('aboutBtn').onclick = () => openModal('about');
$('aboutClose').onclick = closeAll;
$('gearBtn').onclick = () => { applySettings(); renderAccount(); openModal('settings'); };
$('settingsClose').onclick = closeAll;
$('scrim').onclick = closeAll;
$('sheetBtn').onclick = () => { renderCheat(''); $('sheet').classList.add('show'); $('scrim').classList.add('show'); setTimeout(() => $('cheatSearch').focus(), 300); };
$('sheetClose').onclick = closeAll;
$('cheatSearch').addEventListener('input', e => renderCheat(e.target.value));
$('sheetTitle').textContent = (track === 'lua' ? 'Lua' : 'C++') + ' quick reference';
renderCheat('');
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAll(); if (isNarrow()) lv.classList.add('collapsed'); } });

document.querySelectorAll('[data-theme-pick]').forEach(b => b.onclick = () => { S.theme = b.dataset.themePick; saveSettings(); applySettings(); });
$('blurSel').onchange = e => { S.blur = e.target.value; saveSettings(); applySettings(); };
$('orbToggle').onchange = e => { S.orbs = e.target.checked; saveSettings(); applySettings(); };
$('fsRange').oninput = e => { S.font = +e.target.value; saveSettings(); applySettings(); };
$('tabSel').onchange = e => { S.tab = +e.target.value; saveSettings(); applySettings(); };
$('lnToggle').onchange = e => { S.lineNums = e.target.checked; saveSettings(); applySettings(); };
$('acToggle').onchange = e => { S.autoClose = e.target.checked; saveSettings(); applySettings(); };
$('lintToggle').onchange = e => { S.lint = e.target.checked; saveSettings(); if (S.lint) lintNow(); else setProblems([]); };
$('resetProg').onclick = () => twoStep($('resetProg'), () => {
  doneSets.cpp = new Set(); doneSets.lua = new Set();
  store.set('done', []); store.set('doneLua', []);
  cur = 0; renderList(); renderReader(); loadLessonCode(); toast('Progress reset');
});
$('signInBtn').onclick = () => { if (window.AndroidBridge) { window.AndroidBridge.signIn(); $('settingsNote').textContent = 'Starting sign-in...'; } };
$('signOutBtn').onclick = () => { if (window.AndroidBridge) { window.AndroidBridge.signOut(); window.__acct = {}; renderAccount(); } };
$('updBtn').onclick = () => { if (window.AndroidBridge) { window.AndroidBridge.checkUpdate(); $('settingsNote').textContent = 'Checking for updates...'; } };

applySettings();
