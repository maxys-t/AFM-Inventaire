/* ============================================================
   VUE — Projets / tournées : liste, template de matériel,
   checklist de préparation, transitions Inactif → Prépa → Show
   ============================================================ */

function renderProj(){
  let html = `<div class="toolbar"><button class="btn" onclick="openProjForm()">+ Nouveau projet</button></div>`;
  if(db.projectsError){
    html += `<div class="alert bad">La table des projets n'existe pas encore : exécute <b>sql/003-projets.sql</b> dans Supabase (SQL Editor), puis clique sur ↻ Actualiser.</div>`;
    document.getElementById('v-proj').innerHTML = html; return;
  }
  if(!db.projects.length){
    html += '<div class="panel"><div class="empty">Aucun projet. Crée un template de tournée avec sa liste fixe de matériel — il sera réutilisable à chaque fois.</div></div>';
  }else{
    html += `<div class="panel"><table><thead><tr><th>Projet</th><th>Statut</th><th>Matériel</th><th>Préparation</th><th>Dernière utilisation</th></tr></thead><tbody>` +
    db.projects.map(p=>{
      const pr = projProgress(p);
      const prog = p.status==='preparation'
        ? `<div class="pline" style="margin:0"><div class="pbar"><div style="width:${pr.total?Math.round(pr.done/pr.total*100):0}%"></div></div><span class="muted">${pr.done}/${pr.total}</span></div>`
        : (p.status==='show' ? '<span class="muted">en tournée</span>' : '<span class="muted">—</span>');
      return `<tr class="rowlink" onclick="openProject('${p.id}')">
        <td data-l="Projet"><b>${esc(p.name)}</b>${p.description?`<br><span class="muted">${esc(p.description)}</span>`:""}</td>
        <td data-l="Statut"><span class="tag ${PTAG[p.status]}">${PSTAT[p.status]||p.status}</span></td>
        <td data-l="Matériel">${(p.item_ids||[]).length} item(s)</td>
        <td data-l="Préparation">${prog}</td>
        <td data-l="Dernière utilisation">${p.last_used?fdate(p.last_used):'<span class="muted">jamais</span>'}</td>
      </tr>`;
    }).join("") + "</tbody></table></div>";
  }
  document.getElementById('v-proj').innerHTML = html;
}

