/* ============================================================
   VUE — Inventaire : liste, groupes d'exemplaires, sélection
   multiple, formulaire item, fiche détail, QR, check-in/out
   ============================================================ */

let sel = new Set();        // items sélectionnés (cases à cocher)
let expanded = new Set();   // groupes d'exemplaires dépliés

/* ============================================================
   TRI ET FILTRES — depuis les en-têtes de colonnes
   La barre de sept menus déroulants a disparu en v1.15 : elle
   occupait deux lignes au-dessus d'un tableau qui, depuis la
   v1.13.1, occupe la hauteur restante de l'écran. Chaque ligne de
   réglages coûtait donc des items visibles.
   ============================================================ */

/* Tri à plusieurs niveaux : [{k:'cat',dir:1},{k:'price',dir:-1}]
   Le premier départage, le deuxième tranche les égalités, etc. */
let sortLevels = [];
/* Filtres par colonne : {owner: Set(['AF','PS'])}
   Volontairement NON mémorisés d'une session à l'autre : un filtre
   restauré en silence au démarrage ferait croire à des items
   disparus. Les colonnes, elles, sont mémorisées. */
let colFilters = {};
let headerMenuCol = null;

/* ---- Position de défilement ----
   Depuis la v1.13.1 le tableau défile dans son propre cadre, et
   renderInv() reconstruit ce cadre entièrement. Sans précaution, le
   moindre rafraîchissement — déplier un groupe, cocher une case —
   renvoie en haut de la liste.
   On la conserve par défaut, SAUF quand l'ordre ou le contenu change
   vraiment (tri, filtre, recherche) : là, revenir en haut est le bon
   comportement. */
let invScrollReset = false;
function invScrollSave(){
  const w = document.querySelector('#invList .invwrap');
  // Sur mobile il n'y a pas de cadre à défilement : c'est la page.
  if(!w) return {page:true, top: window.scrollY || 0, left:0};
  return {top:w.scrollTop, left:w.scrollLeft};
}
function invScrollRestore(p){
  const w = document.querySelector('#invList .invwrap');
  if(invScrollReset){
    invScrollReset = false;
    if(w) w.scrollTop = 0; else try{ window.scrollTo(0,0); }catch(e){}
    return;
  }
  if(!p) return;
  if(p.page){ try{ window.scrollTo(0, p.top); }catch(e){} return; }
  if(w){ w.scrollTop = p.top; w.scrollLeft = p.left; }
}
/* Appelée par tout ce qui réordonne ou refiltre la liste. */
function invResetScroll(){ invScrollReset = true; }

/* ---- Valeur sur laquelle on filtre ----
   C'est le texte AFFICHÉ qui sert de clé : on filtre ce qu'on voit.
   Les colonnes sans texte (statut, état, photo) ont leur propre
   libellé stable, sinon elles seraient infiltrables. */
function filterText(c, i){
  switch(c.k){
    case 'status': return i.status === 'sorti' ? 'Checked out' : 'Available';
    case 'cond':   return CONDS[i.cond] || i.cond;
    case 'photo':  return i.photo ? 'With photo' : 'No photo';
  }
  return (invCellText(c, i) || '').trim() || '(empty)';
}

/* Valeurs distinctes d'une colonne, avec leur nombre d'items. */
function filterValues(k){
  const c = INV_COLUMNS.find(x=>x.k === k);
  if(!c) return [];
  const n = new Map();
  db.items.forEach(i=>{ const v = filterText(c, i); n.set(v, (n.get(v)||0) + 1); });
  return [...n.entries()]
    .sort((a,b)=> a[0] === '(empty)' ? 1 : b[0] === '(empty)' ? -1
                : a[0].localeCompare(b[0], 'fr', {numeric:true}))
    .map(([v, nb])=>({v, nb}));
}

function hasFilter(k){ return !!(colFilters[k] && colFilters[k].size); }
function activeFilterKeys(){ return Object.keys(colFilters).filter(hasFilter); }

function invFiltered(){
  const q = ((document.getElementById('q')||{}).value || "").toLowerCase().trim();
  const actifs = activeFilterKeys().map(k=>({k, c:INV_COLUMNS.find(x=>x.k===k), set:colFilters[k]}))
                                   .filter(f=>f.c);
  return db.items.filter(i=>{
    if(q){
      const foin = [i.name, i.brand, i.serial, i.id, i.notes, i.owner,
                    i.provider, i.sales_order, catPath(i)].join(' ').toLowerCase();
      if(!foin.includes(q)) return false;
    }
    // Plusieurs colonnes filtrées se combinent : toutes doivent passer.
    for(const f of actifs) if(!f.set.has(filterText(f.c, i))) return false;
    return true;
  });
}

