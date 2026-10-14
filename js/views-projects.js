/* ============================================================
   VUE — Projets : liste, composition en pleine page, préparation

   L'onglet Projets sert à faire partir du matériel. Un projet est un
   mélange de caisses (packs) et d'items isolés ; on le compose en
   glissant depuis l'inventaire, à gauche, vers le projet, à droite.

   Trois écrans, pas de fenêtre modale : composer un chargement
   demande de la place, et une modale sur iPad n'en laisse aucune.
     liste → composition → préparation
   ============================================================ */

let projView = {mode:'list', id:null, tab:'items', q:''};
let showArchivedProj = false;
function toggleArchivedProj(){ showArchivedProj = !showArchivedProj; renderProj(); }

/* « 2026/10/12 » ou « 2026/10/12 → 2026/10/13 » */
function projDates(p){
  if(!p.starts_on && !p.ends_on) return '';
  if(p.starts_on && p.ends_on && p.starts_on !== p.ends_on)
    return fdateD(p.starts_on) + ' → ' + fdateD(p.ends_on);
  return fdateD(p.starts_on || p.ends_on);
}

function renderProj(){
  const box = document.getElementById('v-proj');
  if(db.projectsError){
    box.innerHTML = `<div class="alert bad">The projects table does not exist yet — run <b>sql/003-projets.sql</b> in Supabase (SQL Editor), then click ↻ Refresh.</div>`;
    return;
  }
  /* Un projet supprimé ailleurs pendant qu'on l'éditait : on retombe
     sur la liste plutôt que sur un écran vide. */
  if(projView.mode !== 'list' && !project(projView.id)) projView.mode = 'list';

  if(projView.mode === 'edit'){ box.innerHTML = projEditor(); bindProjDrag(); return; }
  if(projView.mode === 'prep'){ box.innerHTML = projPrep(); return; }
  box.innerHTML = projList();
}

function projGo(mode, id){
  projView.mode = mode; projView.id = id || null; projView.q = '';
  renderProj();
  window.scrollTo(0, 0);
}
function projBack(){ projGo('list'); }

/* ============================================================
   1. La liste
   ============================================================ */
function projList(){
  let html = can('edit')
    ? `<div class="toolbar"><button class="btn" onclick="openProjForm()">+ New project</button></div>` : '';

  const rows = db.projects.filter(p=>showArchivedProj || !p.archived);
  const nbArch = db.projects.filter(p=>p.archived).length;

  if(!rows.length){
    html += '<div class="panel"><div class="empty">'
      + (db.projects.length ? 'No active project — everything is archived.'
         : 'No project yet. Build one from your packs and a few loose items — it can be duplicated next time.')
      + '</div></div>';
  }else{
    html += '<div class="pjcards">' + rows.map(p=>{
      const c = projContent(p);
      const pr = projProgress(p);
      const d = projDates(p);
      return `<div class="pjcard${p.archived?' arch':''}">
        <div class="pjcard-top">
          <div style="flex:1;min-width:0">
            <h3>${esc(p.name)}</h3>
            <div class="muted">${p.loc_name?esc(p.loc_name):'no destination'}${d?' · '+esc(d):''}</div>
          </div>
          <span class="tag ${PTAG[p.status]}">${PSTAT[p.status]||p.status}</span>
        </div>
        ${p.description?`<div class="muted" style="margin-top:4px">${esc(p.description)}</div>`:''}
        <div class="pjsum">
          <div><b>${c.groups.length}</b>case(s)</div>
          <div><b>${c.items.length}</b>item(s)</div>
          <div><b>${fweight(c.weight)}</b>total</div>
        </div>
        ${p.status==='preparation'?`<div class="pline"><div class="pbar"><div style="width:${pr.total?Math.round(pr.done/pr.total*100):0}%"></div></div><span class="muted">${pr.done}/${pr.total}</span></div>`:''}
        <div class="pjacts">
          <button class="btn small" onclick="projGo('prep','${p.id}')">Open</button>
          ${(can('edit') && p.status!=='show')?`<button class="btn sec small" onclick="projGo('edit','${p.id}')">Edit gear</button>`:''}
          ${can('edit')?`<button class="btn sec small" onclick="duplicateProj('${p.id}')">Duplicate</button>`:''}
        </div>
        ${p.archived?'<span class="tag pinactif">archived</span>':''}
      </div>`;
    }).join('') + '</div>';
  }
  if(nbArch){
    html += `<div style="margin-top:10px"><button class="btn sec small" onclick="toggleArchivedProj()">
      ${showArchivedProj?'Hide':'Show'} archived (${nbArch})</button></div>`;
  }
  return html;
}

