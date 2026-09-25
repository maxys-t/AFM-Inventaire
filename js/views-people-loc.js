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

    const detail = open && using.length
      ? `<tr class="bdetail"><td></td><td colspan="2">
           <div class="bchips">${using.map(i=>`
             <span class="chip${overdue(i)?' late':''}" onclick="openDetail('${i.id}')">
               ${esc(itemTitleText(i))} <span class="mono">${i.id}</span>
               · ${daysSince(i.out.date)}d${overdue(i)?' ⚠️':''}
             </span>`).join("")}</div>
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
        ${l.address?`<div class="muted addr">${esc(l.address)}</div>`:''}</td>
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
        ${l.address?`<div class="muted addr">${esc(l.address)}</div>`:'<div class="muted addr">— no address —</div>'}</td>
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
  const row = {name:n, parent, kind: parent ? 'room' : 'site', address:null, archived:false};
  db.locations.push({...row, address:''});
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
  const address = adr ? adr.value.trim() : '';
  const row = {name:n, parent:null, kind:'offsite', address:address||null, archived:false};
  db.locations.push({...row, address});
  inp.value = ""; if(adr) adr.value = "";
  inp.focus();
  renderLoc();
  await apiInsertLocation(row);
}

function editLocAddress(name){
  const l = locObj(name);
  if(!l) return;
  const v = prompt(`Address for "${name}" — used in delivery emails:`, l.address || '');
  if(v === null) return;
  const address = v.trim();
  l.address = address;
  renderLoc();
  apiUpdateLocation(name, {address: address || null});
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
