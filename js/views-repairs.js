/* ============================================================
   VUE — Réparations : attente / en cours / HS + journal
   ============================================================ */

let repPending = null;
function openRepair(id,newCond){
  repPending = {id,newCond};
  const i = item(id);
  document.getElementById('rep-title').textContent = {
    reparation:"Send for repair — ", attente:"Flag as needing repair — ",
    bon:"Mark repaired — ", hs:"Mark out of service — "
  }[newCond] + i.name;
  document.getElementById('rep-notelbl').textContent = newCond==='reparation' ? "Where / with whom? (optional)" : "Note (optional)";
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
    ['attente','⏳ Needs repair'],
    ['reparation','🔧 In repair'],
    ['hs','⛔ Out of service']
  ];
  let html = "";
  groups.forEach(([cond,title])=>{
    const rows = db.items.filter(i=>i.cond===cond);
    html += `<div class="panel"><h2>${title} (${rows.length})</h2>`;
    if(!rows.length){ html += '<div class="muted">Aucun item.</div></div>'; return; }
    html += `<table><thead><tr><th>Item</th><th>Since</th><th>Location</th><th>Details</th><th></th></tr></thead><tbody>`;
    rows.forEach(i=>{
      const since = repSince(i);
      const lastRep = db.history.find(h=>h.itemId===i.id && h.type==='repair');
      const detail = lastRep ? lastRep.detail : "";
      let btns = "";
      if(cond==='attente') btns = `<button class="btn small" onclick="openRepair('${i.id}','reparation')">→ In repair</button> <button class="btn small ok" onclick="openRepair('${i.id}','bon')">Repaired</button>`;
      if(cond==='reparation') btns = `<button class="btn small ok" onclick="openRepair('${i.id}','bon')">Repaired</button> <button class="btn small sec" onclick="openRepair('${i.id}','attente')">→ En attente</button>`;
      if(cond==='hs') btns = `<button class="btn small ok" onclick="openRepair('${i.id}','bon')">Remis en service</button>`;
      html += `<tr class="rowlink" onclick="openDetail('${i.id}')">
        <td data-l="Item">${itemTitle(i)} <span class="mono">${i.id}</span></td>
        <td data-l="Since">${since?`${fdate(since)} <span class="muted">(${daysSince(since)} j)</span>`:'<span class="muted">—</span>'}</td>
        <td data-l="Location">${esc(i.status==='sorti'?i.loc:locLabel(i.loc))}</td>
        <td data-l="Details" class="muted">${esc(detail)}</td>
        <td onclick="event.stopPropagation()">${btns}</td></tr>`;
    });
    html += "</tbody></table></div>";
  });
  const journal = db.history.filter(h=>h.type==='repair' || (h.type==='in' && h.cond && h.cond!=='bon')).slice(0,30).map(h=>{
    const it = item(h.itemId);
    return `<li>🔧 ${it?itemTitle(it):`<b>${esc(h.itemId)}</b>`} — ${histText(h)}<div class="when">${fdate(h.date)}${histBy(h)}</div></li>`;
  }).join("");
  html += `<div class="panel"><h2>Repair log</h2><ul class="hist">${journal||'<div class="muted">No entry yet.</div>'}</ul></div>`;
  document.getElementById('v-rep').innerHTML = html;
}
