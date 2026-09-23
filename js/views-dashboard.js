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
    alerts.push(`<div class="alert ${i.cond==='hs'?'bad':''}">🔧 ${itemTitle(i)} — ${CONDS[i.cond]}
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
        <button class="btn" onclick="show('inv')">Browse inventory</button>
        ${can('edit')?`<button class="btn sec" onclick="openItemForm()">+ Add item</button>`:''}
        ${can('edit')?`<button class="btn sec" onclick="show('proj');openProjForm()">+ New project</button>`:''}
      </div>
    </div>

    ${alerts.length ? `<div class="panel">
        <h2>Needs attention <span class="tag hs">${alerts.length}</span></h2>
        ${alerts.join("")}
      </div>`
      : `<div class="panel"><h2>Needs attention</h2>
        <div class="muted">Nothing to report — everything is in place and in good shape. 👌</div></div>`}

    <div class="cards">
      ${stat(total, 'Items total', '', "goInventory({})")}
      ${stat(dispo, 'Available', 'ok', "goInventory({status:'dispo'})")}
      ${stat(out.length, 'Checked out', 'warn', "goInventory({status:'sorti'})")}
      ${stat(rep.length, 'Needs repair', 'bad', "show('rep')")}
      ${canSeeValue() && withPrice.length
        ? `<div class="stat value"><div class="num">${fprice(value)}</div>
             <div class="lbl">Purchase value${withPrice.length!==total?` <span class="muted">(${withPrice.length} priced)</span>`:''}</div></div>`
        : ''}
    </div>`;
}

/* Ouvre l'inventaire avec un filtre déjà appliqué */
function goInventory(filters){
  show('inv');
  const set = (id,v)=>{ const el = document.getElementById(id); if(el) el.value = v || ''; };
  set('q',''); set('fCat',''); set('fSub',''); set('fLoc',''); set('fCond','');
  set('fOwner',''); set('fProv',''); set('fSort','');
  set('fStatus', filters.status);
  if(filters.cond) set('fCond', filters.cond);
  if(typeof fillSubFilter === 'function') fillSubFilter();
  renderInv();
}
