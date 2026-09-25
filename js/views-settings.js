/* ============================================================
   VUE — Settings
   Menu à gauche, contenu à droite : Account en haut, les autres
   sections à la suite, Sign out détaché en bas du menu.
   Les blocs Users et Locations réutilisent renderUsers() et
   renderLoc(), qui remplissent les conteneurs créés ici.
   ============================================================ */

let settingsTab = 'account';

const SET_TABS = [
  {k:'account',  label:'Account',   icon:'👤'},
  {k:'data',     label:'Data',      icon:'🗂', admin:true},
  {k:'locations',label:'Locations', icon:'📍'},
  {k:'users',    label:'Users',     icon:'🔑', admin:true},
  {k:'activity', label:'Activity',  icon:'🕘'},
  {k:'about',    label:'About',     icon:'ℹ️'}
];

function openSettings(tab){ settingsTab = tab; renderSettings(); }

function renderSettings(){
  const tabs = SET_TABS.filter(t=>!t.admin || can('admin'));
  if(!tabs.some(t=>t.k===settingsTab)) settingsTab = 'account';

  const menu = tabs.map(t=>`
    <button class="setitem${settingsTab===t.k?' on':''}" onclick="openSettings('${t.k}')">
      <span class="ic">${t.icon}</span>${t.label}
    </button>`).join("");

  document.getElementById('v-settings').innerHTML = `
    <div class="setlayout">
      <aside class="setnav">
        <div class="setcard">${menu}</div>
        <div class="setcard">
          <button class="setitem out" onclick="signOut()"><span class="ic">⏻</span>Sign out</button>
        </div>
      </aside>
      <div class="setbody" id="setBody"></div>
    </div>`;

  const body = document.getElementById('setBody');
  if(settingsTab === 'account')   body.innerHTML = paneAccount();
  if(settingsTab === 'data')      body.innerHTML = paneData();
  if(settingsTab === 'locations'){ body.innerHTML = paneLocations(); renderLoc(); }
  if(settingsTab === 'users'){     body.innerHTML = '<div class="panel"><div id="usersBox"></div></div>'; renderUsers(); }
  if(settingsTab === 'activity'){  body.innerHTML = paneActivity(); renderActivity(); }
  if(settingsTab === 'about')     body.innerHTML = paneAbout();
  applyRoleUI();
}

/* ---------- panneaux ---------- */
function paneAccount(){
  const role = me && me.role === 'admin' ? 'Administrator' : 'Assistant';
  return `<div class="panel">
    <h2>Account</h2>
    <p class="muted" style="margin-bottom:14px">You are signed in with a magic link — there is no password to remember.</p>
    <div class="field" style="margin-bottom:10px"><label>Name</label>
      <input value="${esc(me && me.name ? me.name : '')}" disabled></div>
    <div class="field" style="margin-bottom:10px"><label>Email</label>
      <input value="${esc(me ? me.email : '')}" disabled></div>
    <div class="field"><label>Role</label>
      <p><span class="tag ${me && me.role==='admin' ? 'cat' : 'attente'}">${role}</span></p>
      <p class="muted" style="margin-top:6px">${me && me.role==='admin'
        ? 'You can add, edit and delete gear, and manage accounts.'
        : 'You can browse, check gear in and out, flag repairs and pack projects.'}</p>
    </div>
  </div>`;
}

