/* ============================================================
   VUE — Réparations (v1.17)

   Le principe qui gouverne tout ce fichier : un item « à réparer »
   n'est plus un état, c'est un item qui a un DOSSIER ouvert. L'état
   physique (items.cond) et l'étape de réparation (repairs.status)
   sont deux choses distinctes depuis la migration 016.
   ============================================================ */

let repProvFilter = '';      // filtre « chez quel prestataire »
let repOosOpen    = false;   // la section hors service est repliée

/* ---------- Lecture ---------- */
function repOpen(){ return (db.repairs||[]).filter(r=>r.status === 'open'); }
function repSent(){
  const rows = (db.repairs||[]).filter(r=>r.status === 'sent');
  return repProvFilter ? rows.filter(r=>r.provider_id === repProvFilter) : rows;
}
function repClosed(){ return (db.repairs||[]).filter(r=>r.status === 'closed'); }
function repItem(r){ return item(r.item_id) || (db.trash||[]).find(i=>i.id===r.item_id) || null; }

/* Délai moyen, en jours, sur les dossiers réellement revenus.
   C'est la seule statistique utile dès la première année : elle dit
   quoi promettre quand on demande sous combien de temps ça revient. */
function repTurnaround(){
  const done = repClosed().filter(r=>r.sent_at && r.received_at);
  if(!done.length) return null;
  const total = done.reduce((s,r)=>
    s + (new Date(r.received_at) - new Date(r.sent_at)) / 86400000, 0);
  return Math.round(total / done.length);
}

/* Petit repère posé à côté de l'état physique sur la fiche d'un item. */
function repairTag(i){
  const r = repairOf(i.id);
  if(!r) return '';
  return r.status === 'sent'
    ? ` <span class="tag rsent">At ${esc(providerName(r.provider_id))}</span>`
    : ` <span class="tag ropen">Needs repair</span>`;
}

/* ---------- Écran ---------- */
function renderRep(){
  const el = document.getElementById('v-rep');
  if(!el) return;

  if(db.repairsSupported === false){
    el.innerHTML = `<div class="panel"><h2>Repairs</h2>
      <div class="muted">This screen needs database migration 016. Run
      <span class="mono">sql/016-reparations.sql</span> in Supabase, then reload.</div></div>`;
    return;
  }

  const open = repOpen(), sent = repSent();
  const oos  = db.items.filter(i=>i.cond === 'hs');
  const turn = repTurnaround();

  el.innerHTML = `
    ${repHeader()}
    <div class="repstats">
      <div class="repstat"><div class="k">Needs repair</div><div class="n warnv">${open.length}</div></div>
      <div class="repstat"><div class="k">At the repair shop</div><div class="n accv">${repSent().length}</div></div>
      <div class="repstat"><div class="k">Avg. turnaround</div><div class="n">${turn===null?'—':turn+' d'}</div></div>
    </div>
    ${repOpenPanel(open)}
    ${repSentPanel(sent)}
    ${repOosPanel(oos)}
    ${repJournal()}`;
}

function repHeader(){
  const provs = (db.providers||[]).filter(p=>!p.archived);
  const opts = provs.map(p=>
    `<option value="${p.id}" ${repProvFilter===p.id?'selected':''}>${esc(p.name)}</option>`).join('');
  return `<div class="repbar">
    <div>
      <h2 style="margin:0">Repairs</h2>
      <div class="viewintro" style="margin:2px 0 0">Every open incident, from the first report to the item coming back.</div>
    </div>
    <div class="repbar-act">
      <select id="repProv" onchange="setRepProvider(this.value)"
              data-tip="Show only what is currently at one repair shop.">
        <option value="">All providers</option>${opts}
      </select>
      ${can('repair') ? `<button class="btn" onclick="openReport()">+ Report a fault</button>` : ''}
    </div>
  </div>`;
}
function setRepProvider(v){ repProvFilter = v; renderRep(); }

