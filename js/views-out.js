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
   REGROUPEMENT PAR PACK (v1.21, arborescent en v1.22.2)

   Cinq lignes indépendantes alors qu'une caisse entière est partie,
   ça n'apprend rien : on relit le même emprunteur et la même
   destination cinq fois, et on clique cinq fois pour la rentrer.

   Mais un regroupement à plat ment lui aussi. La LEASH SQ5+ Kit et le
   SQ5+ s'affichaient côte à côte comme deux caisses parties
   séparément, alors que la seconde est DANS la première. Les autres
   onglets montrent l'imbrication ; celui-ci doit la montrer aussi,
   sans quoi l'application raconte deux rangements différents selon
   l'écran qu'on regarde.
   ============================================================ */
let outOpen = new Set();

/* Le pack auquel rattacher un item sorti. Un item peut appartenir à
   plusieurs recettes depuis la v1.22 : on retient celle dont le plus
   d'éléments sont partis en même temps — c'est celle qu'on a
   réellement chargée. */
function outPackOf(i, compte){
  const siens = packsOfItem(i.id);
  if(siens.length){
    if(!compte) return packOfItem(i.id) || siens[0];
    return siens.slice().sort((a,b)=>
      (compte.get(b.id)||0) - (compte.get(a.id)||0) ||
      a.name.localeCompare(b.name,'fr'))[0];
  }
  return packOfContainer(i.id);
}

function outGroupedHTML(rows){
  /* Une « sortie » : même emprunteur, même destination. C'est à
     l'intérieur d'une sortie que l'arborescence a un sens — deux
     caisses parties à deux endroits ne s'emboîtent pas. */
  const sorties = new Map();
  rows.forEach(i=>{
    const k = outBy(i) + '|' + (i.out.reason || '');
    if(!sorties.has(k)) sorties.set(k, []);
    sorties.get(k).push(i);
  });

  let html = `<table><thead><tr>
    <th>Item</th><th>Borrower</th><th>Since</th><th>Duration</th>
    <th>Due back</th><th>Destination / reason</th><th></th>
  </tr></thead><tbody>`;

  const vues = new Set();
  rows.forEach(i=>{
    const k = outBy(i) + '|' + (i.out.reason || '');
    if(vues.has(k)) return;
    vues.add(k);
    html += outSortieHTML(k, sorties.get(k));
  });
  return html + '</tbody></table>';
}

function outSortieHTML(k, lst){
  const compte = new Map();
  lst.forEach(i=>packsOfItem(i.id).forEach(p=>compte.set(p.id, (compte.get(p.id)||0) + 1)));

  const parPack = new Map();     // packId → items sortis qui en font partie
  const seuls = [];
  lst.forEach(i=>{
    const p = outPackOf(i, compte);
    if(!p) return seuls.push(i);
    if(!parPack.has(p.id)) parPack.set(p.id, []);
    parPack.get(p.id).push(i);
  });

  const présents = new Set(parPack.keys());
  const enfantsDe = id => [...présents].filter(x=>
    packParents(pack(x)).some(par=>par.id === id));
  /* Racine : un pack dont aucun parent n'est parti avec lui. */
  const racines = [...présents].filter(id=>
    !packParents(pack(id)).some(par=>présents.has(par.id)));

  /* Tout ce que porte une branche, imbriqués compris : c'est ce
     compte-là et ce poids-là qu'on lit sur la ligne du haut. */
  const sousArbre = (id, vus) => {
    vus = vus || new Set();
    if(vus.has(id)) return [];
    vus.add(id);
    let out = (parPack.get(id) || []).slice();
    enfantsDe(id).forEach(e=>{ out = out.concat(sousArbre(e, vus)); });
    return out;
  };

  let html = '';
  const rendus = new Set();
  const branche = (id, niveau, vus) => {
    vus = vus || new Set();
    if(vus.has(id)) return '';
    vus.add(id);
    const propres = parPack.get(id) || [];
    const enfants = enfantsDe(id);
    const tout = sousArbre(id);
    tout.forEach(x=>rendus.add(x.id));

    /* À la racine, un groupe d'un seul élément n'est pas un groupe :
       on montre la ligne de l'objet. Plus bas, en revanche, la caisse
       garde sa ligne même avec un seul objet dedans — c'est elle qui
       dit l'emboîtement, et le masquer reviendrait à prétendre que
       l'objet est posé en vrac dans la caisse du dessus. */
    if(niveau === 0 && tout.length < 2 && !enfants.length){
      return propres.length ? outRow(propres[0], false, 0) : '';
    }
    const cle = 'p:' + id + '|' + k;
    let h = outPackRow(cle, pack(id), tout, niveau);
    if(outOpen.has(cle)){
      propres.forEach(x=>{ h += outRow(x, true, niveau + 1); });
      enfants.forEach(e=>{ h += branche(e, niveau + 1, new Set(vus)); });
    }
    return h;
  };

  racines.forEach(id=>{ html += branche(id, 0); });
  /* Les items qui ne relèvent d'aucune caisse, et ceux dont la caisse
     n'a pas été rendue (cycle, pack supprimé) : rien ne doit
     disparaître de la liste des sorties. */
  lst.forEach(i=>{ if(!rendus.has(i.id) && !seuls.includes(i)) html += outRow(i, false, 0); });
  seuls.forEach(i=>{ html += outRow(i, false, 0); });
  return html;
}

function outPackRow(cle, p, lst, niveau){
  const i0 = lst[0];
  const d = daysSince(i0.out.date);
  const poids = lst.reduce((t,x)=>t + (x.weight_g||0), 0);
  const ouvert = outOpen.has(cle);
  const ids = lst.map(x=>x.id);
  return `<tr class="outpack" onclick="toggleOutPack('${esc(cle)}')">
    <td data-l="Item" style="padding-left:${10 + (niveau||0)*24}px">
      <span class="chev">${ouvert?'▾':'▸'}</span>
      <b>${esc(p ? p.name : 'Pack')}</b>
      <span class="muted">· ${lst.length} items · ${esc(fweight(poids))}</span></td>
    <td data-l="Borrower">${(niveau||0) ? '' : esc(outBy(i0))}</td>
    <td data-l="Depuis">${(niveau||0) ? '' : fdate(i0.out.date)}</td>
    <td data-l="Duration">${d}d</td>
    <td data-l="Due back">${i0.out.due ? esc(fdateD(i0.out.due)) : '<span class="muted">—</span>'}</td>
    <td data-l="Raison">${(niveau||0) ? '' : esc(i0.out.reason||'')}</td>
    <td onclick="event.stopPropagation()">${can('checkout')
      ? `<button class="btn small ok" onclick="checkinPack('${esc(ids.join(','))}')">Check-in all</button>` : ''}</td>
  </tr>`;
}

function outRow(i, enfant, niveau){
  const d = daysSince(i.out.date), od = overdue(i);
  return `<tr class="rowlink${enfant?' childrow':''}" onclick="openDetail('${i.id}')">
    <td data-l="Item" style="padding-left:${10 + (niveau||0)*24}px">${itemTitle(i)} <span class="mono">${i.id}</span></td>
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
