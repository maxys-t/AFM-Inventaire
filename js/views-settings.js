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
  {k:'providers',label:'Repair shops', icon:'🔧', admin:true},
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
  if(settingsTab === 'providers'){ body.innerHTML = paneProviders(); renderProviders(); }
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
  </div>

  <div class="panel">
    <h2>Password</h2>
    <p class="muted" style="margin-bottom:12px">
      At least ${typeof MIN_PW === 'number' ? MIN_PW : 10} characters.
      Changing it here does not sign you out of your other devices.
    </p>
    <div class="field" style="margin-bottom:10px"><label>New password</label>
      <input type="password" id="ch-pw1" autocomplete="new-password" style="max-width:320px"
             onkeydown="if(event.key==='Enter')changeMyPassword()"></div>
    <div class="field" style="margin-bottom:12px"><label>Confirm</label>
      <input type="password" id="ch-pw2" autocomplete="new-password" style="max-width:320px"
             onkeydown="if(event.key==='Enter')changeMyPassword()"></div>
    <button class="btn" id="ch-btn" onclick="changeMyPassword()">Change password</button>
    <p class="muted" id="ch-msg" style="margin-top:10px"></p>
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
        <h4>Weights</h4>
        <button class="btn sec small" onclick="openWeightImport()">Import weights</button>
        <p class="muted">${db.items.filter(i=>i.weight_g).length} of ${db.items.length} items weighed —
          ${fweight(db.items.reduce((t,i)=>t+(i.weight_g||0),0))} in total.</p>
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


/* ============================================================
   Prestataires de réparation (v1.17)
   Une table à part, et non un emplacement « off-site » : un atelier
   a une spécialité et un délai, qu'un lieu de tournée n'a pas.
   ============================================================ */
function paneProviders(){
  return `<div class="panel">
    <h2>Repair shops</h2>
    <div class="viewintro">Who repairs what, and how to reach them. Used when sending an item out.</div>
    <div id="provBox"></div>
  </div>`;
}

function renderProviders(){
  const box = document.getElementById('provBox');
  if(!box) return;
  if(db.repairsSupported === false){
    box.innerHTML = `<div class="muted">Run <span class="mono">sql/016-reparations.sql</span> first.</div>`;
    return;
  }
  const rows = (db.providers||[]).slice()
    .sort((a,b)=>(a.archived?1:0)-(b.archived?1:0) || a.name.localeCompare(b.name));

  const busy = pid => (db.repairs||[]).filter(r=>r.provider_id===pid && r.status==='sent').length;

  box.innerHTML = `
    <table><thead><tr>
      <th>Name</th><th>Specialty</th><th>Contact</th><th>There now</th><th></th>
    </tr></thead><tbody>
    ${rows.map(p=>`<tr class="${p.archived?'muted':''}">
      <td data-l="Name"><b>${esc(p.name)}</b>${p.archived?' <span class="tag">archived</span>':''}</td>
      <td data-l="Specialty">${esc(p.specialty||'—')}</td>
      <td data-l="Contact">${[p.contact,p.phone,p.email].filter(Boolean).map(esc).join('<br>')||'—'}</td>
      <td data-l="There now">${busy(p.id) || '—'}</td>
      <td>
        <button class="btn small sec" onclick="editProvider('${p.id}')">Edit</button>
        <button class="btn small sec" onclick="toggleProviderArchive('${p.id}')">${p.archived?'Restore':'Archive'}</button>
      </td></tr>`).join('') || '<tr><td colspan="5" class="muted">No repair shop yet.</td></tr>'}
    </tbody></table>
    <div style="margin-top:10px"><button class="btn" onclick="editProvider()">+ Add a repair shop</button></div>`;
}

let editingProvider = null;
function editProvider(id){
  editingProvider = id || null;
  const p = id ? providerOf(id) : null;
  const v = k => (p && p[k]) || '';
  const body = document.getElementById('provFormBody');
  body.innerHTML = `
    <div class="form-grid">
      <div class="field full"><label>Name *</label><input id="pv-name" value="${esc(v('name'))}"></div>
      <div class="field"><label>Specialty</label><input id="pv-spec" value="${esc(v('specialty'))}" placeholder="microphones, keyboards…"></div>
      <div class="field"><label>Contact</label><input id="pv-contact" value="${esc(v('contact'))}"></div>
      <div class="field"><label>Phone</label><input id="pv-phone" value="${esc(v('phone'))}"></div>
      <div class="field"><label>Email</label><input id="pv-email" value="${esc(v('email'))}"></div>
      <div class="field full"><label>Street</label><input id="pv-street" value="${esc(v('addr_line1'))}"></div>
      <div class="field"><label>Postcode</label><input id="pv-zip" value="${esc(v('addr_zip'))}"></div>
      <div class="field"><label>City</label><input id="pv-city" value="${esc(v('addr_city'))}"></div>
      <div class="field full"><label>Notes</label><input id="pv-notes" value="${esc(v('notes'))}"></div>
    </div>`;
  document.getElementById('provFormTitle').textContent = p ? 'Edit repair shop' : 'Add a repair shop';
  open_('ovProv');
}

async function saveProvider(){
  const g = k => (document.getElementById('pv-'+k).value||'').trim();
  const name = g('name');
  if(!name){ toast('A name is required.', 'error'); return; }
  const row = {name, specialty:g('spec')||null, contact:g('contact')||null,
               phone:g('phone')||null, email:g('email')||null,
               addr_line1:g('street')||null, addr_zip:g('zip')||null,
               addr_city:g('city')||null, notes:g('notes')||null};
  try{
    if(editingProvider) await apiUpdateProvider(editingProvider, row);
    else                await apiInsertProvider(row);
    close_('ovProv');
    await refresh();
    toast('Saved.', 'ok');
  }catch(e){ toast('Could not save: ' + (e.message||e), 'error'); }
}

async function toggleProviderArchive(id){
  const p = providerOf(id); if(!p) return;
  /* On archive au lieu de supprimer : un atelier retiré ferait
     disparaître le nom sur les réparations déjà closes. */
  if(!p.archived && (db.repairs||[]).some(r=>r.provider_id===id && r.status==='sent')){
    toast('Items are still there. Receive them first.', 'error'); return;
  }
  try{ await apiUpdateProvider(id, {archived: !p.archived}); await refresh(); }
  catch(e){ toast('Could not change it: ' + (e.message||e), 'error'); }
}