/* ---- Tri ----
   Les valeurs absentes finissent toujours en bas, quel que soit le
   sens : un item sans prix n'a rien à faire en tête d'un classement
   par prix. */
function sortKey(c, i){
  switch(c.k){
    case 'item':   return itemTitleText(i).toLowerCase();
    case 'id':     return i.id;
    case 'cat':    return catIndex(i.cat) * 1000 + subIndex(i.cat, i.subcat);
    case 'family': return catIndex(i.cat);
    case 'status': return i.status === 'sorti' ? 1 : 0;
    case 'cond':   return ['bon','use','hs'].indexOf(i.cond);
    case 'price':  return (i.price == null || i.price === '') ? null : Number(i.price);
    case 'pdate':  return i.purchase_date || null;    // « aaaa-mm-jj » se compare tel quel
    case 'photo':  return i.photo ? 0 : 1;
  }
  return (invCellText(c, i) || '').toLowerCase();
}
const videTri = v => v === null || v === undefined || v === ''
                  || (typeof v === 'number' && isNaN(v)) || v === -1;

function sortItems(rows){
  if(!sortLevels.length) return rows;
  return [...rows].sort((a,b)=>{
    for(const lv of sortLevels){
      const c = INV_COLUMNS.find(x=>x.k === lv.k);
      if(!c) continue;
      const x = sortKey(c,a), y = sortKey(c,b);
      if(videTri(x) && videTri(y)) continue;
      if(videTri(x)) return 1;
      if(videTri(y)) return -1;
      const r = (typeof x === 'number' && typeof y === 'number')
              ? x - y : String(x).localeCompare(String(y), 'fr', {numeric:true});
      if(r) return r * lv.dir;
    }
    return a.id.localeCompare(b.id);
  });
}

function sortRank(k){
  const i = sortLevels.findIndex(l=>l.k === k);
  return i === -1 ? null : {rang:i+1, dir:sortLevels[i].dir};
}

/* ---- Actions des menus d'en-tête ---- */
function sortBy(k, dir, ajouter){
  invResetScroll();
  const i = sortLevels.findIndex(l=>l.k === k);
  if(ajouter){
    if(i === -1) sortLevels.push({k, dir});
    else sortLevels[i].dir = dir;
  }else{
    sortLevels = [{k, dir}];
  }
  closeHeaderMenu(); renderInv();
}
function unsortBy(k){
  invResetScroll();
  sortLevels = sortLevels.filter(l=>l.k !== k);
  closeHeaderMenu(); renderInv();
}
/* Clic sur l'en-tête : inverse le sens, ou trie si la colonne ne
   l'était pas. Maj + clic ajoute un niveau au lieu de remplacer. */
function headerSortClick(k, maj){
  const r = sortRank(k);
  const dir = r ? -r.dir : 1;
  sortBy(k, dir, maj || (!!r && sortLevels.length > 1));
}

function toggleFilterValue(k, v, on){
  invResetScroll();
  if(!colFilters[k]) colFilters[k] = new Set();
  if(on) colFilters[k].add(v); else colFilters[k].delete(v);
  if(!colFilters[k].size) delete colFilters[k];
  renderHeaderMenu(); renderInv();
}
function clearFilter(k){
  invResetScroll();
  delete colFilters[k];
  closeHeaderMenu(); renderInv();
}
function hideColumn(k){
  closeHeaderMenu();
  toggleCol(k, false);
}

/* ---- Remise à zéro ---- */
function filtersActive(){
  const q = ((document.getElementById('q')||{}).value || "").trim();
  return !!q || sortLevels.length > 0 || activeFilterKeys().length > 0;
}
function resetFilters(){
  invResetScroll();
  const q = document.getElementById('q'); if(q) q.value = '';
  sortLevels = []; colFilters = {};
  closeHeaderMenu(); renderInv();
}
function updateResetBtn(){
  const b = document.getElementById('btnReset');
  if(!b) return;
  const on = filtersActive();
  b.disabled = !on;
  b.classList.toggle('on', on);
}
/* fillFilters n'a plus de menus à remplir : conservée car appelée
   par render() dans app.js. */
function fillFilters(){}

/* ---- séparateurs de section ----
   Quand un tri est actif, ils suivent le PREMIER niveau de tri.
   Les valeurs absentes étant renvoyées en fin de liste par
   sortItems(), leur section (« No price »…) arrive naturellement
   en bas. Les clés sont celles des colonnes. */
