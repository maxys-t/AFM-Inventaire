/* ============================================================
   VUES — Personnes & Emplacements
   ============================================================ */

/* ---- Personnes ---- */
function renderPeople(){
  const list = db.users.map(u=>{
    const holding = db.items.filter(i=>i.status==='sorti' && i.out.userId===u.id);
    return `<tr><td data-l="Name"><b>${esc(u.name)}</b></td>
      <td data-l="Currently holding">${holding.length?holding.map(i=>`<span class="chip" style="cursor:pointer" onclick="openDetail('${i.id}')">${itemTitleText(i)} · ${daysSince(i.out.date)} j</span>`).join(""):'<span class="muted">nothing</span>'}</td>
      <td>${can('edit')?`<button class="btn danger small" data-id="${u.id}" onclick="delUser(this.dataset.id)">✕</button>`:''}</td></tr>`;
  }).join("");
  document.getElementById('peopleList').innerHTML = db.users.length
    ? `<table><thead><tr><th>Name</th><th>Currently holding</th><th></th></tr></thead><tbody>${list}</tbody></table>`
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

/* ---- Emplacements ---- */
function renderLoc(){
  const sel = document.getElementById('newLocParent'), keep = sel.value;
  sel.innerHTML = '<option value="">— top-level location —</option>' + locRoots().map(r=>`<option value="${esc(r.name)}">inside: ${esc(r.name)}</option>`).join("");
  sel.value = keep;
  const locRow = (l,sub)=>{
    const n = db.items.filter(i=>i.home===l.name).length;
    const present = db.items.filter(i=>i.loc===l.name).length;
    return `<tr><td data-l="Location" class="${sub?'subloc':''}"><b>${esc(l.name)}</b></td>
      <td data-l="Content">${n} assigned · ${present} on site</td>
      <td>${can('edit')?`<button class="btn danger small" data-n="${esc(l.name)}" onclick="delLoc(this.dataset.n)">✕</button>`:''}</td></tr>`;
  };
  let list = "";
  locRoots().forEach(r=>{ list += locRow(r,false); locChildren(r.name).forEach(c=>list += locRow(c,true)); });
  db.locations.filter(l=>l.parent && !locObj(l.parent)).forEach(o=>list += locRow(o,false));
  document.getElementById('locList').innerHTML = db.locations.length
    ? `<table><thead><tr><th>Location</th><th>Content</th><th></th></tr></thead><tbody>${list}</tbody></table>`
    : '<div class="empty">No location yet.</div>';
}
async function addLoc(){
  const inp = document.getElementById('newLoc');
  const n = inp.value.trim();
  const parent = document.getElementById('newLocParent').value||null;
  if(!n) return;
  if(locObj(n)){ alert("That location already exists."); return; }
  db.locations.push({name:n,parent});
  inp.value = ""; inp.focus();
  renderLoc();
  await apiInsertLocation({name:n,parent});
}
async function delLoc(l){
  if(locChildren(l).length){ alert("Cet emplacement contient des sous-emplacements. Supprime-les d'abord."); return; }
  if(db.items.some(i=>i.home===l)){ alert("Some items are still assigned to this location."); return; }
  if(!confirm("Supprimer cet emplacement ?")) return;
  db.locations = db.locations.filter(x=>x.name!==l);
  renderLoc();
  await apiDeleteLocation(l);
}
