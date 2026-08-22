/* ============================================================
   VUE — Corbeille
   Un item supprimé n'est pas effacé : il reste récupérable
   pendant TRASH_DAYS jours. Accessible par le bouton 🗑 de l'en-tête.
   ============================================================ */

const TRASH_DAYS = (typeof TRASH_RETENTION_DAYS === 'number') ? TRASH_RETENTION_DAYS : 30;

function trashDaysLeft(i){ return TRASH_DAYS - daysSince(i.deleted_at); }
function trashExpired(){ return db.trash.filter(i=>trashDaysLeft(i) <= 0); }

/* Compteur discret dans l'en-tête */
function updateTrashBadge(){
  const btn = document.getElementById('trashBtn');
  if(!btn) return;
  const n = db.trash.length;
  btn.style.display = (n && (typeof can!=='function' || can('delete'))) ? '' : 'none';
  const b = document.getElementById('trashCount');
  if(b) b.textContent = n ? ' ' + n : '';
}

function openTrash(){ renderTrash(); open_('ovTrash'); }

function renderTrash(){
  const rows = db.trash.map(i=>{
    const left = trashDaysLeft(i);
    const exp = left <= 0;
    return `<tr>
      <td data-l="Item"><b>${esc(i.name)}</b> <span class="mono">${i.id}</span>
        <br><span class="muted">${CATS[i.cat]||i.cat} · supprimé le ${fdate(i.deleted_at)}</span></td>
      <td data-l="Expiration">${exp
        ? '<span class="tag hs">à purger</span>'
        : `<span class="muted">encore ${left} j</span>`}</td>
      <td style="white-space:nowrap">
        <button class="btn small ok" onclick="restoreItem('${i.id}')">Restaurer</button>
        <button class="btn small sec" onclick="purgeItem('${i.id}')">Supprimer définitivement</button>
      </td></tr>`;
  }).join("");

  const nExp = trashExpired().length;
  document.getElementById('trashBody').innerHTML = `
    <h3>🗑 Corbeille</h3>
    <p class="muted" style="margin-bottom:12px">
      Les items supprimés restent ici <b>${TRASH_DAYS} jours</b> avec tout leur historique,
      puis peuvent être purgés définitivement. Restaurer un item le remet dans l'inventaire
      à son emplacement de référence.
    </p>
    ${db.trash.length
      ? `<table><thead><tr><th>Item</th><th>Expiration</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
      : '<div class="empty">La corbeille est vide.</div>'}
    <div class="modal-actions" style="justify-content:space-between;flex-wrap:wrap">
      <span>
        ${nExp ? `<button class="btn sec small" onclick="purgeExpired()">Vider les ${nExp} expiré(s)</button> ` : ''}
        ${db.trash.length ? `<button class="btn danger small" onclick="purgeAll()">Tout supprimer définitivement</button>` : ''}
      </span>
      <button class="btn sec" onclick="close_('ovTrash')">Fermer</button>
    </div>`;
}

async function restoreItem(id){
  const i = db.trash.find(x=>x.id===id);
  if(!i) return;
  db.trash = db.trash.filter(x=>x.id!==id);
  delete i.deleted_at;
  i.status = 'dispo'; i.loc = i.home; i.out = null;
  db.items.push(i);
  db.items.sort((a,b)=>a.id.localeCompare(b.id));
  renderTrash(); updateTrashBadge(); render();
  await apiRestoreItem(id);
  await apiUpdateItem(id, {status:'dispo', loc:i.home, out:null});
  await hist(id,'edit',"restauré depuis la corbeille");
  toast(`« ${i.name} » restauré.`, 'ok');
}

async function purgeItem(id){
  const i = db.trash.find(x=>x.id===id);
  if(!i) return;
  if(!confirm(`Supprimer DÉFINITIVEMENT « ${i.name} » et tout son historique ?\n\nCette action est irréversible.`)) return;
  db.trash = db.trash.filter(x=>x.id!==id);
  db.history = db.history.filter(h=>h.itemId!==id);
  renderTrash(); updateTrashBadge();
  await apiPurgeItem(id);
}

async function purgeAll(){
  const list = [...db.trash];
  if(!list.length) return;
  if(!confirm(`Supprimer DÉFINITIVEMENT les ${list.length} item(s) de la corbeille, avec tout leur historique ?\n\nCette action est irréversible.`)) return;
  const ids = list.map(i=>i.id);
  db.trash = [];
  db.history = db.history.filter(h=>!ids.includes(h.itemId));
  renderTrash(); updateTrashBadge();
  await apiPurgeItems(ids);
  toast(`${list.length} item(s) supprimé(s) définitivement.`, 'ok');
}

async function purgeExpired(){
  const list = trashExpired();
  if(!list.length) return;
  if(!confirm(`Supprimer DÉFINITIVEMENT ${list.length} item(s) de plus de ${TRASH_DAYS} jours, avec leur historique ?\n\nCette action est irréversible.`)) return;
  for(const i of list){
    db.trash = db.trash.filter(x=>x.id!==i.id);
    db.history = db.history.filter(h=>h.itemId!==i.id);
    await apiPurgeItem(i.id);
  }
  renderTrash(); updateTrashBadge();
  toast(`${list.length} item(s) supprimé(s) définitivement.`, 'ok');
}
