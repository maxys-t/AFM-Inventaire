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
  const incomplets = tous.filter(p=>packStatus(p).manque).length;
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
    const dansLeContenu = packItemsOf(p.id).some(i=>
      (itemTitleText(i) + ' ' + i.id).toLowerCase().includes(q));
    if(!dansLeNom && !dansLeContenu) return false;
  }
  if(packOnlyIncomplete && !packStatus(p).manque) return false;
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

/* `parentId` : la branche d'où la ligne est affichée. Depuis la v1.22
   un pack peut figurer dans plusieurs autres ; sans cette information,
   un glissement ne saurait pas de QUELLE caisse on sort l'objet, et
   « déplacer » deviendrait « copier » au hasard des branches.
   `vus` coupe les répétitions dans une même descendance. */
function packBrancheHTML(p, niveau, parentId, vus){
  vus = vus || new Set();
  if(vus.has(p.id)) return '';
  vus.add(p.id);
  const enfants = packChildren(p.id);
  const ouvert = packOpen.has(p.id);
  let h = packRowHTML(p, niveau, false, enfants.length, parentId);
  if(ouvert) enfants.forEach(c=>{ h += packBrancheHTML(c, niveau + 1, p.id, new Set(vus)); });
  return h;
}

function packRowHTML(p, niveau, aplati, nEnfants, parentId){
  const st = packStatus(p);
  const ph = packPhoto(p);
  const c = p.container_id ? item(p.container_id) : null;
  const parent = packParent(p);
  const chev = nEnfants
    ? `<span class="chev" onclick="event.stopPropagation();togglePack('${p.id}')">${packOpen.has(p.id)?'▾':'▸'}</span>`
    : '<span class="chev ghost">•</span>';

  /* Un trou dans un rack monté en permanence est un problème ; dans
     une configuration qui n'est pas montée, ce n'en est pas un. Même
     chiffre, deux lectures — l'écran ne doit crier que pour la
     première. */
  const etat = st.dehors
    ? `<span class="tag sorti">out · ${esc(st.dehors.où)}</span>`
    : !st.absents.length
      ? (p.permanent ? `<span class="pkok">all here</span>` : `<span class="pkok">all free</span>`)
      : (st.manque ? `<span class="pkwarn">${st.absents.length} missing</span>`
                   : `<span class="muted">${st.absents.length} in use</span>`);

  return `<div class="packrow" data-pack="${p.id}" data-drop="${p.id}" data-parent="${parentId||''}"
       style="padding-left:${12 + niveau*26}px" onclick="openPackDetail('${p.id}')"
       onpointerdown="packDragStart(event,'pack','${p.id}')">
    ${chev}
    <span class="pkgrip" title="Drag to move this pack">⠿</span>
    ${ph ? `<img class="repthumb" loading="lazy" src="${ph}">`
         : '<span class="repthumb rnophoto"></span>'}
    <div class="repbody">
      <div class="reptitle"><b>${esc(p.name)}</b>
        ${c ? `<span class="pkcont">▣ ${esc(itemTitleText(c))} · <span class="mono">${esc(c.id)}</span></span>` : ''}</div>
      <div class="repmeta">${st.total} item${st.total>1?'s':''}
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
    const dehors = i.status === 'sorti' || repairOf(i.id);
    return `<div class="pkline${sous?' sub':''}" data-item="${i.id}"
         onpointerdown="packDragStart(event,'item','${i.id}')">
      <span class="pkgrip" title="Drag to move this item">⠿</span>
      ${i.photo ? `<img class="repthumb sm" loading="lazy" src="${i.photo}">`
                : '<span class="repthumb sm rnophoto"></span>'}
      <div class="repbody">
        <div>${itemTitle(i)} <span class="mono">${esc(i.id)}</span>
          ${sousPack ? `<span class="tag rsent">pack · ${packStatus(sousPack).total} items</span>` : ''}</div>
      </div>
      <span class="muted pkw">${esc(fweight(sousPack ? itemWeightDeep(i) : i.weight_g))}</span>
      <span class="pkst">${(dehors && !st.dehors) ? `<span class="pkwarn">⚠ ${esc(itemWhere(i))}</span>` : ''}</span>
      ${can('edit') ? `<button class="btn small sec" onclick="event.stopPropagation();packRemove('${p.id}','${i.id}')">✕</button>` : ''}
    </div>`;
  };

  let contenu = '';
  packItemsOf(p.id).forEach(i=>{
    contenu += ligne(i, false);
    const sp = packOfContainer(i.id);
    if(sp) packItemsOf(sp.id).forEach(m=>{ contenu += ligne(m, true); });
  });

  document.getElementById('packBody').innerHTML = `
    <div class="pkhead">
      ${ph ? `<img class="pkbig" src="${ph}">` : '<span class="pkbig rnophoto"></span>'}
      <div>
        <h3 style="margin:0">${esc(p.name)}
          <span class="tag ${p.permanent?'perm':'conf'}">${p.permanent?'assembled':'config'}</span>
          ${st.dehors?`<span class="tag sorti">checked out</span>`:''}</h3>
        ${st.dehors?`<div style="margin:4px 0 0"><b>📤 Out — ${esc(st.dehors.où)}</b>${
          st.dehors.quand?` <span class="muted">· since ${esc(fdateD(st.dehors.quand))}</span>`:''}</div>`:''}
        <div class="submuted" style="margin:3px 0 0">
          ${c ? `▣ ${esc(itemTitleText(c))} · <span class="mono">${esc(c.id)}</span> · ${esc(itemWhere(c))}`
              : 'No container — a grouping without a box'}</div>
      </div>
    </div>

    <div class="repstats" style="margin:14px 0">
      <div class="repstat"><div class="k">Items</div><div class="n">${st.total}</div></div>
      <div class="repstat"><div class="k">${st.dehors?'Still here':'In the box'}</div>
        <div class="n ${st.manque?'warnv':''}">${st.présents.length}</div></div>
      <div class="repstat"><div class="k">Total weight</div>
        <div class="n">${esc(fweight(packWeight(p)))}</div></div>
    </div>

    <div class="fieldlbl">Contents</div>
    <div class="pklist" data-drop="${p.id}">${contenu || '<div class="muted">Empty.</div>'}</div>

    ${(st.absents.length && !st.dehors) ? `<div class="infoband ${st.manque?'bad':''}" style="display:block">
      <b>${st.manque ? `⚠ Missing from the rack — ${st.absents.length}`
                     : `In use elsewhere — ${st.absents.length}`}</b>
      <div style="margin-top:5px">${st.absents.map(m=>
        `${esc(itemTitleText(m.i))} <span class="muted">· ${esc(m.où || 'location unknown')}</span>`
      ).join('<br>')}</div>
      ${st.manque ? '' : '<div class="hintline" style="margin-top:6px">This pack is a configuration, not a place: these items are simply busy right now.</div>'}
    </div>` : ''}

    ${packExtrasBlock(p)}

    <div class="hintline" style="margin-top:12px">Weight:
      container ${esc(fweight(parts.contenant))}${
      parts.nSousPacks ? ` · ${parts.nSousPacks} nested pack${parts.nSousPacks>1?'s':''} ${esc(fweight(parts.sousPacks))}` : ''
      } · other items ${esc(fweight(parts.autres))}</div>`;

  document.getElementById('packActs').innerHTML = `
    ${can('edit') ? `<button class="btn sec" onclick="openPackForm('${p.id}')">Edit</button>` : ''}
    ${can('edit') ? `<button class="btn sec" onclick="openPackAdd('${p.id}')">+ Add items</button>` : ''}
    ${can('checkout') ? (st.dehors
      ? `<button class="btn ok" onclick="packCheckin('${p.id}')">📥 Check in pack</button>`
      : `<button class="btn" onclick="packCheckout('${p.id}')">Check out pack</button>`) : ''}`;
}

/* ============================================================
   CONSOMMABLES (v1.22)

   Gaffer, colliers, piles, un multitool. Des choses qu'on veut voir
   sur la checklist d'une caisse, mais qui ne méritent ni identifiant,
   ni fiche, ni historique, ni étiquette QR. Les inscrire à
   l'inventaire ferait passer le parc de 649 à 700 lignes dont des
   rouleaux de scotch — et « sortir un rouleau de gaffer » n'a aucun
   sens.

   Ce sont donc des lignes de checklist, et elles doivent le rester :
   un libellé, une quantité. Volontairement sans poids — le total d'un
   projet est le chiffre qu'on lit face à un transporteur.
   ============================================================ */
function packExtrasBlock(p){
  if(!db.packExtrasSupported){
    return `<div class="hintline" style="margin-top:12px">Consumables need <b>sql/024-packs-presets-projets.sql</b> — run it in Supabase, then refresh.</div>`;
  }
  const ex = packExtrasOf(p.id);
  return `
    <div class="fieldlbl" style="margin-top:14px">Consumables
      <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">— checklist only, no weight</span></div>
    <div class="pklist">
      ${ex.map(e=>`<div class="pkline">
        <div class="repbody"><div>${esc(e.label)} <span class="muted">× ${e.qty}</span></div></div>
        ${can('edit')?`<button class="btn small sec" onclick="packExtraDelete('${e.id}')">✕</button>`:''}
      </div>`).join('') || '<div class="muted">None.</div>'}
    </div>
    ${can('edit')?`<div class="toolbar" style="margin-top:8px">
      <input id="px-label" placeholder="e.g. Black gaffer tape" style="flex:1;min-width:150px"
             onkeydown="if(event.key==='Enter')packExtraAdd('${p.id}')">
      <input id="px-qty" type="number" min="1" max="9999" value="1" style="width:84px">
      <button class="btn small" onclick="packExtraAdd('${p.id}')">Add</button>
    </div>`:''}`;
}

async function packExtraAdd(packId){
  const el = document.getElementById('px-label');
  const label = (el.value||'').trim();
  if(!label){ toast('Type a name first.', 'warn'); return; }
  const qty = Math.max(1, Math.min(9999, parseInt(document.getElementById('px-qty').value, 10) || 1));
  try{
    const row = await apiInsertPackExtra({pack_id:packId, label, qty, pos:packExtrasOf(packId).length});
    db.packExtras.push(row);
    renderPackDetail();
    toast('Added.', 'ok');
  }catch(err){ toast(String(err.message||err), 'error'); }
}
async function packExtraDelete(id){
  try{
    await apiDeletePackExtra(id);
    db.packExtras = db.packExtras.filter(e=>e.id !== id);
    renderPackDetail();
  }catch(err){ toast(String(err.message||err), 'error'); }
}

/* ============================================================
   GLISSER-DÉPOSER
   Pointer events, pas l'API HTML de glisser-déposer : celle-ci ne
   fonctionne pas au doigt, et l'iPad est la cible principale. Un
   seul code pour la souris et le tactile.
   ============================================================ */
let drag = null;
/* Un glissement se termine par un « clic » que le navigateur envoie
   de toute façon. Sans ce garde-fou, déposer un pack ouvre sa fiche
   dans la foulée — on a bougé quelque chose, et une fenêtre s'ouvre
   par-dessus le résultat qu'on voulait voir. */
let dragFini = 0;
document.addEventListener('click', e=>{
  if(Date.now() - dragFini < 350){ e.stopPropagation(); e.preventDefault(); }
}, true);

function packDragStart(e, type, id){
  if(!can('edit')) return;
  if(e.button !== undefined && e.button !== 0) return;
  /* Au doigt, seule la poignée lance un glissement : partout ailleurs
     la liste doit pouvoir défiler. À la souris, la ligne entière
     reste saisissable — le défilement s'y fait à la molette, et rien
     ne se gêne. */
  if(e.pointerType === 'touch' && !(e.target.closest && e.target.closest('.pkgrip'))) return;
  const depart = {x:e.clientX, y:e.clientY};
  /* La liste d'où part le geste : c'est en haut d'ELLE que la zone de
     sortie doit apparaître, pas en haut de la fenêtre. Une bande
     flottante au sommet de l'écran n'a aucun rapport avec l'endroit
     où l'on travaille. */
  const conteneur = e.target.closest('#packTree, .pklist');
  /* D'OÙ part le geste. Un item peut désormais appartenir à plusieurs
     packs : sans cette origine, « déplacer » le retirerait d'une
     caisse choisie au hasard, ou de nulle part — et le glissement
     deviendrait une copie silencieuse. */
  const ligne = e.target.closest('.packrow');
  const source = (conteneur && conteneur.classList.contains('pklist'))
    ? (conteneur.dataset.drop || null)
    : (ligne ? (ligne.dataset.parent || null) : null);
  drag = {type, id, depart, actif:false, cible:null, fantome:null, conteneur, source};
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
    packOutBar(true);
    drag.fantome = document.createElement('div');
    drag.fantome.className = 'dragghost';
    drag.fantome.innerHTML = packDragLabel();
    document.body.appendChild(drag.fantome);
  }
  drag.fantome.style.left = (e.clientX + 14) + 'px';
  drag.fantome.style.top  = (e.clientY + 14) + 'px';
  /* La caisse d'arrivée est souvent hors de l'écran : on fait défiler
     tout seul quand le doigt approche d'un bord. */
  dragScrollMove(e);

  const sous = document.elementFromPoint(e.clientX, e.clientY);
  const zone = sous && sous.closest('[data-drop]');
  const cible = zone ? zone.getAttribute('data-drop') : null;
  if(cible === drag.cible) return;
  document.querySelectorAll('.dropok,.dropno').forEach(x=>x.classList.remove('dropok','dropno'));
  drag.cible = cible;
  if(!cible) return;
  if(cible === '__out'){
    zone.classList.add('dropok');
    drag.boucle = false;
    const par = packDragParent();
    drag.fantome.innerHTML = packDragLabel() +
      `<span class="ok">↥ out of ${esc(par ? par.name : '')}</span>`;
    return;
  }
  const boucle = drag.type === 'item' && packWouldLoop(cible, drag.id);
  zone.classList.add(boucle ? 'dropno' : 'dropok');
  drag.boucle = boucle;
  /* On annonce le résultat AVANT la dépose : le poids et le compte
     qu'on obtiendra, ou la raison du refus. */
  drag.fantome.innerHTML = packDragLabel(cible, boucle);
}

/* La zone de sortie n'apparaît que pendant un glissement, et
   seulement si l'objet est effectivement rangé quelque part. Une
   cible permanente inviterait à des dépôts accidentels. */
function packOutBar(montrer){
  let b = document.getElementById('packout');
  if(!montrer){ if(b) b.remove(); return; }
  if(b || !drag || !drag.conteneur) return;
  const parent = packDragParent();
  if(!parent) return;
  b = document.createElement('div');
  b.id = 'packout';
  b.className = 'packoutrow';
  b.setAttribute('data-drop', '__out');
  b.innerHTML = `↥ Take out of <b>${esc(parent.name)}</b>`;
  drag.conteneur.insertBefore(b, drag.conteneur.firstChild);
}

/* Le pack dont l'objet glissé sort, s'il est rangé quelque part. */
/* La caisse d'où part le geste, pour afficher « sortir de … ». On
   préfère l'origine réelle du glissement à une déduction : un item
   peut appartenir à plusieurs packs depuis la v1.22. */
function packDragParent(){
  if(!drag) return null;
  if(drag.source) return pack(drag.source);
  if(drag.type === 'pack'){
    const p = pack(drag.id);
    return p ? packParent(p) : null;
  }
  return packOfItem(drag.id);
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
  return t + `<span class="ok">→ ${esc(cible.name)} · ${st.total + 1} items · ${esc(fweight(packWeight(cible) + poids))}</span>`;
}

async function packDragEnd(e){
  const d = drag; drag = null;
  dragScrollStop();
  if(d && d.actif) dragFini = Date.now();
  packOutBar(false);
  document.body.classList.remove('dragging');
  document.querySelectorAll('.dropok,.dropno').forEach(x=>x.classList.remove('dropok','dropno'));
  if(d && d.fantome) d.fantome.remove();
  if(!d || !d.actif || !d.cible) return;
  if(d.boucle){ toast('That would put a pack inside itself.', 'error'); return; }

  if(d.cible === '__out'){
    const itemId = d.type === 'pack' ? (pack(d.id) || {}).container_id : d.id;
    if(itemId) await packTakeOut(itemId, d.source);
    return;
  }
  const cible = pack(d.cible);
  if(!cible) return;
  /* Déposer un pack, c'est déposer son contenant : c'est lui l'objet
     qu'on range, et c'est ce que la personne a en tête. */
  const itemId = d.type === 'pack' ? (pack(d.id) || {}).container_id : d.id;
  if(!itemId){ toast('This pack has no container, so it cannot be put inside another.', 'error'); return; }
  await packMoveInto(cible.id, [itemId], d.source);
}

/* ============================================================
   DÉPLACER, AVEC ANNULATION
   Pas de pile d'historique : dans une app partagée, « annuler »
   trois gestes plus tard écraserait le travail de quelqu'un d'autre.
   On défait ce qu'on vient de faire, tout de suite ou jamais.
   ============================================================ */
async function packMoveInto(packId, itemIds, sourceId){
  const p = pack(packId);
  /* Où chacun était rangé, pour pouvoir revenir en arrière. La source
     est la caisse D'OÙ le geste est parti : depuis la v1.22 un item
     peut appartenir à plusieurs packs, et seule celle-là doit le
     perdre. À défaut d'origine connue (un glissement depuis un pack
     racine), on ne retire rien et le geste ajoute. */
  const avant = itemIds.map(id=>{
    const o = sourceId ? pack(sourceId) : null;
    return {id, pack: (o && packItemsOf(o.id).some(x=>x.id === id)) ? o.id : null};
  });
  try{
    /* Glisser déplace : on retire de la caisse d'origine avant d'ajouter. */
    for(const a of avant) if(a.pack && a.pack !== packId) await apiRemovePackItems(a.pack, [a.id]);
    await apiAddPackItems(packId, itemIds);
    await refresh(); renderPacks();
    if(packShown) renderPackDetail();
    toast(`${itemIds.length} item(s) → ${p.name}`, 'ok',
          'Undo', ()=>packUndoMove(packId, avant), 10000);
  }catch(err){ toast(String(err.message || err), 'error'); }
}

async function packUndoMove(packId, avant){
  try{
    await apiRemovePackItems(packId, avant.map(a=>a.id));
    for(const a of avant) if(a.pack) await apiAddPackItems(a.pack, [a.id]);
    await refresh(); renderPacks();
    if(packShown) renderPackDetail();
    toast('Reverted.', 'ok');
  }catch(err){ toast('Could not undo: ' + (err.message||err), 'error'); }
}

/* Sortir un objet de son pack : il quitte le plan de celui qui le
   contenait et n'est plus rangé nulle part. Ses autres appartenances
   ne bougent pas — on le sort d'une boîte, on ne l'efface pas. */
async function packTakeOut(itemId, sourceId){
  const p = sourceId ? pack(sourceId) : packOfItem(itemId);
  if(!p){ toast('This is not inside a pack.', 'error'); return; }
  try{
    await apiRemovePackItems(p.id, [itemId]);
    await refresh(); renderPacks();
    if(packShown) renderPackDetail();
    toast(`Taken out of ${p.name}.`, 'ok', 'Undo', async ()=>{
      await apiAddPackItems(p.id, [itemId]);
      await refresh(); renderPacks();
      if(packShown) renderPackDetail();
      toast('Reverted.', 'ok');
    }, 10000);
  }catch(err){ toast(String(err.message||err), 'error'); }
}

async function packRemove(packId, itemId){
  try{
    await apiRemovePackItems(packId, [itemId]);
    await refresh(); renderPacks(); renderPackDetail();
    toast('Removed from the pack.', 'ok', 'Undo', async ()=>{
      await apiAddPackItems(packId, [itemId]);
      await refresh(); renderPacks(); renderPackDetail();
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

/* Proposer les 649 items pour choisir une caisse était un champ de
   mines : trois lettres et on tombait sur un micro. On ne propose
   donc que les sous-catégories de contenants (CONTAINER_SUBS), plus
   ce qui sert déjà de contenant. La case ci-dessous rouvre la liste
   entière pour les cas qu'on n'a pas prévus. */
let packFormAll = false;
function packFormShowAll(on){ packFormAll = !!on; openPackForm(packEditing); }

function openPackForm(id){
  packEditing = id || null;
  const p = id ? pack(id) : null;
  /* Depuis la v1.24, un contenant peut porter plusieurs recettes : on
     ne l'écarte plus parce qu'un autre pack s'en sert. Seul un
     deuxième assemblage MONTÉ est refusé, et c'est packSave qui le
     dit — avec la raison. */
  const libres = db.items.filter(i=>packFormAll || isContainerKind(i));
  packContChoix = new Map();
  const étiquette = i => `${itemTitleText(i)} · ${i.id}`;
  libres.forEach(i=>packContChoix.set(étiquette(i).toLowerCase(), i.id));
  /* Le contenant déjà choisi doit rester reconnaissable même s'il
     sort de la liste courte. */
  if(p && p.container_id && item(p.container_id))
    packContChoix.set(étiquette(item(p.container_id)).toLowerCase(), p.container_id);

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
          `<option value="${esc(étiquette(i))}">`).join('')}</datalist>
        <label class="checkline">
          <input type="checkbox" ${packFormAll?'checked':''} onchange="packFormShowAll(this.checked)">
          Show all items (${db.items.length}) — not just bags, cases and racks</label></div>
      <div class="field full"><label>Notes</label>
        <input id="pf-notes" value="${esc(p ? (p.notes||'') : '')}"></div>
      <div class="field full">
        <label class="checkline" data-tip="An assembled pack is a real place: a missing item is a gap worth flagging. A configuration is a reusable recipe — nothing is missing until it is built.">
          <input type="checkbox" id="pf-perm" ${p && p.permanent ? 'checked' : ''}>
          Assembled permanently (studio rack, console) ⓘ</label>
        <div class="hintline">Leave unticked for a touring configuration: the same item may belong to several configurations, and only one is built at a time.</div>
      </div>
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
  const monté = !!(document.getElementById('pf-perm')||{}).checked;
  /* Un contenant peut servir à plusieurs configurations, mais n'être
     monté qu'une fois : deux assemblages montés autour du même meuble
     décriraient deux contenus simultanés du même objet. La base le
     refuse aussi ; on le dit ici, avec le nom du coupable. */
  if(cont && monté){
    const déjà = packsOfContainer(cont).find(x=>x.permanent && x.id !== packEditing);
    if(déjà){
      toast(`${itemTitleText(item(cont))} is already assembled as "${déjà.name}". `
          + `Leave this one as a configuration, or unassemble the other.`, 'error', null, null, 9000);
      return;
    }
  }
  const row = {name, container_id: cont, notes: document.getElementById('pf-notes').value.trim() || null,
               permanent: monté};
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
  if(!confirm(`Delete the pack "${p.name}"?\n\nThe ${packStatus(p).total} items stay in the inventory.`)) return;
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
  const déjà = new Set(packItemsOf(p.id).map(i=>i.id));
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
        ${sp ? `<span class="tag rsent">pack · ${packStatus(sp).total} items</span>` : ''}</div>
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
   On sort ce qui est dans la boîte. Ce qui est déjà dehors est
   annoncé, pas embarqué : l'inventaire ne doit jamais affirmer
   qu'un objet part alors qu'il est déjà ailleurs. */
/* ============================================================
   SORTIR UNE CAISSE

   Les items signalés — en panne, hors service, dossier de réparation
   ouvert — étaient retirés de la sélection sans rien demander. On
   emporte pourtant un ampli capricieux quand on en a besoin, et
   découvrir au déchargement qu'il est resté au studio parce que
   l'application a décidé à notre place, c'est le pire moment.

   Une fenêtre les liste donc, cochés par défaut : on part avec, sauf
   si l'on décoche. Seul l'objet qui est CHEZ un réparateur reste
   dehors — aucune case à cocher ne le fera apparaître dans la caisse.
   ============================================================ */
let packOutPending = null;

function packCheckout(id){
  const p = pack(id);
  /* Tout ce qui part : le contenant, son contenu, et celui des packs
     imbriqués. Pas seulement les membres directs. */
  const tout = packAllItems(p);
  const dehors    = tout.filter(i=>i.status === 'sorti');
  const ici       = tout.filter(i=>i.status === 'dispo');
  const absents   = ici.filter(checkoutImpossible);
  const possibles = ici.filter(i=>!checkoutImpossible(i));
  const signalés  = possibles.filter(i=>checkoutBlockReason(i));

  if(!possibles.length){
    toast(dehors.length
      ? 'Everything in this pack is already out.'
      : 'Nothing in this pack can be checked out.', 'error');
    return;
  }

  if(!signalés.length && !absents.length){
    packOutGo(p, possibles.map(i=>i.id), dehors.length, []);
    return;
  }

  packOutPending = {packId:p.id, ids:possibles.map(i=>i.id),
                    dehors:dehors.length, absents:absents.map(i=>i.id)};
  document.getElementById('poTitle').textContent = `Check out ${p.name}`;
  document.getElementById('poBody').innerHTML = `
    <p class="muted">${possibles.length} item(s) will be checked out.
      ${signalés.length} ${signalés.length>1?'are':'is'} flagged — untick what should stay behind.</p>
    <div class="pklist" style="margin-top:10px">
      ${signalés.map(i=>`<label class="pkline" style="cursor:pointer">
        <input type="checkbox" checked data-po="${i.id}" style="width:18px;height:18px;flex:none">
        <div class="repbody"><div>${itemTitle(i)} <span class="mono">${esc(i.id)}</span></div>
          <div class="submuted">${esc(checkoutBlockReason(i))}</div></div>
        <span class="tag ${i.cond}">${esc(CONDS[i.cond]||i.cond)}</span>
      </label>`).join('')}
    </div>
    ${absents.length ? `<div class="infoband bad" style="display:block;margin-top:10px">
      <b>⚠ Not in the studio — ${absents.length}</b>
      <div style="margin-top:5px">${absents.map(i=>
        `${esc(itemTitleText(i))} <span class="muted">· ${esc(itemWhere(i))}</span>`
      ).join('<br>')}</div>
      <div class="hintline" style="margin-top:6px">These are at a repair shop — they cannot leave with the case.</div>
    </div>` : ''}
    ${dehors.length ? `<div class="hintline" style="margin-top:8px">${dehors.length} item(s) of this pack are already out elsewhere.</div>` : ''}`;
  open_('ovPackOut');
}

/* Les deux raccourcis de la fenêtre : tout emporter, ou ne rien
   emporter de ce qui est signalé. */
function packOutTickAll(on){
  document.querySelectorAll('#poBody input[data-po]').forEach(c=>{ c.checked = on; });
}

function packOutConfirm(){
  const d = packOutPending; if(!d) return;
  const refusés = new Set();
  document.querySelectorAll('#poBody input[data-po]').forEach(c=>{
    if(!c.checked) refusés.add(c.dataset.po);
  });
  const ids = d.ids.filter(x=>!refusés.has(x));
  if(!ids.length){ toast('Nothing left to check out.', 'warn'); return; }
  close_('ovPackOut');
  packOutGo(pack(d.packId), ids, d.dehors, [...refusés]);
}

function packOutGo(p, ids, dehors, laissés){
  sel = new Set(ids);
  close_('ovPack');
  show('inv');
  renderBulkBar();
  const bouts = [`${ids.length} item(s) selected`];
  if(dehors) bouts.push(`${dehors} already out`);
  if(laissés.length) bouts.push(`${laissés.length} left behind`);
  if(bouts.length > 1) toast(bouts.join(' · '), 'info', null, null, 7000);
  openBulkCheckout();
}

/* Le retour d'une caisse partie entière. Sans lui, rentrer un pack
   demandait de retrouver ses huit éléments un par un dans l'onglet
   Checked out — alors qu'ils sont revenus ensemble, dans la même
   caisse, par le même geste. */
async function packCheckin(id){
  const p = pack(id); if(!p) return;
  const dehors = packAllItems(p).filter(i=>i.status === 'sorti' && !outForRepair(i));
  if(!dehors.length){ toast('Nothing to check in.', 'warn'); return; }
  if(!confirm(`Check in ${dehors.length} item(s) of "${p.name}"?\n\nEach one goes back to its home location.`)) return;
  try{
    const lignes = [];
    for(const i of dehors){
      i.status = 'dispo'; i.loc = i.home; i.out = null;
      await apiUpdateItem(i.id, {status:'dispo', loc:i.loc, out:null});
      lignes.push({itemId:i.id, type:'in', detail:`Back with ${p.name}`, cond:i.cond});
    }
    await histMany(lignes);
    await refresh(); renderPacks();
    if(packShown) renderPackDetail();
    toast(`${dehors.length} item(s) checked in.`, 'ok');
  }catch(err){ toast(String(err.message||err), 'error'); }
}