function repOpenPanel(rows){
  let html = `<div class="panel reppanel"><h3 class="rephead warn">⚠ Needs repair
    <span class="muted">${rows.length}</span></h3>`;
  if(!rows.length) return html + `<div class="muted">Nothing waiting.</div></div>`;
  html += rows.map(r=>{
    const i = repItem(r); if(!i) return '';
    const stillOut = i.status === 'sorti';
    return `<div class="reprow">
      ${i.photo?`<img class="repthumb" loading="lazy" src="${i.photo}">`
               :'<span class="repthumb rnophoto"></span>'}
      <div class="repbody">
        <div class="reptitle rowlink" onclick="openDetail('${i.id}')">${itemTitle(i)}
          <span class="mono">${i.id}</span></div>
        <div class="repmeta">
          <span class="tag ropen">${esc(faultLabel(r.fault))}</span>
          ${stillOut?`<span class="tag rout">↗ still out · ${esc(i.loc)}</span>`:''}
          <span class="muted">reported ${fdate(r.opened_at)}${r.opened_by_name?` by ${esc(r.opened_by_name)}`:''} · ${daysSince(r.opened_at)} d</span>
        </div>
        ${r.description?`<div class="repnote">${esc(r.description)}</div>`:''}
        ${stillOut?`<div class="repnote">Repair starts when it comes back. It cannot go out again.</div>`:''}
      </div>
      ${can('repair') ? (stillOut
        ? `<button class="btn small sec" disabled
             data-tip="The item is still out. Check it in first.">Send out</button>`
        : `<button class="btn small" onclick="openSend('${r.id}')">Send out</button>`) : ''}
    </div>`;
  }).join('');
  return html + '</div>';
}

function repSentPanel(rows){
  let html = `<div class="panel reppanel"><h3 class="rephead acc">🔧 At the repair shop
    <span class="muted">${rows.length}</span></h3>
    <div class="muted small">Counted as out, kept apart from borrowings.</div>`;
  if(!rows.length) return html + `<div class="muted" style="margin-top:8px">Nothing out for repair.</div></div>`;

  /* Groupé par prestataire, et non à plat : voir que deux micros
     dorment au même atelier, c'est un seul coup de fil au lieu de deux. */
  const byProv = new Map();
  rows.forEach(r=>{
    const k = r.provider_id || '';
    if(!byProv.has(k)) byProv.set(k, []);
    byProv.get(k).push(r);
  });

  for(const [pid, list] of byProv){
    const p = providerOf(pid);
    html += `<div class="repgroup">
      <div class="repgrouphead">
        <b>${p ? esc(p.name) : 'No provider recorded'}</b>
        <span class="muted">${[p&&p.specialty, p&&p.phone, `${list.length} item${list.length>1?'s':''}`]
          .filter(Boolean).map(esc).join(' · ')}</span>
      </div>`;
    html += list.map(r=>{
      const i = repItem(r); if(!i) return '';
      const late = repStale(r);
      return `<div class="reprow">
        ${i.photo?`<img class="repthumb" loading="lazy" src="${i.photo}">`
                 :'<span class="repthumb rnophoto"></span>'}
        <div class="repbody">
          <div class="reptitle rowlink" onclick="openDetail('${i.id}')">${itemTitle(i)}
            <span class="mono">${i.id}</span></div>
          <div class="repmeta ${late?'late':''}">${esc(faultLabel(r.fault))} ·
            sent ${fdate(r.sent_at)} · <b>${repairDays(r)} d</b>${r.tracking_ref?` · ref ${esc(r.tracking_ref)}`:''}</div>
        </div>
        ${can('edit') ? `<button class="btn small" onclick="openReceive('${r.id}')">Receive</button>` : ''}
      </div>`;
    }).join('');
    html += '</div>';
  }
  return html + '</div>';
}
function repStale(r){ return repairStale(r); }

