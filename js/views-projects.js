/* ============================================================
   VUE — Projets / tournées : liste, template de matériel,
   checklist de préparation, transitions Inactif → Prépa → Show
   ============================================================ */

/* Un projet archivé sort de la liste sans disparaître : les tournées
   passées restent consultables, et leur historique reste lisible. */
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
  let html = can('edit') ? `<div class="toolbar"><button class="btn" onclick="openProjForm()">+ New project</button></div>` : '';
  if(db.projectsError){
    html += `<div class="alert bad">The projects table does not exist yet — run <b>sql/003-projets.sql</b> in Supabase (SQL Editor), then click ↻ Refresh.</div>`;
    document.getElementById('v-proj').innerHTML = html; return;
  }
  const rows = db.projects.filter(p=>showArchivedProj || !p.archived);
  const nbArch = db.projects.filter(p=>p.archived).length;

  if(!rows.length){
    html += '<div class="panel"><div class="empty">'
      + (db.projects.length ? 'No active project — everything is archived.'
         : 'No project yet. Create a tour template with its fixed gear list — it can be reused every time.')
      + '</div></div>';
  }else{
    html += `<div class="panel"><table><thead><tr><th>Project</th><th>Destination</th><th>Dates</th><th>Status</th><th>Gear</th><th>Packing</th></tr></thead><tbody>` +
    rows.map(p=>{
      const pr = projProgress(p);
      const prog = p.status==='preparation'
        ? `<div class="pline" style="margin:0"><div class="pbar"><div style="width:${pr.total?Math.round(pr.done/pr.total*100):0}%"></div></div><span class="muted">${pr.done}/${pr.total}</span></div>`
        : (p.status==='show' ? '<span class="muted">on show</span>' : '<span class="muted">—</span>');
      const d = projDates(p);
      return `<tr class="rowlink ${p.archived?'archrow':''}" onclick="openProject('${p.id}')">
        <td data-l="Project"><b>${esc(p.name)}</b>${p.archived?' <span class="tag pinactif">archived</span>':''}
          ${p.description?`<div class="muted">${esc(p.description)}</div>`:""}</td>
        <td data-l="Destination">${p.loc_name?esc(p.loc_name):'<span class="muted">—</span>'}</td>
        <td data-l="Dates">${d?esc(d):'<span class="muted">—</span>'}</td>
        <td data-l="Status"><span class="tag ${PTAG[p.status]}">${PSTAT[p.status]||p.status}</span></td>
        <td data-l="Gear">${(p.item_ids||[]).length} item(s)</td>
        <td data-l="Packing">${prog}</td>
      </tr>`;
    }).join("") + "</tbody></table></div>";
  }
  if(nbArch){
    html += `<div style="margin-top:-6px"><button class="btn sec small" onclick="toggleArchivedProj()">
      ${showArchivedProj?'Hide':'Show'} archived (${nbArch})</button></div>`;
  }
  document.getElementById('v-proj').innerHTML = html;
}

/* ---- formulaire projet (création / modification du template) ----
   Le sélecteur fonctionne comme le Finder : familles → sous-catégories → items.
   Une recherche court-circuite l'arborescence et affiche une liste à plat. */
let editingProjId = null, pickerSel = new Set();
let pickCat = "", pickSub = "";       // dossier ouvert

function openProjForm(id){
  editingProjId = id||null;
  const p = id?project(id):null;
  document.getElementById('projFormTitle').textContent = p?'Modifier le projet':'Nouveau projet';
  document.getElementById('p-name').value = p?p.name:"";
  document.getElementById('p-desc').value = p?(p.description||""):"";
  const dest = document.getElementById('p-dest');
  if(dest){
    dest.innerHTML = '<option value="">— no destination —</option>' + locOptions();
    dest.value = p ? (p.loc_name||"") : "";
    // Une destination archivée n'est plus dans la liste : on l'y remet
    // pour ne pas l'effacer silencieusement en rouvrant le formulaire.
    if(p && p.loc_name && dest.value !== p.loc_name){
      dest.insertAdjacentHTML('beforeend',
        `<option value="${esc(p.loc_name)}">${esc(p.loc_name)} (archived)</option>`);
      dest.value = p.loc_name;
    }
  }
  const s = document.getElementById('p-start'), e = document.getElementById('p-end');
  if(s) s.value = p ? (p.starts_on||"") : "";
  if(e) e.value = p ? (p.ends_on||"") : "";
  document.getElementById('p-search').value = "";
  pickerSel = new Set(p?(p.item_ids||[]):[]);
  pickCat = ""; pickSub = "";
  renderPicker();
  open_('ovProj');
}

