/* ============================================================
   VUE — Tableau de bord (stats, alertes, activité récente)
   ============================================================ */

function renderDash(){
  const t = db.items.length;
  const out = db.items.filter(i=>i.status==='sorti');
  const rep = db.items.filter(i=>i.cond!=='bon');
  let alerts = "";
  out.forEach(i=>{
    const o = i.out;
    if(o.due && o.alertOn!==false && overdue(i)){
      alerts += `<div class="alert bad">⚠️ <b>${esc(i.name)}</b> — retour prévu le <b>${fdateD(o.due)}</b>, en retard de <b>${daysLate(i)} j</b> — ${esc(outBy(i))} (${esc(o.reason)})</div>`;
    }else if(!o.due && !o.projectId && daysSince(o.date)>=ALERT_DAYS){
      alerts += `<div class="alert">⏰ <b>${esc(i.name)}</b> sorti depuis <b>${daysSince(o.date)} j</b> — ${esc(outBy(i))} (${esc(o.reason)})</div>`;
    }
  });
  rep.forEach(i=>{
    alerts += `<div class="alert ${i.cond==='hs'?'bad':''}">🔧 <b>${esc(i.name)}</b> — ${CONDS[i.cond]}</div>`;
  });
  const recent = db.history.slice(0,8).map(h=>{
    const it = item(h.itemId);
    return `<li>${histIcon(h.type)} <b>${esc(it?it.name:h.itemId)}</b> — ${histText(h)}<div class="when">${fdate(h.date)}</div></li>`;
  }).join("");
  document.getElementById('v-dash').innerHTML = `
    <div class="cards">
      <div class="stat"><div class="num">${t}</div><div class="lbl">Items au total</div></div>
      <div class="stat ok"><div class="num">${t-out.length}</div><div class="lbl">Disponibles</div></div>
      <div class="stat warn"><div class="num">${out.length}</div><div class="lbl">Sortis</div></div>
      <div class="stat bad"><div class="num">${rep.length}</div><div class="lbl">Réparation / HS</div></div>
    </div>
    <div class="panel"><h2>Alertes</h2>${alerts || '<div class="muted">Rien à signaler 👌</div>'}</div>
    <div class="panel"><h2>Activité récente</h2><ul class="hist">${recent || '<div class="muted">Aucune activité</div>'}</ul></div>`;
}