/* ---- formulaire projet (création / modification du template) ---- */
let editingProjId = null, pickerSel = new Set();
function openProjForm(id){
  editingProjId = id||null;
  const p = id?project(id):null;
  document.getElementById('projFormTitle').textContent = p?'Modifier le projet':'Nouveau projet';
  document.getElementById('p-name').value = p?p.name:"";
  document.getElementById('p-desc').value = p?(p.description||""):"";
  document.getElementById('p-search').value = "";
  pickerSel = new Set(p?(p.item_ids||[]):[]);
  renderPicker();
  open_('ovProj');
}
function renderPicker(){
  const q = (document.getElementById('p-search').value||"").toLowerCase();
  const rows = db.items.filter(i=>!q || (i.name+" "+i.id+" "+(CATS[i.cat]||"")).toLowerCase().includes(q));
  document.getElementById('p-picker').innerHTML = rows.map(i=>`
    <label><input type="checkbox" ${pickerSel.has(i.id)?'checked':''} onchange="togglePick('${i.id}',this.checked)">
    <span style="flex:1"><b>${esc(i.name)}</b> <span class="mono">${i.id}</span> <span class="muted">· ${CATS[i.cat]||i.cat}</span></span></label>`).join("")
    || '<div class="muted" style="padding:8px">Aucun item.</div>';
  document.getElementById('p-count').textContent = pickerSel.size + " item(s) sélectionné(s)";
}
function togglePick(id,on){
  if(on) pickerSel.add(id); else pickerSel.delete(id);
  document.getElementById('p-count').textContent = pickerSel.size + " item(s) sélectionné(s)";
}
async function saveProj(){
  const name = document.getElementById('p-name').value.trim();
  if(!name){ alert("Le nom est obligatoire."); return; }
  if(!pickerSel.size){ alert("Sélectionne au moins un item."); return; }
  const desc = document.getElementById('p-desc').value.trim();
  if(editingProjId){
    const p = project(editingProjId);
    p.name = name; p.description = desc; p.item_ids = [...pickerSel];
    p.prep = p.prep||{};
    Object.keys(p.prep).forEach(k=>{ if(!pickerSel.has(k)) delete p.prep[k]; });
    await apiUpdateProject(p.id, {name,description:desc,item_ids:p.item_ids,prep:p.prep});
  }else{
    const p = {id:"p"+Date.now(), name, description:desc, status:'inactif', item_ids:[...pickerSel], prep:{}, last_used:null, created_at:now()};
    db.projects.push(p);
    await apiInsertProject(p);
  }
  close_('ovProj'); renderProj();
}
async function deleteProj(id){
  const p = project(id);
  if(p.status==='show'){ alert("Clôture d'abord le show avant de supprimer ce projet."); return; }
  if(!confirm("Supprimer ce projet ? (le matériel et son historique ne sont pas touchés)")) return;
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
  let list = its.map(i=>{
    const busyElsewhere = i.status==='sorti' && (!i.out.projectId || i.out.projectId!==p.id);
    const onTour = i.status==='sorti' && i.out.projectId===p.id;
    const avail = onTour ? '<span class="tag pshow">en tournée</span>'
      : busyElsewhere ? `<span class="tag sorti">sorti — ${esc(outBy(i))}</span>`
      : i.cond!=='bon' ? `<span class="tag ${i.cond}">${CONDS[i.cond]}</span>`
      : '<span class="tag dispo">dispo</span>';
    const check = p.status==='show' ? '' :
      `<input type="checkbox" ${p.prep&&p.prep[i.id]?'checked':''} onchange="toggleProjItem('${p.id}','${i.id}',this.checked)">`;
    return `<label>${check}<span style="flex:1"><b>${esc(i.name)}</b> <span class="mono">${i.id}</span></span>${avail}</label>`;
  }).join("");
  const missing = (p.item_ids||[]).length - its.length;
  if(missing>0) list += `<div class="muted" style="padding:8px">⚠️ ${missing} item(s) du template ont été supprimés de l'inventaire.</div>`;
  let actions = "";
  if(p.status==='inactif') actions = `<button class="btn" onclick="setProjStatus('${p.id}','preparation')">Commencer la préparation</button>`;
  if(p.status==='preparation') actions = `<button class="btn" onclick="goShow('${p.id}')">🎪 Passer en mode Show</button> <button class="btn sec small" onclick="resetPrep('${p.id}')">Réinitialiser la checklist</button> <button class="btn sec small" onclick="setProjStatus('${p.id}','inactif')">Mettre en pause</button>`;
  if(p.status==='show') actions = `<button class="btn ok" onclick="closeShow('${p.id}')">📥 Clôturer le show / retour de tournée</button>`;
  document.getElementById('projDetailBody').innerHTML = `
    <h3>${esc(p.name)} <span class="tag ${PTAG[p.status]}">${PSTAT[p.status]}</span></h3>
    ${p.description?`<p class="muted" style="margin-bottom:8px">${esc(p.description)}</p>`:""}
    ${p.status!=='show'?`<div class="pline"><div class="pbar"><div style="width:${pct}%"></div></div><span class="muted"><b>${pr.done}/${pr.total}</b> prêts</span></div>`:""}
    <div class="clist" style="margin:10px 0">${list||'<div class="muted">Aucun item.</div>'}</div>
    <div class="modal-actions" style="justify-content:flex-start;flex-wrap:wrap">${actions}</div>
    <div class="modal-actions" style="justify-content:space-between">
      <span>
        ${p.status!=='show'?`<button class="btn sec small" onclick="openProjForm('${p.id}')">Modifier</button>`:""}
        <button class="btn danger small" onclick="deleteProj('${p.id}')">Supprimer</button>
      </span>
      <button class="btn sec" onclick="close_('ovProjDetail')">Fermer</button>
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
  if(pr.done<pr.total && !confirm(`${pr.total-pr.done} item(s) ne sont pas cochés "prêt". Passer en mode Show quand même ?`)) return;
  if(busy.length && !confirm(`${busy.length} item(s) sont déjà sortis ailleurs (${busy.map(i=>i.name).join(", ")}). Ils seront ignorés. Continuer ?`)) return;
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
  if(!confirm("Clôturer le show ? Tout le matériel du projet sera checké-in et retournera à son emplacement de référence.")) return;
  const outItems = db.items.filter(i=>i.status==='sorti' && i.out && i.out.projectId===p.id);
  for(const i of outItems){
    i.status = 'dispo'; i.loc = i.home; i.out = null;
    await apiUpdateItem(i.id, {status:'dispo',loc:i.loc,out:null});
    await hist(i.id,'in',`Retour de tournée — ${p.name}`,null,i.cond);
  }
  p.status = 'inactif'; p.prep = {};
  await apiUpdateProject(pid, {status:'inactif',prep:{}});
  renderProjDetail(pid);
}