/* Items d'un dossier : famille, puis sous-catégorie si elle est ouverte */
function pickItems(cat, sub){
  return db.items.filter(i=>(!cat || i.cat===cat) && (!sub || i.subcat===sub))
                 .sort((a,b)=>itemTitleText(a).localeCompare(itemTitleText(b),'fr'));
}
function pickCount(cat, sub){
  const its = pickItems(cat, sub);
  return {n:its.length, sel:its.filter(i=>pickerSel.has(i.id)).length};
}

function pickOpenCat(c){ pickCat = (pickCat===c && !pickSub) ? "" : c; pickSub = ""; renderPicker(); }
function pickOpenSub(sb){ pickSub = (pickSub===sb) ? "" : sb; renderPicker(); }

function pickRow(i){
  const on = pickerSel.has(i.id);
  const etat = i.status==='sorti' ? '<span class="tag sorti">sorti</span>'
             : i.cond!=='bon' ? `<span class="tag ${i.cond}">${CONDS[i.cond]}</span>` : '';
  return `<label class="prow${on?' on':''}">
    <input type="checkbox" ${on?'checked':''} onchange="togglePick('${i.id}',this.checked)">
    ${i.photo?`<img loading="lazy" src="${i.photo}">`:'<span class="ph"></span>'}
    <span class="nm">${itemTitle(i)}</span>
    <span class="mono">${i.id}</span>${etat}
  </label>`;
}

function renderPicker(){
  const q = (document.getElementById('p-search').value||"").trim().toLowerCase();
  const box = document.getElementById('p-picker');

  if(q){                                        // recherche : liste à plat
    const rows = db.items.filter(i=>
      (itemTitleText(i)+" "+i.id+" "+catPath(i)+" "+(i.serial||"")).toLowerCase().includes(q));
    box.innerHTML = `<div class="pnav"><div class="pcol wide">
        <div class="phead">${rows.length} result(s) for "${esc(q)}"
          ${rows.length?`<button type="button" class="lnk" onclick="pickAll(${JSON.stringify(rows.map(i=>i.id)).replace(/"/g,'&quot;')},true)">select all</button>`:''}</div>
        ${rows.map(pickRow).join("") || '<div class="muted" style="padding:10px">No item.</div>'}
      </div></div>`;
    updatePickCount(); return;
  }

  // Colonne 1 : familles
  const fams = Object.entries(CATS).map(([k,v])=>{
    const c = pickCount(k);
    if(!c.n) return '';
    return `<div class="pitem${pickCat===k?' on':''}" onclick="pickOpenCat('${k}')">
      <span class="nm">${esc(v.label)}</span>
      <span class="cnt">${c.sel?`<b>${c.sel}</b>/`:''}${c.n}</span><span class="arr">›</span>
    </div>`;
  }).join("");

  // Colonne 2 : sous-catégories de la famille ouverte
  let subs = '<div class="muted" style="padding:10px">Pick a family</div>';
  if(pickCat){
    subs = Object.entries(subsOf(pickCat)).map(([k,v])=>{
      const c = pickCount(pickCat, k);
      if(!c.n) return '';
      return `<div class="pitem${pickSub===k?' on':''}" onclick="pickOpenSub('${k}')">
        <span class="nm">${esc(v.label)}</span>
        <span class="cnt">${c.sel?`<b>${c.sel}</b>/`:''}${c.n}</span><span class="arr">›</span>
      </div>`;
    }).join("") || '<div class="muted" style="padding:10px">Empty</div>';
  }

  // Colonne 3 : items du dossier courant
  let items = '<div class="muted" style="padding:10px">Pick a folder</div>';
  if(pickCat){
    const its = pickItems(pickCat, pickSub);
    const ids = its.map(i=>i.id);
    const tous = ids.length && ids.every(id=>pickerSel.has(id));
    items = `<div class="phead">${its.length} item(s)
        <button type="button" class="lnk" onclick="pickAll(${JSON.stringify(ids).replace(/"/g,'&quot;')},${!tous})">${tous?'clear all':'select all'}</button>
      </div>` + (its.map(pickRow).join("") || '<div class="muted" style="padding:10px">Empty</div>');
  }

  box.innerHTML = `<div class="pnav">
    <div class="pcol">${fams}</div>
    <div class="pcol">${subs}</div>
    <div class="pcol wide">${items}</div>
  </div>`;
  updatePickCount();
}

function pickAll(ids, on){
  ids.forEach(id=>{ if(on) pickerSel.add(id); else pickerSel.delete(id); });
  renderPicker();
}
function togglePick(id,on){
  if(on) pickerSel.add(id); else pickerSel.delete(id);
  // Redessin complet pour rafraîchir les compteurs des dossiers,
  // en conservant la position de défilement de la colonne des items.
  const col = document.querySelector('#p-picker .pcol.wide');
  const sc = col ? col.scrollTop : 0;
  renderPicker();
  const nc = document.querySelector('#p-picker .pcol.wide');
  if(nc) nc.scrollTop = sc;
}

/* Bandeau de sélection, avec retrait au clic */
function updatePickCount(){
  const el = document.getElementById('p-count');
  const n = pickerSel.size;
  if(!n){ el.innerHTML = '<span class="muted">No item selected.</span>'; return; }
  const its = [...pickerSel].map(id=>item(id)).filter(Boolean);
  const max = 30;
  el.innerHTML = `<b>${n}</b> item(s) selected `
    + `<button type="button" class="lnk" onclick="pickAll(${JSON.stringify([...pickerSel]).replace(/"/g,'&quot;')},false)">clear all</button>`
    + `<div class="pchips">` + its.slice(0,max).map(i=>
        `<span class="chip" onclick="togglePick('${i.id}',false)">${esc(itemTitleText(i))} ✕</span>`).join("")
    + (its.length>max?`<span class="muted">+ ${its.length-max} more</span>`:'') + `</div>`;
}

