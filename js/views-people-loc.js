/* ============================================================
   VUES — Personnes & Emplacements
   ============================================================ */

/* ---- Emprunteurs ----
   Chaque emprunteur se déplie : on ne montre que le nombre d'items
   tant qu'on ne l'ouvre pas, pour garder la liste lisible. */
let openBorrowers = new Set();

function toggleBorrower(id){
  if(openBorrowers.has(id)) openBorrowers.delete(id); else openBorrowers.add(id);
  renderPeople();
}

function renderPeople(){
  const list = db.users.map(u=>{
    const using = db.items.filter(i=>i.status==='sorti' && i.out.userId===u.id)
                          .sort((a,b)=>new Date(a.out.date)-new Date(b.out.date));
    const open = openBorrowers.has(u.id);
    const late = using.filter(i=>overdue(i)).length;

    const summary = using.length
      ? `<button class="bsum${open?' on':''}" onclick="toggleBorrower('${u.id}')">
           <span class="chev">${open?'▾':'▸'}</span>
           ${using.length} item${using.length>1?'s':''}
           ${late?`<span class="tag hs">${late} overdue</span>`:''}
         </button>`
      : '<span class="muted">nothing</span>';

    /* Un vrai tableau plutôt qu'une rangée de pastilles : avec dix
       items sortis, les pastilles deviennent illisibles. */
    const detail = open && using.length
      ? `<tr class="bdetail"><td colspan="3">
           <table class="btable"><thead><tr>
             <th>Item</th><th>ID</th><th>Out since</th><th>Due back</th><th>Destination</th><th></th>
           </tr></thead><tbody>
           ${using.map(i=>`<tr class="rowlink${overdue(i)?' lateraw':''}" onclick="openDetail('${i.id}')">
             <td data-l="Item">${itemTitle(i)}</td>
             <td data-l="ID"><span class="mono">${esc(i.id)}</span></td>
             <td data-l="Out since">${daysSince(i.out.date)}d <span class="muted">${esc(fdateD(i.out.date.slice(0,10)))}</span></td>
             <td data-l="Due back">${i.out.due
               ? `<span class="${overdue(i)?'days-late':''}">${esc(fdateD(i.out.due))}${overdue(i)?' ⚠️':''}</span>`
               : '<span class="muted">—</span>'}</td>
             <td data-l="Destination">${esc(i.out.reason||'')}</td>
             <td onclick="event.stopPropagation()">${can('checkout')
               ? `<button class="btn small ok" onclick="openCheckin('${i.id}')">Check in</button>` : ''}</td>
           </tr>`).join("")}
           </tbody></table>
           ${can('checkout') ? `<div style="margin-top:10px">
             <button class="btn ok small" onclick="checkInAllFor('${u.id}')">📥 Check in all (${using.length})</button>
           </div>` : ''}
         </td></tr>`
      : '';

    return `<tr><td data-l="Name"><b>${esc(u.name)}</b></td>
      <td data-l="Currently using">${summary}</td>
      <td>${can('edit')?`<button class="btn danger small" data-id="${u.id}" onclick="delUser(this.dataset.id)">✕</button>`:''}</td></tr>${detail}`;
  }).join("");

  document.getElementById('peopleList').innerHTML = db.users.length
    ? `<table><thead><tr><th>Name</th><th>Currently using</th><th></th></tr></thead><tbody>${list}</tbody></table>`
    : '<div class="empty">No borrower yet.</div>';
}

/* Renvoie l'identifiant d'un emprunteur, en le créant si le nom est nouveau.
   La comparaison ignore la casse et les accents pour éviter les doublons. */
async function borrowerId(name){
  const n = (name||'').trim();
  if(!n) return null;
  const k = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const hit = db.users.find(u=>k(u.name) === k(n));
  if(hit) return hit.id;
  const u = {id:"u"+Date.now(), name:n};
  db.users.push(u);
  await apiInsertPerson(u);
  return u.id;
}

async function addUser(){
  const inp = document.getElementById('newUser');
  const n = inp.value.trim();
  if(!n) return;
  const u = {id:"u"+Date.now(),name:n};
  db.users.push(u);
  inp.value = ""; inp.focus();
  renderPeople();
  await apiInsertPerson(u);
}
async function delUser(id){
  if(db.items.some(i=>i.status==='sorti'&&i.out.userId===id)){ alert("This borrower still has gear checked out."); return; }
  if(!confirm("Supprimer cette personne ?")) return;
  db.users = db.users.filter(u=>u.id!==id);
  renderPeople();
  await apiDeletePerson(id);
}

