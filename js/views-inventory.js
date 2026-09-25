/* ============================================================
   VUE — Inventaire : liste, groupes d'exemplaires, sélection
   multiple, formulaire item, fiche détail, QR, check-in/out
   ============================================================ */

let sel = new Set();        // items sélectionnés (cases à cocher)
let sortDir = 1;            // 1 = croissant, -1 = décroissant
let expanded = new Set();   // groupes d'exemplaires dépliés

/* ---- filtres ---- */
function fillFilters(){
  const fc = document.getElementById('fCat'), keep = fc.value;
  fc.innerHTML = '<option value="">Category: all</option>' + catOptions();
  fc.value = keep;
  fillSubFilter();
  const fl = document.getElementById('fLoc'), keepL = fl.value;
  fl.innerHTML = '<option value="">Location: all</option>' + locOptions();
  fl.value = keepL;
  fillValueFilter('fOwner', 'Owner', i=>i.owner);
  fillValueFilter('fProv',  'Provider',  i=>i.provider);
}

/* Remplit un menu déroulant avec les valeurs présentes dans l'inventaire */
function fillValueFilter(id, label, get){
  const el = document.getElementById(id);
  if(!el) return;
  const keep = el.value;
  const vals = [...new Set(db.items.map(i=>(get(i)||'').trim()).filter(Boolean))]
                 .sort((a,b)=>a.localeCompare(b,'fr'));
  const vides = db.items.filter(i=>!(get(i)||'').trim()).length;
  el.innerHTML = `<option value="">${label}: all</option>`
    + vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")
    + (vides ? `<option value="__vide__">— not set (${vides})</option>` : '');
  el.value = keep;
  if(el.value !== keep) el.value = "";      // la valeur a disparu
}
/* La liste des sous-catégories dépend de la catégorie choisie */
function fillSubFilter(){
  const fc = document.getElementById('fCat'), fs = document.getElementById('fSub');
  if(!fs) return;
  const keep = fs.value;
  if(!fc.value){ fs.innerHTML = '<option value="">Sub-category: all</option>'; fs.disabled = true; return; }
  fs.disabled = false;
  fs.innerHTML = '<option value="">Sub-category: all</option>' + subOptions(fc.value);
  fs.value = subsOf(fc.value)[keep] ? keep : "";
}
function onCatFilterChange(){ fillSubFilter(); renderInv(); }
function invFiltered(){
  const q = (document.getElementById('q').value||"").toLowerCase();
  const cat = document.getElementById('fCat').value, st = document.getElementById('fStatus').value;
  const sub = (document.getElementById('fSub')||{}).value || "";
  const lo = document.getElementById('fLoc').value, co = document.getElementById('fCond').value;
  const ow = (document.getElementById('fOwner')||{}).value || "";
  const pr = (document.getElementById('fProv')||{}).value || "";
  const match = (v, f)=> f === '__vide__' ? !(v||'').trim() : (v||'').trim() === f;
  return db.items.filter(i=>{
    if(q && !(i.name+" "+i.brand+" "+i.serial+" "+i.id+" "+(i.notes||"")+" "+(i.owner||"")+" "+(i.provider||"")+" "+(i.sales_order||"")+" "+catPath(i)).toLowerCase().includes(q)) return false;
    if(cat && i.cat!==cat) return false;
    if(sub && i.subcat!==sub) return false;
    if(st && i.status!==st) return false;
    if(lo && !inLocFilter(lo,i.loc) && !inLocFilter(lo,i.home)) return false;
    if(co && i.cond!==co) return false;
    if(ow && !match(i.owner, ow)) return false;
    if(pr && !match(i.provider, pr)) return false;
    return true;
  });
}

/* ---- tri ----
   Les valeurs absentes finissent toujours en bas, quel que soit le sens :
   un item sans prix n'a rien à faire en tête d'un classement par prix. */
