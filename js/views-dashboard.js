/* ============================================================
   VUE — Dashboard
   Trois temps de lecture : ce qu'est l'app, ce qu'on peut faire
   tout de suite, ce qui demande une action. Les chiffres du bas
   renvoient vers l'inventaire déjà filtré.
   Le journal d'activité vit désormais dans Settings.
   ============================================================ */

function renderDash(){
  const total = db.items.length;
  const out   = db.items.filter(i=>i.status==='sorti');
  const rep   = db.items.filter(i=>i.cond!=='bon');
  const dispo = total - out.length;

  /* --- ce qui demande une action --- */
  const alerts = [];
  out.forEach(i=>{
    const o = i.out;
    if(o.due && o.alertOn!==false && overdue(i))
      alerts.push(`<div class="alert bad">⚠️ ${itemTitle(i)} — due back <b>${fdateD(o.due)}</b>,
        <b>${daysLate(i)} day${daysLate(i)>1?'s':''} overdue</b> — ${esc(outBy(i))} (${esc(o.reason)})</div>`);
    else if(!o.due && !o.projectId && daysSince(o.date)>=ALERT_DAYS)
      alerts.push(`<div class="alert">⏰ ${itemTitle(i)} out for <b>${daysSince(o.date)} days</b>
        — ${esc(outBy(i))} (${esc(o.reason)})</div>`);
  });
  rep.forEach(i=>{
    const r = repairOf(i.id);
    const what = r
      ? `${faultLabel(r.fault)} — ${r.status==='sent' ? `at ${esc(providerName(r.provider_id))}` : 'needs repair'}`
      : condLabel(i.cond);
    alerts.push(`<div class="alert ${i.cond==='hs'||(r&&repairStale(r))?'bad':''}">🔧 ${itemTitle(i)} — ${what}
      <button class="btn sec small" onclick="openDetail('${i.id}')">Open</button></div>`);
  });

  /* --- valeur d'achat : administrateurs seulement --- */
  const withPrice = db.items.filter(i=>i.price!=null && i.price!=='');
  const value = withPrice.reduce((s,i)=>s + Number(i.price), 0);

  const stat = (n, label, tone, action) =>
    `<div class="stat ${tone||''}" ${action?`onclick="${action}" role="button" tabindex="0"`:''}>
       <div class="num">${n}</div><div class="lbl">${label}</div></div>`;

  document.getElementById('v-dash').innerHTML = `
    <div class="hero">
      <h1>${esc(LABELS.appTitle)}</h1>
      <p>${esc(LABELS.tagline || '')}</p>
      <div class="heroacts">
        ${can('edit')?`<button class="btn" onclick="show('proj');openProjForm()">+ New project</button>`:
                      `<button class="btn" onclick="show('proj')">Open projects</button>`}
        <button class="btn sec" onclick="show('packs')">Packs</button>
        <button class="btn sec" onclick="show('inv')">Browse inventory</button>
        ${can('edit')?`<button class="btn sec" onclick="openItemForm()">+ Add item</button>`:''}
      </div>
    </div>

    ${dashProjectsHTML()}
    ${dashPacksHTML()}

    ${alerts.length ? `<div class="panel">
        <h2>Needs attention <span class="tag hs">${alerts.length}</span></h2>
        ${alerts.join("")}
      </div>`
      : `<div class="panel"><h2>Needs attention</h2>
        <div class="muted">Nothing to report — everything is in place and in good shape. 👌</div></div>`}

    <div class="cards">
      ${stat(total, 'Items total', '', "goInventory({})")}
      ${stat(dispo, 'Items available', 'ok', "goInventory({status:'dispo'})")}
      ${stat(out.length, 'Items checked out', 'warn', "goInventory({status:'sorti'})")}
      ${stat(rep.length, 'Items needing repair', 'bad', "show('rep')")}
      ${canSeeValue() && withPrice.length
        ? `<div class="stat value"><div class="num">${fprice(value)}</div>
             <div class="lbl">Purchase value${withPrice.length!==total?` <span class="muted">(${withPrice.length} priced)</span>`:''}</div></div>`
        : ''}
    </div>`;
}

/* ============================================================
   LES PROJETS EN COURS, EN TÊTE DU TABLEAU DE BORD (v1.29.1)

   Le projet est la fin : c'est lui qui part, et les caisses comme
   l'inventaire existent pour le servir. Le tableau de bord le dit
   dans son ordre — ce qui se prépare ou ce qui roule avant ce qui
   attend sur une étagère.

   Le bloc ne s'affiche que s'il y a quelque chose en cours. Un
   panneau vide en permanence n'apprend rien et prend la place de ce
   qui en apprend.
   ============================================================ */