/* ---- Emplacements ----
   Deux tableaux distincts : les lieux du studio (site › salle) d'un
   côté, les adresses extérieures de l'autre. Ils ne servent pas à la
   même chose : on range du matériel dans les premiers, on l'envoie
   temporairement dans les seconds. */
let showArchivedLoc = false;

function toggleArchivedLoc(){ showArchivedLoc = !showArchivedLoc; renderLoc(); }

function renderLoc(){
  const sel = document.getElementById('newLocParent');
  if(sel){
    const keep = sel.value;
    sel.innerHTML = '<option value="">— new site —</option>'
      + locRoots().filter(r=>!r.archived).map(r=>`<option value="${esc(r.name)}">inside: ${esc(r.name)}</option>`).join("");
    sel.value = keep;
  }

  /* --- studio : sites et salles --- */
  const locRow = (l,sub)=>{
    const n = db.items.filter(i=>i.home===l.name).length;
    const present = db.items.filter(i=>i.loc===l.name).length;
    return `<tr><td data-l="Location" class="${sub?'subloc':''}">
        <b>${esc(l.name)}</b>${sub?'':' <span class="tag cat">site</span>'}
        ${hasAddress(l.name)?`<div class="muted addr">${esc(locAddress(l.name))}</div>`:''}</td>
      <td data-l="Content">${n} assigned · ${present} on site</td>
      <td class="locact">${can('edit')?`
        ${sub?'':`<button class="btn sec small" data-n="${esc(l.name)}" onclick="editLocAddress(this.dataset.n)">Address</button>`}
        <button class="btn danger small" data-n="${esc(l.name)}" onclick="delLoc(this.dataset.n)">✕</button>`:''}</td></tr>`;
  };
  let list = "";
  locRoots().forEach(r=>{ list += locRow(r,false); locChildren(r.name).forEach(c=>list += locRow(c,true)); });
  locOrphans().forEach(o=>list += locRow(o,false));
  const box = document.getElementById('locList');
  if(box) box.innerHTML = list
    ? `<table><thead><tr><th>Location</th><th>Content</th><th></th></tr></thead><tbody>${list}</tbody></table>`
    : '<div class="empty">No location yet.</div>';

  /* --- off-site : adresses extérieures --- */
  const offBox = document.getElementById('offList');
  if(!offBox) return;
  const rows = offsites(showArchivedLoc);
  const offRow = l=>{
    const here = db.items.filter(i=>i.loc===l.name).length;
    const projs = db.projects.filter(p=>p.loc_name===l.name && !p.archived).length;
    return `<tr class="${l.archived?'archrow':''}">
      <td data-l="Place"><b>${esc(l.name)}</b>${l.archived?' <span class="tag pinactif">archived</span>':''}
        ${hasAddress(l.name)
          ? `<div class="muted addr">${esc(locAddress(l.name))}</div>`
          : '<div class="muted addr">— no address —</div>'}
        ${locPhone(l.name)?`<div class="muted addr">☎ ${esc(locPhone(l.name))}</div>`:''}</td>
      <td data-l="Use">${here?`<span class="tag sorti">${here} item${here>1?'s':''} there</span> `:''}${projs?`${projs} project${projs>1?'s':''}`:(here?'':'<span class="muted">unused</span>')}</td>
      <td class="locact">${can('edit')?`
        <button class="btn sec small" data-n="${esc(l.name)}" onclick="editLocAddress(this.dataset.n)">Edit</button>
        <button class="btn sec small" data-n="${esc(l.name)}" onclick="archiveLoc(this.dataset.n)">${l.archived?'Restore':'Archive'}</button>
        <button class="btn danger small" data-n="${esc(l.name)}" onclick="delLoc(this.dataset.n)">✕</button>`:''}</td></tr>`;
  };
  const nbArch = offsites(true).filter(l=>l.archived).length;
  offBox.innerHTML =
    (rows.length
      ? `<table><thead><tr><th>Place</th><th>Use</th><th></th></tr></thead><tbody>${rows.map(offRow).join("")}</tbody></table>`
      : '<div class="empty">No off-site address yet.</div>')
    + (nbArch ? `<div style="margin-top:10px"><button class="btn sec small" onclick="toggleArchivedLoc()">
         ${showArchivedLoc ? 'Hide' : 'Show'} archived (${nbArch})</button></div>` : '');
}

