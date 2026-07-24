/* ============================================================
   VUES — Personnes & Emplacements
   ============================================================ */

/* ---- Personnes ---- */
function renderPeople(){
  const list = db.users.map(u=>{
    const holding = db.items.filter(i=>i.status==='sorti' && i.out.userId===u.id);
    return `<tr><td data-l="Nom"><b>${esc(u.name)}</b></td>
      <td data-l="A en sa possession">${holding.length?holding.map(i=>`<span class="chip" style="cursor:pointer" onclick="openDetail('${i.id}')">${esc(i.name)} · ${daysSince(i.out.date)} j</span>`).join(""):'<span class="muted">rien</span>'}</td>
      <td><button class="btn danger small" data-id="${u.id}" onclick="delUser(this.dataset.id)">✕</button></td></tr>`;
  }).join("");
  document.getElementById('peopleList').innerHTML = db.users.length
    ? `<table><thead><tr><th>Nom</th><th>A en sa possession</th><th></th></tr></thead><tbody>${list}</tbody></table>`
    : '<div class="empty">Aucune personne enregistrée.</div>';
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
  if(db.items.some(i=>i.status==='sorti'&&i.out.userId===id)){ alert("Cette personne a encore du matériel sorti."); return; }
  if(!confirm("Supprimer cette personne ?")) return;
  db.users = db.users.filter(u=>u.id!==id);
  renderPeople();
  await apiDeletePerson(id);
}

/* ---- Emplacements ---- */
function renderLoc(){
  const sel = document.getElementById('newLocParent'), keep = sel.value;
  sel.innerHTML = '<option value="">— emplacement principal —</option>' + locRoots().map(r=>`<option value="${esc(r.name)}">dans : ${esc(r.name)}</option>`).join("");
  sel.value = keep;
  const locRow = (l,sub)=>{
    const n = db.items.filter(i=>i.home===l.name).length;
    const present = db.items.filter(i=>i.loc===l.name).length;
    return `<tr><td data-l="Emplacement" class="${sub?'subloc':''}"><b>${esc(l.name)}</b></td>
      <td data-l="Contenu">${n} rattaché(s) · ${present} présent(s)</td>
      <td><button class="btn danger small" data-n="${esc(l.name)}" onclick="delLoc(this.dataset.n)">✕</button></td></tr>`;
  };
  let list = "";
  locRoots().forEach(r=>{ list += locRow(r,false); locChildren(r.name).forEach(c=>list += locRow(c,true)); });
  db.locations.filter(l=>l.parent && !locObj(l.parent)).forEach(o=>list += locRow(o,false));
  document.getElementById('locList').innerHTML = db.locations.length
    ? `<table><thead><tr><th>Emplacement</th><th>Contenu</th><th></th></tr></thead><tbody>${list}</tbody></table>`
    : '<div class="empty">Aucun emplacement.</div>';
}
async function addLoc(){
  const inp = document.getElementById('newLoc');
  const n = inp.value.trim();
  const parent = document.getElementById('newLocParent').value||null;
  if(!n) return;
  if(locObj(n)){ alert("Cet emplacement existe déjà."); return; }
  db.locations.push({name:n,parent});
  inp.value = ""; inp.focus();
  renderLoc();
  await apiInsertLocation({name:n,parent});
}
async function delLoc(l){
  if(locChildren(l).length){ alert("Cet emplacement contient des sous-emplacements. Supprime-les d'abord."); return; }
  if(db.items.some(i=>i.home===l)){ alert("Des items sont rattachés à cet emplacement."); return; }
  if(!confirm("Supprimer cet emplacement ?")) return;
  db.locations = db.locations.filter(x=>x.name!==l);
  renderLoc();
  await apiDeleteLocation(l);
}