function dashProjectsHTML(){
  if(db.projectsError) return '';
  const actifs = db.projects.filter(p=>!p.archived && p.status !== 'inactif');
  if(!actifs.length) return '';

  const ordre = {show:0, preparation:1};
  const ligne = p => {
    const c = projContent(p);
    const pr = projProgress(p);
    const d = projDates(p);
    return `<div class="dpack" onclick="show('proj');projGo('prep','${p.id}')">
      <div class="repbody">
        <div class="reptitle"><b>${esc(p.name)}</b>
          <span class="tag ${PTAG[p.status]}">${PSTAT[p.status]||p.status}</span></div>
        <div class="repmeta">${c.groups.length} case(s) · ${c.items.length} item(s) ·
          ${esc(fweight(c.weight))}${p.loc_name?' · '+esc(p.loc_name):''}${d?' · '+esc(d):''}</div>
      </div>
      ${p.status==='preparation'
        ? `<div class="pbar" style="max-width:90px"><div style="width:${pr.total?Math.round(pr.done/pr.total*100):0}%"></div></div>
           <span class="muted" style="font-size:12px">${pr.done}/${pr.total}</span>`
        : '<span class="muted" style="font-size:12px">on the road</span>'}
    </div>`;
  };

  return `<div class="panel">
    <h2>In progress <span class="tag pprep">${actifs.length}</span></h2>
    <div class="dpacks">${actifs.sort((a,b)=>(ordre[a.status]??9)-(ordre[b.status]??9)).map(ligne).join('')}</div>
  </div>`;
}

/* ============================================================
   ENVOYER UNE CAISSE, DEPUIS LE TABLEAU DE BORD (v1.22.2)

   Les packs sont devenus l'usage principal : on sort du matériel par
   caisse, bien plus souvent qu'à l'item. Faire ce geste demandait
   jusqu'ici d'ouvrir l'onglet Packs, de trouver la caisse, d'ouvrir
   sa fiche, puis de cliquer. Quatre écrans pour une action
   quotidienne.

   On ne liste que les racines : une caisse imbriquée part avec celle
   qui la contient, la proposer séparément inviterait à défaire un
   rangement sans le vouloir.
   ============================================================ */
function dashPacksHTML(){
  if(!db.packsSupported) return '';
  const racines = packRoots().sort((a,b)=>a.name.localeCompare(b.name,'fr'));
  if(!racines.length) return '';

  const dehors = racines.filter(p=>packStatus(p).dehors);
  const ici    = racines.filter(p=>!packStatus(p).dehors);

  const ligne = p => {
    const st = packStatus(p);
    const tout = packAllItems(p);
    const ph = packPhoto(p);
    return `<div class="dpack" onclick="show('packs');openPackDetail('${p.id}')">
      ${ph ? `<img class="repthumb" loading="lazy" src="${ph}">`
           : '<span class="repthumb rnophoto"></span>'}
      <div class="repbody">
        <div class="reptitle"><b>${esc(p.name)}</b>
          ${st.dehors?`<span class="tag sorti">out · ${esc(st.dehors.où)}</span>`:''}</div>
        <div class="repmeta">${tout.length} item(s) · ${esc(fweight(packWeight(p)))}${
          st.manque?` · <span class="pkwarn">${st.absents.length} missing</span>`:''}</div>
      </div>
      <span onclick="event.stopPropagation()">${can('checkout')
        ? (st.dehors
            ? `<button class="btn small ok" onclick="packCheckin('${p.id}')">Check in</button>`
            : `<button class="btn small" onclick="packCheckout('${p.id}')">Send out</button>`)
        : ''}</span>
    </div>`;
  };

  return `<div class="panel">
    <h2>Packs ${dehors.length?`<span class="tag sorti">${dehors.length} out</span>`:''}</h2>
    <div class="dpacks">${ici.concat(dehors).map(ligne).join('')}</div>
    <div class="hintline" style="margin-top:8px">Sending a case takes its container,
      its contents and any nested case with it.</div>
  </div>`;
}

/* Ouvre l'inventaire avec un filtre déjà appliqué.
   Depuis la v1.15 les filtres vivent dans colFilters et portent sur
   le texte affiché : « Available », « Checked out », « Needs repair ». */
function goInventory(filters){
  show('inv');
  const q = document.getElementById('q'); if(q) q.value = '';
  sortLevels = [];
  colFilters = {};
  if(filters.status)
    colFilters.status = new Set([filters.status === 'sorti' ? 'Checked out' : 'Available']);
  if(filters.cond)
    colFilters.cond = new Set([CONDS[filters.cond] || filters.cond]);
  renderInv();
}
