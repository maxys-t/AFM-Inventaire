/* ============================================================
   VUE — Inventaire : liste, groupes d'exemplaires, sélection
   multiple, formulaire item, fiche détail, QR, check-in/out
   ============================================================ */

let sel = new Set();        // items sélectionnés (cases à cocher)
let expanded = new Set();   // groupes d'exemplaires dépliés

/* ---- filtres ---- */
function fillFilters(){
  const fc = document.getElementById('fCat'), keep = fc.value;
  fc.innerHTML = '<option value="">Catégorie : toutes</option>' + catOptions();
  fc.value = keep;
  fillSubFilter();
  const fl = document.getElementById('fLoc'), keepL = fl.value;
  fl.innerHTML = '<option value="">Emplacement : tous</option>' + locOptions();
  fl.value = keepL;
}
/* La liste des sous-catégories dépend de la catégorie choisie */
function fillSubFilter(){
  const fc = document.getElementById('fCat'), fs = document.getElementById('fSub');
  if(!fs) return;
  const keep = fs.value;
  if(!fc.value){ fs.innerHTML = '<option value="">Sous-catégorie : toutes</option>'; fs.disabled = true; return; }
  fs.disabled = false;
  fs.innerHTML = '<option value="">Sous-catégorie : toutes</option>' + subOptions(fc.value);
  fs.value = subsOf(fc.value)[keep] ? keep : "";
}
function onCatFilterChange(){ fillSubFilter(); renderInv(); }
function invFiltered(){
  const q = (document.getElementById('q').value||"").toLowerCase();
  const cat = document.getElementById('fCat').value, st = document.getElementById('fStatus').value;
  const sub = (document.getElementById('fSub')||{}).value || "";
  const lo = document.getElementById('fLoc').value, co = document.getElementById('fCond').value;
  return db.items.filter(i=>{
    if(q && !(i.name+" "+i.brand+" "+i.serial+" "+i.id+" "+(i.notes||"")+" "+catPath(i)).toLowerCase().includes(q)) return false;
    if(cat && i.cat!==cat) return false;
    if(sub && i.subcat!==sub) return false;
    if(st && i.status!==st) return false;
    if(lo && !inLocFilter(lo,i.loc) && !inLocFilter(lo,i.home)) return false;
    if(co && i.cond!==co) return false;
    return true;
  });
}

