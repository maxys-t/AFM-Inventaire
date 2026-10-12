/* ============================================================
   VUE — Packs (v1.20)

   Une session Pro Tools : des items dans des dossiers, des dossiers
   dans des dossiers. L'arbre n'est pas stocké, il se déduit — un
   pack est enfant d'un autre si son contenant en est membre.
   ============================================================ */

let packOpen = new Set();      // packs dépliés
let packFilter = '';           // recherche
let packOnlyIncomplete = false;

function renderPacks(){
  const el = document.getElementById('v-packs');
  if(!el) return;
  if(db.packsSupported === false){
    el.innerHTML = `<div class="panel"><h2>Packs</h2><div class="muted">
      This screen needs database migration 019. Run
      <span class="mono">sql/019-packs.sql</span> in Supabase, then reload.</div></div>`;
    return;
  }

  const tous = (db.packs||[]).filter(p=>!p.archived);
  const incomplets = tous.filter(p=>packStatus(p).manquants.length).length;
  /* Le poids total ne somme que les racines : additionner un pack et
     celui qu'il contient compterait deux fois le même matériel. */
  const total = packRoots().reduce((t,p)=>t + packWeight(p), 0);

  el.innerHTML = `
    <div class="repbar">
      <div>
        <h2 style="margin:0">Packs</h2>
        <div class="viewintro" style="margin:2px 0 0">What travels together, and what is missing from it.</div>
      </div>
      <div class="repbar-act">
        ${can('edit') ? `<button class="btn" onclick="openPackForm()">+ New pack</button>` : ''}
      </div>
    </div>

    <div class="packtools">
      <input type="search" id="packq" class="bigsearch" placeholder="Search a pack, or an item inside one"
             value="${esc(packFilter)}" oninput="setPackFilter(this.value)">
      <button class="btn small ${packOnlyIncomplete?'':'sec'}" onclick="togglePackIncomplete()">Incomplete only</button>
    </div>

    <div class="repstats">
      <div class="repstat"><div class="k">Packs</div><div class="n">${tous.length}</div></div>
      <div class="repstat"><div class="k">Incomplete</div>
        <div class="n ${incomplets?'warnv':''}">${incomplets}</div></div>
      <div class="repstat"><div class="k">Total weight</div><div class="n">${esc(fweight(total))}</div></div>
    </div>

    <div class="panel packpanel" id="packTree">${packTreeHTML()}</div>`;
}

function setPackFilter(v){
  packFilter = v;
  document.getElementById('packTree').innerHTML = packTreeHTML();
}
function togglePackIncomplete(){ packOnlyIncomplete = !packOnlyIncomplete; renderPacks(); }

function packMatches(p){
  const q = packFilter.trim().toLowerCase();
  if(q){
    const dansLeNom = p.name.toLowerCase().includes(q);
    const dansLeContenu = packPlan(p.id).some(i=>
      (itemTitleText(i) + ' ' + i.id).toLowerCase().includes(q));
    if(!dansLeNom && !dansLeContenu) return false;
  }
  if(packOnlyIncomplete && !packStatus(p).manquants.length) return false;
  return true;
}

function packTreeHTML(){
  /* Une recherche aplatit l'arbre : sinon un pack trouvé au troisième
     niveau resterait caché sous un parent replié. */
  const chercheur = packFilter.trim() || packOnlyIncomplete;
  const liste = chercheur
    ? (db.packs||[]).filter(p=>!p.archived && packMatches(p)).map(p=>packRowHTML(p, 0, true))
    : packRoots().map(p=>packBrancheHTML(p, 0));
  return liste.join('') ||
    `<div class="empty">${chercheur ? 'Nothing matches.' : 'No pack yet.'}</div>`;
}

function packBrancheHTML(p, niveau){
  const enfants = packChildren(p.id);
  const ouvert = packOpen.has(p.id);
  let h = packRowHTML(p, niveau, false, enfants.length);
  if(ouvert) enfants.forEach(c=>{ h += packBrancheHTML(c, niveau + 1); });
  return h;
}