/* Ajout d'un lieu du studio : site si aucun parent choisi, sinon salle. */
async function addLoc(){
  const inp = document.getElementById('newLoc');
  const n = inp.value.trim();
  const parent = document.getElementById('newLocParent').value || null;
  if(!n) return;
  if(locObj(n)){ alert("That location already exists."); return; }
  const row = {name:n, parent, kind: parent ? 'room' : 'site', archived:false};
  db.locations.push({...row, street:'', extra:'', zip:'', city:'', phone:''});
  inp.value = ""; inp.focus();
  renderLoc();
  await apiInsertLocation(row);
}

/* Ajout d'une adresse extérieure. Pas de parent : un off-site ne vit
   pas dans l'arborescence du studio. */
async function addOffsite(){
  const inp = document.getElementById('newOff');
  const adr = document.getElementById('newOffAddr');
  const n = inp.value.trim();
  if(!n) return;
  if(locObj(n)){ alert("A location with that name already exists."); return; }
  const street = adr ? adr.value.trim() : '';
  const row = {name:n, parent:null, kind:'offsite', street:street||null, archived:false};
  db.locations.push({name:n, parent:null, kind:'offsite',
                     street, extra:'', zip:'', city:'', phone:'', archived:false});
  inp.value = ""; if(adr) adr.value = "";
  inp.focus();
  renderLoc();
  await apiInsertLocation(row);
}

/* ---- Adresse d'un lieu ----
   Champs séparés plutôt qu'un champ libre : c'est ce qui permet au
   mail de livraison de sortir une adresse correctement mise en forme. */
let editingLoc = null;

function editLocAddress(name){
  const l = locObj(name);
  if(!l) return;
  editingLoc = name;
  const set = (id,v)=>{ const el = document.getElementById(id); if(el) el.value = v || ''; };
  const t = document.getElementById('addrTitle');
  if(t) t.textContent = 'Address — ' + name;
  set('ad-street', l.street); set('ad-extra', l.extra);
  set('ad-zip', l.zip); set('ad-city', l.city); set('ad-phone', l.phone);
  // Le téléphone de contact n'a de sens que sur une adresse extérieure.
  const ph = document.getElementById('ad-phone-field');
  if(ph) ph.style.display = isOffsite(name) ? '' : 'none';
  open_('ovAddr');
}

async function saveLocAddress(){
  const l = locObj(editingLoc);
  if(!l){ close_('ovAddr'); return; }
  const get = id => ((document.getElementById(id)||{}).value || '').trim();
  const fields = {
    street: get('ad-street'), extra: get('ad-extra'),
    zip: get('ad-zip'), city: get('ad-city'),
    phone: isOffsite(editingLoc) ? get('ad-phone') : ''
  };
  Object.assign(l, fields);
  close_('ovAddr');
  renderLoc();
  // null plutôt que chaîne vide : une case vide reste vide en base.
  const row = {};
  Object.entries(fields).forEach(([k,v])=>{ row[k] = v || null; });
  await apiUpdateLocation(l.name, row);
}

/* Archiver plutôt que supprimer : le lieu sort des menus mais
   l'historique et les anciens projets continuent de le nommer. */
async function archiveLoc(name){
  const l = locObj(name);
  if(!l) return;
  if(!l.archived && db.items.some(i=>i.loc===name)){
    alert("Gear is still out at this address. Check it back in first.");
    return;
  }
  l.archived = !l.archived;
  renderLoc();
  await apiUpdateLocation(name, {archived: l.archived});
}

async function delLoc(l){
  if(locChildren(l).length){ alert("This location contains sub-locations. Delete them first."); return; }
  if(db.items.some(i=>i.home===l)){ alert("Some items are still assigned to this location."); return; }
  if(db.items.some(i=>i.loc===l)){ alert("Gear is still at this location."); return; }
  if(db.projects.some(p=>p.loc_name===l)){
    alert("A project still points to this place. Archive it instead."); return;
  }
  if(!confirm(`Delete "${l}"? Archiving keeps it out of the menus without losing it.`)) return;
  db.locations = db.locations.filter(x=>x.name!==l);
  renderLoc();
  await apiDeleteLocation(l);
}