/* ---- rendu de la liste ---- */
function renderInv(){
  const rows = invFiltered();
  const searching = !!(document.getElementById('q').value||"").trim();

  if(!rows.length){
    document.getElementById('invList').innerHTML = '<div class="empty">Aucun item ne correspond.</div>';
    renderBulkBar(); return;
  }

  // Regroupement des exemplaires d'un même modèle (« … #1 », « … #2 »)
  const groups = new Map();
  rows.forEach(i=>{
    const k = groupKeyOf(i.name);
    if(!k) return;
    if(!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });

  const done = new Set();
  let body = "";
  rows.forEach(i=>{
    const k = groupKeyOf(i.name);
    if(k && groups.get(k).length > 1){
      if(done.has(k)) return;
      done.add(k);
      const open = expanded.has(k) || searching;
      body += groupRow(k, groups.get(k), open);
      if(open) body += groups.get(k).map(x=>itemRow(x, true)).join("");
    }else{
      body += itemRow(i, false);
    }
  });

  const allIds = rows.map(i=>i.id);
  const allSel = allIds.length && allIds.every(id=>sel.has(id));
  document.getElementById('invList').innerHTML = `<table><thead><tr>
    <th style="width:34px"><input type="checkbox" ${allSel?'checked':''} onchange="selectAllVisible(this.checked)" title="Tout sélectionner"></th>
    <th></th><th>Item</th><th>Catégorie</th><th>Statut</th><th>Emplacement</th><th>État</th><th></th>
  </tr></thead><tbody>${body}</tbody></table>`;
  renderBulkBar();
}

function itemRow(i, isChild){
  return `<tr class="rowlink ${isChild?'childrow':''} ${sel.has(i.id)?'selrow':''}" onclick="openDetail('${i.id}')">
    <td onclick="event.stopPropagation()"><input type="checkbox" ${sel.has(i.id)?'checked':''} onchange="toggleSel('${i.id}',this.checked)"></td>
    <td>${i.photo?`<img class="thumb" src="${i.photo}">`:""}</td>
    <td data-l="Item">${itemTitle(i)}<br><span class="mono">${i.id}</span></td>
    <td data-l="Catégorie"><span class="tag cat">${esc(subLabel(i.cat,i.subcat))}</span><br><span class="muted">${esc(catLabel(i.cat))}</span></td>
    <td data-l="Statut">${statusTag(i)}</td>
    <td data-l="Emplacement">${esc(i.status==='sorti'?i.loc:locLabel(i.loc))}${i.loc!==i.home?` <span class="muted">(réf : ${esc(locLabel(i.home))})</span>`:""}</td>
    <td data-l="État"><span class="tag ${i.cond}">${CONDS[i.cond]||i.cond}</span></td>
    <td onclick="event.stopPropagation()">${actionBtn(i)}</td>
  </tr>`;
}

function groupRow(key, items, open){
  const dispo = items.filter(i=>i.status==='dispo').length;
  const sortis = items.length - dispo;
  const abimes = items.filter(i=>i.cond!=='bon').length;
  const allSel = items.every(i=>sel.has(i.id));
  const locs = [...new Set(items.map(i=>i.status==='sorti'?i.loc:locLabel(i.loc)))];
  const cats = [...new Set(items.map(i=>i.cat+'/'+i.subcat))];
  const brands = [...new Set(items.map(i=>(i.brand||'').trim()))];
  return `<tr class="grouprow ${allSel?'selrow':''}" onclick="toggleGroup(${JSON.stringify(key).replace(/"/g,'&quot;')})">
    <td onclick="event.stopPropagation()"><input type="checkbox" ${allSel?'checked':''} onchange="selectGroup(${JSON.stringify(key).replace(/"/g,'&quot;')},this.checked)"></td>
    <td><span class="chev">${open?'▾':'▸'}</span></td>
    <td data-l="Item">${brands.length===1&&brands[0]?`<b>${esc(brands[0])}</b> `:''}${esc(key)}<br><span class="muted">${items.length} exemplaires</span></td>
    <td data-l="Catégorie">${cats.length===1?`<span class="tag cat">${esc(subLabel(items[0].cat,items[0].subcat))}</span>`:'<span class="muted">mixte</span>'}</td>
    <td data-l="Statut">${dispo?`<span class="tag dispo">${dispo} dispo</span> `:''}${sortis?`<span class="tag sorti">${sortis} sorti(s)</span>`:''}</td>
    <td data-l="Emplacement">${locs.length===1?esc(locs[0]):'<span class="muted">plusieurs</span>'}</td>
    <td data-l="État">${abimes?`<span class="tag attente">${abimes} à réparer</span>`:'<span class="tag bon">OK</span>'}</td>
    <td></td>
  </tr>`;
}

function toggleGroup(key){
  if(expanded.has(key)) expanded.delete(key); else expanded.add(key);
  renderInv();
}
function statusTag(i){
  if(i.status==='dispo') return '<span class="tag dispo">Disponible</span>';
  const od = overdue(i);
  return `<span class="tag ${od?'hs':'sorti'}">Sorti · ${daysSince(i.out.date)} j${od?' ⚠️':''}</span>`;
}
function actionBtn(i){
  return i.status==='dispo'
    ? `<button class="btn small" onclick="openCheckout('${i.id}')">Check-out</button>`
    : `<button class="btn small ok" onclick="openCheckin('${i.id}')">Check-in</button>`;
}

/* ================= SÉLECTION MULTIPLE ================= */
function toggleSel(id, on){ if(on) sel.add(id); else sel.delete(id); renderInv(); }
function selectGroup(key, on){
  invFiltered().filter(i=>groupKeyOf(i.name)===key).forEach(i=>{ if(on) sel.add(i.id); else sel.delete(i.id); });
  renderInv();
}
function selectAllVisible(on){
  invFiltered().forEach(i=>{ if(on) sel.add(i.id); else sel.delete(i.id); });
  renderInv();
}
function clearSel(){ sel.clear(); renderBulkBar(); }
function selItems(){ return [...sel].map(id=>item(id)).filter(Boolean); }

function renderBulkBar(){
  const bar = document.getElementById('bulkbar');
  if(!bar) return;
  const n = sel.size;
  if(!n || curView()!=='inv'){ bar.style.display = 'none'; bar.innerHTML = ''; return; }
  const its = selItems();
  const nDispo = its.filter(i=>i.status==='dispo').length;
  const nSortis = its.length - nDispo;
  bar.style.display = '';
  bar.innerHTML = `
    <span class="count"><b>${n}</b> sélectionné${n>1?'s':''}</span>
    ${nDispo?`<button class="btn small" onclick="openBulkCheckout()">Check-out (${nDispo})</button>`:''}
    ${nSortis?`<button class="btn small ok" onclick="openBulkCheckin()">Check-in (${nSortis})</button>`:''}
    ${can('edit')?`<button class="btn small sec" onclick="openBulkMove()">Emplacement</button>`:''}
    ${can('edit')?`<button class="btn small sec" onclick="openBulkCat()">Catégorie</button>`:''}
    <button class="btn small sec" onclick="openBulkCond()">État</button>
    ${can('delete')?`<button class="btn small danger" onclick="bulkTrash()">Corbeille</button>`:''}
    <button class="btn small sec" onclick="clearSel()">Annuler</button>`;
}

/* ---- fenêtre générique pour les actions groupées ---- */
let bulkAction = null;
function openBulkModal(title, label, optionsHtml, action, second){
  bulkAction = action;
  document.getElementById('bulk-title').textContent = title;
  document.getElementById('bulk-label').textContent = label;
  document.getElementById('bulk-select').innerHTML = optionsHtml;
  document.getElementById('bulk-select').onchange = second ? fillBulkSub : null;
  const row2 = document.getElementById('bulk-row2');
  row2.style.display = second ? '' : 'none';
  if(second){ document.getElementById('bulk-label2').textContent = second; fillBulkSub(); }
  open_('ovBulk');
}
function fillBulkSub(){
  const c = document.getElementById('bulk-select').value;
  document.getElementById('bulk-select2').innerHTML = '<option value="">— choisir —</option>' + subOptions(c);
}
async function doBulk(){
  const v = document.getElementById('bulk-select').value;
  const v2 = document.getElementById('bulk-select2').value;
  if(document.getElementById('bulk-row2').style.display !== 'none' && !v2){
    alert("La sous-catégorie est obligatoire."); return;
  }
  close_('ovBulk');
  if(bulkAction) await bulkAction(v, v2);
}

function openBulkCat(){
  openBulkModal(`Reclasser ${sel.size} item(s)`, "Catégorie", catOptions(), doBulkCat, "Sous-catégorie");
}
async function doBulkCat(cat, subcat){
  const targets = selItems();
  if(!targets.length) return;
  targets.forEach(i=>{ i.cat = cat; i.subcat = subcat; });
  await apiUpdateItemsIn(targets.map(i=>i.id), {cat, subcat});
  await histMany(targets.map(i=>({itemId:i.id, type:'edit', detail:`reclassé : ${catLabel(cat)} › ${subLabel(cat,subcat)}`})));
  clearSel(); render();
  toast(`${targets.length} item(s) reclassé(s).`, 'ok');
}

function openBulkMove(){
  openBulkModal(`Déplacer ${sel.size} item(s)`, "Nouvel emplacement de référence", locOptions(), doBulkMove);
}
async function doBulkMove(home){
  const targets = selItems();
  if(!targets.length) return;
  targets.forEach(i=>{ i.home = home; if(i.status==='dispo') i.loc = home; });
  const dispo = targets.filter(i=>i.status==='dispo').map(i=>i.id);
  const sortis = targets.filter(i=>i.status!=='dispo').map(i=>i.id);
  await apiUpdateItemsIn(dispo, {home, loc:home});
  await apiUpdateItemsIn(sortis, {home});
  await histMany(targets.map(i=>({itemId:i.id, type:'move', detail:`nouvel emplacement de référence : ${locLabel(home)}`})));
  clearSel(); render();
  toast(`${targets.length} item(s) déplacé(s) vers ${locLabel(home)}.`, 'ok');
}

function openBulkCond(){
  const opts = Object.entries(CONDS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
  openBulkModal(`Changer l'état de ${sel.size} item(s)`, "Nouvel état", opts, doBulkCond);
}
async function doBulkCond(cond){
  const targets = selItems();
  if(!targets.length) return;
  targets.forEach(i=>i.cond = cond);
  await apiUpdateItemsIn(targets.map(i=>i.id), {cond});
  await histMany(targets.map(i=>({itemId:i.id, type:'repair', detail:REPACT[cond]||`état : ${CONDS[cond]}`, cond})));
  clearSel(); render();
  toast(`${targets.length} item(s) : ${CONDS[cond]}.`, 'ok');
}

async function bulkTrash(){
  const targets = selItems();
  if(!targets.length) return;
  if(!db.trashSupported){ alert("La corbeille n'est pas activée : exécute sql/004-corbeille.sql."); return; }
  if(!confirm(`Mettre ${targets.length} item(s) à la corbeille ?\n\nIls seront récupérables pendant ${typeof TRASH_DAYS==='number'?TRASH_DAYS:30} jours.`)) return;
  const d = now(), ids = targets.map(i=>i.id);
  targets.forEach(i=>i.deleted_at = d);
  db.items = db.items.filter(i=>!ids.includes(i.id));
  db.trash.unshift(...targets);
  clearSel(); render();
  if(typeof updateTrashBadge==='function') updateTrashBadge();
  await apiUpdateItemsIn(ids, {deleted_at:d});
  toast(`${targets.length} item(s) mis à la corbeille.`, 'ok');
}

/* ---- formulaire item (ajout / modification) ---- */
let editingId = null;
let pendingPhoto = null;    // photo recadrée en attente d'enregistrement

/* Choix d'une photo → recadrage carré immédiat */
function onPhotoChosen(input){
  const f = input.files[0];
  if(!f) return;
  const rd = new FileReader();
  rd.onload = e=> openCropper(e.target.result, d=>{ pendingPhoto = d; showPhotoPreview(d); });
  rd.readAsDataURL(f);
  input.value = "";
}
function recropPhoto(){
  const cur = pendingPhoto || (editingId && item(editingId) ? item(editingId).photo : null);
  if(!cur){ toast("Aucune photo à recadrer.", 'error'); return; }
  openCropper(cur, d=>{ pendingPhoto = d; showPhotoPreview(d); });
}
function removePhoto(){
  pendingPhoto = '';           // chaîne vide = suppression explicite
  showPhotoPreview(null);
}
function showPhotoPreview(src){
  const z = document.getElementById('i-photo-zone');
  z.innerHTML = src
    ? `<img class="sqphoto" src="${src}">
       <button type="button" class="btn sec small" onclick="recropPhoto()">Recadrer</button>
       <button type="button" class="btn sec small" onclick="removePhoto()">Retirer</button>`
    : `<span class="muted">Aucune photo</span>`;
}
function openItemForm(id){
  editingId = id||null;
  document.getElementById('itemFormTitle').textContent = id?'Modifier l\'item':'Ajouter un item';
  document.getElementById('i-cat').innerHTML = '<option value="">— choisir —</option>' + catOptions();
  document.getElementById('i-home').innerHTML = locOptions();
  const i = id?item(id):null;
  document.getElementById('i-name').value = i?i.name:"";
  document.getElementById('i-cat').value = i?i.cat:"";
  fillSubForm(i?i.subcat:"");
  document.getElementById('i-brand').value = i?i.brand:"";
  document.getElementById('i-serial').value = i?i.serial:"";
  document.getElementById('i-cond').value = i?i.cond:"bon";
  if(i) document.getElementById('i-home').value = i.home;
  document.getElementById('i-notes').value = i?i.notes:"";
  document.getElementById('i-photo').value = "";
  pendingPhoto = null;
  showPhotoPreview(i ? i.photo : null);
  document.getElementById('qtyField').style.display = id?'none':'';
  document.getElementById('i-qty').value = 1;
  open_('ovItem');
}
/* Sous-catégories du formulaire, dépendantes de la catégorie choisie */
function fillSubForm(sel){
  const c = document.getElementById('i-cat').value;
  const el = document.getElementById('i-subcat');
  if(!c){ el.innerHTML = '<option value="">— choisir une catégorie d\'abord —</option>'; el.disabled = true; return; }
  el.disabled = false;
  el.innerHTML = '<option value="">— choisir —</option>' + subOptions(c, sel);
  if(sel) el.value = sel;
}

function saveItem(){
  const name = document.getElementById('i-name').value.trim();
  if(!name){ alert("Le nom est obligatoire."); return; }
  const cat = document.getElementById('i-cat').value;
  const subcat = document.getElementById('i-subcat').value;
  if(!cat){ alert("La catégorie est obligatoire."); return; }
  if(!subcat){ alert("La sous-catégorie est obligatoire."); return; }
  if(!db.locations.length){ alert("Créez d'abord un emplacement (onglet Emplacements)."); return; }
  const vals = {
    name, cat, subcat, brand:document.getElementById('i-brand').value.trim(),
    serial:document.getElementById('i-serial').value.trim(), cond:document.getElementById('i-cond').value,
    home:document.getElementById('i-home').value, notes:document.getElementById('i-notes').value.trim()
  };
  const finish = async (photo)=>{
    if(editingId){
      const i = item(editingId);
      const movedHome = i.home!==vals.home;
      const condChanged = i.cond!==vals.cond;
      Object.assign(i,vals);
      if(photo !== null) i.photo = photo || null;
      if(i.status==='dispo' && movedHome) i.loc = vals.home;
      await apiUpdateItem(i.id, {...vals, photo:i.photo, loc:i.loc});
      if(movedHome && i.status==='dispo') await hist(i.id,'move',`nouvel emplacement de référence : ${locLabel(vals.home)}`);
      if(condChanged) await hist(i.id,'repair',REPACT[vals.cond]||`état : ${CONDS[vals.cond]}`,null,vals.cond);
      else await hist(i.id,'edit');
    }else{
      const qty = Math.max(1, Math.min(200, parseInt(document.getElementById('i-qty').value)||1));
      const base = groupKeyOf(name) || name;   // « Câble #4 » saisi → famille « Câble »
      const start = 1 + db.items.filter(x=>x.name===base || groupKeyOf(x.name)===base).length;
      const rows = [];
      for(let k=0;k<qty;k++){
        const id = uid(vals.cat, vals.subcat);
        const nm = qty>1 ? `${base} #${start+k}` : name;
        const row = {id,...vals,name:nm,photo:photo||null,loc:vals.home,status:"dispo",out:null};
        db.items.push(row); rows.push(row);
      }
      await apiInsertItems(rows);
      await histMany(rows.map(r=>({itemId:r.id, type:'create', detail:"Ajout à l'inventaire"})));
    }
    close_('ovItem'); render();
  };
  finish(pendingPhoto);
}
async function deleteItem(id){
  const i = item(id);
  if(!i) return;
  if(!db.trashSupported){
    alert("La corbeille n'est pas encore activée : exécute sql/004-corbeille.sql dans Supabase.");
    return;
  }
  if(i.status==='sorti' && !confirm(`« ${i.name} » est actuellement sorti (${outBy(i)}).\nLe mettre quand même à la corbeille ?`)) return;
  else if(i.status!=='sorti' && !confirm(`Mettre « ${i.name} » à la corbeille ?\n\nIl sera récupérable pendant ${typeof TRASH_DAYS==='number'?TRASH_DAYS:30} jours, avec son historique.`)) return;
  db.items = db.items.filter(x=>x.id!==id);
  i.deleted_at = now();
  db.trash.unshift(i);
  sel.delete(id);
  close_('ovDetail'); render();
  if(typeof updateTrashBadge==='function') updateTrashBadge();
  await apiTrashItem(id);
  toast(`« ${i.name} » mis à la corbeille.`, 'ok', "Annuler", ()=>restoreItem(id));
}

/* ================= CHECK-OUT / CHECK-IN ================= */
let actionId = null, bulkMode = false;

function openCheckout(id){
  if(!db.users.length){ alert("Ajoutez d'abord une personne (onglet Personnes)."); return; }
  actionId = id; bulkMode = false;
  document.getElementById('out-item').textContent = item(id).name;
  prepCheckoutForm();
}
function openBulkCheckout(){
  if(!db.users.length){ alert("Ajoutez d'abord une personne (onglet Personnes)."); return; }
  const n = selItems().filter(i=>i.status==='dispo').length;
  if(!n){ toast("Aucun item disponible dans la sélection.", 'error'); return; }
  actionId = null; bulkMode = true;
  document.getElementById('out-item').textContent = `${n} item(s)`;
  prepCheckoutForm();
}
function prepCheckoutForm(){
  document.getElementById('out-user').innerHTML = db.users.map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join("");
  document.getElementById('out-reason').value = "";
  document.getElementById('out-due').value = "";
  document.getElementById('out-alert').checked = true;
  open_('ovOut');
}
async function doCheckout(){
  const reason = document.getElementById('out-reason').value.trim();
  if(!reason){ alert("Indiquez la destination ou la raison."); return; }
  const due = document.getElementById('out-due').value || null;
  const alertOn = document.getElementById('out-alert').checked;
  const userId = document.getElementById('out-user').value;
  const targets = bulkMode ? selItems().filter(i=>i.status==='dispo') : [item(actionId)];
  if(!targets.length) return;

  const out = {userId, date:now(), reason, due, alertOn};
  targets.forEach(i=>{ i.status='sorti'; i.out={...out}; i.loc=reason; });
  await apiUpdateItemsIn(targets.map(i=>i.id), {status:'sorti', out, loc:reason});
  await histMany(targets.map(i=>({itemId:i.id, type:'out',
    detail: reason + (due?` — retour prévu le ${fdateD(due)}`:''), userId})));
  close_('ovOut');
  if(bulkMode){ clearSel(); toast(`${targets.length} item(s) sortis.`, 'ok'); }
  bulkMode = false; render();
}

function openCheckin(id){
  actionId = id; bulkMode = false;
  const i = item(id);
  document.getElementById('in-item').textContent = i.name;
  document.getElementById('in-cond').value = i.cond;
  document.getElementById('in-note').value = "";
  open_('ovIn');
}
function openBulkCheckin(){
  const n = selItems().filter(i=>i.status==='sorti').length;
  if(!n){ toast("Aucun item sorti dans la sélection.", 'error'); return; }
  actionId = null; bulkMode = true;
  document.getElementById('in-item').textContent = `${n} item(s)`;
  document.getElementById('in-cond').value = 'bon';
  document.getElementById('in-note').value = "";
  open_('ovIn');
}
async function doCheckin(){
  const cond = document.getElementById('in-cond').value, note = document.getElementById('in-note').value.trim();
  const targets = bulkMode ? selItems().filter(i=>i.status==='sorti') : [item(actionId)];
  if(!targets.length) return;
  const rows = [];
  for(const i of targets){
    const userId = i.out?i.out.userId:null;
    i.status='dispo'; i.cond=cond; i.loc=i.home; i.out=null;
    await apiUpdateItem(i.id, {status:'dispo', cond, loc:i.home, out:null});
    rows.push({itemId:i.id, type:'in', detail:note, userId, cond});
  }
  await histMany(rows);
  close_('ovIn');
  if(bulkMode){ clearSel(); toast(`${targets.length} item(s) rentrés.`, 'ok'); }
  bulkMode = false; render();
}

/* ================= FICHE ITEM ================= */
function openDetail(id){
  const i = item(id);
  if(!i){ toast(`Item ${id} introuvable.`, 'error'); return; }
  const rows = db.history.filter(h=>h.itemId===id).map(h=>
    `<li>${histIcon(h.type)} ${histText(h)}<div class="when">${fdate(h.date)}${histBy(h)}</div></li>`).join("");
  const outInfo = i.status==='sorti'
    ? `<div class="alert ${overdue(i)?'bad':''}">📤 Sorti depuis le <b>${fdate(i.out.date)}</b> (${daysSince(i.out.date)} j) — <b>${esc(outBy(i))}</b> · ${esc(i.out.reason)}${i.out.due?`<br>Retour prévu le <b>${fdateD(i.out.due)}</b>${overdue(i)?` — <span class="days-late">en retard de ${daysLate(i)} j</span>`:''}`:''}</div>` : "";
  const repBtns = i.cond==='bon'
    ? `<button class="btn sec small" onclick="openRepair('${i.id}','attente')">Signaler à réparer</button>`
    : `<button class="btn small ok" onclick="openRepair('${i.id}','bon')">Marquer réparé</button>`;
  document.getElementById('detailBody').innerHTML = `
    <h3>${itemTitle(i)} <span class="mono">${i.id}</span></h3>
    ${i.photo?`<img class="itemphoto" src="${i.photo}">`:""}
    <p style="margin-bottom:10px">
      <span class="tag cat">${esc(catPath(i))}</span> ${statusTag(i)} <span class="tag ${i.cond}">${CONDS[i.cond]||i.cond}</span>
    </p>
    ${outInfo}
    <p class="muted" style="margin-bottom:4px">
      ${i.serial?`N° série : <b>${esc(i.serial)}</b><br>`:""}
      Emplacement de référence : <b>${esc(locLabel(i.home))}</b><br>
      Emplacement actuel : <b>${esc(i.status==='sorti'?i.loc:locLabel(i.loc))}</b>
    </p>
    ${i.notes?`<p class="muted" style="margin-bottom:10px">📝 ${esc(i.notes)}</p>`:""}
    <div class="modal-actions" style="justify-content:flex-start;margin:12px 0;flex-wrap:wrap">
      ${actionBtn(i)}
      ${repBtns}
      ${can('edit')?`<button class="btn sec small" onclick="openItemForm('${i.id}')">Modifier</button>`:''}
      <button class="btn sec small" onclick="showLabel('${i.id}')">Étiquette / QR</button>
      ${can('delete')?`<button class="btn danger small" onclick="deleteItem('${i.id}')">Mettre à la corbeille</button>`:''}
    </div>
    <div id="qrzone"></div>
    <h3 style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Historique</h3>
    <ul class="hist">${rows||'<li class="muted">Aucun mouvement</li>'}</ul>
    <div class="modal-actions"><button class="btn sec" onclick="close_('ovDetail')">Fermer</button></div>`;
  open_('ovDetail');
}

/* Ouverture d'une fiche après scan d'un QR code */
function consumePendingItem(){
  const id = localStorage.getItem('pendingItem');
  if(!id) return;
  localStorage.removeItem('pendingItem');
  if(item(id)) openDetail(id);
  else toast(`Item ${id} introuvable (supprimé ?).`, 'error');
}

/* ---- étiquette / QR : encode l'adresse de la fiche ---- */
function showLabel(id){
  const i = item(id), z = document.getElementById('qrzone');
  z.innerHTML = `<div id="qrbox"><div id="qrcode"></div>
    <div style="color:#000;text-align:center;font-family:monospace;font-weight:700;margin-top:6px">${i.id}</div>
    <div style="color:#000;text-align:center;font-size:12px">${esc(i.name)}</div></div>
    <div><button class="btn small sec" onclick="printLabel()">🖨️ Imprimer l'étiquette</button>
    <span class="muted" style="margin-left:8px">Scanner ouvre la fiche dans l'app</span></div>`;
  if(typeof QRCode!=='undefined') new QRCode(document.getElementById('qrcode'),{text:itemUrl(i.id),width:110,height:110});
  else document.getElementById('qrcode').innerHTML = '<span style="color:#000;font-size:12px">(QR indisponible hors ligne)</span>';
}
function printLabel(){
  const box = document.getElementById('qrbox');
  if(!box) return;
  const p = document.getElementById('labelPrint');
  p.innerHTML = box.outerHTML; p.style.display = 'block';
  window.print();
  p.style.display = 'none';
}
