/* ============================================================
   VUE — Sortis : matériel actuellement hors du studio
   ============================================================ */

function renderOut(){
  const oc = document.getElementById('oCat'), keep = oc.value;
  oc.innerHTML = '<option value="">Catégorie : toutes</option>' + Object.entries(CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
  oc.value = keep;
  const ou = document.getElementById('oUser'), keepU = ou.value;
  ou.innerHTML = '<option value="">Personne : toutes</option>' + db.users.map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join("")
    + db.projects.map(p=>`<option value="p:${p.id}">🎪 ${esc(p.name)}</option>`).join("");
  ou.value = keepU;
  renderOutList();
}
function renderOutList(){
  const q = (document.getElementById('oq').value||"").toLowerCase();
  const cat = document.getElementById('oCat').value;
  const usr = document.getElementById('oUser').value;
  const minDays = +document.getElementById('oDays').value||0;
  const rows = db.items.filter(i=>{
    if(i.status!=='sorti') return false;
    if(daysSince(i.out.date)<minDays) return false;
    if(q && !(i.name+" "+i.id+" "+i.out.reason+" "+outBy(i)).toLowerCase().includes(q)) return false;
    if(cat && i.cat!==cat) return false;
    if(usr){
      if(usr.startsWith('p:')){ if(!i.out.projectId || 'p:'+i.out.projectId!==usr) return false; }
      else if(i.out.userId!==usr) return false;
    }
    return true;
  }).sort((a,b)=>new Date(a.out.date)-new Date(b.out.date));
  document.getElementById('outList').innerHTML = rows.length ? `<table><thead><tr>
    <th>Item</th><th>Qui</th><th>Depuis</th><th>Durée</th><th>Retour prévu</th><th>Destination / raison</th><th></th>
  </tr></thead><tbody>` + rows.map(i=>{
    const d = daysSince(i.out.date), od = overdue(i);
    return `<tr class="rowlink" onclick="openDetail('${i.id}')">
      <td data-l="Item"><b>${esc(i.name)}</b> <span class="mono">${i.id}</span></td>
      <td data-l="Qui">${esc(outBy(i))}</td>
      <td data-l="Depuis">${fdate(i.out.date)}</td>
      <td data-l="Durée"><span class="${(!i.out.due && d>=ALERT_DAYS)?'days-late':''}">${d} j</span></td>
      <td data-l="Retour prévu">${i.out.due?`<span class="${od?'days-late':''}">${fdateD(i.out.due)}${od?' ⚠️':''}</span>`:'<span class="muted">—</span>'}</td>
      <td data-l="Raison">${esc(i.out.reason)}</td>
      <td onclick="event.stopPropagation()"><button class="btn small ok" onclick="openCheckin('${i.id}')">Check-in</button></td>
    </tr>`;}).join("") + "</tbody></table>"
  : '<div class="empty">Rien ne correspond — ou tout est au studio 🎉</div>';
}