function sepFor(i, by){
  switch(by){
    case 'item': {
      const c = (itemTitleText(i).trim().toUpperCase().charAt(0) || '—');
      if(/[A-Z]/.test(c)) return c;
      return /[0-9]/.test(c) ? '0–9' : 'Other';
    }
    case 'id':     return (String(i.id).split('-')[0] || '—');
    case 'cat':    return subLabel(i.cat, i.subcat) || 'Uncategorised';
    case 'family': return catLabel(i.cat) || 'Uncategorised';
    case 'status': return i.status === 'sorti' ? 'Checked out' : 'Available';
    case 'loc':    return (i.status==='sorti' ? i.loc : locLabel(i.loc)) || 'No location';
    case 'home':   return locLabel(i.home) || 'No home';
    case 'cond':   return CONDS[i.cond] || i.cond;
    case 'owner':  return (i.owner||'').trim() || 'No owner';
    case 'prov':   return (i.provider||'').trim() || 'No provider';
    case 'photo':  return i.photo ? 'With photo' : 'No photo';
    case 'serial': return (i.serial||'').trim() ? 'With serial number' : 'No serial number';
    case 'so':     return (i.sales_order||'').trim() || 'No sales order';
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
function mobileSep(label){ return `<div class="msep-head">${esc(label)}</div>`; }
function sepRow(label, span){
  return `<tr class="seprow"><td colspan="${span}">${esc(label)}</td></tr>`;
}

/* ---- en-tête du tableau, construit à partir des colonnes visibles ---- */
/* ============================================================
   RENDU MOBILE
   Un tableau converti en blocs empilés donnait une ligne par
   colonne : quatorze colonnes, quatorze lignes par item, et moins
   d'un item visible à l'écran. On rend donc une carte conçue pour
   le téléphone — titre, repères, action — au lieu de déguiser un
   tableau.
   ============================================================ */
const MOBILE_BP = 700;
function isMobileView(){
  try{ return window.matchMedia('(max-width:' + MOBILE_BP + 'px)').matches; }
  catch(e){ return false; }
}

/* Repères sous le titre : courts, séparés par des points médians.
   Le statut et l'état gardent leur pastille, le reste est du texte. */
function mobileMeta(i){
  return mobileColDefs().map(c=>{
    if(c.k === 'status') return statusTag(i);
    if(c.k === 'cond')   return `<span class="tag ${i.cond}">${esc(CONDS[i.cond]||i.cond)}</span>`;
    if(c.k === 'id')     return `<span class="mono">${esc(i.id)}</span>`;
    const t = invCellText(c, i);
    return t ? `<span>${esc(t)}</span>` : '';
  }).filter(Boolean).join('<span class="msep">·</span>');
}

function mobileCard(i, isChild){
  const why = checkoutBlockReason(i);
  const action = i.status !== 'dispo'
    ? `<button class="btn small ok mact" onclick="event.stopPropagation();openCheckin('${i.id}')">In</button>`
    : why
      ? `<button class="btn small warn mact" onclick="event.stopPropagation();openCheckout('${i.id}')">Out ⚠️</button>`
      : `<button class="btn small mact" onclick="event.stopPropagation();openCheckout('${i.id}')">Out</button>`;
  return `<div class="mcard${isChild?' mchild':''}${sel.has(i.id)?' msel':''}" onclick="openDetail('${i.id}')">
    <label class="mcb" onclick="event.stopPropagation()">
      <input type="checkbox" ${sel.has(i.id)?'checked':''} onchange="toggleSel('${i.id}',this.checked)"></label>
    ${prefs.mobilePhoto ? (i.photo
        ? `<img class="mthumb" loading="lazy" src="${i.photo}">`
        : '<span class="mthumb mnophoto"></span>') : ''}
    <div class="mbody">
      <div class="mtitle">${itemTitle(i)}</div>
      <div class="mmeta">${mobileMeta(i)}</div>
    </div>
    ${can('checkout') ? action : ''}
  </div>`;
}

function mobileGroupCard(key, items, open){
  const dispo = items.filter(i=>i.status==='dispo').length;
  const marques = [...new Set(items.map(i=>(i.brand||'').trim()))];
  const photos = [...new Set(items.map(i=>i.photo||''))];
  const k = JSON.stringify(key).replace(/"/g,'&quot;');
  const allSel = items.every(i=>sel.has(i.id));
  return `<div class="mcard mgroup${allSel?' msel':''}" onclick="toggleGroup(${k})">
    <label class="mcb" onclick="event.stopPropagation()">
      <input type="checkbox" ${allSel?'checked':''} onchange="selectGroup(${k},this.checked)"></label>
    ${prefs.mobilePhoto ? (photos.length===1 && photos[0]
        ? `<img class="mthumb" loading="lazy" src="${photos[0]}">`
        : '<span class="mthumb mnophoto"></span>') : ''}
    <div class="mbody">
      <div class="mtitle"><span class="chev">${open?'▾':'▸'}</span>
        ${marques.length===1 && marques[0] ? `<b>${esc(marques[0])}</b> ` : ''}${esc(key)}</div>
      <div class="mmeta"><span>${items.length} copies</span><span class="msep">·</span>
        <span class="tag dispo">${dispo} available</span></div>
    </div>
  </div>`;
}

/* ---- en-tête : chaque colonne porte son menu ----
   Le rang de tri est affiché (1↑, 2↓) : sans lui, un tri à deux
   niveaux serait invisible et donnerait l'impression d'un classement
   arbitraire. */
function invHeadHtml(allSel){
  const cols = invColDefs();
  return `<tr>
    <th class="cbcol"><input type="checkbox" ${allSel?'checked':''} onchange="selectAllVisible(this.checked)" title="Select all"></th>
    ${cols.map(c=>{
      const r = sortRank(c.k);
      const f = hasFilter(c.k);
      return `<th class="col-${c.k}${r?' sorted':''}${f?' filtered':''}">
        <button class="hbtn" onclick="headerSortClick('${c.k}', event.shiftKey)"
                title="Click to sort — Shift+click to add a sort level">
          ${c.k==='photo' ? '📷' : esc(c.label)}
          ${r ? `<span class="srank">${sortLevels.length>1?r.rang:''}${r.dir>0?'↑':'↓'}</span>` : ''}
          ${f ? '<span class="fdot" title="Filtered">●</span>' : ''}
        </button>
        <button class="hmenu" onclick="openHeaderMenu('${c.k}', this, event)" title="Sort and filter">▾</button>
      </th>`;
    }).join("")}
    <th class="actcol"></th>
  </tr>`;
}

/* ---- menu d'un en-tête ---- */
function openHeaderMenu(k, btn, ev){
  if(ev){ ev.stopPropagation(); ev.preventDefault(); }
  if(headerMenuCol === k){ closeHeaderMenu(); return; }
  headerMenuCol = k;
  renderHeaderMenu(btn);
}
function closeHeaderMenu(){
  headerMenuCol = null;
  const m = document.getElementById('hdrMenu');
  if(m) m.classList.remove('open');
}
function renderHeaderMenu(btn){
  const m = document.getElementById('hdrMenu');
  if(!m || !headerMenuCol) return;
  const k = headerMenuCol;
  const c = INV_COLUMNS.find(x=>x.k === k);
  if(!c) return closeHeaderMenu();

  const r = sortRank(k);
  const vals = filterValues(k);
  const sel = colFilters[k];
  const tous = !sel || sel.size === 0;
  // Au-delà d'une trentaine de valeurs la liste devient illisible :
  // on ouvre un champ de recherche plutôt que de tout dérouler.
  const recherche = vals.length > 12;

  m.innerHTML = `
    <div class="hm-sec">
      <button class="hm-it${r && r.dir>0 ? ' on':''}" onclick="sortBy('${k}',1,false)">↑ Sort A → Z</button>
      <button class="hm-it${r && r.dir<0 ? ' on':''}" onclick="sortBy('${k}',-1,false)">↓ Sort Z → A</button>
      ${sortLevels.length && !r
        ? `<button class="hm-it" onclick="sortBy('${k}',1,true)">+ Add as sort level ${sortLevels.length+1}</button>` : ''}
      ${r ? `<button class="hm-it" onclick="unsortBy('${k}')">✕ Remove from sort</button>` : ''}
    </div>
    <div class="hm-sec">
      <div class="hm-head">Filter
        ${!tous ? `<button class="hm-link" onclick="clearFilter('${k}')">show all</button>` : ''}</div>
      ${recherche ? `<input class="hm-search" placeholder="Search values…" oninput="filterValueSearch(this.value)">` : ''}
      <div class="hm-list" id="hmList">
        ${vals.map(x=>`<label class="hm-val" data-v="${esc(x.v.toLowerCase())}">
            <input type="checkbox" ${sel && sel.has(x.v) ? 'checked':''}
                   onchange="toggleFilterValue('${k}', ${JSON.stringify(x.v).replace(/"/g,'&quot;')}, this.checked)">
            <span class="hm-vlabel">${esc(x.v)}</span><span class="muted">${x.nb}</span></label>`).join("")}
      </div>
    </div>
    ${c.fixed ? '' : `<div class="hm-sec">
      <button class="hm-it" onclick="hideColumn('${k}')">Hide this column</button></div>`}`;

  m.classList.add('open');
  // Positionnement sous le bouton, sans déborder de l'écran
  if(btn){
    const r2 = btn.getBoundingClientRect();
    m.style.top = Math.round(r2.bottom + 4) + 'px';
    m.style.left = Math.round(Math.min(r2.left, window.innerWidth - 300)) + 'px';
  }
}
function filterValueSearch(q){
  const t = (q||'').toLowerCase().trim();
  document.querySelectorAll('#hmList .hm-val').forEach(l=>{
    l.style.display = !t || (l.dataset.v||'').includes(t) ? '' : 'none';
  });
}
document.addEventListener('click', e=>{
  if(!headerMenuCol) return;
  if(e.target.closest('#hdrMenu') || e.target.closest('.hmenu')) return;
  closeHeaderMenu();
});