function repOosPanel(items){
  if(!items.length) return '';
  const head = `<div class="panel repfold" onclick="toggleRepOos()">
    <span class="chev">${repOosOpen?'▾':'▸'}</span>
    <span>Out of service</span><span class="muted">${items.length}</span>
    <span class="muted foldnote">Kept for the record, hidden from the inventory</span></div>`;
  if(!repOosOpen) return head;
  return head + `<div class="panel reppanel">` + items.map(i=>`
    <div class="reprow">
      ${i.photo?`<img class="repthumb" loading="lazy" src="${i.photo}">`
               :'<span class="repthumb rnophoto"></span>'}
      <div class="repbody"><div class="reptitle rowlink" onclick="openDetail('${i.id}')">${itemTitle(i)}
        <span class="mono">${i.id}</span></div>
        <div class="repmeta muted">${esc(locLabel(i.loc))}</div></div>
    </div>`).join('') + '</div>';
}
function toggleRepOos(){ repOosOpen = !repOosOpen; renderRep(); }

function repJournal(){
  const rows = repClosed().slice(0, 20);
  if(!rows.length) return '';
  return `<div class="panel"><h3>Closed incidents</h3><ul class="hist">` + rows.map(r=>{
    const i = repItem(r);
    return `<li>🔧 ${i?itemTitle(i):esc(r.item_id)} — ${esc(faultLabel(r.fault))} →
      ${esc(OUTCOMES[r.outcome]||'closed')}${r.work_done?` (${esc(r.work_done)})`:''}
      <div class="when">${fdate(r.closed_at||r.received_at||r.opened_at)}</div></li>`;
  }).join('') + '</ul></div>';
}

/* ============================================================
   1. SIGNALER UNE PANNE
   La partie qui compte n'est pas la catégorie : c'est l'état
   documenté au départ. Sans lui, le contrôle au retour ne compare
   rien, et une bosse constatée au retour n'est imputable à personne.
   ============================================================ */
let reportItemId = null, reportFault = null, reportCond = 'bon';

function openReport(id){
  reportItemId = id || null;
  reportFault = null; reportCond = 'bon';
  photoBuf.rp = []; photoZone('rp');
  document.getElementById('rp-note').value = '';
  const picker = document.getElementById('rp-pickwrap');
  const pick = document.getElementById('rp-pick');
  if(id){
    picker.style.display = 'none';
    document.getElementById('rp-item').textContent = itemTitleText(item(id));
  }else{
    picker.style.display = '';
    pick.value = '';
    document.getElementById('rp-item').textContent = '—';
    document.getElementById('rp-list').innerHTML = db.items
      .map(i=>`<option value="${esc(i.id)}">${esc(itemTitleText(i))}</option>`).join('');
  }
  renderReport();
  open_('ovReport');
}
function pickReportItem(v){
  const i = item((v||'').trim());
  reportItemId = i ? i.id : null;
  document.getElementById('rp-item').textContent = i ? itemTitleText(i) : '—';
  renderReport();
}
function setReportFault(k){ reportFault = k; renderReport(); }
function setReportCond(k){ reportCond = k; renderReport(); }

function renderReport(){
  document.getElementById('rp-faults').innerHTML = Object.entries(FAULTS)
    .map(([k,l])=>`<button class="chipbtn ${reportFault===k?'on':''}"
      onclick="setReportFault('${k}')">${esc(l)}</button>`).join('');
  document.getElementById('rp-conds').innerHTML = [
    ['bon','Working apart from this fault'],['use','Marked, worn'],['hs','Unusable']
  ].map(([k,l])=>`<button class="chipbtn sq ${reportCond===k?'on':''}"
      onclick="setReportCond('${k}')">${esc(l)}</button>`).join('');

  const i = reportItemId ? item(reportItemId) : null;
  const out = i && i.status === 'sorti';
  const band = document.getElementById('rp-outband');
  band.style.display = out ? '' : 'none';
  if(out) band.querySelector('span').textContent =
    `This item is out at ${i.loc}. The repair starts when it comes back, and it cannot go out again meanwhile.`;

  const dup = i && repairOf(i.id);
  const warn = document.getElementById('rp-dup');
  warn.style.display = dup ? '' : 'none';
}