function packRowHTML(p, niveau, aplati, nEnfants){
  const st = packStatus(p);
  const ph = packPhoto(p);
  const c = p.container_id ? item(p.container_id) : null;
  const parent = packParent(p);
  const chev = nEnfants
    ? `<span class="chev" onclick="event.stopPropagation();togglePack('${p.id}')">${packOpen.has(p.id)?'▾':'▸'}</span>`
    : '<span class="chev ghost">•</span>';

  const etat = st.manquants.length
    ? `<span class="pkwarn">${st.dedans.length + st.ailleurs.length} of ${st.plan}</span>`
    : `<span class="pkok">complete</span>`;

  return `<div class="packrow" data-pack="${p.id}" data-drop="${p.id}"
       style="padding-left:${12 + niveau*26}px" onclick="openPackDetail('${p.id}')"
       onpointerdown="packDragStart(event,'pack','${p.id}')">
    ${chev}
    ${ph ? `<img class="repthumb" loading="lazy" src="${ph}">`
         : '<span class="repthumb rnophoto"></span>'}
    <div class="repbody">
      <div class="reptitle"><b>${esc(p.name)}</b>
        ${c ? `<span class="pkcont">▣ ${esc(itemTitleText(c))} · <span class="mono">${esc(c.id)}</span></span>` : ''}</div>
      <div class="repmeta">${st.plan} item${st.plan>1?'s':''}
        ${aplati && parent ? `· in ${esc(parent.name)}` : (c ? `· ${esc(itemWhere(c))}` : '')}</div>
    </div>
    <div class="pkright">
      <div>${esc(fweight(packWeight(p)))}</div>
      <div>${etat}</div>
    </div>
  </div>`;
}

function togglePack(id){
  if(packOpen.has(id)) packOpen.delete(id); else packOpen.add(id);
  document.getElementById('packTree').innerHTML = packTreeHTML();
}

/* ============================================================
   FICHE D'UN PACK
   ============================================================ */
let packShown = null;

function openPackDetail(id){
  const p = pack(id);
  if(!p) return;
  packShown = id;
  renderPackDetail();
  open_('ovPack');
}

function renderPackDetail(){
  const p = pack(packShown);
  if(!p) return;
  const st = packStatus(p);
  const parts = packWeightParts(p);
  const c = p.container_id ? item(p.container_id) : null;
  const ph = packPhoto(p);

  const ligne = (i, sous) => {
    const sousPack = packOfContainer(i.id);
    const dedans = i.in_pack_id === p.id;
    const autre = i.in_pack_id ? pack(i.in_pack_id) : null;
    const luiAppartient = autre && packsOfItem(i.id).some(x=>x.id === autre.id);
    const etat = dedans
      ? '<span class="pkok">✓ inside</span>'
      : (luiAppartient && i.status !== 'sorti'
          ? `<span class="muted">in ${esc(autre.name)}</span>`
          : `<span class="pkwarn">⚠ ${esc(itemWhere(i)) || 'missing'}</span>`);
    return `<div class="pkline${sous?' sub':''}" data-item="${i.id}"
         onpointerdown="packDragStart(event,'item','${i.id}')">
      ${i.photo ? `<img class="repthumb sm" loading="lazy" src="${i.photo}">`
                : '<span class="repthumb sm rnophoto"></span>'}
      <div class="repbody">
        <div>${itemTitle(i)} <span class="mono">${esc(i.id)}</span>
          ${sousPack ? `<span class="tag rsent">pack · ${packStatus(sousPack).dedans.length} of ${packStatus(sousPack).plan}</span>` : ''}</div>
      </div>
      <span class="muted pkw">${esc(fweight(sousPack ? itemWeightDeep(i) : i.weight_g))}</span>
      <span class="pkst">${etat}</span>
      ${can('edit') ? `<button class="btn small sec" onclick="event.stopPropagation();packRemove('${p.id}','${i.id}')">✕</button>` : ''}
    </div>`;
  };

  let contenu = '';
  packPlan(p.id).forEach(i=>{
    contenu += ligne(i, false);
    const sp = packOfContainer(i.id);
    if(sp) packPlan(sp.id).forEach(m=>{ contenu += ligne(m, true); });
  });

  document.getElementById('packBody').innerHTML = `
    <div class="pkhead">
      ${ph ? `<img class="pkbig" src="${ph}">` : '<span class="pkbig rnophoto"></span>'}
      <div>
        <h3 style="margin:0">${esc(p.name)}</h3>
        <div class="submuted" style="margin:3px 0 0">
          ${c ? `▣ ${esc(itemTitleText(c))} · <span class="mono">${esc(c.id)}</span> · ${esc(itemWhere(c))}`
              : 'No container — a grouping without a box'}</div>
      </div>
    </div>

    <div class="repstats" style="margin:14px 0">
      <div class="repstat"><div class="k">In the plan</div><div class="n">${st.plan}</div></div>
      <div class="repstat"><div class="k">Present</div>
        <div class="n ${st.manquants.length?'warnv':''}">${st.dedans.length + st.ailleurs.length}</div></div>
      <div class="repstat"><div class="k">Total weight</div>
        <div class="n">${esc(fweight(packWeight(p)))}</div></div>
    </div>

    <div class="fieldlbl">Contents</div>
    <div class="pklist" data-drop="${p.id}">${contenu || '<div class="muted">Empty.</div>'}</div>

    ${st.manquants.length ? `<div class="infoband bad" style="display:block">
      <b>⚠ Missing from the plan — ${st.manquants.length}</b>
      <div style="margin-top:5px">${st.manquants.map(m=>
        `${esc(itemTitleText(m.i))} <span class="muted">· ${esc(m.où || 'location unknown')}</span>`
      ).join('<br>')}</div>
    </div>` : ''}

    <div class="hintline" style="margin-top:12px">Weight:
      container ${esc(fweight(parts.contenant))}${
      parts.nSousPacks ? ` · ${parts.nSousPacks} nested pack${parts.nSousPacks>1?'s':''} ${esc(fweight(parts.sousPacks))}` : ''
      } · other items ${esc(fweight(parts.autres))}</div>`;

  document.getElementById('packActs').innerHTML = `
    ${can('edit') ? `<button class="btn sec" onclick="openPackForm('${p.id}')">Edit</button>` : ''}
    ${can('edit') ? `<button class="btn sec" onclick="openPackAdd('${p.id}')">+ Add items</button>` : ''}
    ${can('checkout') ? `<button class="btn" onclick="packCheckout('${p.id}')">Check out pack</button>` : ''}`;
}