/* Création : le projet existe en base dès l'ouverture de la page.
   Composer un chargement se fait par petits gestes — glisser une
   caisse, en retirer un item — et chacun doit être enregistré sur le
   champ. Un formulaire qu'on « valide » à la fin perdrait tout si
   l'iPad se verrouille au milieu. */
async function openProjForm(id){
  if(id){ projGo('edit', id); return; }
  if(!can('edit')) return;
  const p = {id:"p"+Date.now(), name:"New project", description:"", status:'inactif',
             item_ids:[], pack_ids:[], prep:{}, snapshot:null, last_used:null,
             created_at:now(), loc_name:'', starts_on:null, ends_on:null, archived:false};
  db.projects.push(p);
  projGo('edit', p.id);
  try{ await apiInsertProject({...p, loc_name:null}); }
  catch(e){ toast('Could not create the project: ' + (e.message||e), 'error'); }
}

async function duplicateProj(id){
  const s = project(id); if(!s) return;
  const p = {...s, id:"p"+Date.now(), name:s.name + ' (copy)', status:'inactif',
             prep:{}, snapshot:null, last_used:null, created_at:now(), archived:false,
             item_ids:[...(s.item_ids||[])], pack_ids:[...(s.pack_ids||[])]};
  db.projects.push(p);
  projGo('edit', p.id);
  try{
    await apiInsertProject({...p, loc_name:p.loc_name||null});
    toast('Duplicated — same cases and items, empty checklist.', 'ok');
  }catch(e){ toast('Could not duplicate: ' + (e.message||e), 'error'); }
}

/* ============================================================
   2. La composition
   ============================================================ */

/* Les exemplaires se regroupent : « XLR 5 m — 12 exemplaires, 8
   disponibles » plutôt que douze lignes à glisser une par une. */
function projGroups(){
  const m = new Map();
  db.items.forEach(i=>{
    const base = groupKeyOf(i.name) || i.name;
    const k = (i.brand||'') + '|' + base + '|' + i.subcat;
    if(!m.has(k)) m.set(k, {key:k, brand:i.brand||'', name:base, subcat:i.subcat, all:[]});
    m.get(k).all.push(i);
  });
  return [...m.values()].sort((a,b)=>
    ((a.brand+' '+a.name).localeCompare(b.brand+' '+b.name,'fr')));
}

/* Ce que les caisses du projet apportent déjà : un item s'y trouvant
   ne doit pas pouvoir être ajouté une seconde fois à côté. */
function projFromPacks(p){
  const s = new Set();
  projPacks(p).forEach(k=>packAllItems(k).forEach(i=>s.add(i.id)));
  return s;
}

