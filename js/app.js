/* ============================================================
   APP — navigation, modales, export/import, démarrage
   ============================================================ */

/* Version affichée dans l'en-tête : permet de vérifier d'un coup d'œil
   quelle version est réellement en ligne après une mise à jour. */
const APP_VERSION = '1.11.0';

/* ---- navigation entre onglets ---- */
const VIEWS = ['dash','inv','people','proj','out','rep','settings'];
function show(v){
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.v===v));
  VIEWS.forEach(x=>{ const el = document.getElementById('v-'+x); if(el) el.style.display = x===v?'':'none'; });
  const intro = document.getElementById('viewIntro');
  if(intro){
    const txt = (LABELS.intro && LABELS.intro[v]) || '';
    intro.textContent = txt;
    intro.style.display = txt ? '' : 'none';
  }
  // L'inventaire a besoin de plus de largeur que les autres vues.
  document.body.classList.toggle('wideview', v === 'inv');
  try{ window.scrollTo(0,0); }catch(e){}
  render();
}
function curView(){ const b = document.querySelector('nav button.active'); return b?b.dataset.v:'dash'; }
function render(){
  if(typeof updateTrashBadge==='function') updateTrashBadge();
  const v = curView();
  if(v==='dash') renderDash();
  if(v==='inv'){ fillFilters(); renderInv(); }
  if(v==='proj') renderProj();
  if(v==='out') renderOut();
  if(v==='rep') renderRep();
  if(v==='people') renderPeople();
  if(v==='settings') renderSettings();
  if(typeof renderBulkBar==='function' && v!=='inv') renderBulkBar();
}

/* ---- notifications (bandeau en bas d'écran) ----
   toast("message", 'ok' | 'error' | 'info', libellé bouton, action, durée) */
function toast(msg, type='info', actionLabel=null, actionFn=null, ms=null){
  let wrap = document.getElementById('toasts');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.id = 'toasts';
    document.body.appendChild(wrap);
  }
  // Un message d'erreur remplace le précédent plutôt que de s'empiler
  if(type==='error') wrap.querySelectorAll('.toast.error').forEach(t=>t.remove());

  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icon = type==='ok' ? '✓' : type==='error' ? '⚠️' : 'ⓘ';
  el.innerHTML = `<span class="ic">${icon}</span><span class="msg"></span>`;
  el.querySelector('.msg').textContent = msg;
  if(actionLabel && actionFn){
    const b = document.createElement('button');
    b.className = 'act';
    b.textContent = actionLabel;
    b.onclick = ()=>{ el.remove(); actionFn(); };
    el.appendChild(b);
  }
  const close = document.createElement('button');
  close.className = 'cl'; close.textContent = '✕';
  close.onclick = ()=>el.remove();
  el.appendChild(close);
  wrap.appendChild(el);

  const delay = ms || (type==='error' ? 10000 : 2500);
  setTimeout(()=>el.remove(), delay);
}

/* Les échecs d'écriture sont déjà signalés par une notification :
   on évite juste les avertissements bruyants dans la console. */
window.addEventListener('unhandledrejection', e=>{ console.warn('Action interrupted:', e.reason); e.preventDefault(); });

/* ---- modales ----
   Règle générale : une seule fenêtre à la fois (open_).
   Exception : les fenêtres imbriquées, comme le recadrage ouvert
   depuis le formulaire d'un item, s'empilent par-dessus (openOver). */
function close_(id){ document.getElementById(id).classList.remove('open','stacked'); }
function open_(id){
  document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open','stacked'));
  document.getElementById(id).classList.add('open');
}
function openOver(id){ document.getElementById(id).classList.add('open','stacked'); }
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{
  if(e.target!==o) return;
  if(o.id === 'ovCrop' && typeof cancelCrop === 'function') return cancelCrop();
  o.classList.remove('open','stacked');
}));

/* ---- export / import JSON ---- */
function exportJSON(){
  // On inclut les items de la corbeille (avec leur date de suppression)
  // pour que l'export soit une image complète de la base.
  const out = {...db, items:[...db.items, ...db.trash]};
  delete out.trash; delete out.trashSupported; delete out.projectsError;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));
  a.download = 'afm-inventory-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
}
/* Accepte deux formats :
   — l'export du bouton « Exporter » de l'application (users, itemId, userId)
   — les fichiers de sauvegarde automatique, issus de la base (people, item_id, user_id) */
function normalizeImport(d){
  const users = d.users || d.people || [];
  const locations = (d.locations||[]).map(l=>typeof l==='string'?{name:l,parent:null}:{name:l.name,parent:l.parent||null});
  const history = (d.history||[]).map(h=>({
    itemId: h.itemId || h.item_id,
    type: h.type,
    date: h.date,
    detail: h.detail||"",
    userId: h.userId || h.user_id || null,
    cond: h.cond || null
  })).filter(h=>h.itemId && h.type);
  return {items:d.items||[], users, locations, history, projects:d.projects||[]};
}
function importJSON(inp){
  const f = inp.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = async e=>{
    let d;
    try{
      const raw = JSON.parse(e.target.result);
      if(!raw || !Array.isArray(raw.items) || !(raw.users || raw.people)) throw 0;
      d = normalizeImport(raw);
    }catch(err){
      toast("Invalid file — this is not an inventory export.", 'error');
      inp.value = ""; return;
    }
    if(!confirm(`Import ${d.items.length} item(s), ${d.users.length} borrower(s), ${d.projects.length} project(s) and ${d.history.length} history entries?\n\nExisting items with the same ID will be overwritten.`)){ inp.value=""; return; }
    try{
      if(d.locations.length) await apiUpsertLocations(d.locations);
      if(d.users.length) await apiUpsertPeople(d.users);
      if(d.items.length) await apiUpsertItems(d.items.map(i=>({
        id:i.id,name:i.name,cat:i.cat||'divers',subcat:i.subcat||'autre',brand:i.brand||"",serial:i.serial||"",cond:normCond(i.cond),
        notes:i.notes||"",photo:i.photo||null,owner:i.owner||"",provider:i.provider||"",price:i.price??null,sales_order:i.sales_order||"",purchase_date:i.purchase_date||null,home:i.home,loc:i.loc,status:i.status||"dispo",out:i.out||null,
        ...(db.trashSupported ? {deleted_at:i.deleted_at||null} : {})
      })));
      if(d.projects.length) await apiUpsertProjects(d.projects.map(p=>({
        id:p.id,name:p.name,description:p.description||"",status:p.status||'inactif',
        item_ids:p.item_ids||[],prep:p.prep||{},last_used:p.last_used||null
      })));
      if(d.history.length) await apiInsertHistoryRows(d.history.map(h=>({
        item_id:h.itemId,type:h.type,date:h.date,detail:h.detail,user_id:h.userId,cond:h.cond?normCond(h.cond):null
      })));
      await loadAll(); render();
      toast(`Import complete — ${d.items.length} item(s) restored.`, 'ok', null, null, 5000);
    }catch(err){ /* l'erreur est déjà signalée par run() */ }
    inp.value = "";
  };
  r.readAsText(f);
}

/* ---- textes configurables + démarrage ---- */
function applyLabels(){
  document.title = LABELS.appTitle;
  document.querySelector('header h1').textContent = LABELS.appTitle;
  const v = document.getElementById('appVersion');
  if(v){ v.textContent = 'v' + APP_VERSION; v.title = 'Version en ligne'; }
  document.querySelectorAll('nav button').forEach(b=>{ if(LABELS.nav[b.dataset.v]) b.textContent = LABELS.nav[b.dataset.v]; });
}
applyLabels();
init();