/* Les photos ne sont pas un ornement : ce sont elles qui rendent la
   comparaison au retour opposable. Une panne se documente rarement en
   une image — le connecteur arraché, la trace sur le flanc et l'écran
   éteint sont trois choses à montrer. Un seul mécanisme sert les deux
   fenêtres. `capture` ouvre l'appareil photo directement sur tablette
   et téléphone : en studio, c'est le geste attendu. */
const PHOTO_MAX = 6;
let photoBuf = {rp: [], rc: []};

function photoZone(key){
  const el = document.getElementById(key + '-photozone');
  if(!el) return;
  const list = photoBuf[key] || [];
  const full = list.length >= PHOTO_MAX;
  const tiles = list.map((d, n)=>`
    <div class="phtile">
      <img class="photoprev" src="${d}" onclick="viewPhoto('${key}',${n})">
      <button class="phdrop" onclick="dropPhoto('${key}',${n})" aria-label="Remove">✕</button>
    </div>`).join('');
  const add = full
    ? `<div class="hintline">Six photos is the maximum. Remove one to add another.</div>`
    : `<label class="photobtn${list.length?' compact':''}">
         <span class="pi">📷</span>
         <span>${list.length ? 'Add another' : 'Take or choose photos'}</span>
         <input type="file" accept="image/*" capture="environment" multiple
                style="display:none" onchange="takePhoto('${key}', this)">
       </label>`;
  el.innerHTML = `<div class="phgrid">${tiles}</div>${add}`;
}

function takePhoto(key, inp){
  const files = [...(inp.files||[])];
  inp.value = '';
  if(!files.length) return;
  const room = PHOTO_MAX - photoBuf[key].length;
  if(files.length > room) toast(`Only ${room} more photo(s) fit.`, 'error');
  files.slice(0, room).forEach(f=>{
    const fr = new FileReader();
    fr.onload = () => { photoBuf[key].push(fr.result); photoZone(key); };
    fr.readAsDataURL(f);
  });
}
function dropPhoto(key, n){ photoBuf[key].splice(n, 1); photoZone(key); }

/* Une vignette de 78 px ne montre pas une rayure. Le même visualiseur
   sert pour les photos en cours de saisie et pour celles déjà au
   dossier, d'où la liste passée en clair. */
let photoView = [], photoViewAt = 0;
function viewPhoto(key, n){
  photoView = key === 'doc' ? photoViewDoc : (photoBuf[key] || []);
  photoViewAt = n; renderPhotoView(); open_('ovPhoto');
}
let photoViewDoc = [];
function stepPhoto(d){
  if(!photoView.length) return;
  photoViewAt = (photoViewAt + d + photoView.length) % photoView.length;
  renderPhotoView();
}
function renderPhotoView(){
  document.getElementById('pv-img').src = photoView[photoViewAt] || '';
  document.getElementById('pv-n').textContent =
    photoView.length > 1 ? `${photoViewAt+1} / ${photoView.length}` : '';
  document.getElementById('pv-nav').style.display = photoView.length > 1 ? '' : 'none';
}

/* Affiche une liste déjà enregistrée, sans possibilité de retrait. */
function photoStrip(list, label){
  photoViewDoc = list || [];
  if(!photoViewDoc.length) return `<div class="hintline">No photo was taken.</div>`;
  return `<div class="phgrid">` + photoViewDoc.map((d,n)=>
    `<img class="photoprev" src="${d}" onclick="viewPhoto('doc',${n})" alt="${esc(label||'')}">`
  ).join('') + `</div>`;
}