function projEditor(){
  const p = project(projView.id);
  const q = (projView.q||'').trim().toLowerCase();
  const pris = projFromPacks(p);
  const c = projContent(p);

  /* ---- colonne de gauche ---- */
  let src = '';
  if(projView.tab === 'items'){
    const gs = projGroups().filter(g=>!q ||
      (g.brand + ' ' + g.name + ' ' + catPath(g.all[0]) + ' ' +
       g.all.map(i=>i.id + ' ' + (i.serial||'')).join(' ')).toLowerCase().includes(q));
    src = gs.map(g=>{
      const posés  = g.all.filter(i=>(p.item_ids||[]).includes(i.id)).length;
      const libres = g.all.filter(i=>!pris.has(i.id) && !(p.item_ids||[]).includes(i.id)
                                     && !projBusy(i, p));
      const viaPack = g.all.filter(i=>pris.has(i.id)).length;
      const enRep   = g.all.filter(i=>repairOf(i.id)).length;
      const sous = [
        g.all.length + ' copy(ies)',
        libres.length + ' free',
        viaPack ? viaPack + ' already in a case of this project' : '',
        enRep ? enRep + ' in repair' : ''
      ].filter(Boolean).join(' · ');
      const mort = !libres.length && !posés;
      return `<div class="pjrow${mort?' off':''}" data-kind="item" data-key="${esc(g.key)}">
        <span class="pjgrip">⠿</span>
        <div class="pjnm"><div class="t">${g.brand?`<b>${esc(g.brand)}</b> `:''}${esc(g.name)}</div>
          <div class="s">${esc(sous)} · ${fweight(g.all[0].weight_g||0)} each</div></div>
        ${posés
          ? `<span class="pjqty">
               <button onclick="projLess('${esc(g.key)}')">−</button><span>${posés}</span>
               <button onclick="projMore('${esc(g.key)}')"${libres.length?'':' disabled'}>+</button></span>`
          : `<button class="pjadd" onclick="projMore('${esc(g.key)}')"${libres.length?'':' disabled'}>+</button>`}
      </div>`;
    }).join('') || '<div class="empty">Nothing matches.</div>';
  }else{
    const ks = (db.packs||[]).filter(k=>!k.archived && (!q || k.name.toLowerCase().includes(q)));
    src = ks.map(k=>{
      const tous = packAllItems(k);
      const ind = tous.filter(i=>projBusy(i, p));
      const dedans = (p.pack_ids||[]).includes(k.id);
      const ex = packExtrasOf(k.id).length;
      return `<div class="pjrow${dedans?' off':''}" data-kind="pack" data-key="${k.id}">
        <span class="pjgrip">⠿</span>
        <div class="pjnm"><div class="t">${esc(k.name)}
            <span class="tag ${k.permanent?'perm':'conf'}">${k.permanent?'assembled':'config'}</span></div>
          <div class="s">${tous.length} item(s) · ${fweight(tous.reduce((t,i)=>t+(i.weight_g||0),0))}${
            ind.length?` · <span class="warntxt">${ind.length} unavailable</span>`:''}${
            ex?` · ${ex} consumable(s)`:''}</div></div>
        ${dedans ? '<span class="muted">in project</span>'
                 : `<button class="pjadd" onclick="projAddPack('${k.id}')">+</button>`}
      </div>`;
    }).join('') || '<div class="empty">No pack yet — build one in the Packs tab.</div>';
  }

  /* ---- colonne de droite ---- */
  let contenu = c.groups.map(g=>`
    <div class="pjgrp">
      <div class="hd"><span class="t">${esc(g.name)}</span>
        <span class="muted">${g.items.length} item(s) · ${fweight(g.items.reduce((t,i)=>t+(i.weight_g||0),0))}</span>
        <button class="pjx" onclick="projRemovePack('${g.packId}')" title="Remove this case">✕</button></div>
      <div class="bd">
        ${g.items.map(i=>`<div class="pjrow"><div class="pjnm"><div class="t">${itemTitle(i)}</div>
            <div class="s mono">${i.id}</div></div><span class="muted">${fweight(i.weight_g||0)}</span></div>`).join('')}
        ${g.écartés.length?`<div class="pjsub warntxt">Left out — unavailable</div>` +
          g.écartés.map(i=>`<div class="pjrow off"><div class="pjnm"><div class="t">${itemTitle(i)}</div>
            <div class="s">${esc(itemWhere(i))}</div></div></div>`).join(''):''}
        ${g.extras.length?`<div class="pjsub">Consumables</div>` +
          g.extras.map(e=>`<div class="pjrow extra"><div class="pjnm"><div class="t">${esc(e.label)}</div>
            <div class="s">× ${e.qty} · not counted in the weight</div></div></div>`).join(''):''}
      </div>
    </div>`).join('');

  if(c.loose.length){
    contenu += `<div class="pjgrp"><div class="hd"><span class="t">Loose items</span>
      <span class="muted">${c.loose.length} item(s) · ${fweight(c.loose.reduce((t,i)=>t+(i.weight_g||0),0))}</span></div>
      <div class="bd">${c.loose.map(i=>`<div class="pjrow">
        <div class="pjnm"><div class="t">${itemTitle(i)}</div><div class="s mono">${i.id}</div></div>
        <span class="muted">${fweight(i.weight_g||0)}</span>
        <button class="pjx" onclick="projRemoveItem('${i.id}')">✕</button></div>`).join('')}
      </div></div>`;
  }
  if(!contenu) contenu = `<div class="empty">Drag a case or an item from the left,<br>or use the + button.</div>`;

  return `
  <div class="pjhead">
    <button class="btn sec small" onclick="projBack()">← Projects</button>
    <input id="pj-name" value="${esc(p.name)}" onchange="projSetName(this.value)"
           class="pjname" placeholder="Project name">
    <select id="pj-dest" onchange="projSetField('loc_name', this.value)">${projDestOptions(p)}</select>
    <input type="date" value="${p.starts_on||''}" onchange="projSetField('starts_on', this.value||null)">
    <input type="date" value="${p.ends_on||''}"   onchange="projSetField('ends_on', this.value||null)">
    <button class="btn ok" onclick="projGo('prep','${p.id}')">Packing →</button>
  </div>

  <div class="pjedit">
    <div class="pjcol src">
      <div class="pjtabs">
        <button class="${projView.tab==='items'?'on':''}" onclick="projTab('items')">Items</button>
        <button class="${projView.tab==='packs'?'on':''}" onclick="projTab('packs')">Packs</button>
      </div>
      <input type="search" id="pj-q" placeholder="Search…" value="${esc(projView.q)}"
             oninput="projSearch(this.value)">
      <div class="pjsrc">${src}</div>
    </div>

    <div class="pjcol prj" id="pjdrop">
      <div class="pjgrab" onclick="document.body.classList.toggle('pjfold')"></div>
      <div class="pjsum">
        <div><b>${c.groups.length}</b>case(s)</div>
        <div><b>${c.items.length}</b>item(s)</div>
        <div><b>${fweight(c.weight)}</b>total</div>
      </div>
      ${c.missing?`<div class="alert">⚠️ ${c.missing} item(s) of this project are no longer in the inventory.</div>`:''}
      ${contenu}
    </div>
  </div>`;
}

