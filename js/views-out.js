/* ============================================================
   VUE — Sortis : matériel actuellement hors du studio
   ============================================================ */

function renderOut(){
  const oc = document.getElementById('oCat'), keep = oc.value;
  oc.innerHTML = '<option value="">Category: all</option>' + catOptions();
  oc.value = keep;
  const ou = document.getElementById('oUser'), keepU = ou.value;
  ou.innerHTML = '<option value="">Borrower: all</option>' + db.users.map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join("")
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
  document.getElementById('outList').innerHTML = rows.length
    ? outGroupedHTML(rows)
    : '<div class="empty">Rien ne correspond — ou tout est au studio 🎉</div>';
}


/* ============================================================
   REGROUPEMENT PAR PACK (v1.21)

   Cinq lignes indépendantes alors qu'une caisse entière est partie,
   ça n'apprend rien : on relit le même emprunteur et la même
   destination cinq fois, et on clique cinq fois pour la rentrer.
   On regroupe donc par pack — celui où l'item est rangé, ou celui
   qu'il représente s'il en est le contenant.
   ============================================================ */
let outOpen = new Set();

function outGroupKey(i){
  const dedans = packOfItem(i.id);
  if(dedans) return 'p:' + dedans.id;
  const represente = packOfContainer(i.id);
  if(represente) return 'p:' + represente.id;
  return null;
}

function outGroupedHTML(rows){
  /* Un groupe n'a de sens que si plusieurs items du même pack sont
     sortis ensemble, chez la même personne. Un item isolé reste une
     ligne ordinaire — mieux vaut pas de groupe qu'un groupe d'un. */
  const paquets = new Map();
  rows.forEach(i=>{
    const k = outGroupKey(i);
    if(!k) return;
    const cle = k + '|' + outBy(i) + '|' + (i.out.reason || '');
    if(!paquets.has(cle)) paquets.set(cle, []);
    paquets.get(cle).push(i);
  });
  const groupés = new Map();
  for(const [cle, lst] of paquets) if(lst.length > 1) groupés.set(cle, lst);
  const dansUnGroupe = new Set();
  groupés.forEach(l=>l.forEach(i=>dansUnGroupe.add(i.id)));

  let html = `<table><thead><tr>
    <th>Item</th><th>Borrower</th><th>Since</th><th>Duration</th>
    <th>Due back</th><th>Destination / reason</th><th></th>
  </tr></thead><tbody>`;

  const faits = new Set();
  rows.forEach(i=>{
    if(faits.has(i.id)) return;
    const cle = (outGroupKey(i) || '') + '|' + outBy(i) + '|' + (i.out.reason || '');
    const grp = groupés.get(cle);
    if(grp && dansUnGroupe.has(i.id)){
      grp.forEach(x=>faits.add(x.id));
      html += outPackRow(cle, grp);
      if(outOpen.has(cle)) grp.forEach(x=>{ html += outRow(x, true); });
    }else{
      faits.add(i.id);
      html += outRow(i, false);
    }
  });
  return html + '</tbody></table>';
}

function outPackRow(cle, lst){
  const p = pack(cle.split('|')[0].slice(2));
  const i0 = lst[0];
  const d = daysSince(i0.out.date);
  const poids = lst.reduce((t,x)=>t + (x.weight_g||0), 0);
  const ouvert = outOpen.has(cle);
  const ids = lst.map(x=>x.id);
  return `<tr class="outpack" onclick="toggleOutPack('${esc(cle)}')">
    <td data-l="Item"><span class="chev">${ouvert?'▾':'▸'}</span>
      <b>${esc(p ? p.name : 'Pack')}</b>
      <span class="muted">· ${lst.length} items · ${esc(fweight(poids))}</span></td>
    <td data-l="Borrower">${esc(outBy(i0))}</td>
    <td data-l="Depuis">${fdate(i0.out.date)}</td>
    <td data-l="Duration">${d}d</td>
    <td data-l="Due back">${i0.out.due ? esc(fdateD(i0.out.due)) : '<span class="muted">—</span>'}</td>
    <td data-l="Raison">${esc(i0.out.reason||'')}</td>
    <td onclick="event.stopPropagation()">${can('checkout')
      ? `<button class="btn small ok" onclick="checkinPack('${esc(ids.join(','))}')">Check-in all</button>` : ''}</td>
  </tr>`;
}

function outRow(i, enfant){
  const d = daysSince(i.out.date), od = overdue(i);
  return `<tr class="rowlink${enfant?' childrow':''}" onclick="openDetail('${i.id}')">
    <td data-l="Item">${itemTitle(i)} <span class="mono">${i.id}</span></td>
    <td data-l="Borrower">${enfant ? '' : esc(outBy(i))}</td>
    <td data-l="Depuis">${enfant ? '' : fdate(i.out.date)}</td>
    <td data-l="Duration"><span class="${(!i.out.due && d>=ALERT_DAYS)?'days-late':''}">${d}d</span></td>
    <td data-l="Due back">${i.out.due?`<span class="${od?'days-late':''}">${fdateD(i.out.due)}${od?' ⚠️':''}</span>`:'<span class="muted">—</span>'}</td>
    <td data-l="Raison">${enfant ? '' : esc(i.out.reason)}</td>
    <td onclick="event.stopPropagation()">${outForRepair(i)
      ? `<button class="btn small" onclick="openReceive('${i.out.repairId}')"
           data-tip="Coming back from a repair goes through the return check.">Receive</button>`
      : `<button class="btn small ok" onclick="openCheckin('${i.id}')">Check-in</button>`}</td>
  </tr>`;
}

function toggleOutPack(cle){
  if(outOpen.has(cle)) outOpen.delete(cle); else outOpen.add(cle);
  renderOutList();
}

/* Rentrer une caisse entière : un geste au lieu de cinq. */
function checkinPack(idsCsv){
  const ids = idsCsv.split(',').filter(Boolean);
  const items = ids.map(item).filter(i=>i && i.status === 'sorti');
  if(!items.length) return;
  /* Un item revenant de réparation passe par la clôture de l'incident :
     on ne le mélange pas à un retour ordinaire. */
  const répar = items.filter(outForRepair);
  if(répar.length === items.length){ openReceive(items[0].out.repairId); return; }
  sel = new Set(items.filter(i=>!outForRepair(i)).map(i=>i.id));
  if(répar.length) toast(`${répar.length} item(s) come back through the repair check.`, 'info');
  openBulkCheckin();
}