async function saveProj(){
  const name = document.getElementById('p-name').value.trim();
  if(!name){ alert("Le nom est obligatoire."); return; }
  if(!pickerSel.size){ alert("Select at least one item."); return; }
  const desc = document.getElementById('p-desc').value.trim();
  const loc_name = (document.getElementById('p-dest')||{}).value || '';
  const starts_on = (document.getElementById('p-start')||{}).value || null;
  const ends_on = (document.getElementById('p-end')||{}).value || null;
  if(starts_on && ends_on && ends_on < starts_on){
    alert("The end date comes before the start date.");
    return;
  }
  const dates = {loc_name: loc_name||null, starts_on, ends_on};
  if(editingProjId){
    const p = project(editingProjId);
    p.name = name; p.description = desc; p.item_ids = [...pickerSel];
    p.loc_name = loc_name; p.starts_on = starts_on; p.ends_on = ends_on;
    p.prep = p.prep||{};
    Object.keys(p.prep).forEach(k=>{ if(!pickerSel.has(k)) delete p.prep[k]; });
    await apiUpdateProject(p.id, {name,description:desc,item_ids:p.item_ids,prep:p.prep,...dates});
  }else{
    const p = {id:"p"+Date.now(), name, description:desc, status:'inactif',
               item_ids:[...pickerSel], prep:{}, last_used:null, created_at:now(),
               loc_name, starts_on, ends_on, archived:false};
    db.projects.push(p);
    await apiInsertProject({...p, loc_name: loc_name||null});
  }
  close_('ovProj'); renderProj();
}

/* Archivage : on range, on ne supprime pas. */
async function archiveProj(id){
  const p = project(id); if(!p) return;
  if(!p.archived && p.status === 'show'){
    alert("Close the show before archiving this project.");
    return;
  }
  p.archived = !p.archived;
  await apiUpdateProject(id, {archived: p.archived});
  renderProjDetail(id); renderProj();
}

/* ---- brouillon de mail de livraison ----
   Volontairement un brouillon et non un envoi : le message part au nom
   du studio, autant le relire. Un envoi automatique demanderait en plus
   un serveur, donc le mot de passe SMTP quelque part hors de l'app. */
function deliveryMailBody(p){
  const its = projItems(p);
  const dest = p.loc_name || '';
  const addr = dest ? locAddress(dest) : '';
  const dates = projDates(p);

  const L = [];
  L.push(`Delivery details — ${p.name}`, '');
  if(dest)  L.push(`Destination: ${dest}`);
  if(addr)  L.push(`Address: ${addr}`);
  if(dates) L.push(`Dates: ${dates}`);
  L.push(`Items: ${its.length}`, '');

  // Regroupement par sous-catégorie, comme la checklist de préparation
  const packs = new Map();
  its.forEach(i=>{
    const k = catPath(i);
    if(!packs.has(k)) packs.set(k, []);
    packs.get(k).push(i);
  });
  [...packs.entries()].sort((a,b)=>a[0].localeCompare(b[0],'fr')).forEach(([cat, arr])=>{
    L.push(`${cat} (${arr.length})`);
    arr.sort((a,b)=>itemTitleText(a).localeCompare(itemTitleText(b),'fr'))
       .forEach(i=>L.push(`  - ${itemTitleText(i)} [${i.id}]`));
    L.push('');
  });

  const missing = (p.item_ids||[]).length - its.length;
  if(missing > 0) L.push(`(${missing} item(s) of this project are no longer in the inventory)`, '');
  L.push(`— ${LABELS.appTitle}`);
  return L.join('\n');
}

