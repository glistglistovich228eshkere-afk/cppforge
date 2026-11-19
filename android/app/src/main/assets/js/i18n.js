/* Interface translation logic: Russian (ru), Ukrainian (uk), German (de). Loaded last.
   Dictionaries: i18n_data.js (interface), i18n_lessons_cpp.js and i18n_lessons_lua.js (lessons).
   Code and the Bizzarest_one / cppforge branding are never translated. */
const LANGS = { en:'English', ru:'Русский', uk:'Українська', de:'Deutsch' };
const LESSON_T = Object.assign({}, LESSON_T_CPP, LESSON_T_LUA);

const I18N = { ru:{ui:{}, partial:PART_CONSOLE.ru, kicker:PART_KICKER.ru, lessons:{}}, uk:{ui:{}, partial:PART_CONSOLE.uk, kicker:PART_KICKER.uk, lessons:{}}, de:{ui:{}, partial:PART_CONSOLE.de, kicker:PART_KICKER.de, lessons:{}} };
Object.keys(UI_T).forEach(k => ['ru','uk','de'].forEach(l => { I18N[l].ui[k] = UI_T[k][LI[l]]; }));
Object.keys(LESSON_T).forEach(id => ['ru','uk','de'].forEach(l => {
  const r = LESSON_T[id];
  I18N[l].lessons[id] = { title:r.title[LI[l]], intro:r.intro[LI[l]], goal:r.goal[LI[l]], hint:r.hint[LI[l]] };
}));

let LANG = store.get('lang', 'en');
if (LANG !== 'en' && !I18N[LANG]) LANG = 'en';

// Keep English originals so switching languages works in both directions.
const LESSON_ORIG = new Map();
[...CPP_LESSONS, ...LUA_LESSONS].forEach(L => LESSON_ORIG.set(L, { title:L.title, intro:L.intro, goal:L.goal, hint:L.hint, sec:L.sec }));
function applyLessons(){
  const ui = LANG === 'en' ? null : I18N[LANG].ui;
  const lt = LANG === 'en' ? {} : I18N[LANG].lessons;
  [...CPP_LESSONS, ...LUA_LESSONS].forEach(L => {
    const o = LESSON_ORIG.get(L), tr = lt[L.id];
    L.title = tr ? tr.title : o.title;
    L.intro = tr ? tr.intro : o.intro;
    L.goal = tr ? tr.goal : o.goal;
    L.hint = tr ? tr.hint : o.hint;
    L.sec = (ui && ui[o.sec]) || o.sec;
  });
}

// Text nodes: remember the English text and what we wrote, so running again is safe.
const SKIP_SEL = 'pre,textarea,.ed,.codebox,code,script,style,.cheat';
function partial(s, list){
  let out = s;
  for (const [a, b] of list) out = out.split(a).join(b);
  return out;
}
function localizeNode(node){
  const cur = node.nodeValue;
  const en = (node._tr !== undefined && cur === node._tr) ? node._en : cur;
  let out = en;
  if (LANG !== 'en') {
    const key = en.trim();
    const tv = I18N[LANG].ui[key];
    if (tv !== undefined) out = en.replace(key, tv);
    else if (node.parentElement && node.parentElement.matches('.kicker,.ln-no')) out = partial(en, I18N[LANG].kicker);
  }
  node._en = en;
  node._tr = out;
  if (out !== cur) node.nodeValue = out;
}
const ATTRS = ['placeholder','title','aria-label'];
function localizeAttrs(){
  document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
    el._attrs = el._attrs || {};
    ATTRS.forEach(a => {
      if (!el.hasAttribute(a)) return;
      const cur = el.getAttribute(a);
      const en = (el._attrs[a] && el._attrs[a].tr === cur) ? el._attrs[a].en : cur;
      const tv = LANG === 'en' ? undefined : I18N[LANG].ui[en.trim()];
      const out = tv !== undefined ? tv : en;
      el._attrs[a] = { en, tr:out };
      if (out !== cur) el.setAttribute(a, out);
    });
  });
}
function translateDOM(){
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = []; let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(node => { const p = node.parentElement; if (p && !p.closest(SKIP_SEL)) localizeNode(node); });
  localizeAttrs();
}

// Messages built in code (toasts and console lines).
function trMsg(s, allowPartial){
  if (LANG === 'en') return s;
  const key = String(s);
  const tv = I18N[LANG].ui[key.trim()];
  if (tv !== undefined) return tv;
  return allowPartial ? partial(key, I18N[LANG].partial) : key;
}

// Re-translate after every render, so new text is covered too.
['renderList','renderReader','renderCheat','renderAccount','renderProblems','setTrack','select','setMode','applySettings','renderAvatar','openProfile','setProblems','showTab','openModal','closeAll','runLesson','runPlayground','lintNow'].forEach(name => {
  const f = window[name];
  if (typeof f !== 'function') return;
  window[name] = function (...args) { const r = f.apply(this, args); translateDOM(); return r; };
});
const _toast = window.toast;
window.toast = m => _toast(trMsg(m, false));
const _lOutLine = lOut.line;
lOut.line = (text, kind) => _lOutLine(kind === 'out' ? text : trMsg(text, true), kind);
const _pOutLine = pOut.line;
pOut.line = (text, kind) => _pOutLine(kind === 'out' ? text : trMsg(text, true), kind);

function applyLanguage(code){
  if (code !== 'en' && !I18N[code]) code = 'en';
  LANG = code;
  store.set('lang', code);
  document.documentElement.lang = code;
  applyLessons();
  $('langSel').value = code;
  renderList(); renderReader(); renderCheat($('cheatSearch').value); renderAccount(); renderAvatar(); renderProblems();
  translateDOM();
}

$('langSel').onchange = e => applyLanguage(e.target.value);
applyLanguage(LANG);
