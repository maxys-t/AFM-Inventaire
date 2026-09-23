/* ============================================================
   VUE — Settings
   Tout ce qui n'est pas l'usage quotidien : compte, comptes
   autorisés, emplacements, import/export, journal d'activité.
   Les blocs Users et Locations réutilisent renderUsers() et
   renderLoc(), qui remplissent les conteneurs créés ici.
   ============================================================ */

function renderSettings(){
  const admin = can('admin');
  const nPhotos = db.items.filter(i=>i.photo).length;

  document.getElementById('v-settings').innerHTML = `
    <div class="panel">
      <h2>Account</h2>
      <p class="muted" style="margin-bottom:10px">
        Signed in as <b>${esc(me ? (me.name || me.email) : '—')}</b>
        ${me ? `<span class="tag ${me.role==='admin'?'cat':'attente'}">${me.role==='admin'?'Administrator':'Assistant'}</span>` : ''}
        <br><span class="mono">${esc(me ? me.email : '')}</span>
      </p>
      <button class="btn danger" onclick="signOut()">Sign out</button>
    </div>

    <div class="panel" data-req="admin">
      <h2>Data</h2>
      <p class="muted" style="margin-bottom:10px">
        Bulk tools. Nothing is written before you confirm.
      </p>
      <div class="setgrid">
        <div>
          <h4>Inventory</h4>
          <button class="btn sec small" onclick="openCsvImport()">Import / export CSV</button>
          <p class="muted">Add or update many items at once from a spreadsheet.</p>
        </div>
        <div>
          <h4>Photos</h4>
          <button class="btn sec small" onclick="openPhotoImport()">Import photos</button>
          <p class="muted">${nPhotos} of ${db.items.length} items have a photo.</p>
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
    </div>

    <div class="panel">
      <h2>Locations</h2>
      <p class="muted" style="margin-bottom:10px">
        A top-level location is a room (Studio A, Control room…). Pick "inside: …"
        to create a sub-location, e.g. Synth rack inside Studio A.
      </p>
      <div class="toolbar" data-req="edit" style="margin-bottom:10px">
        <input id="newLoc" placeholder="e.g. Studio A, Synth rack…" onkeydown="if(event.key==='Enter')addLoc()">
        <select id="newLocParent"></select>
        <button class="btn" onclick="addLoc()">+ Add location</button>
      </div>
      <div id="locList"></div>
    </div>

    <div class="panel" data-req="admin"><div id="usersBox"></div></div>

    <div class="panel">
      <h2>Recent activity</h2>
      <p class="muted" style="margin-bottom:10px">The last hundred actions, most recent first.</p>
      <ul class="hist" id="settingsActivity"></ul>
    </div>

    <div class="panel">
      <h2>About</h2>
      <p class="muted">
        <b>${esc(LABELS.appTitle)}</b> — version ${APP_VERSION}<br>
        ${db.items.length} items · ${db.locations.length} locations ·
        ${db.users.length} borrowers · ${db.projects.length} projects
      </p>
    </div>`;

  renderLoc();
  if(admin && typeof renderUsers === 'function') renderUsers();
  renderActivity();
  applyRoleUI();
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