/* La liste des destinations, avec la bonne déjà choisie. Un lieu
   archivé n'y figure plus : on l'y remet, sinon rouvrir un projet
   effacerait sa destination sans rien dire — c'était le piège corrigé
   en v1.11, et il se reposait à l'identique ici. */
function projDestOptions(p){
  let html = '<option value="">— no destination —</option>' + locOptions();
  const n = p.loc_name || '';
  if(!n) return html;
  const cible = `<option value="${esc(n)}">`;
  if(html.includes(cible)) return html.replace(cible, `<option value="${esc(n)}" selected>`);
  return html + `<option value="${esc(n)}" selected>${esc(n)} (archived)</option>`;
}

function projTab(t){ projView.tab = t; renderProj(); }
function projSearch(v){
  projView.q = v;
  renderProj();
  const e = document.getElementById('pj-q');
  if(e){ e.focus(); e.setSelectionRange(e.value.length, e.value.length); }
}

/* ---- mutations ---- */
async function projSave(p, fields){
  try{ await apiUpdateProject(p.id, fields); }
  catch(e){ toast('Not saved: ' + (e.message||e), 'error'); }
}
async function projSetName(v){
  const p = project(projView.id); if(!p) return;
  p.name = v.trim() || 'Untitled project';
  await projSave(p, {name:p.name});
}
async function projSetField(f, v){
  const p = project(projView.id); if(!p) return;
  p[f] = v;
  if(p.starts_on && p.ends_on && p.ends_on < p.starts_on){
    toast('The end date comes before the start date.', 'warn');
  }
  await projSave(p, {[f]: v || null});
}

/* Ajouter un exemplaire : l'application choisit lequel, parmi ceux
   qui sont réellement disponibles. Demander « lequel des douze XLR »
   n'apporte rien à qui charge un camion. */
async function projMore(key){
  const p = project(projView.id); if(!p || !can('edit')) return;
  const g = projGroups().find(x=>x.key === key); if(!g) return;
  const pris = projFromPacks(p);
  const libre = g.all.find(i=>!pris.has(i.id) && !(p.item_ids||[]).includes(i.id) && !projBusy(i, p));
  if(!libre){ toast('No free copy left of ' + g.name + '.', 'warn'); return; }
  p.item_ids = [...(p.item_ids||[]), libre.id];
  renderProj();
  await projSave(p, {item_ids:p.item_ids});
}
async function projLess(key){
  const p = project(projView.id); if(!p || !can('edit')) return;
  const g = projGroups().find(x=>x.key === key); if(!g) return;
  const dedans = g.all.filter(i=>(p.item_ids||[]).includes(i.id));
  if(!dedans.length) return;
  const id = dedans[dedans.length-1].id;
  p.item_ids = (p.item_ids||[]).filter(x=>x !== id);
  if(p.prep) delete p.prep[id];
  renderProj();
  await projSave(p, {item_ids:p.item_ids, prep:p.prep||{}});
}
async function projRemoveItem(id){
  const p = project(projView.id); if(!p || !can('edit')) return;
  p.item_ids = (p.item_ids||[]).filter(x=>x !== id);
  if(p.prep) delete p.prep[id];
  renderProj();
  await projSave(p, {item_ids:p.item_ids, prep:p.prep||{}});
}