/* ---- bandeau des filtres actifs ----
   Le tableau défile dans son cadre : un filtre posé puis oublié
   deviendrait invisible dès qu'on a fait défiler, et on chercherait
   un item pourtant présent. Ce bandeau est ce qui remplace la
   visibilité qu'offrait gratuitement l'ancienne barre de filtres. */
function renderFilterBar(){
  const el = document.getElementById('invFilters');
  if(!el) return;
  const puces = [];
  sortLevels.forEach((lv, n)=>{
    const c = INV_COLUMNS.find(x=>x.k === lv.k);
    if(!c) return;
    puces.push(`<span class="fchip sortchip">${sortLevels.length>1?(n+1)+'. ':''}${esc(c.label)}
      ${lv.dir>0?'↑':'↓'}<button onclick="unsortBy('${lv.k}')" title="Remove">✕</button></span>`);
  });
  activeFilterKeys().forEach(k=>{
    const c = INV_COLUMNS.find(x=>x.k === k);
    if(!c) return;
    const v = [...colFilters[k]];
    const txt = v.length <= 2 ? v.join(', ') : `${v.length} values`;
    puces.push(`<span class="fchip">${esc(c.label)}: ${esc(txt)}
      <button onclick="clearFilter('${k}')" title="Remove">✕</button></span>`);
  });
  const q = ((document.getElementById('q')||{}).value || '').trim();
  if(q) puces.push(`<span class="fchip">Search: ${esc(q)}
      <button onclick="document.getElementById('q').value='';renderInv()" title="Remove">✕</button></span>`);

  el.innerHTML = puces.length
    ? puces.join('') + `<button class="btn sec small" onclick="resetFilters()">Reset all</button>`
    : '';
  el.style.display = puces.length ? '' : 'none';
}

