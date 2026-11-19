/* Profile logic: username, display name, icon, and photo. Loaded after app.js. */
const PROFILE_ICONS = [
  {id:'spark', d:'M12 2l2.9 6.9L22 10l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.2L2 10l7.1-1.1z'},
  {id:'bolt',  d:'M13 2L3 14h7l-1 8 10-12h-7z'},
  {id:'book',  d:'M3 5a2 2 0 0 1 2-2h6v18H5a2 2 0 0 0-2 2zM21 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 1 2 2z'},
  {id:'code',  d:'M8 6l-6 6 6 6 1.4-1.4L4.8 12l4.6-4.6zM16 6l-1.4 1.4 4.6 4.6-4.6 4.6L16 18l6-6z'},
  {id:'cube',  d:'M12 2l9 5v10l-9 5-9-5V7z'},
  {id:'moon',  d:'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'},
  {id:'flame', d:'M12 2c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 2 4-4z'},
  {id:'leaf',  d:'M4 20c0-9 6-14 16-16-1 10-6 16-15 16z'}
];
const PROFILE_DEFAULT = { username:'learner', displayName:'', icon:'spark', image:'' };
const USERNAME_RE = /^[a-z0-9_]{3,20}$/i;
let PROFILE = Object.assign({}, PROFILE_DEFAULT, store.get('profile', {}));
let DRAFT = null;

function iconSvg(id){
  const ic = PROFILE_ICONS.find(i => i.id === id) || PROFILE_ICONS[0];
  return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + ic.d + '"/></svg>';
}
function avatarInner(p){
  return p.image ? '<img src="' + p.image + '" alt="">' : '<span class="av-ic">' + iconSvg(p.icon) + '</span>';
}
function saveProfile(){ store.set('profile', PROFILE); renderAvatar(); }
function renderAvatar(){
  $('avatarSlot').innerHTML = avatarInner(PROFILE);
  $('profileBtn').title = 'Profile: ' + (PROFILE.displayName || PROFILE.username);
}
function validateProfile(d){
  if (!USERNAME_RE.test(d.username)) return 'Username: 3 to 20 letters, numbers, or underscores.';
  if (d.displayName.length > 40) return 'Display name must be 40 characters or fewer.';
  return '';
}
function refreshDraft(){
  $('pfPreview').innerHTML = avatarInner(DRAFT);
  $('pfIcons').querySelectorAll('[data-icon]').forEach(b => b.classList.toggle('on', !DRAFT.image && b.dataset.icon === DRAFT.icon));
  const err = validateProfile(DRAFT);
  $('pfErr').textContent = err;
  $('pfSave').disabled = !!err;
}
function openProfile(){
  DRAFT = Object.assign({}, PROFILE);
  $('pfUser').value = DRAFT.username;
  $('pfName').value = DRAFT.displayName;
  $('pfIcons').innerHTML = PROFILE_ICONS.map(ic =>
    '<button class="pf-icon" data-icon="' + ic.id + '" aria-label="' + ic.id + ' icon">' + iconSvg(ic.id) + '</button>').join('');
  $('pfIcons').querySelectorAll('[data-icon]').forEach(b => b.onclick = () => { DRAFT.icon = b.dataset.icon; DRAFT.image = ''; refreshDraft(); });
  refreshDraft();
  openModal('profile');
}

// Pre-fill the display name from the Google account the first time we see it.
const _prevSetAccount = window.setAccount;
window.setAccount = function (o){
  _prevSetAccount(o);
  if (o && o.email && o.name && !PROFILE.displayName) { PROFILE.displayName = o.name; saveProfile(); }
};

$('profileBtn').onclick = openProfile;
$('openProfile').onclick = () => { closeAll(); openProfile(); };
$('pfUser').oninput = e => { DRAFT.username = e.target.value.trim(); refreshDraft(); };
$('pfName').oninput = e => { DRAFT.displayName = e.target.value; refreshDraft(); };
$('pfUpload').onclick = () => $('pfFile').click();
$('pfRemove').onclick = () => { DRAFT.image = ''; refreshDraft(); };
$('pfFile').onchange = e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  if (f.size > 8 * 1024 * 1024) { toast('Pick an image under 8 MB.'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const side = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 128, 128);
      DRAFT.image = c.toDataURL('image/jpeg', 0.85);
      refreshDraft();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
};
$('pfCancel').onclick = closeAll;
$('pfSave').onclick = () => {
  DRAFT.username = DRAFT.username.trim();
  DRAFT.displayName = DRAFT.displayName.trim();
  if (validateProfile(DRAFT)) return;
  PROFILE = Object.assign({}, DRAFT);
  saveProfile();
  closeAll();
  toast('Profile saved');
};

renderAvatar();
