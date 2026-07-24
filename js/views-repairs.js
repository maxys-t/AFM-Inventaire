/* ============================================================
   VUE — Réparations : attente / en cours / HS + journal
   ============================================================ */

let repPending = null;
function openRepair(id,newCond){
  repPending = {id,newCond};
  const i = item(id);
  document.getElementById('rep-title').textContent = {
    reparation:"Envoyer en réparation — ", attente:"Mettre en attente — ",
    bon:"Marquer réparé — ", hs:"Déclarer hors service — "
  }[newCond] + i.name;
  document.getElementById('rep-notelbl').textContent = newCond==='reparation' ? "Où / chez qui ? (optionnel)" : "Note (optionnel)";
  document.getElementById('rep-note').value = "";
  open_('ovRep');
}
async function doRepair(){
  const {id,newCond} = repPending;
  const note = document.getElementById('rep-note').value.trim();
  const i = item(id);
  i.cond = newCond;
  await apiUpdateItem(i.id, {cond:newCond});
  await hist(id,'repair', REPACT[newCond] + (note?` — ${note}`:''), null, newCond);
  close_('ovRep'); render();
}
function repSince(i){
  const h = db.history.find(h=>h.itemId===i.id && (h.type==='repair' || (h.type==='in' && h.cond && h.cond!=='bon')));
  return h ? h.date : null;
}
function renderRep(){
  const groups = [
    ['attente','⏳ En attente de réparation'],
    ['reparation','🔧 En réparation'],
    ['hs','⛔ Hors service']
  ];
  let html = "";
  groups.forEach(([cond,title])=>{
    const rows = db.items.filter(i=>i.cond===cond);
    html += `<div class="panel"><h2>${title} (${rows.length})</h2>`;
    if(!rows.length){ html += '<div class="muted">Aucun item.</div></div>'; return; }
    html += `<table><thead><tr><th>Item</th><th>Depuis</th><th>Emplacement</th><th>Détail</th><th></th></tr></thead><tbody>`;
    rows.forEach(i=>{
      const since = repSince(i);
      const lastRep = db.history.find(h=>h.itemId===i.id && h.type==='repair');
      const detail = lastRep ? lastRep.detail : "";
      let btns = "";
      if(cond==='attente') btns = `<button class="btn small" onclick="openRepair('${i.id}','reparation')">→ En réparation</button> <button class="btn small ok" onclick="openRepair('${i.id}','bon')">Réparé</button>`;
      if(cond==='reparation') btns = `<button class="btn small ok" onclick="openRepair('${i.id}','bon')">Réparé</button> <button class="btn small sec" onclick="openRepair('${i.id}','attente')">→ En attente</button>`;
      if(cond==='hs') btns = `<button class="btn small ok" onclick="openRepair('${i.id}','bon')">Remis en service</button>`;
      html += `<tr class="rowlink" onclick="openDetail('${i.id}')">
        <td data-l="Item"><b>${esc(i.name)}</b> <span class="mono">${i.id}</span></td>
        <td data-l="Depuis">${since?`${fdate(since)} <span class="muted">(${daysSince(since)} j)</span>`:'<span class="muted">—</span>'}</td>
        <td data-l="Emplacement">${esc(i.status==='sorti'?i.loc:locLabel(i.loc))}</td>
        <td data-l="Détail" class="muted">${esc(detail)}</td>
        <td onclick="event.stopPropagation()">${btns}</td></tr>`;
    });
    html += "</tbody></table></div>";
  });
  const journal = db.history.filter(h=>h.type==='repair' || (h.type==='in' && h.cond && h.cond!=='bon')).slice(0,30).map(h=>{
    const it = item(h.itemId);
    return `<li>🔧 <b>${esc(it?it.name:h.itemId)}</b> — ${histText(h)}<div class="when">${fdate(h.date)}</div></li>`;
  }).join("");
  html += `<div class="panel"><h2>Journal des réparations</h2><ul class="hist">${journal||'<div class="muted">Aucun événement.</div>'}</ul></div>`;
  document.getElementById('v-rep').innerHTML = html;
}