/* Ajouter une caisse. Deux garde-fous visibles plutôt qu'un refus :
   on dit ce qui est écarté et ce qui a été retiré du hors-caisse, et
   on laisse partir. Le studio anticipe ses croisements ; l'application
   n'a pas à décider à sa place. */
async function projAddPack(id){
  const p = project(projView.id); if(!p || !can('edit')) return;
  const k = pack(id); if(!k) return;
  if((p.pack_ids||[]).includes(id)) return;
  p.pack_ids = [...(p.pack_ids||[]), id];

  const amenés = new Set(packAllItems(k).map(i=>i.id));
  const avant = (p.item_ids||[]).length;
  p.item_ids = (p.item_ids||[]).filter(x=>!amenés.has(x));
  const retirés = avant - p.item_ids.length;

  renderProj();
  await projSave(p, {pack_ids:p.pack_ids, item_ids:p.item_ids});

  if(retirés) toast(`${retirés} item(s) already carried by ${k.name} were removed from the loose list.`, 'info');
  const ind = packAllItems(k).filter(i=>projBusy(i, p));
  if(ind.length) toast(`${k.name} added — ${ind.length} item(s) unavailable, left out of the checklist.`, 'warn');
}
async function projRemovePack(id){
  const p = project(projView.id); if(!p || !can('edit')) return;
  p.pack_ids = (p.pack_ids||[]).filter(x=>x !== id);
  renderProj();
  await projSave(p, {pack_ids:p.pack_ids});
}

/* ---- glisser-déposer ----
   Pointer events, et non le glisser-déposer HTML5 : celui-ci ne
   fonctionne pas au doigt sur iPad. Même mécanique que l'onglet
   Packs, où elle a fait ses preuves. */
let projDrag = null;
function bindProjDrag(){
  if(!can('edit')) return;
  document.querySelectorAll('.pjsrc .pjrow').forEach(r=>{
    r.addEventListener('pointerdown', e=>{
      if(e.button !== undefined && e.button !== 0) return;
      if(e.target.closest('button')) return;
      if(r.classList.contains('off')) return;
      projDrag = {kind:r.dataset.kind, key:r.dataset.key,
                  x:e.clientX, y:e.clientY, actif:false, fantôme:null, sur:false};
      try{ r.setPointerCapture(e.pointerId); }catch(err){}
    });
    r.addEventListener('pointermove', e=>{
      if(!projDrag) return;
      if(!projDrag.actif){
        if(Math.abs(e.clientX-projDrag.x) + Math.abs(e.clientY-projDrag.y) < 8) return;
        projDrag.actif = true;
        const f = document.createElement('div');
        f.className = 'pjghost';
        f.textContent = projDrag.kind==='pack'
          ? (pack(projDrag.key)||{}).name || ''
          : r.querySelector('.pjnm .t').textContent.trim();
        document.body.appendChild(f);
        projDrag.fantôme = f;
      }
      projDrag.fantôme.style.left = e.clientX + 'px';
      projDrag.fantôme.style.top  = e.clientY + 'px';
      const dz = document.getElementById('pjdrop');
      if(!dz) return;
      const b = dz.getBoundingClientRect();
      projDrag.sur = e.clientX >= b.left && e.clientX <= b.right
                  && e.clientY >= b.top  && e.clientY <= b.bottom;
      dz.classList.toggle('hot', projDrag.sur);
    });
    const fin = ()=>{
      if(!projDrag) return;
      const d = projDrag; projDrag = null;
      if(d.fantôme) d.fantôme.remove();
      const dz = document.getElementById('pjdrop');
      if(dz) dz.classList.remove('hot');
      if(d.actif && d.sur){ d.kind==='pack' ? projAddPack(d.key) : projMore(d.key); }
    };
    r.addEventListener('pointerup', fin);
    r.addEventListener('pointercancel', fin);
  });
}

/* ============================================================
   3. La préparation
   ============================================================ */