/* ============================================================
   GLISSER-DÉPOSER
   Pointer events, pas l'API HTML de glisser-déposer : celle-ci ne
   fonctionne pas au doigt, et l'iPad est la cible principale. Un
   seul code pour la souris et le tactile.
   ============================================================ */
let drag = null;

function packDragStart(e, type, id){
  if(!can('edit')) return;
  if(e.button !== undefined && e.button !== 0) return;
  const depart = {x:e.clientX, y:e.clientY};
  drag = {type, id, depart, actif:false, cible:null, fantome:null};
  e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
  const move = ev => packDragMove(ev);
  const up   = ev => { packDragEnd(ev); window.removeEventListener('pointermove', move);
                       window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function packDragMove(e){
  if(!drag) return;
  const d = Math.hypot(e.clientX - drag.depart.x, e.clientY - drag.depart.y);
  /* Huit pixels avant de considérer que c'est un glissement : sinon
     le moindre tremblement pendant un clic déplacerait du matériel. */
  if(!drag.actif && d < 8) return;
  if(!drag.actif){
    drag.actif = true;
    document.body.classList.add('dragging');
    drag.fantome = document.createElement('div');
    drag.fantome.className = 'dragghost';
    drag.fantome.innerHTML = packDragLabel();
    document.body.appendChild(drag.fantome);
  }
  drag.fantome.style.left = (e.clientX + 14) + 'px';
  drag.fantome.style.top  = (e.clientY + 14) + 'px';

  const sous = document.elementFromPoint(e.clientX, e.clientY);
  const zone = sous && sous.closest('[data-drop]');
  const cible = zone ? zone.getAttribute('data-drop') : null;
  if(cible === drag.cible) return;
  document.querySelectorAll('.dropok,.dropno').forEach(x=>x.classList.remove('dropok','dropno'));
  drag.cible = cible;
  if(!cible) return;
  const boucle = drag.type === 'item' && packWouldLoop(cible, drag.id);
  zone.classList.add(boucle ? 'dropno' : 'dropok');
  drag.boucle = boucle;
  /* On annonce le résultat AVANT la dépose : le poids et le compte
     qu'on obtiendra, ou la raison du refus. */
  drag.fantome.innerHTML = packDragLabel(cible, boucle);
}

function packDragLabel(cibleId, boucle){
  const quoi = drag.type === 'pack' ? pack(drag.id) : item(drag.id);
  const nom = drag.type === 'pack' ? (quoi ? quoi.name : '') : itemTitleText(quoi);
  const poids = drag.type === 'pack' ? packWeight(quoi) : itemWeightDeep(quoi);
  let t = `<b>${esc(nom)}</b> · ${esc(fweight(poids))}`;
  if(!cibleId) return t;
  const cible = pack(cibleId);
  if(!cible) return t;
  if(boucle) return t + `<span class="no">✕ ${esc(cible.name)} is already inside it</span>`;
  const st = packStatus(cible);
  return t + `<span class="ok">→ ${esc(cible.name)} · ${st.plan + 1} items · ${esc(fweight(packWeight(cible) + poids))}</span>`;
}

async function packDragEnd(e){
  const d = drag; drag = null;
  document.body.classList.remove('dragging');
  document.querySelectorAll('.dropok,.dropno').forEach(x=>x.classList.remove('dropok','dropno'));
  if(d && d.fantome) d.fantome.remove();
  if(!d || !d.actif || !d.cible) return;
  if(d.boucle){ toast('That would put a pack inside itself.', 'error'); return; }

  const cible = pack(d.cible);
  if(!cible) return;
  /* Déposer un pack, c'est déposer son contenant : c'est lui l'objet
     qu'on range, et c'est ce que la personne a en tête. */
  const itemId = d.type === 'pack' ? (pack(d.id) || {}).container_id : d.id;
  if(!itemId){ toast('This pack has no container, so it cannot be put inside another.', 'error'); return; }
  await packMoveInto(cible.id, [itemId]);
}

/* ============================================================
   DÉPLACER, AVEC ANNULATION
   Pas de pile d'historique : dans une app partagée, « annuler »
   trois gestes plus tard écraserait le travail de quelqu'un d'autre.
   On défait ce qu'on vient de faire, tout de suite ou jamais.
   ============================================================ */
async function packMoveInto(packId, itemIds){
  const p = pack(packId);
  const avant = itemIds.map(id=>{
    const i = item(id);
    return {id, in_pack_id: i ? i.in_pack_id : null,
            appartenait: packsOfItem(id).some(x=>x.id === packId)};
  });
  try{
    await apiAddPackItems(packId, itemIds);
    /* La position ne suit que si l'item est au studio. S'il est en
       tournée, seul le plan change — on ne va pas prétendre avoir
       déplacé quelque chose qui est à trois cents kilomètres. */
    const ici = itemIds.filter(id=>{ const i = item(id); return i && i.status !== 'sorti'; });
    if(ici.length) await apiSetItemsPack(ici, packId);
    await refresh();
    if(packShown) renderPackDetail();

    const dehors = itemIds.length - ici.length;
    toast(`${itemIds.length} item(s) → ${p.name}` +
          (dehors ? ` · ${dehors} still out, plan only` : ''),
          'ok', 'Undo', ()=>packUndoMove(packId, avant), 10000);
  }catch(err){
    toast(String(err.message || err), 'error');
  }
}

async function packUndoMove(packId, avant){
  try{
    const àRetirer = avant.filter(a=>!a.appartenait).map(a=>a.id);
    if(àRetirer.length) await apiRemovePackItems(packId, àRetirer);
    /* On remet chacun là où il était, groupé par destination. */
    const groupes = new Map();
    avant.forEach(a=>{
      const k = a.in_pack_id || '';
      if(!groupes.has(k)) groupes.set(k, []);
      groupes.get(k).push(a.id);
    });
    for(const [k, ids] of groupes) await apiSetItemsPack(ids, k || null);
    await refresh();
    if(packShown) renderPackDetail();
    toast('Reverted.', 'ok');
  }catch(err){ toast('Could not undo: ' + (err.message||err), 'error'); }
}

async function packRemove(packId, itemId){
  const avant = [{id:itemId, in_pack_id:item(itemId) ? item(itemId).in_pack_id : null, appartenait:true}];
  try{
    await apiRemovePackItems(packId, [itemId]);
    if(item(itemId) && item(itemId).in_pack_id === packId) await apiSetItemsPack([itemId], null);
    await refresh();
    renderPackDetail();
    toast('Removed from the pack.', 'ok', 'Undo', async ()=>{
      await apiAddPackItems(packId, [itemId]);
      await apiSetItemsPack([itemId], avant[0].in_pack_id);
      await refresh(); renderPackDetail();
    }, 10000);
  }catch(err){ toast(String(err.message||err), 'error'); }
}

/* ============================================================
   CRÉER, MODIFIER, REMPLIR
   ============================================================ */
let packEditing = null;
/* Ce que la liste propose, et à quel item ça correspond. On relisait
   le texte choisi avec une expression régulière — autant dire qu'on
   devinait ce qu'on venait soi-même d'écrire. Un identifiant commençant
   par un chiffre (« 500-001 ») suffisait à tout faire échouer. */
let packContChoix = new Map();

function openPackForm(id){
  packEditing = id || null;
  const p = id ? pack(id) : null;
  /* Un contenant déjà pris par un autre pack ne doit pas être
     proposé : « qu'y a-t-il dans cette caisse » n'aurait plus de
     réponse unique. */
  const libres = db.items.filter(i=>{
    const d = packOfContainer(i.id);
    return !d || (p && d.id === p.id);
  });
  packContChoix = new Map();
  const étiquette = i => `${itemTitleText(i)} · ${i.id}`;
  libres.forEach(i=>packContChoix.set(étiquette(i).toLowerCase(), i.id));

  document.getElementById('pfTitle').textContent = p ? 'Edit pack' : 'New pack';
  document.getElementById('pfBody').innerHTML = `
    <div class="form-grid">
      <div class="field full"><label>Name *</label>
        <input id="pf-name" value="${esc(p ? p.name : '')}" placeholder="e.g. Rack Studio A"></div>
      <div class="field full">
        <label data-tip="The box, rack or device that holds the others. Its own weight counts in the total, and its photo becomes the pack's.">Container ⓘ</label>
        <input id="pf-cont" list="pf-list" placeholder="Type a name or an ID — leave empty for a grouping without a box"
               value="${p && p.container_id ? esc(étiquette(item(p.container_id))) : ''}">
        <datalist id="pf-list">${libres.map(i=>
          `<option value="${esc(étiquette(i))}">`).join('')}</datalist></div>
      <div class="field full"><label>Notes</label>
        <input id="pf-notes" value="${esc(p ? (p.notes||'') : '')}"></div>
    </div>
    ${p ? `<div class="modsec"><button class="btn danger small" onclick="packDelete('${p.id}')">Delete this pack</button>
      <div class="hintline">The items stay in the inventory — only the grouping disappears.</div></div>` : ''}`;
  open_('ovPackForm');
}

/* « Roland Juno-106 · SYN-001 » → SYN-001.
   D'abord la correspondance exacte de ce que la liste proposait ;
   ensuite seulement on essaie de deviner, pour la frappe à la main. */
function packPickId(v){
  const t = String(v||'').trim();
  if(!t) return null;
  const connu = packContChoix.get(t.toLowerCase());
  if(connu) return connu;
  if(item(t)) return t;
  /* Le code d'une sous-catégorie peut contenir des chiffres. */
  const m = t.match(/([A-Za-z0-9]+-\d+)\s*$/);
  if(m && item(m[1])) return m[1];
  /* Dernier recours : le nom complet, sans l'identifiant. */
  const parNom = db.items.find(i=>itemTitleText(i).toLowerCase() === t.toLowerCase());
  return parNom ? parNom.id : null;
}

async function packSave(){
  const name = document.getElementById('pf-name').value.trim();
  if(!name){ toast('A name is required.', 'error'); return; }
  const brut = document.getElementById('pf-cont').value.trim();
  const cont = brut ? packPickId(brut) : null;
  if(brut && !cont){ toast('Container not found — pick one from the list.', 'error'); return; }
  const row = {name, container_id: cont, notes: document.getElementById('pf-notes').value.trim() || null};
  try{
    if(packEditing) await apiUpdatePack(packEditing, row);
    else { const p = await apiInsertPack(row); packShown = p.id; }
    close_('ovPackForm');
    await refresh();
    renderPacks();
    if(packShown && document.getElementById('ovPack').classList.contains('open')) renderPackDetail();
    toast('Saved.', 'ok');
  }catch(err){ toast(String(err.message||err), 'error'); }
}

async function packDelete(id){
  const p = pack(id);
  if(!confirm(`Delete the pack "${p.name}"?\n\nThe ${packStatus(p).plan} items stay in the inventory.`)) return;
  try{
    await apiDeletePack(id);
    close_('ovPackForm'); close_('ovPack');
    await refresh(); renderPacks();
    toast('Pack deleted.', 'ok');
  }catch(err){ toast(String(err.message||err), 'error'); }
}

/* ---- Ajouter des items à un pack ---- */
let packAddSel = new Set();

function openPackAdd(id){
  packShown = id; packAddSel = new Set();
  document.getElementById('pa-q').value = '';
  renderPackAdd();
  open_('ovPackAdd');
}
function packAddSearch(){ renderPackAdd(); }
function packAddToggle(id){
  if(packAddSel.has(id)) packAddSel.delete(id); else packAddSel.add(id);
  renderPackAdd();
}
function renderPackAdd(){
  const p = pack(packShown);
  const q = (document.getElementById('pa-q').value||'').toLowerCase().trim();
  const déjà = new Set(packPlan(p.id).map(i=>i.id));
  const rows = db.items
    .filter(i=>!déjà.has(i.id))
    .filter(i=>!q || (itemTitleText(i)+' '+i.id).toLowerCase().includes(q))
    .slice(0, 80);
  document.getElementById('paList').innerHTML = rows.map(i=>{
    const boucle = packWouldLoop(p.id, i.id);
    const sp = packOfContainer(i.id);
    return `<div class="pkline ${boucle?'muted':''}" ${boucle?'':`onclick="packAddToggle('${i.id}')"`}>
      <input type="checkbox" ${packAddSel.has(i.id)?'checked':''} ${boucle?'disabled':''}>
      ${i.photo ? `<img class="repthumb sm" src="${i.photo}">` : '<span class="repthumb sm rnophoto"></span>'}
      <div class="repbody"><div>${itemTitle(i)} <span class="mono">${esc(i.id)}</span>
        ${sp ? `<span class="tag rsent">pack · ${packStatus(sp).plan} items</span>` : ''}</div>
        <div class="repmeta">${esc(itemWhere(i))}${boucle?' · would create a loop':''}</div></div>
    </div>`;
  }).join('') || '<div class="muted">Nothing matches.</div>';
  document.getElementById('paGo').textContent =
    packAddSel.size ? `Add ${packAddSel.size} item${packAddSel.size>1?'s':''}` : 'Add';
  document.getElementById('paGo').disabled = !packAddSel.size;
}
async function packAddApply(){
  if(!packAddSel.size) return;
  close_('ovPackAdd');
  await packMoveInto(packShown, [...packAddSel]);
}

/* ---- Sortir un pack ----
   On sort ce qui est réellement dedans. Ce qui manque est annoncé,
   pas embarqué : l'inventaire ne doit jamais affirmer qu'un objet
   est en tournée alors qu'il est dans un tiroir. */
function packCheckout(id){
  const p = pack(id);
  const st = packStatus(p);
  const sortables = st.dedans.filter(i=>i.status === 'dispo' && canCheckout(i));
  const bloqués = st.dedans.filter(i=>i.status === 'dispo' && !canCheckout(i));
  if(!sortables.length){ toast('Nothing in this pack can be checked out.', 'error'); return; }

  sel = new Set(sortables.map(i=>i.id));
  close_('ovPack');
  if(st.manquants.length || bloqués.length){
    toast(`${sortables.length} item(s) selected` +
          (st.manquants.length ? ` · ${st.manquants.length} missing from the pack` : '') +
          (bloqués.length ? ` · ${bloqués.length} blocked` : ''), 'info', null, null, 7000);
  }
  show('inv');
  openBulkCheckout();
}