async function doReport(){
  const i = reportItemId ? item(reportItemId) : null;
  if(!i){ toast('Pick an item first.', 'error'); return; }
  if(!reportFault){ toast('Choose what is wrong.', 'error'); return; }
  if(repairOf(i.id)){ toast('This item already has an open incident.', 'error'); return; }
  const note = document.getElementById('rp-note').value.trim();

  try{
    const photos = [];
    for(const [n, d] of photoBuf.rp.entries())
      photos.push(await apiUploadPhoto(d, `repairs/${i.id}-open-${Date.now()}-${n}.jpg`));
    const row = {
      item_id: i.id, fault: reportFault, description: note || null,
      cond_at_open: reportCond, photos_open: photos,
      opened_by_name: (me && me.name) || (me && me.email) || null
    };
    await apiOpenRepair(row);
    /* L'état physique ne suit que s'il a vraiment changé : signaler
       une panne ne rend pas un objet « usé ». */
    if(reportCond !== i.cond){
      i.cond = reportCond;
      await apiUpdateItem(i.id, {cond: reportCond});
    }
    await hist(i.id, 'repair', `fault reported: ${faultLabel(reportFault)}${note?` — ${note}`:''}`,
               null, reportCond);
    close_('ovReport');
    await refresh();
    toast('Incident opened.', 'ok');
  }catch(e){ toast('Could not open the incident: ' + (e.message||e), 'error'); }
}

/* ============================================================
   2. ENVOYER CHEZ UN PRESTATAIRE
   ============================================================ */
let sendRepairId = null;

function openSend(rid){
  sendRepairId = rid;
  const r = (db.repairs||[]).find(x=>x.id === rid);
  const i = r && repItem(r);
  if(!r || !i){ toast('Incident not found.', 'error'); return; }
  document.getElementById('sd-item').textContent = itemTitleText(i);
  document.getElementById('sd-fault').textContent = faultLabel(r.fault);
  document.getElementById('sd-ref').value = '';
  const sel = document.getElementById('sd-prov');
  const provs = (db.providers||[]).filter(p=>!p.archived);
  sel.innerHTML = `<option value="">— choose —</option>` +
    provs.map(p=>`<option value="${p.id}">${esc(p.name)}${p.specialty?` — ${esc(p.specialty)}`:''}</option>`).join('');
  document.getElementById('sd-none').style.display = provs.length ? 'none' : '';
  open_('ovSend');
}

async function doSend(){
  const r = (db.repairs||[]).find(x=>x.id === sendRepairId);
  const i = r && repItem(r);
  if(!r || !i) return;
  const pid = document.getElementById('sd-prov').value;
  if(!pid){ toast('Choose a provider.', 'error'); return; }
  const ref = document.getElementById('sd-ref').value.trim();
  const p = providerOf(pid);

  try{
    await apiUpdateRepair(r.id, {
      provider_id: pid, tracking_ref: ref || null,
      sent_at: new Date().toISOString(), status: 'sent'
    });
    /* L'item part réellement : il quitte le studio, et l'inventaire
       doit le dire. Mais sans emprunteur — un atelier n'en est pas un,
       et « Check in all » ne doit pas le rapatrier. */
    const out = {userId:null, date:new Date().toISOString(), due:null,
                 reason: p ? p.name : 'Repair shop', repairId: r.id};
    i.status = 'sorti'; i.out = out; i.loc = out.reason;
    await apiUpdateItem(i.id, {status:'sorti', out, loc: out.reason});
    await hist(i.id, 'repair', `sent to ${p?p.name:'a provider'}${ref?` — ref ${ref}`:''}`);
    close_('ovSend');
    await refresh();
    toast('Sent for repair.', 'ok');
  }catch(e){ toast('Could not record the shipment: ' + (e.message||e), 'error'); }
}

/* ============================================================
   3. CONTRÔLE AU RETOUR
   L'état constaté et la destination sont deux questions séparées :
   un item peut revenir réparé et être quand même mis de côté.
   ============================================================ */
let recvRepairId = null, recvOutcome = null, recvDest = 'service';