function openDeliveryMail(id){
  const p = project(id); if(!p) return;
  if(!projItems(p).length){ alert("This project has no gear to list."); return; }
  const subject = `${p.name}${p.loc_name?` — ${p.loc_name}`:''}${projDates(p)?` — ${projDates(p)}`:''}`;
  const href = 'mailto:?subject=' + encodeURIComponent(subject)
             + '&body=' + encodeURIComponent(deliveryMailBody(p));
  // Certains clients mail plafonnent la longueur d'un lien mailto.
  if(href.length > 16000){
    alert("This gear list is too long for an email draft. Export the project list instead.");
    return;
  }
  window.location.href = href;
}
async function deleteProj(id){
  const p = project(id);
  if(p.status==='show'){ alert("Close the show before deleting this project."); return; }
  if(!confirm("Delete this project? (gear and history are untouched)")) return;
  db.projects = db.projects.filter(x=>x.id!==id);
  await apiDeleteProject(id);
  close_('ovProjDetail'); renderProj();
}

/* ---- fiche projet / checklist ---- */
function openProject(id){ renderProjDetail(id); open_('ovProjDetail'); }
function renderProjDetail(id){
  const p = project(id); if(!p) return;
  const its = projItems(p);
  const pr = projProgress(p);
  const pct = pr.total?Math.round(pr.done/pr.total*100):0;
  // Checklist groupée par sous-catégorie : plus lisible qu'une longue liste plate
  const paquets = new Map();
  its.forEach(i=>{
    const k = catPath(i);
    if(!paquets.has(k)) paquets.set(k, []);
    paquets.get(k).push(i);
  });
  let list = [...paquets.entries()].sort((a,b)=>a[0].localeCompare(b[0],'fr')).map(([cat, arr])=>{
    const prets = arr.filter(i=>p.prep && p.prep[i.id]).length;
    const lignes = arr.map(i=>{
      const busyElsewhere = i.status==='sorti' && (!i.out.projectId || i.out.projectId!==p.id);
      const onTour = i.status==='sorti' && i.out.projectId===p.id;
      const avail = onTour ? '<span class="tag pshow">on show</span>'
        : busyElsewhere ? `<span class="tag sorti">out — ${esc(outBy(i))}</span>`
        : i.cond!=='bon' ? `<span class="tag ${i.cond}">${CONDS[i.cond]}</span>`
        : '<span class="tag dispo">available</span>';
      const coche = p.prep && p.prep[i.id];
      if(p.status==='show')
        return `<div class="prow"><span class="ph"></span><span class="nm">${itemTitle(i)}</span>
                <span class="mono">${i.id}</span>${avail}</div>`;
      return `<label class="prow${coche?' on':''}">
        <input type="checkbox" ${coche?'checked':''} onchange="toggleProjItem('${p.id}','${i.id}',this.checked)">
        ${i.photo?`<img loading="lazy" src="${i.photo}">`:'<span class="ph"></span>'}
        <span class="nm">${itemTitle(i)}</span><span class="mono">${i.id}</span>${avail}</label>`;
    }).join("");
    return `<div class="cgroup">
      <div class="chead">${esc(cat)}
        <span class="muted">${p.status==='show' ? arr.length + ' item(s)' : prets + '/' + arr.length + ' ready'}</span></div>
      ${lignes}</div>`;
  }).join("");
  const missing = (p.item_ids||[]).length - its.length;
  if(missing>0) list += `<div class="muted" style="padding:8px">⚠️ ${missing} item(s) from this template were deleted from the inventory.</div>`;
  let actions = "";
  if(p.status==='inactif') actions = `<button class="btn" onclick="setProjStatus('${p.id}','preparation')">Start packing</button>`;
  if(p.status==='preparation') actions = `<button class="btn" onclick="goShow('${p.id}')">🎪 Go on show</button> <button class="btn sec small" onclick="resetPrep('${p.id}')">Reset checklist</button> <button class="btn sec small" onclick="setProjStatus('${p.id}','inactif')">Pause</button>`;
  if(p.status==='show') actions = `<button class="btn ok" onclick="closeShow('${p.id}')">📥 Close show / gear back</button>`;
  document.getElementById('projDetailBody').innerHTML = `
    <h3>${esc(p.name)} <span class="tag ${PTAG[p.status]}">${PSTAT[p.status]}</span>
      ${p.archived?'<span class="tag pinactif">archived</span>':''}</h3>
    ${p.description?`<p class="muted" style="margin-bottom:8px">${esc(p.description)}</p>`:""}
    ${(p.loc_name || projDates(p)) ? `<div class="destbox">
      ${p.loc_name?`<div><b>${esc(p.loc_name)}</b>${locAddress(p.loc_name)?` <span class="muted">— ${esc(locAddress(p.loc_name))}</span>`:' <span class="muted">— no address on file</span>'}</div>`:''}
      ${projDates(p)?`<div class="muted">${esc(projDates(p))}</div>`:''}
    </div>` : ''}
    ${p.status!=='show'?`<div class="pline"><div class="pbar"><div style="width:${pct}%"></div></div><span class="muted"><b>${pr.done}/${pr.total}</b> ready</span></div>`:""}
    <div class="clist" style="margin:10px 0">${list||'<div class="muted">No item.</div>'}</div>
    <div class="modal-actions" style="justify-content:flex-start;flex-wrap:wrap">${actions}</div>
    <div class="modal-actions" style="justify-content:space-between;flex-wrap:wrap;gap:6px">
      <span>
        ${(can('edit') && p.status!=='show')?`<button class="btn sec small" onclick="openProjForm('${p.id}')">Edit</button>`:""}
        <button class="btn sec small" onclick="openDeliveryMail('${p.id}')"
                title="Opens a pre-filled draft in your mail app">✉️ Delivery details</button>
        ${can('edit')?`<button class="btn sec small" onclick="archiveProj('${p.id}')">${p.archived?'Restore':'Archive'}</button>`:""}
        ${can('edit')?`<button class="btn danger small" onclick="deleteProj('${p.id}')">Delete</button>`:""}
      </span>
      <button class="btn sec" onclick="close_('ovProjDetail')">Close</button>
    </div>`;
}