function paneData(){
  const withPhoto = db.items.filter(i=>i.photo).length;
  return `<div class="panel">
    <h2>Data</h2>
    <p class="muted" style="margin-bottom:14px">Bulk tools. Nothing is written before you confirm.</p>
    <div class="setgrid">
      <div>
        <h4>Inventory</h4>
        <button class="btn sec small" onclick="openCsvImport()">Import / export CSV</button>
        <p class="muted">Add or update many items at once from a spreadsheet.</p>
      </div>
      <div>
        <h4>Photos</h4>
        <button class="btn sec small" onclick="openPhotoImport()">Import photos</button>
        <p class="muted">${withPhoto} of ${db.items.length} items have a photo.</p>
      </div>
      <div>
        <h4>Full backup</h4>
        <button class="btn sec small" onclick="exportJSON()">Export JSON</button>
        <button class="btn sec small" onclick="document.getElementById('importFile').click()">Import JSON</button>
        <p class="muted">A complete snapshot: items, borrowers, projects and history.</p>
      </div>
      <div>
        <h4>Trash</h4>
        <button class="btn sec small" onclick="openTrash()">Open trash${db.trash.length?` (${db.trash.length})`:''}</button>
        <p class="muted">Deleted items stay recoverable for ${typeof TRASH_DAYS==='number'?TRASH_DAYS:30} days.</p>
      </div>
    </div>
  </div>`;
}

function paneLocations(){
  return `<div class="panel">
    <h2>Studio locations</h2>
    <p class="muted" style="margin-bottom:12px">
      Two levels. A <b>site</b> is a building or address you own — AccessFlow.
      Inside it, a <b>room</b> is where the gear actually lives — Studio A.
      Give the site an address: it is the one used in delivery emails.
    </p>
    <div class="toolbar" data-req="edit" style="margin-bottom:12px">
      <input id="newLoc" placeholder="e.g. AccessFlow, Studio A…" onkeydown="if(event.key==='Enter')addLoc()">
      <select id="newLocParent"></select>
      <button class="btn" onclick="addLoc()">+ Add</button>
    </div>
    <div id="locList"></div>
  </div>

  <div class="panel">
    <h2>Off-site</h2>
    <p class="muted" style="margin-bottom:12px">
      Addresses where gear goes temporarily: a venue, a rental client, a shoot.
      They can be picked as a destination when checking gear out, and as a
      project destination — but never as an item's home.
      Created once, an address can be reused for every future date.
    </p>
    <div class="toolbar" data-req="edit" style="margin-bottom:12px">
      <input id="newOff" placeholder="e.g. Trianon" onkeydown="if(event.key==='Enter')addOffsite()">
      <input id="newOffAddr" placeholder="80 Bd de Rochechouart, 75018 Paris" style="min-width:260px;flex:1"
             onkeydown="if(event.key==='Enter')addOffsite()">
      <button class="btn" onclick="addOffsite()">+ Add address</button>
    </div>
    <div id="offList"></div>
  </div>`;
}

function paneActivity(){
  return `<div class="panel">
    <h2>Activity</h2>
    <p class="muted" style="margin-bottom:12px">The last hundred actions, most recent first.</p>
    <ul class="hist" id="settingsActivity"></ul>
  </div>`;
}

function paneAbout(){
  return `<div class="panel">
    <h2>About</h2>
    <p class="muted" style="margin-bottom:12px">${esc(LABELS.tagline || '')}</p>
    <table><tbody>
      <tr><td>Version</td><td><b>${APP_VERSION}</b></td></tr>
      <tr><td>Items</td><td><b>${db.items.length}</b></td></tr>
      <tr><td>Locations</td><td><b>${db.locations.length}</b></td></tr>
      <tr><td>Borrowers</td><td><b>${db.users.length}</b></td></tr>
      <tr><td>Projects</td><td><b>${db.projects.length}</b></td></tr>
      <tr><td>Photos</td><td><b>${db.items.filter(i=>i.photo).length}</b></td></tr>
    </tbody></table>
  </div>`;
}

/* Journal d'activité — déplacé ici depuis le tableau de bord */
function renderActivity(){
  const el = document.getElementById('settingsActivity');
  if(!el) return;
  const rows = db.history.slice(0, 100).map(h=>{
    const it = item(h.itemId) || db.trash.find(x=>x.id===h.itemId);
    return `<li>${histIcon(h.type)} ${it?itemTitle(it):`<b>${esc(h.itemId)}</b>`} — ${histText(h)}
      <div class="when">${fdate(h.date)}${histBy(h)}</div></li>`;
  }).join("");
  el.innerHTML = rows || '<li class="muted">No activity yet.</li>';
}