function openReceive(rid){
  recvRepairId = rid; recvOutcome = null; recvDest = 'service';
  photoBuf.rc = []; photoZone('rc');
  const r = (db.repairs||[]).find(x=>x.id === rid);
  const i = r && repItem(r);
  if(!r || !i){ toast('Incident not found.', 'error'); return; }

  document.getElementById('rc-item').textContent = itemTitleText(i);
  document.getElementById('rc-from').textContent = r.provider_id
    ? `back from ${providerName(r.provider_id)} · ${repairDays(r)} d`
    : `open for ${repairDays(r)} d`;
  document.getElementById('rc-when').textContent = fdate(r.sent_at || r.opened_at);
  document.getElementById('rc-fault').textContent = faultLabel(r.fault);
  document.getElementById('rc-cond0').textContent = condLabel(r.cond_at_open);
  document.getElementById('rc-desc').textContent = r.description || '';
  const ph = document.getElementById('rc-photo0');
  ph.innerHTML = photoStrip(r.photos_open, 'When it was sent');
  document.getElementById('rc-work').value = '';
  renderReceive();
  open_('ovRecv');
}
function setRecvOutcome(k){
  recvOutcome = k;
  /* La destination la plus probable, pas une décision : elle reste
     modifiable juste en dessous. */
  recvDest = k === 'repaired' ? 'service' : (k === 'new_damage' ? 'repair' : 'repair');
  renderReceive();
}
function setRecvDest(k){ recvDest = k; renderReceive(); }

function renderReceive(){
  document.getElementById('rc-outcomes').innerHTML = Object.entries(OUTCOMES)
    .map(([k,l])=>`<button class="chipbtn sq ${recvOutcome===k?'on':''}"
      onclick="setRecvOutcome('${k}')">${esc(l)}</button>`).join('');
  document.getElementById('rc-dests').innerHTML = Object.entries(DESTINATIONS)
    .map(([k,l])=>`<button class="chipbtn sq ${recvDest===k?'on':''}"
      onclick="setRecvDest('${k}')">${esc(l)}</button>`).join('');
}

async function doReceive(){
  const r = (db.repairs||[]).find(x=>x.id === recvRepairId);
  const i = r && repItem(r);
  if(!r || !i) return;
  if(!recvOutcome){ toast('Say what came back.', 'error'); return; }
  const work = document.getElementById('rc-work').value.trim();
  const nowIso = new Date().toISOString();

  try{
    const backPhotos = [];
    for(const [n, d] of photoBuf.rc.entries())
      backPhotos.push(await apiUploadPhoto(d, `repairs/${i.id}-back-${Date.now()}-${n}.jpg`));
    if(recvDest === 'repair'){
      /* Toujours en panne : le dossier reste ouvert et repart à zéro
         côté prestataire, plutôt que d'en ouvrir un second. */
      await apiUpdateRepair(r.id, {
        received_at: nowIso, outcome: recvOutcome, work_done: work || null,
        photos_return: backPhotos,
        provider_id: null, tracking_ref: null, sent_at: null, status: 'open'
      });
      await apiUpdateItem(i.id, {status:'dispo', out:null, loc: i.home});
      await hist(i.id, 'repair', `back, still faulty: ${OUTCOMES[recvOutcome]}${work?` — ${work}`:''}`);
      toast('Back in the queue.', 'ok');
    }else{
      const cond = recvDest === 'hs' ? 'hs'
                 : (recvOutcome === 'repaired' ? 'bon' : 'use');
      await apiUpdateRepair(r.id, {
        received_at: nowIso, outcome: recvOutcome, work_done: work || null,
        photos_return: backPhotos,
        closed_at: nowIso, destination: recvDest, status: 'closed'
      });
      await apiUpdateItem(i.id, {status:'dispo', out:null, loc: i.home, cond});
      await hist(i.id, 'repair',
        `incident closed: ${OUTCOMES[recvOutcome]} → ${DESTINATIONS[recvDest]}${work?` — ${work}`:''}`,
        null, cond);
      toast(recvDest === 'hs' ? 'Marked out of service.' : 'Back in service.', 'ok');
    }
    close_('ovRecv');
    await refresh();
  }catch(e){ toast('Could not close the incident: ' + (e.message||e), 'error'); }
}