function toggleSortDir(){
  sortDir = -sortDir;
  document.getElementById('sortDir').textContent = sortDir > 0 ? '↑' : '↓';
  renderInv();
}
function sortValue(i, by){
  switch(by){
    case 'name':  return itemTitleText(i).toLowerCase();
    case 'id':    return i.id;
    case 'cat':   return catPath(i).toLowerCase();
    case 'loc':   return (i.status==='sorti' ? i.loc : locLabel(i.loc) || '').toLowerCase();
    case 'cond':  return ['bon','attente','reparation','hs'].indexOf(i.cond);
    case 'price': return (i.price==null || i.price==='') ? null : Number(i.price);
    case 'pdate': return i.purchase_date || null;     // « aaaa-mm-jj » se compare tel quel
    case 'owner': return (i.owner||'').toLowerCase();
    case 'prov':  return (i.provider||'').toLowerCase();
  }
  return null;
}
function sortItems(rows, by){
  if(!by) return rows;
  const vide = v => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v)) || v === -1;
  return [...rows].sort((a,b)=>{
    const x = sortValue(a,by), y = sortValue(b,by);
    if(vide(x) && vide(y)) return a.id.localeCompare(b.id);
    if(vide(x)) return 1;
    if(vide(y)) return -1;
    if(typeof x === 'number' && typeof y === 'number') return (x-y) * sortDir;
    return String(x).localeCompare(String(y),'fr') * sortDir;
  });
}

/* ---- remise à zéro des filtres ---- */
const FILTER_IDS = ['q','fCat','fSub','fStatus','fLoc','fOwner','fProv','fCond','fSort'];
function filtersActive(){
  return FILTER_IDS.some(id=>{ const el = document.getElementById(id); return el && el.value; });
}
function resetFilters(){
  FILTER_IDS.forEach(id=>{ const el = document.getElementById(id); if(el) el.value = ''; });
  sortDir = 1;
  const sd = document.getElementById('sortDir');
  if(sd) sd.textContent = '↑';
  fillSubFilter();
  renderInv();
}
function updateResetBtn(){
  const b = document.getElementById('btnReset');
  if(!b) return;
  const on = filtersActive();
  b.disabled = !on;
  b.classList.toggle('on', on);
}

/* ---- séparateurs de section ----
   Uniquement quand un tri est actif : ils suivent le critère choisi.
   Les valeurs absentes étant toujours renvoyées en fin de liste par
   sortItems(), leur section (« No price »…) arrive naturellement en bas. */
function sepFor(i, by){
  switch(by){
    case 'name': {
      const c = (itemTitleText(i).trim().toUpperCase().charAt(0) || '—');
      if(/[A-Z]/.test(c)) return c;
      return /[0-9]/.test(c) ? '0–9' : 'Other';
    }
    case 'id':    return (String(i.id).split('-')[0] || '—');
    case 'cat':   return catLabel(i.cat) || 'Uncategorised';
    case 'loc':   return (i.status==='sorti' ? i.loc : locLabel(i.loc)) || 'No location';
    case 'cond':  return CONDS[i.cond] || i.cond;
    case 'owner': return (i.owner||'').trim() || 'No owner';
    case 'prov':  return (i.provider||'').trim() || 'No provider';
    case 'price': {
      if(i.price==null || i.price==='') return 'No price';
      const p = Number(i.price);
      if(isNaN(p)) return 'No price';
      if(p < 100)  return 'Under 100 €';
      if(p < 500)  return '100 – 500 €';
      if(p < 1000) return '500 – 1 000 €';
      if(p < 5000) return '1 000 – 5 000 €';
      return '5 000 € and above';
    }
    case 'pdate': {
      if(!i.purchase_date) return 'No purchase date';
      const d = new Date(i.purchase_date);
      if(isNaN(d.getTime())) return 'No purchase date';
      return d.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
    }
  }
  return null;
}
function sepRow(label, span){
  return `<tr class="seprow"><td colspan="${span}">${esc(label)}</td></tr>`;
}

/* ---- en-tête du tableau, construit à partir des colonnes visibles ---- */
function invHeadHtml(allSel){
  const cols = invColDefs();
  return `<tr>
    <th class="cbcol"><input type="checkbox" ${allSel?'checked':''} onchange="selectAllVisible(this.checked)" title="Select all"></th>
    ${cols.map(c=>`<th class="col-${c.k}">${c.k==='photo' ? '' : esc(c.label)}</th>`).join("")}
    <th class="actcol"></th>
  </tr>`;
}

