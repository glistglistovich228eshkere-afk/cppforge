/* Motion behaviour: preloader, staggered entrances, exit transitions, and the Animations setting.
   Loaded last. Timing values live in css/motion.css (:root) and in MOTION below. */
const MOTION = { staggerMs: 80, exitMs: 250, preloaderMinMs: 900, preloaderMaxMs: 2500 };

function motionOn(){ return S.motion !== false; }

// Restart an animation class on an element (works even if it was already applied).
function replay(el, cls){
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}
function enterAll(nodes){
  nodes.forEach((el, i) => { el.style.setProperty('--i', i); replay(el, 'enter'); });
}

// Preloader: hides once the page has loaded, then the lesson list cascades in.
let preloaderGone = false;
function hidePreloader(){
  if (preloaderGone) return;
  preloaderGone = true;
  const p = $('preloader');
  if (!p) return;
  if (!motionOn()) { p.remove(); return; }
  p.classList.add('done');
  setTimeout(() => p.remove(), MOTION.exitMs + 150);
  enterAll(Array.from(document.querySelectorAll('#list .item')));
}
window.addEventListener('load', () => setTimeout(hidePreloader, MOTION.preloaderMinMs));
setTimeout(hidePreloader, MOTION.preloaderMaxMs);

// Entrances for new content: lesson reader, error cards, and profile icons cascade as they appear.
const WATCH = new Set(['reader', 'probList', 'pfIcons']);
new MutationObserver(muts => {
  if (!motionOn()) return;
  muts.forEach(m => {
    if (!WATCH.has(m.target.id)) return;
    const kids = Array.from(m.target.children);
    m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      node.style.setProperty('--i', Math.max(0, kids.indexOf(node)));
      replay(node, 'enter');
    });
  });
}).observe(document.body, { childList: true, subtree: true });

// Route transition: the outgoing view fades and drifts up, then the new view rises in.
const _setMode = window.setMode;
window.setMode = function (m) {
  const current = document.documentElement.dataset.mode === 'play' ? 'play' : 'lessons';
  if (!motionOn() || m === current) return _setMode(m);
  const out = $(current === 'play' ? 'playView' : 'lessonView');
  out.classList.add('leaving');
  setTimeout(() => {
    out.classList.remove('leaving');
    _setMode(m);
    replay($(m === 'play' ? 'playView' : 'lessonView'), 'view-enter');
  }, MOTION.exitMs);
};

// Modal exit: fade out with an upward drift before the dialog is hidden.
const _closeAll = window.closeAll;
window.closeAll = function () {
  const open = Array.from(document.querySelectorAll('.modal.show'));
  if (!motionOn() || open.length === 0 || document.querySelector('.sheet.show')) return _closeAll();
  open.forEach(m => m.classList.add('closing'));
  $('scrim').classList.remove('show');
  setTimeout(() => { open.forEach(m => m.classList.remove('closing')); _closeAll(); }, MOTION.exitMs);
};

// Animations setting (on by default).
const motionToggle = $('motionToggle');
function applyMotion(){
  document.documentElement.classList.toggle('no-motion', !motionOn());
  if (motionToggle) motionToggle.checked = motionOn();
}
if (motionToggle) motionToggle.onchange = e => { S.motion = e.target.checked; saveSettings(); applyMotion(); };
applyMotion();
if (!motionOn()) hidePreloader();
