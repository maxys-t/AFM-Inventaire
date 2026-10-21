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

  const mini = (n, label, tone, action) =>
    `<div class="mini ${tone||''}" ${action?`onclick="${action}" role="button" tabindex="0"`:''}>
       <div class="v">${n}</div><div class="k">${label}</div></div>`;

  /* ============================================================
     LE TABLEAU DE BORD EN DEUX COLONNES (v2.0.1)

     Tout s'empilait sur une seule colonne : il fallait défiler pour
     savoir si quelque chose clochait, alors que c'est la première
     question qu'on pose en arrivant.

     À gauche, large, ce qui demande une action — les alertes, puis
     les projets en cours. À droite, étroit, ce qui s'observe — les
     chiffres du parc et les caisses. L'œil balaie la colonne gauche
     et s'arrête s'il y a quelque chose ; sinon il passe à droite.
     ============================================================ */
  document.getElementById('v-dash').innerHTML = `
    <div class="dashtop">
      <div>
        <h1>${esc(LABELS.appTitle)}</h1>
        <p class="muted">${esc(LABELS.tagline || '')}</p>
      </div>
      <div class="heroacts">
        ${can('edit')?`<button class="btn" onclick="show('proj');openProjForm()">+ New project</button>`:
                      `<button class="btn" onclick="show('proj')">Open projects</button>`}
        ${can('edit')?`<button class="btn sec" onclick="openItemForm()">+ Add item</button>`:''}
      </div>
    </div>

    <div class="dashgrid">
      <div>
        ${alerts.length ? `<div class="panel">
            <h2>Needs attention <span class="tag hs">${alerts.length}</span></h2>
            ${alerts.join("")}
          </div>`
          : `<div class="panel"><h2>Needs attention</h2>
            <div class="muted">Nothing to report — everything is in place and in good shape. 👌</div></div>`}
        ${dashProjectsHTML()}
      </div>

      <div>
        <div class="panel">
          <h2>The fleet</h2>
          <div class="minis">
            ${mini(total, 'Total', '', "goInventory({})")}
            ${mini(dispo, 'Available', 'ok', "goInventory({status:'dispo'})")}
            ${mini(out.length, 'Checked out', 'warn', "goInventory({status:'sorti'})")}
            ${mini(rep.length, 'To repair', 'bad', "show('rep')")}
          </div>
          ${canSeeValue() && withPrice.length ? `<div class="hintline" style="margin-top:9px">
            Purchase value <b>${fprice(value)}</b>${withPrice.length!==total?` — ${withPrice.length} of ${total} priced`:''}</div>` : ''}
        </div>
        ${dashPacksHTML()}
      </div>
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

  /* ============================================================
     DEHORS D'ABORD, ET SÉPARÉMENT (v2.1.0)

     Les caisses arrivaient en une seule liste, celles qui sont sorties
     à la fin : savoir ce qui est dehors — la question qu'on pose en
     arrivant le matin — demandait de défiler jusqu'en bas.

     Deux groupes nommés, les sorties en tête. Chacun porte son compte,
     donc un coup d'œil suffit même replié ; et un groupe vide
     disparaît au lieu d'occuper la place d'un titre sans contenu.
     ============================================================ */
  const groupe = (titre, liste, etiquette) => !liste.length ? '' : `
    <div class="dpgroup">
      <div class="dphead">${titre} ${etiquette}</div>
      <div class="dpacks">${liste.map(ligne).join('')}</div>
    </div>`;

  return `<div class="panel">
    <h2>Packs ${dehors.length?`<span class="tag sorti">${dehors.length} out</span>`:''}</h2>
    <div class="dpcols">
      ${groupe('Out', dehors, `<span class="tag sorti">${dehors.length}</span>`)}
      ${groupe('In place', ici, `<span class="tag dispo">${ici.length}</span>`)}
    </div>
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