/* ---- rendu de la liste ---- */
function renderInv(){
  const scroll = invScrollSave();
  const by = sortLevels.length ? sortLevels[0].k : "";
  const rows = sortItems(invFiltered());
  const searching = !!(document.getElementById('q').value||"").trim();
  renderInvSummary(rows);
  updateResetBtn();
  renderFilterBar();
  if(typeof renderViewButtons === 'function') renderViewButtons();

  const wrap = document.getElementById('invList');
  if(!rows.length){
    wrap.innerHTML = '<div class="empty">No item matches.</div>';
    renderBulkBar();
  if(typeof syncInvHeight === 'function') syncInvHeight();
  invScrollRestore(scroll); return;
  }

  const span = invColDefs().length + 2;

  // Un tri explicite affiche une liste à plat : regrouper masquerait le classement.
  const mob = isMobileView();

  if(by){
    const allSelF = rows.length && rows.every(i=>sel.has(i.id));
    let body = "", lastSep = null;
    rows.forEach(i=>{
      const s = sepFor(i, by);
      if(s !== null && s !== lastSep){ lastSep = s; body += mob ? mobileSep(s) : sepRow(s, span); }
      body += mob ? mobileCard(i, false) : itemRow(i, false);
    });
    wrap.innerHTML = mob
      ? `<div class="mlist">${body}</div>`
      : `<div class="invwrap"><table class="invtable">
          <thead>${invHeadHtml(allSelF)}</thead><tbody>${body}</tbody></table></div>`;
    renderBulkBar();
  if(typeof syncInvHeight === 'function') syncInvHeight();
  invScrollRestore(scroll); return;
  }

  // Regroupement des exemplaires d'un même modèle (« … #1 », « … #2 »)
  const groups = new Map();
  rows.forEach(i=>{
    const k = groupKeyOf(i.name);
    if(!k) return;
    if(!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });

  /* Vue par défaut : l'ordre est celui de config.js, famille par
     famille, et non l'ordre d'importation du fichier Excel d'origine.
     Un séparateur marque chaque changement de famille — c'est ce qui
     rend une liste de 648 items parcourable. */
  const ordonnes = [...rows].sort(byCatOrder);

  const done = new Set();
  let body = "", derniereFamille = null;
  ordonnes.forEach(i=>{
    // On construit d'abord la ligne : un exemplaire déjà affiché dans
    // son groupe n'en produit aucune, et ne doit donc pas déclencher
    // un séparateur de famille resté vide.
    let ligne = "";
    const k = groupKeyOf(i.name);
    if(k && groups.get(k).length > 1){
      if(done.has(k)) return;
      done.add(k);
      const open = expanded.has(k) || searching;
      ligne = (mob ? mobileGroupCard(k, groups.get(k), open) : groupRow(k, groups.get(k), open))
            + (open ? groups.get(k).map(x=>mob ? mobileCard(x, true) : itemRow(x, true)).join("") : "");
    }else{
      ligne = mob ? mobileCard(i, false) : itemRow(i, false);
    }
    const fam = catLabel(i.cat) || '—';
    if(fam !== derniereFamille){ derniereFamille = fam; body += mob ? mobileSep(fam) : sepRow(fam, span); }
    body += ligne;
  });

  const allIds = rows.map(i=>i.id);
  const allSel = allIds.length && allIds.every(id=>sel.has(id));
  wrap.innerHTML = mob
    ? `<div class="mlist">${body}</div>`
    : `<div class="invwrap"><table class="invtable">
        <thead>${invHeadHtml(allSel)}</thead><tbody>${body}</tbody></table></div>`;
  renderBulkBar();
  if(typeof syncInvHeight === 'function') syncInvHeight();
  invScrollRestore(scroll);
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
/* ---- Un item abîmé ne sort pas ----
   Laisser partir en tournée du matériel signalé en réparation, c'est
   découvrir le problème sur place. Le retour, lui, reste toujours
   possible : un item déjà dehors doit pouvoir rentrer quel que soit
   son état. */
function checkoutBlockReason(i){
  if(i.status !== 'dispo') return null;
  /* L'étape de réparation vient du dossier, plus de l'état physique :
     depuis la v1.17 les deux sont séparés. */
  const r = repairOf(i.id);
  if(r && r.status === 'sent') return "currently at the repair shop";
  if(r)                        return "flagged as needing repair";
  if(i.cond === 'hs')          return "marked out of service";
  return null;
}
function canCheckout(i){ return i.status === 'dispo' && !checkoutBlockReason(i); }

function actionBtn(i){
  if(i.status !== 'dispo')
    return `<button class="btn small ok" onclick="openCheckin('${i.id}')">Check in</button>`;
  const why = checkoutBlockReason(i);
  if(why)
    return `<button class="btn small warn" onclick="openCheckout('${i.id}')"
              title="${esc(why)} — you will be asked to confirm">Check out ⚠️</button>`;
  return `<button class="btn small" onclick="openCheckout('${i.id}')">Check out</button>`;
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
  document.getElementById('bulk-select2').innerHTML = '<option value="">— choose —</option>' + subOptions(c);
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
  openBulkModal(`Move ${sel.size} item(s)`, "New home location", homeOptions(), doBulkMove);
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
  await histMany(targets.map(i=>({itemId:i.id, type:'repair', detail:`condition set to ${condLabel(cond)}`, cond})));
  clearSel(); render();
  toast(`${targets.length} item(s) : ${condLabel(cond)}.`, 'ok');
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
  document.getElementById('itemFormTitle').textContent = id?'Edit item':'Add item';
  document.getElementById('i-cat').innerHTML = '<option value="">— choose —</option>' + catOptions();
  document.getElementById('i-home').innerHTML = homeOptions();   // jamais un off-site : un item n'habite pas au Trianon
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
  el.innerHTML = '<option value="">— choose —</option>' + subOptions(c, sel);
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
      if(condChanged) await hist(i.id,'repair',`condition set to ${condLabel(vals.cond)}`,null,vals.cond);
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

/* ---- Sortie d'un item abîmé : un avertissement, pas un mur ----
   Interdire complètement serait faux : il arrive qu'on emporte
   sciemment du matériel imparfait. Mais le laisser passer en silence
   l'est tout autant. On demande donc, en mettant en avant l'option
   qui protège — retirer de la sélection. */
let damagedWarn = null;      // {ids, abimes, mode} en attente de décision
let allowDamaged = false;    // décision prise pour la sortie en cours

function openCheckout(id){
  const i = item(id);
  if(!i) return;
  const why = checkoutBlockReason(i);
  if(why && !allowDamaged){ showDamagedWarning([i], 'single'); return; }
  actionId = id; bulkMode = false;
  document.getElementById('out-item').textContent = i.name;
  prepCheckoutForm();
}

function openBulkCheckout(){
  const dispo = selItems().filter(i=>i.status==='dispo');
  if(!dispo.length){ toast("No available item in the selection.", 'error'); return; }
  const abimes = dispo.filter(i=>!canCheckout(i));
  if(abimes.length && !allowDamaged){ showDamagedWarning(abimes, 'bulk'); return; }

  const cibles = allowDamaged ? dispo : dispo.filter(canCheckout);
  if(!cibles.length){ toast("Nothing left to check out.", 'error'); return; }
  actionId = null; bulkMode = true;
  document.getElementById('out-item').textContent = `${cibles.length} item(s)`;
  prepCheckoutForm();
}

/* La fenêtre d'avertissement. Elle nomme les items concernés :
   « 3 items sont abîmés » ne dit pas lesquels, et c'est justement ce
   qu'il faut savoir pour décider. */
function showDamagedWarning(abimes, mode){
  damagedWarn = {ids: abimes.map(i=>i.id), mode};
  const liste = abimes.slice(0, 12).map(i=>`<li>${itemTitle(i)}
      <span class="mono">${esc(i.id)}</span>
      <span class="tag ${i.cond}">${esc(CONDS[i.cond]||i.cond)}</span></li>`).join("");
  const reste = abimes.length > 12 ? `<li class="muted">… and ${abimes.length - 12} more</li>` : '';

  document.getElementById('warnBody').innerHTML = `
    <h3>⚠️ ${abimes.length} item${abimes.length>1?'s':''} flagged for repair</h3>
    <p class="muted" style="margin-bottom:10px">${mode === 'bulk'
      ? 'These items are in your selection. Taking damaged gear on a job usually means discovering the problem on site.'
      : 'This item is flagged for repair. Taking damaged gear on a job usually means discovering the problem on site.'}</p>
    <ul class="warnlist">${liste}${reste}</ul>
    <div class="modal-actions" style="flex-wrap:wrap;gap:8px">
      ${mode === 'bulk'
        ? `<button class="btn" onclick="damagedRemove()">Remove them from the selection</button>`
        : `<button class="btn" onclick="close_('ovWarn')">Cancel</button>`}
      <button class="btn sec" onclick="damagedProceed()">Check out anyway</button>
    </div>`;
  open_('ovWarn');
}

/* Option mise en avant : on retire les items abîmés et on continue
   avec le reste. */
function damagedRemove(){
  if(!damagedWarn) return close_('ovWarn');
  damagedWarn.ids.forEach(id=>sel.delete(id));
  const n = damagedWarn.ids.length;
  damagedWarn = null;
  close_('ovWarn');
  renderInv();
  toast(`${n} item(s) removed from the selection.`, 'ok');
  if(selItems().filter(i=>i.status==='dispo').length) openBulkCheckout();
}

function damagedProceed(){
  const w = damagedWarn;
  damagedWarn = null;
  close_('ovWarn');
  allowDamaged = true;                 // vaut pour cette sortie uniquement
  if(w && w.mode === 'single') openCheckout(w.ids[0]);
  else openBulkCheckout();
}
function prepCheckoutForm(){
  // Liste de suggestions : les emprunteurs déjà connus, les plus récents d'abord
  document.getElementById('borrowerList').innerHTML =
    db.users.map(u=>`<option value="${esc(u.name)}">`).join("");
  // La destination reste un champ libre ; les adresses extérieures
  // connues sont simplement proposées pour éviter les variantes
  // d'orthographe (« Trianon », « le trianon », « Trianon Paris »).
  const off = document.getElementById('offsiteList');
  if(off) off.innerHTML = offsites(false).map(l=>`<option value="${esc(l.name)}">`).join("");
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
  // Dernier filet : l'état a pu changer entre l'ouverture de la fenêtre
  // et la validation, par exemple depuis un autre poste.
  const targets = (bulkMode ? selItems().filter(i=>i.status==='dispo') : [item(actionId)])
                    .filter(i=>i && (allowDamaged || canCheckout(i)));
  if(!targets.length){ toast("Nothing left to check out — those items are flagged for repair.", 'error'); return; }
  const nAbimes = targets.filter(i=>!canCheckout(i)).length;
  if(!targets.length) return;

  const out = {userId, date:now(), reason, due, alertOn};
  targets.forEach(i=>{ i.status='sorti'; i.out={...out}; i.loc=reason; });
  await apiUpdateItemsIn(targets.map(i=>i.id), {status:'sorti', out, loc:reason});
  await histMany(targets.map(i=>({itemId:i.id, type:'out',
    detail: reason + (due?` — due back ${fdateD(due)}`:''), userId})));
  close_('ovOut');
  if(bulkMode){ clearSel(); toast(`${targets.length} item(s) checked out to ${esc(who)}.`, 'ok'); }
  // Une trace explicite : on saura plus tard que c'était un choix.
  if(nAbimes) toast(`${nAbimes} item(s) went out flagged for repair.`, 'info', null, null, 7000);
  bulkMode = false; allowDamaged = false; render();
}

/* Retour groupé demandé depuis ailleurs que l'inventaire (onglet
   Borrowers) : une liste explicite d'identifiants, pour ne pas
   détourner la sélection de l'inventaire. */
let checkinTargets = null;

function openCheckin(id){
  const i0 = item(id);
  /* Un item revenant de réparation ne rentre pas en rayon : il passe
     par la clôture de l'incident, qui compare l'état constaté à
     l'état documenté au départ. Sans ce détour, un clic un peu rapide
     sur « In » effacerait la seule trace de l'état de départ. */
  if(i0 && outForRepair(i0)){ openReceive(i0.out.repairId); return; }
  actionId = id; bulkMode = false; checkinTargets = null;
  const i = item(id);
  document.getElementById('in-item').textContent = i.name;
  document.getElementById('in-cond').value = i.cond;
  document.getElementById('in-note').value = "";
  /* Un incident ouvert pendant la sortie ne se referme pas tout seul
     au retour : l'item rentre, mais rejoint la file de réparation et
     reste insortable. Le dire ici évite la surprise au prochain
     check-out, trois jours plus tard. */
  const band = document.getElementById('in-repband');
  const pending = repairOf(id);
  if(band){
    band.style.display = pending ? '' : 'none';
    if(pending) band.querySelector('span').textContent =
      ` A fault was reported while it was out (${faultLabel(pending.fault)}). ` +
      `It goes back to the repair queue, not on the shelf, and cannot go out again.`;
  }
  open_('ovIn');
}
function openBulkCheckin(){
  const n = selItems().filter(i=>i.status==='sorti').length;
  if(!n){ toast("No checked-out item in the selection.", 'error'); return; }
  actionId = null; bulkMode = true; checkinTargets = null;
  document.getElementById('in-item').textContent = `${n} item(s)`;
  document.getElementById('in-cond').value = 'bon';
  document.getElementById('in-note').value = "";
  open_('ovIn');
}

/* Rentrer tout le matériel d'un emprunteur d'un seul geste.
   On passe par la même fenêtre que le retour groupé : l'état du
   matériel se renseigne au moment où on l'a entre les mains. */
function checkInAllFor(userId){
  const its = db.items.filter(i=>i.status==='sorti' && i.out && i.out.userId===userId);
  if(!its.length){ toast("Nothing to check in.", 'error'); return; }
  const who = (db.users.find(u=>u.id===userId)||{}).name || '';
  actionId = null; bulkMode = false;
  checkinTargets = its.map(i=>i.id);
  document.getElementById('in-item').textContent = `${its.length} item(s)${who?` from ${who}`:''}`;
  document.getElementById('in-cond').value = 'bon';
  document.getElementById('in-note').value = "";
  open_('ovIn');
}

async function doCheckin(){
  const cond = document.getElementById('in-cond').value, note = document.getElementById('in-note').value.trim();
  const targets = checkinTargets
    ? checkinTargets.map(id=>item(id)).filter(i=>i && i.status==='sorti')
    : bulkMode ? selItems().filter(i=>i.status==='sorti') : [item(actionId)];
  if(!targets.length){ checkinTargets = null; return; }
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
  else if(checkinTargets) toast(`${targets.length} item(s) checked in.`, 'ok');
  bulkMode = false; checkinTargets = null; render();
}

/* ================= FICHE ITEM ================= */
function openDetail(id){
  const i = item(id);
  if(!i){ toast(`Item ${id} not found.`, 'error'); return; }
  const rows = db.history.filter(h=>h.itemId===id).map(h=>
    `<li>${histIcon(h.type)} ${histText(h)}<div class="when">${fdate(h.date)}${histBy(h)}</div></li>`).join("");
  const outInfo = i.status==='sorti'
    ? `<div class="alert ${overdue(i)?'bad':''}">📤 Out since <b>${fdate(i.out.date)}</b> (${daysSince(i.out.date)}d) — <b>${esc(outBy(i))}</b> · ${esc(i.out.reason)}${i.out.due?`<br>Due back <b>${fdateD(i.out.due)}</b>${overdue(i)?` — <span class="days-late">${daysLate(i)}d overdue</span>`:''}`:''}</div>` : "";
  /* Un seul bouton, et il dépend du dossier et non de l'état physique :
     un item « marqué, usé » sans panne déclarée n'a rien à réparer. */
  const openRep = repairOf(i.id);
  const repBtns = openRep
    ? `<button class="btn small ok" onclick="openReceive('${openRep.id}')">Close the incident</button>`
    : `<button class="btn sec small" onclick="openReport('${i.id}')">Report a fault</button>`;
  document.getElementById('detailBody').innerHTML = `
    <h3>${itemTitle(i)} <span class="mono">${i.id}</span></h3>
    ${i.photo?`<img class="itemphoto" loading="lazy" src="${i.photo}">`:""}
    <p style="margin-bottom:10px">
      <span class="tag cat">${esc(catPath(i))}</span> ${statusTag(i)} <span class="tag ${i.cond}">${condLabel(i.cond)}</span>${repairTag(i)}
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
    <div class="modal-actions"><button class="btn sec" onclick="close_('ovDetail')">Close</button></div>`;
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