function projPrep(){
  const p = project(projView.id);
  const c = projContent(p);
  const pr = projProgress(p);
  const pct = pr.total ? Math.round(pr.done/pr.total*100) : 0;
  const figé = p.status === 'show';

  const bloc = (titre, lignes, extras, écartés, poids) => {
    const clés = lignes.map(l=>l.key);
    const ok = clés.filter(k=>p.prep && p.prep[k]).length;
    return `<div class="pjgrp">
      <div class="hd"><span class="t">${esc(titre)}</span>
        ${figé?'':`<div class="pbar${ok===clés.length&&clés.length?' done':''}" style="max-width:110px"><div style="width:${clés.length?ok/clés.length*100:0}%"></div></div>`}
        <span class="muted">${figé?clés.length+' item(s)':ok+'/'+clés.length} · ${fweight(poids)}</span>
        ${(!figé && can('projectPrep') && clés.length)?`<button class="btn sec small" onclick="projTickAll(${JSON.stringify(clés).replace(/"/g,'&quot;')})">Tick all</button>`:''}
      </div>
      <div class="bd">
        ${lignes.filter(l=>!l.extra).map(l=>projLine(l, p, figé)).join('')}
        ${extras.length?'<div class="pjsub">Consumables</div>' + lignes.filter(l=>l.extra).map(l=>projLine(l, p, figé)).join(''):''}
        ${écartés.length?'<div class="pjsub warntxt">Left out — unavailable</div>' +
          écartés.map(i=>`<div class="pjrow off"><div class="pjnm"><div class="t">${itemTitle(i)}</div>
            <div class="s">${esc(itemWhere(i))}</div></div></div>`).join(''):''}
      </div></div>`;
  };

  let blocs = c.groups.map(g=>bloc(
    g.name,
    g.items.map(i=>({key:i.id, html:itemTitle(i), sub:i.id + ' · ' + fweight(i.weight_g||0)}))
      .concat(g.extras.map(e=>({key:e.key, html:esc(e.label), sub:'× ' + e.qty, extra:true}))),
    g.extras, g.écartés,
    g.items.reduce((t,i)=>t+(i.weight_g||0), 0)
  )).join('');

  if(c.loose.length){
    blocs += bloc('Loose items',
      c.loose.map(i=>({key:i.id, html:itemTitle(i), sub:i.id + ' · ' + fweight(i.weight_g||0)})),
      [], [], c.loose.reduce((t,i)=>t+(i.weight_g||0), 0));
  }

  let actions = '';
  if(can('projectPrep')){
    if(p.status === 'inactif') actions = `<button class="btn" onclick="setProjStatus('${p.id}','preparation')">Start packing</button>`;
    if(p.status === 'preparation') actions =
      `<button class="btn" onclick="goShow('${p.id}')">🎪 Go on show</button>
       <button class="btn sec small" onclick="resetPrep('${p.id}')">Reset checklist</button>
       <button class="btn sec small" onclick="setProjStatus('${p.id}','inactif')">Pause</button>`;
    if(p.status === 'show') actions = `<button class="btn ok" onclick="closeShow('${p.id}')">📥 Close show / gear back</button>`;
  }

  return `
  <div class="pjhead">
    <button class="btn sec small" onclick="projBack()">← Projects</button>
    <h2 class="pjtitle">${esc(p.name)} <span class="tag ${PTAG[p.status]}">${PSTAT[p.status]}</span>
      ${p.archived?'<span class="tag pinactif">archived</span>':''}</h2>
    ${(can('edit') && !figé)?`<button class="btn sec small" onclick="projGo('edit','${p.id}')">Edit gear</button>`:''}
  </div>

  <div class="panel">
    ${(p.loc_name || projDates(p)) ? `<div class="destbox">
      ${p.loc_name?`<div><b>${esc(p.loc_name)}</b>${hasAddress(p.loc_name)?` <span class="muted">— ${esc(locAddress(p.loc_name))}</span>`:' <span class="muted">— no address on file</span>'}
        ${locPhone(p.loc_name)?`<span class="muted">· ☎ ${esc(locPhone(p.loc_name))}</span>`:''}</div>`:''}
      ${projDates(p)?`<div class="muted">${esc(projDates(p))}</div>`:''}
    </div>` : ''}
    <div class="pjsum">
      <div><b>${c.groups.length}</b>case(s)</div>
      <div><b>${c.items.length}</b>item(s)</div>
      <div><b>${fweight(c.weight)}</b>total</div>
      ${figé?'':`<div><b>${pr.done}/${pr.total}</b>ticked</div>`}
    </div>
    ${figé?`<div class="muted">Gear list frozen when the show started — changing a pack now will not rewrite what left.</div>`
          :`<div class="pline"><div class="pbar${pr.done===pr.total&&pr.total?' done':''}"><div style="width:${pct}%"></div></div></div>`}
    ${c.missing?`<div class="alert">⚠️ ${c.missing} item(s) of this project are no longer in the inventory.</div>`:''}
  </div>

  ${blocs || '<div class="panel"><div class="empty">This project is empty — add cases and items first.</div></div>'}

  <div class="modal-actions" style="justify-content:flex-start;flex-wrap:wrap;margin-top:12px">${actions}</div>
  <div class="modal-actions" style="justify-content:flex-start;flex-wrap:wrap;gap:6px">
    <button class="btn sec small" onclick="openDeliveryMail('${p.id}')"
            title="Opens a pre-filled draft in your mail app">✉️ Delivery details</button>
    ${can('edit')?`<button class="btn sec small" onclick="duplicateProj('${p.id}')">Duplicate</button>`:''}
    ${can('edit')?`<button class="btn sec small" onclick="archiveProj('${p.id}')">${p.archived?'Restore':'Archive'}</button>`:''}
    ${can('delete')?`<button class="btn danger small" onclick="deleteProj('${p.id}')">Delete</button>`:''}
  </div>`;
}

function projLine(l, p, figé){
  const on = !!(p.prep && p.prep[l.key]);
  if(figé || !can('projectPrep'))
    return `<div class="pjrow${l.extra?' extra':''}"><div class="pjnm">
      <div class="t">${l.html}</div><div class="s">${esc(l.sub)}</div></div></div>`;
  return `<label class="pjrow${l.extra?' extra':''}" style="cursor:pointer">
    <input type="checkbox" ${on?'checked':''} onchange="toggleProjItem('${p.id}','${l.key}',this.checked)">
    <div class="pjnm"><div class="t"${on?' style="opacity:.5;text-decoration:line-through"':''}>${l.html}</div>
      <div class="s">${esc(l.sub)}</div></div></label>`;
}

async function projTickAll(clés){
  const p = project(projView.id); if(!p) return;
  p.prep = p.prep || {};
  clés.forEach(k=>p.prep[k] = true);
  if(p.status === 'inactif') p.status = 'preparation';
  renderProj();
  await projSave(p, {prep:p.prep, status:p.status});
}
async function toggleProjItem(pid, key, on){
  const p = project(pid); if(!p) return;
  p.prep = p.prep || {};
  if(on) p.prep[key] = true; else delete p.prep[key];
  if(p.status === 'inactif' && on) p.status = 'preparation';
  renderProj();
  await projSave(p, {prep:p.prep, status:p.status});
}
async function setProjStatus(pid, st){
  const p = project(pid); if(!p) return;
  p.status = st;
  renderProj();
  await projSave(p, {status:st});
}
async function resetPrep(pid){
  const p = project(pid); if(!p) return;
  p.prep = {};
  renderProj();
  await projSave(p, {prep:{}});
}

/* ---- départ et retour ----

   Au départ, le contenu est FIGÉ. Tant que le projet se prépare, il
   suit les packs — vider une Pelicase change ce qui partira, et c'est
   le comportement voulu. Une fois parti, non : vider cette caisse le
   lendemain réécrirait ce qui est sorti la veille. */
async function goShow(pid){
  const p = project(pid); if(!p) return;
  const c = projContent(p);
  const pr = projProgress(p);
  if(!c.items.length){ toast('Nothing to take out.', 'warn'); return; }
  if(pr.done < pr.total &&
     !confirm(`${pr.total-pr.done} line(s) are not ticked as ready. Go on show anyway?`)) return;

  const date = now();
  const lignes = [];
  for(const i of c.items){
    if(i.status === 'sorti') continue;
    i.status = 'sorti';
    i.out = {userId:null, projectId:p.id, date, reason:`Show — ${p.name}`};
    i.loc = `Show — ${p.name}`;
    await apiUpdateItem(i.id, {status:i.status, out:i.out, loc:i.loc});
    lignes.push({itemId:i.id, type:'out', detail:`Show — ${p.name}`});
  }
  if(lignes.length) await histMany(lignes);

  p.status = 'show'; p.last_used = date; p.snapshot = projSnapshot(p);
  await projSave(p, {status:'show', last_used:date, snapshot:p.snapshot});
  renderProj();
  toast(`On show — ${c.items.length} item(s), ${fweight(c.weight)}.`, 'ok');
}

async function closeShow(pid){
  const p = project(pid); if(!p) return;
  if(!confirm("Close the show? All project gear will be checked in and returned to its home location.")) return;
  const dehors = db.items.filter(i=>i.status==='sorti' && i.out && i.out.projectId===p.id);
  const lignes = [];
  for(const i of dehors){
    i.status = 'dispo'; i.loc = i.home; i.out = null;
    await apiUpdateItem(i.id, {status:'dispo', loc:i.loc, out:null});
    lignes.push({itemId:i.id, type:'in', detail:`Back from show — ${p.name}`, cond:i.cond});
  }
  if(lignes.length) await histMany(lignes);
  /* La photographie reste : elle documente ce qui est parti. Seule la
     checklist se remet à zéro, pour la fois suivante. */
  p.status = 'inactif'; p.prep = {};
  await projSave(p, {status:'inactif', prep:{}});
  renderProj();
  toast(`${dehors.length} item(s) checked in.`, 'ok');
}

/* ---- archivage, suppression ---- */
async function archiveProj(id){
  const p = project(id); if(!p) return;
  if(!p.archived && p.status === 'show'){ toast("Close the show before archiving this project.", 'warn'); return; }
  p.archived = !p.archived;
  await projSave(p, {archived:p.archived});
  renderProj();
}
async function deleteProj(id){
  const p = project(id); if(!p) return;
  if(p.status === 'show'){ toast("Close the show before deleting this project.", 'warn'); return; }
  if(!confirm("Delete this project? (gear and history are untouched)")) return;
  db.projects = db.projects.filter(x=>x.id !== id);
  await apiDeleteProject(id);
  projGo('list');
}

/* ---- brouillon de mail de livraison ----
   Volontairement un brouillon et non un envoi : le message part au nom
   du studio, autant le relire. La liste suit les caisses — c'est elle
   qu'on lit sur un quai, pas une liste par sous-catégorie. */
function deliveryMailBody(p){
  const c = projContent(p);
  const dest = p.loc_name || '';
  const dates = projDates(p);

  const L = [];
  L.push(`Delivery details — ${p.name}`, '');
  if(dest){
    L.push(`Destination: ${dest}`);
    locAddressLines(dest).forEach(line => L.push('  ' + line));
    if(locPhone(dest)) L.push(`  Phone: ${locPhone(dest)}`);
  }
  if(dates) L.push(`Dates: ${dates}`);
  L.push(`Cases: ${c.groups.length} — items: ${c.items.length} — total weight: ${fweight(c.weight)}`, '');

  c.groups.forEach(g=>{
    const poids = g.items.reduce((t,i)=>t+(i.weight_g||0), 0);
    L.push(`${g.name} (${g.items.length} items, ${fweight(poids)})`);
    g.items.forEach(i=>L.push(`  - ${itemTitleText(i)} [${i.id}]`));
    g.extras.forEach(e=>L.push(`  · ${e.label} × ${e.qty}`));
    L.push('');
  });
  if(c.loose.length){
    const poids = c.loose.reduce((t,i)=>t+(i.weight_g||0), 0);
    L.push(`Loose items (${c.loose.length}, ${fweight(poids)})`);
    c.loose.forEach(i=>L.push(`  - ${itemTitleText(i)} [${i.id}]`));
    L.push('');
  }
  if(c.missing > 0) L.push(`(${c.missing} item(s) of this project are no longer in the inventory)`, '');
  L.push('Consumables are packing reminders and are not included in the weight.', '');
  L.push(`— ${LABELS.appTitle}`);
  return L.join('\n');
}

function openDeliveryMail(id){
  const p = project(id); if(!p) return;
  if(!projContent(p).items.length){ toast("This project has no gear to list.", 'warn'); return; }
  const subject = `${p.name}${p.loc_name?` — ${p.loc_name}`:''}${projDates(p)?` — ${projDates(p)}`:''}`;
  const href = 'mailto:?subject=' + encodeURIComponent(subject)
             + '&body=' + encodeURIComponent(deliveryMailBody(p));
  if(href.length > 16000){
    toast("This gear list is too long for an email draft. Export the project instead.", 'warn');
    return;
  }
  window.location.href = href;
}

/* Conservé pour les appels venus d'ailleurs (fiche item, tableau de
   bord) : ouvrir un projet, c'est désormais ouvrir sa préparation. */
function openProject(id){ show('proj'); projGo('prep', id); }