/* ---- transitions de statut ---- */
async function toggleProjItem(pid,itemId,on){
  const p = project(pid);
  p.prep = p.prep||{};
  if(on) p.prep[itemId] = true; else delete p.prep[itemId];
  if(p.status==='inactif' && on) p.status = 'preparation';
  renderProjDetail(pid);
  await apiUpdateProject(pid, {prep:p.prep,status:p.status});
}
async function setProjStatus(pid,st){
  const p = project(pid);
  p.status = st;
  renderProjDetail(pid);
  await apiUpdateProject(pid, {status:st});
}
async function resetPrep(pid){
  const p = project(pid);
  p.prep = {};
  renderProjDetail(pid);
  await apiUpdateProject(pid, {prep:{}});
}
async function goShow(pid){
  const p = project(pid);
  const its = projItems(p);
  const pr = projProgress(p);
  const busy = its.filter(i=>i.status==='sorti' && (!i.out.projectId || i.out.projectId!==p.id));
  if(pr.done<pr.total && !confirm(`${pr.total-pr.done} item(s) are not ticked as ready. Go on show anyway?`)) return;
  if(busy.length && !confirm(`${busy.length} item(s) are already checked out elsewhere (${busy.map(i=>i.name).join(", ")}). They will be skipped. Continue?`)) return;
  const date = now();
  for(const i of its){
    if(i.status==='sorti') continue;
    i.status = 'sorti';
    i.out = {userId:null, projectId:p.id, date, reason:`Show — ${p.name}`};
    i.loc = `Show — ${p.name}`;
    await apiUpdateItem(i.id, {status:i.status,out:i.out,loc:i.loc});
    await hist(i.id,'out',`Show — ${p.name}`);
  }
  p.status = 'show'; p.last_used = date;
  await apiUpdateProject(pid, {status:'show',last_used:date});
  renderProjDetail(pid);
}
async function closeShow(pid){
  const p = project(pid);
  if(!confirm("Close the show? All project gear will be checked in and returned to its home location.")) return;
  const outItems = db.items.filter(i=>i.status==='sorti' && i.out && i.out.projectId===p.id);
  for(const i of outItems){
    i.status = 'dispo'; i.loc = i.home; i.out = null;
    await apiUpdateItem(i.id, {status:'dispo',loc:i.loc,out:null});
    await hist(i.id,'in',`Back from show — ${p.name}`,null,i.cond);
  }
  p.status = 'inactif'; p.prep = {};
  await apiUpdateProject(pid, {status:'inactif',prep:{}});
  renderProjDetail(pid);
}