/* ---- rendu de la liste ---- */
function renderInv(){
  const by = (document.getElementById('fSort')||{}).value || "";
  const rows = sortItems(invFiltered(), by);
  const searching = !!(document.getElementById('q').value||"").trim();
  renderInvSummary(rows);
  updateResetBtn();

  const wrap = document.getElementById('invList');
  if(!rows.length){
    wrap.innerHTML = '<div class="empty">No item matches.</div>';
    renderBulkBar(); return;
  }

  const span = invColDefs().length + 2;

  // Un tri explicite affiche une liste à plat : regrouper masquerait le classement.
  if(by){
    const allSelF = rows.length && rows.every(i=>sel.has(i.id));
    let body = "", lastSep = null;
    rows.forEach(i=>{
      const s = sepFor(i, by);
      if(s !== null && s !== lastSep){ lastSep = s; body += sepRow(s, span); }
      body += itemRow(i, false);
    });
    wrap.innerHTML = `<div class="invwrap"><table class="invtable">
      <thead>${invHeadHtml(allSelF)}</thead><tbody>${body}</tbody></table></div>`;
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
  wrap.innerHTML = `<div class="invwrap"><table class="invtable">
    <thead>${invHeadHtml(allSel)}</thead><tbody>${body}</tbody></table></div>`;
  renderBulkBar();
}

/* Résumé de ce qui est affiché : nombre d'items et valeur d'achat cumulée */
function renderInvSummary(rows){
  const el = document.getElementById('invSummary');
  if(!el) return;
  const avecPrix = rows.filter(i=>i.price!=null && i.price!=='');
  const total = avecPrix.reduce((s,i)=>s + Number(i.price), 0);
  const sortis = rows.filter(i=>i.status==='sorti').length;
  el.innerHTML = `<b>${rows.length}</b> item${rows.length>1?'s':''} shown`
    + (rows.length !== db.items.length ? ` <span class="muted">of ${db.items.length}</span>` : '')
    + (sortis ? ` · ${sortis} checked out` : '')
    + (canSeeValue() && avecPrix.length ? ` · purchase value <b>${fprice(total)}</b>`
        + (avecPrix.length !== rows.length ? ` <span class="muted">(${avecPrix.length} with a price)</span>` : '') : '');
}

/* ---- contenu des cellules ----
   invCellText() renvoie le texte brut : il sert à la fois à l'infobulle
   au survol (le nom complet reste lisible même tronqué) et au calcul
   des valeurs communes sur une ligne de groupe. */
function invCellText(c, i){
  switch(c.k){
    case 'item':   return itemTitleText(i);
    case 'id':     return i.id;
    case 'cat':    return subLabel(i.cat, i.subcat);
    case 'family': return catLabel(i.cat);
    case 'loc':    return (i.status==='sorti' ? i.loc : locLabel(i.loc)) || '';
    case 'home':   return locLabel(i.home) || '';
    case 'owner':  return i.owner || '';
    case 'prov':   return i.provider || '';
    case 'price':  return (i.price==null || i.price==='') ? '' : fprice(Number(i.price));
    case 'pdate':  return i.purchase_date ? fdateOnly(i.purchase_date) : '';
    case 'so':     return i.sales_order || '';
    case 'serial': return i.serial || '';
  }
  return '';
}
function invCell(c, i){
  switch(c.k){
    case 'photo':  return i.photo ? `<img class="thumb" loading="lazy" src="${i.photo}">` : '';
    case 'item':   return itemTitle(i);
    case 'id':     return `<span class="mono">${esc(i.id)}</span>`;
    case 'cat':    return `<span class="tag cat">${esc(subLabel(i.cat,i.subcat))}</span>`;
    case 'status': return statusTag(i);
    case 'cond':   return `<span class="tag ${i.cond}">${esc(CONDS[i.cond]||i.cond)}</span>`;
    // Un item qui n'est pas à sa place se repère d'un coup d'œil.
    case 'home':   return `<span class="${i.loc!==i.home?'awayhome':''}">${esc(invCellText(c,i))}</span>`;
    default:       return esc(invCellText(c,i));
  }
}
const NO_TITLE = ['photo','status','cond'];

function itemRow(i, isChild){
  const cols = invColDefs();
  const cells = cols.map(c=>{
    const t = NO_TITLE.includes(c.k) ? '' : invCellText(c, i);
    return `<td class="col-${c.k}" data-l="${esc(c.label)}"${t?` title="${esc(t)}"`:''}>${invCell(c,i)}</td>`;
  }).join("");
  return `<tr class="rowlink ${isChild?'childrow':''} ${sel.has(i.id)?'selrow':''}" onclick="openDetail('${i.id}')">
    <td class="cbcol" onclick="event.stopPropagation()"><input type="checkbox" ${sel.has(i.id)?'checked':''} onchange="toggleSel('${i.id}',this.checked)"></td>
    ${cells}
    <td class="actcol" onclick="event.stopPropagation()">${actionBtn(i)}</td>
  </tr>`;
}

/* Ligne de groupe : même jeu de colonnes, mais chaque cellule résume
   les exemplaires au lieu d'en décrire un seul. */
function groupCell(c, key, items, open){
  const uniq = a => [...new Set(a)];
  switch(c.k){
    case 'photo': {
      const ph = uniq(items.map(i=>i.photo||''));
      return ph.length===1 && ph[0] ? `<img class="thumb" loading="lazy" src="${ph[0]}">` : '';
    }
    case 'item': {
      const brands = uniq(items.map(i=>(i.brand||'').trim()));
      return `<span class="chev">${open?'▾':'▸'}</span> `
           + (brands.length===1 && brands[0] ? `<b>${esc(brands[0])}</b> ` : '')
           + `${esc(key)} <span class="muted">${items.length} copies</span>`;
    }
    case 'cat': {
      const cc = uniq(items.map(i=>i.cat+'/'+i.subcat));
      return cc.length===1
        ? `<span class="tag cat">${esc(subLabel(items[0].cat,items[0].subcat))}</span>`
        : '<span class="muted">mixed</span>';
    }
    case 'status': {
      const dispo = items.filter(i=>i.status==='dispo').length;
      const sortis = items.length - dispo;
      return (dispo?`<span class="tag dispo">${dispo} available</span> `:'')
           + (sortis?`<span class="tag sorti">${sortis} out</span>`:'');
    }
    case 'cond': {
      const bad = items.filter(i=>i.cond!=='bon').length;
      return bad ? `<span class="tag attente">${bad} to fix</span>` : '<span class="tag bon">OK</span>';
    }
    case 'price': {
      const wp = items.filter(i=>i.price!=null && i.price!=='');
      return wp.length ? fprice(wp.reduce((s,i)=>s+Number(i.price),0)) : '';
    }
    default: {
      const v = uniq(items.map(i=>invCellText(c,i)).filter(Boolean));
      if(!v.length) return '';
      return v.length===1 ? esc(v[0]) : '<span class="muted">several</span>';
    }
  }
}

function groupRow(key, items, open){
  const allSel = items.every(i=>sel.has(i.id));
  const k = JSON.stringify(key).replace(/"/g,'&quot;');
  const cells = invColDefs()
    .map(c=>`<td class="col-${c.k}" data-l="${esc(c.label)}">${groupCell(c,key,items,open)}</td>`)
    .join("");
  return `<tr class="grouprow ${allSel?'selrow':''}" onclick="toggleGroup(${k})">
    <td class="cbcol" onclick="event.stopPropagation()"><input type="checkbox" ${allSel?'checked':''} onchange="selectGroup(${k},this.checked)"></td>
    ${cells}
    <td class="actcol"></td>
  </tr>`;
}

function toggleGroup(key){
  if(expanded.has(key)) expanded.delete(key); else expanded.add(key);
  renderInv();
}
function statusTag(i){
  if(i.status==='dispo') return '<span class="tag dispo">Available</span>';
  const od = overdue(i);
  return `<span class="tag ${od?'hs':'sorti'}">Out · ${daysSince(i.out.date)}d${od?' ⚠️':''}</span>`;
}
function actionBtn(i){
  return i.status==='dispo'
    ? `<button class="btn small" onclick="openCheckout('${i.id}')">Check out</button>`
    : `<button class="btn small ok" onclick="openCheckin('${i.id}')">Check in</button>`;
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
    <span class="count"><b>${n}</b> selected</span>
    ${nDispo?`<button class="btn small" onclick="openBulkCheckout()">Check out (${nDispo})</button>`:''}
    ${nSortis?`<button class="btn small ok" onclick="openBulkCheckin()">Check in (${nSortis})</button>`:''}
    ${can('edit')?`<button class="btn small sec" onclick="openBulkMove()">Move</button>`:''}
    ${can('edit')?`<button class="btn small sec" onclick="openBulkCat()">Category</button>`:''}
    <button class="btn small sec" onclick="openBulkCond()">Condition</button>
    ${can('delete')?`<button class="btn small danger" onclick="bulkTrash()">Trash</button>`:''}
    <button class="btn small sec" onclick="clearSel()">Clear</button>`;
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
    alert("Sub-category is required."); return;
  }
  close_('ovBulk');
  if(bulkAction) await bulkAction(v, v2);
}

function openBulkCat(){
  openBulkModal(`Re-categorise ${sel.size} item(s)`, "Category", catOptions(), doBulkCat, "Sub-category");
}
async function doBulkCat(cat, subcat){
  const targets = selItems();
  if(!targets.length) return;
  targets.forEach(i=>{ i.cat = cat; i.subcat = subcat; });
  await apiUpdateItemsIn(targets.map(i=>i.id), {cat, subcat});
  await histMany(targets.map(i=>({itemId:i.id, type:'edit', detail:`re-categorised: ${catLabel(cat)} › ${subLabel(cat,subcat)}`})));
  clearSel(); render();
  toast(`${targets.length} item(s) re-categorised.`, 'ok');
}

function openBulkMove(){
  openBulkModal(`Move ${sel.size} item(s)`, "New home location", locOptions(), doBulkMove);
}
async function doBulkMove(home){
  const targets = selItems();
  if(!targets.length) return;
  targets.forEach(i=>{ i.home = home; if(i.status==='dispo') i.loc = home; });
  const dispo = targets.filter(i=>i.status==='dispo').map(i=>i.id);
  const sortis = targets.filter(i=>i.status!=='dispo').map(i=>i.id);
  await apiUpdateItemsIn(dispo, {home, loc:home});
  await apiUpdateItemsIn(sortis, {home});
  await histMany(targets.map(i=>({itemId:i.id, type:'move', detail:`new home location: ${locLabel(home)}`})));
  clearSel(); render();
  toast(`${targets.length} item(s) moved to ${locLabel(home)}.`, 'ok');
}

function openBulkCond(){
  const opts = Object.entries(CONDS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
  openBulkModal(`Change condition of ${sel.size} item(s)`, "New condition", opts, doBulkCond);
}
async function doBulkCond(cond){
  const targets = selItems();
  if(!targets.length) return;
  targets.forEach(i=>i.cond = cond);
  await apiUpdateItemsIn(targets.map(i=>i.id), {cond});
  await histMany(targets.map(i=>({itemId:i.id, type:'repair', detail:REPACT[cond]||`condition: ${CONDS[cond]}`, cond})));
  clearSel(); render();
  toast(`${targets.length} item(s) : ${CONDS[cond]}.`, 'ok');
}

async function bulkTrash(){
  const targets = selItems();
  if(!targets.length) return;
  if(!db.trashSupported){ alert("Trash is not enabled — run sql/004-corbeille.sql."); return; }
  if(!confirm(`Move ${targets.length} item(s) to the trash?\n\nThey stay recoverable for ${typeof TRASH_DAYS==='number'?TRASH_DAYS:30} days.`)) return;
  const d = now(), ids = targets.map(i=>i.id);
  targets.forEach(i=>i.deleted_at = d);
  db.items = db.items.filter(i=>!ids.includes(i.id));
  db.trash.unshift(...targets);
  clearSel(); render();
  if(typeof updateTrashBadge==='function') updateTrashBadge();
  await apiUpdateItemsIn(ids, {deleted_at:d});
  toast(`${targets.length} item(s) moved to the trash.`, 'ok');
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
  if(!cur){ toast("No photo to crop.", 'error'); return; }
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
       <button type="button" class="btn sec small" onclick="recropPhoto()">Crop</button>
       <button type="button" class="btn sec small" onclick="removePhoto()">Remove</button>`
    : `<span class="muted">No photo</span>`;
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
  document.getElementById('i-owner').value = i?(i.owner||""):"";
  document.getElementById('i-provider').value = i?(i.provider||""):"";
  document.getElementById('i-price').value = (i && i.price!=null)?String(i.price).replace('.',','):"";
  document.getElementById('i-order').value = i?(i.sales_order||""):"";
  document.getElementById('i-date').value = i?(i.purchase_date||""):"";
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
  if(!c){ el.innerHTML = '<option value="">— pick a category first —</option>'; el.disabled = true; return; }
  el.disabled = false;
  el.innerHTML = '<option value="">— choisir —</option>' + subOptions(c, sel);
  if(sel) el.value = sel;
}

function saveItem(){
  const name = document.getElementById('i-name').value.trim();
  if(!name){ alert("Name is required."); return; }
  const cat = document.getElementById('i-cat').value;
  const subcat = document.getElementById('i-subcat').value;
  if(!cat){ alert("Category is required."); return; }
  if(!subcat){ alert("Sub-category is required."); return; }
  if(!db.locations.length){ alert("Create a location first (Settings › Locations)."); return; }
  const vals = {
    name, cat, subcat, brand:document.getElementById('i-brand').value.trim(),
    serial:document.getElementById('i-serial').value.trim(), cond:document.getElementById('i-cond').value,
    home:document.getElementById('i-home').value, notes:document.getElementById('i-notes').value.trim(),
    owner:document.getElementById('i-owner').value.trim(), provider:document.getElementById('i-provider').value.trim(),
    price:parsePrice(document.getElementById('i-price').value),
    sales_order:document.getElementById('i-order').value.trim(),
    purchase_date:document.getElementById('i-date').value || null
  };
  const finish = async (photo)=>{
    // Une photo fraîchement recadrée part dans le stockage ; on ne garde que son lien.
    const uploadIfNeeded = async (dataUrl, id)=>{
      if(!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
      return await apiUploadPhoto(dataUrl, `items/${id}.jpg`);
    };
    if(editingId){
      const i = item(editingId);
      const movedHome = i.home!==vals.home;
      const condChanged = i.cond!==vals.cond;
      Object.assign(i,vals);
      if(photo !== null) i.photo = photo ? await uploadIfNeeded(photo, editingId) : null;
      if(i.status==='dispo' && movedHome) i.loc = vals.home;
      await apiUpdateItem(i.id, {...vals, photo:i.photo, loc:i.loc});
      if(movedHome && i.status==='dispo') await hist(i.id,'move',`new home location: ${locLabel(vals.home)}`);
      if(condChanged) await hist(i.id,'repair',REPACT[vals.cond]||`condition: ${CONDS[vals.cond]}`,null,vals.cond);
      else await hist(i.id,'edit');
    }else{
      const qty = Math.max(1, Math.min(200, parseInt(document.getElementById('i-qty').value)||1));
      const base = groupKeyOf(name) || name;   // « Câble #4 » saisi → famille « Câble »
      const start = 1 + db.items.filter(x=>x.name===base || groupKeyOf(x.name)===base).length;
      const rows = [];
      const shared = photo ? await uploadIfNeeded(photo, uid(vals.cat, vals.subcat)) : null;
      for(let k=0;k<qty;k++){
        const id = uid(vals.cat, vals.subcat);
        const nm = qty>1 ? `${base} #${start+k}` : name;
        const row = {id,...vals,name:nm,photo:shared,loc:vals.home,status:"dispo",out:null};
        db.items.push(row); rows.push(row);
      }
      await apiInsertItems(rows);
      await histMany(rows.map(r=>({itemId:r.id, type:'create', detail:"Added to inventory"})));
    }
    close_('ovItem'); render();
  };
  finish(pendingPhoto);
}
async function deleteItem(id){
  const i = item(id);
  if(!i) return;
  if(!db.trashSupported){
    alert("Trash is not enabled yet — run sql/004-corbeille.sql in Supabase.");
    return;
  }
  if(i.status==='sorti' && !confirm(`"${i.name}" is currently checked out (${outBy(i)}).\nMove it to the trash anyway?`)) return;
  else if(i.status!=='sorti' && !confirm(`Move "${i.name}" to the trash?\n\nIt stays recoverable for ${typeof TRASH_DAYS==='number'?TRASH_DAYS:30} days, with its history.`)) return;
  db.items = db.items.filter(x=>x.id!==id);
  i.deleted_at = now();
  db.trash.unshift(i);
  sel.delete(id);
  close_('ovDetail'); render();
  if(typeof updateTrashBadge==='function') updateTrashBadge();
  await apiTrashItem(id);
  toast(`"${i.name}" moved to the trash.`, 'ok', "Undo", ()=>restoreItem(id));
}

/* ================= CHECK-OUT / CHECK-IN ================= */
let actionId = null, bulkMode = false;

function openCheckout(id){
  actionId = id; bulkMode = false;
  document.getElementById('out-item').textContent = item(id).name;
  prepCheckoutForm();
}
function openBulkCheckout(){
  const n = selItems().filter(i=>i.status==='dispo').length;
  if(!n){ toast("No available item in the selection.", 'error'); return; }
  actionId = null; bulkMode = true;
  document.getElementById('out-item').textContent = `${n} item(s)`;
  prepCheckoutForm();
}
function prepCheckoutForm(){
  // Liste de suggestions : les emprunteurs déjà connus, les plus récents d'abord
  document.getElementById('borrowerList').innerHTML =
    db.users.map(u=>`<option value="${esc(u.name)}">`).join("");
  document.getElementById('out-user').value = "";
  document.getElementById('out-reason').value = "";
  document.getElementById('out-due').value = "";
  document.getElementById('out-alert').checked = true;
  open_('ovOut');
}
async function doCheckout(){
  const who = document.getElementById('out-user').value.trim();
  if(!who){ alert("Enter who is taking the gear."); return; }
  const reason = document.getElementById('out-reason').value.trim();
  if(!reason){ alert("Enter a destination or a reason."); return; }
  const due = document.getElementById('out-due').value || null;
  const alertOn = document.getElementById('out-alert').checked;
  const userId = await borrowerId(who);
  const targets = bulkMode ? selItems().filter(i=>i.status==='dispo') : [item(actionId)];
  if(!targets.length) return;

  const out = {userId, date:now(), reason, due, alertOn};
  targets.forEach(i=>{ i.status='sorti'; i.out={...out}; i.loc=reason; });
  await apiUpdateItemsIn(targets.map(i=>i.id), {status:'sorti', out, loc:reason});
  await histMany(targets.map(i=>({itemId:i.id, type:'out',
    detail: reason + (due?` — due back ${fdateD(due)}`:''), userId})));
  close_('ovOut');
  if(bulkMode){ clearSel(); toast(`${targets.length} item(s) checked out to ${esc(who)}.`, 'ok'); }
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
  if(!n){ toast("No checked-out item in the selection.", 'error'); return; }
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
  if(bulkMode){ clearSel(); toast(`${targets.length} item(s) checked in.`, 'ok'); }
  bulkMode = false; render();
}

/* ================= FICHE ITEM ================= */
function openDetail(id){
  const i = item(id);
  if(!i){ toast(`Item ${id} introuvable.`, 'error'); return; }
  const rows = db.history.filter(h=>h.itemId===id).map(h=>
    `<li>${histIcon(h.type)} ${histText(h)}<div class="when">${fdate(h.date)}${histBy(h)}</div></li>`).join("");
  const outInfo = i.status==='sorti'
    ? `<div class="alert ${overdue(i)?'bad':''}">📤 Out since <b>${fdate(i.out.date)}</b> (${daysSince(i.out.date)}d) — <b>${esc(outBy(i))}</b> · ${esc(i.out.reason)}${i.out.due?`<br>Due back <b>${fdateD(i.out.due)}</b>${overdue(i)?` — <span class="days-late">${daysLate(i)}d overdue</span>`:''}`:''}</div>` : "";
  const repBtns = i.cond==='bon'
    ? `<button class="btn sec small" onclick="openRepair('${i.id}','attente')">Flag for repair</button>`
    : `<button class="btn small ok" onclick="openRepair('${i.id}','bon')">Mark repaired</button>`;
  document.getElementById('detailBody').innerHTML = `
    <h3>${itemTitle(i)} <span class="mono">${i.id}</span></h3>
    ${i.photo?`<img class="itemphoto" loading="lazy" src="${i.photo}">`:""}
    <p style="margin-bottom:10px">
      <span class="tag cat">${esc(catPath(i))}</span> ${statusTag(i)} <span class="tag ${i.cond}">${CONDS[i.cond]||i.cond}</span>
    </p>
    ${outInfo}
    <p class="muted" style="margin-bottom:4px">
      ${i.serial?`Serial: <b>${esc(i.serial)}</b><br>`:""}
      ${i.owner?`Owner: <b>${esc(i.owner)}</b><br>`:""}
      ${i.provider?`Provider: <b>${esc(i.provider)}</b><br>`:""}
      ${i.price!=null?`Purchase price: <b>${fprice(i.price)}</b>${i.purchase_date?` on ${fdateOnly(i.purchase_date)}`:""}<br>`
        :(i.purchase_date?`Bought on <b>${fdateOnly(i.purchase_date)}</b><br>`:"")}
      ${i.sales_order?`Sales order: <b>${esc(i.sales_order)}</b><br>`:""}
      Home location: <b>${esc(locLabel(i.home))}</b><br>
      Current location: <b>${esc(i.status==='sorti'?i.loc:locLabel(i.loc))}</b>
    </p>
    ${i.notes?`<p class="muted" style="margin-bottom:10px">📝 ${esc(i.notes)}</p>`:""}
    <div class="modal-actions" style="justify-content:flex-start;margin:12px 0;flex-wrap:wrap">
      ${actionBtn(i)}
      ${repBtns}
      ${can('edit')?`<button class="btn sec small" onclick="openItemForm('${i.id}')">Edit</button>`:''}
      <button class="btn sec small" onclick="showLabel('${i.id}')">QR label</button>
      ${can('delete')?`<button class="btn danger small" onclick="deleteItem('${i.id}')">Move to trash</button>`:''}
    </div>
    <div id="qrzone"></div>
    <h3 style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">History</h3>
    <ul class="hist">${rows||'<li class="muted">No activity yet</li>'}</ul>
    <div class="modal-actions"><button class="btn sec" onclick="close_('ovDetail')">Fermer</button></div>`;
  open_('ovDetail');
}

/* Ouverture d'une fiche après scan d'un QR code */
function consumePendingItem(){
  const id = localStorage.getItem('pendingItem');
  if(!id) return;
  localStorage.removeItem('pendingItem');
  if(item(id)) openDetail(id);
  else toast(`Item ${id} not found (deleted?).`, 'error');
}

/* ---- étiquette / QR : encode l'adresse de la fiche ---- */
function showLabel(id){
  const i = item(id), z = document.getElementById('qrzone');
  z.innerHTML = `<div id="qrbox"><div id="qrcode"></div>
    <div style="color:#000;text-align:center;font-family:monospace;font-weight:700;margin-top:6px">${i.id}</div>
    <div style="color:#000;text-align:center;font-size:12px">${esc(i.name)}</div></div>
    <div><button class="btn small sec" onclick="printLabel()">🖨️ Print label</button>
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
