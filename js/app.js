/* ============================================================
   APP — navigation, modales, export/import, démarrage
   ============================================================ */

/* Version affichée dans l'en-tête : permet de vérifier d'un coup d'œil
   quelle version est réellement en ligne après une mise à jour. */
const APP_VERSION = '1.22.3';

/* ---- navigation entre onglets ---- */
const VIEWS = ['dash','inv','people','proj','out','packs','rep','settings'];
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
  syncStickyOffset();
  try{ window.scrollTo(0,0); }catch(e){}
  render();
}

/* Le tableau d'inventaire remplit la hauteur restante de l'écran et
   défile dans son propre cadre, comme un tableur. C'est ce qui permet
   aux en-têtes de coller : `position: sticky` se cale sur le conteneur
   qui défile, et il faut donc que ce conteneur ait une hauteur bornée.
   Elle dépend de tout ce qui le précède (en-tête, navigation, filtres),
   dont la hauteur change avec la largeur de la fenêtre : on la mesure
   plutôt que de la deviner. */
function syncInvHeight(){
  const w = document.querySelector('#invList .invwrap');
  if(!w) return;
  const haut = w.getBoundingClientRect().top;
  const dispo = window.innerHeight - haut - 20;   // marge pour la barre de sélection
  w.style.maxHeight = Math.max(260, Math.round(dispo)) + 'px';
}
function syncStickyOffset(){ syncInvHeight(); }   // ancien nom, conservé
window.addEventListener('resize', syncInvHeight);
window.addEventListener('load', syncInvHeight);

/* Franchir le seuil téléphone / bureau change de rendu : on redessine.
   On n'écoute pas « resize », qui se déclenche en continu — seulement
   le changement d'état de la requête média. */
try{
  const mq = window.matchMedia('(max-width:700px)');
  const relire = ()=>{ if(curView() === 'inv') renderInv(); };
  if(mq.addEventListener) mq.addEventListener('change', relire);
  else if(mq.addListener) mq.addListener(relire);
}catch(e){}

/* ============================================================
   INFOBULLES
   Les infobulles natives du navigateur (attribut title) mettent une
   seconde à venir et n'existent pas au tactile. Celles-ci répondent
   tout de suite à la souris et à l'appui long — c'est ce qui les
   rend utiles sur la tablette, cible principale du projet.
   ============================================================ */
let tipTimer = null;
function showTip(el){
  const txt = el.getAttribute('data-tip');
  if(!txt) return;
  let t = document.getElementById('tipbox');
  if(!t){
    t = document.createElement('div');
    t.id = 'tipbox';
    document.body.appendChild(t);
  }
  t.textContent = txt;
  t.classList.add('on');
  const r = el.getBoundingClientRect();
  const w = t.offsetWidth, h = t.offsetHeight;
  // On place au-dessus si le bas manque de place, et on borne les côtés.
  const bas = r.bottom + 8 + h < window.innerHeight;
  t.style.top  = Math.round(bas ? r.bottom + 8 : r.top - h - 8) + 'px';
  t.style.left = Math.round(Math.min(Math.max(8, r.left + r.width/2 - w/2),
                                     window.innerWidth - w - 8)) + 'px';
}
function hideTip(){
  clearTimeout(tipTimer);
  const t = document.getElementById('tipbox');
  if(t) t.classList.remove('on');
}
document.addEventListener('mouseover', e=>{
  const el = e.target.closest('[data-tip]');
  if(el) showTip(el); else hideTip();
});
document.addEventListener('mouseout', e=>{ if(e.target.closest('[data-tip]')) hideTip(); });
document.addEventListener('touchstart', e=>{
  const el = e.target.closest('[data-tip]');
  if(!el) return;
  clearTimeout(tipTimer);
  // Appui long : 450 ms, sans empêcher le geste normal.
  tipTimer = setTimeout(()=>showTip(el), 450);
}, {passive:true});
document.addEventListener('touchend', hideTip, {passive:true});
document.addEventListener('scroll', hideTip, {passive:true, capture:true});
function curView(){ const b = document.querySelector('nav button.active'); return b?b.dataset.v:'dash'; }
function render(){
  if(typeof updateTrashBadge==='function') updateTrashBadge();
  const v = curView();
  if(v==='dash') renderDash();
  if(v==='inv'){ fillFilters(); renderInv(); }
  if(v==='proj') renderProj();
  if(v==='out') renderOut();
  if(v==='packs') renderPacks();
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
function close_(id){
  // Refermer la fenêtre de sortie annule l'autorisation donnée pour du
  // matériel abîmé : elle ne vaut que pour l'opération en cours.
  if(id === 'ovOut' && typeof allowDamaged !== 'undefined') allowDamaged = false;
  document.getElementById(id).classList.remove('open','stacked');
}
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
async function exportJSON(){
  /* On relit la base plutôt que d'exporter ce qui est à l'écran :
     l'affichage se limite aux 1 000 dernières lignes d'historique, et
     la sauvegarde héritait de ce plafond sans le dire. */
  const out = {...db, items:[...db.items, ...db.trash]};
  delete out.trash; delete out.trashSupported; delete out.projectsError;
  delete out.repairsSupported; delete out.packsSupported;
  delete out.packExtrasSupported;
  try{
    toast('Reading the full history…', 'info');
    const [hist, items] = await Promise.all([
      apiFetchAll('history', 'date'),
      apiFetchAll('items', 'id')
    ]);
    out.history = hist.map(h=>({itemId:h.item_id, type:h.type, date:h.date,
      userId:h.user_id, detail:h.detail, cond:h.cond, actorName:h.actor_name||null}));
    out.items = items;
  }catch(e){
    toast('Could not read everything — export cancelled: ' + (e.message||e), 'error');
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));
  a.download = 'afm-inventory-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  toast(`Exported — ${out.items.length} items, ${out.history.length} history entries.`,
        'ok', null, null, 6000);
}
/* Accepte deux formats :
   — l'export du bouton « Exporter » de l'application (users, itemId, userId)
   — les fichiers de sauvegarde automatique, issus de la base (people, item_id, user_id) */
function normalizeImport(d){
  const users = d.users || d.people || [];

  /* Les emplacements ont gagné des colonnes en v1.11 et v1.12 (type,
     adresse détaillée, archivage). Une restauration doit les rendre :
     sans ça on récupère un inventaire complet mais des lieux nus.
     `address` est l'ancien champ libre, encore présent dans les
     sauvegardes antérieures à la migration 013. */
  const locations = (d.locations||[]).map(l=>{
    if(typeof l === 'string') return {name:l, parent:null, kind:'site'};
    return {
      name: l.name,
      parent: l.parent || null,
      kind: l.kind || (l.parent ? 'room' : 'site'),
      street: l.street || l.address || null,
      zip: l.zip || null,
      city: l.city || null,
      extra: l.extra || null,
      phone: l.phone || null,
      archived: !!l.archived
    };
  }).filter(l=>l.name);

  const history = (d.history||[]).map(h=>({
    itemId: h.itemId || h.item_id,
    type: h.type,
    date: h.date,
    detail: h.detail||"",
    userId: h.userId || h.user_id || null,
    cond: h.cond || null,
    // Qui a fait quoi : sans ce champ, l'historique restauré devient anonyme.
    actorName: h.actorName || h.actor_name || null
  })).filter(h=>h.itemId && h.type);

  /* Réparations et prestataires (v1.17). Les oublier ici rendrait une
     restauration silencieusement incomplète : l'inventaire reviendrait
     entier, mais sans aucun historique de panne — et sans les photos
     qui documentent l'état au départ. C'est la même omission qu'en
     v1.12.2, sur une autre table. */
  const providers = (d.providers || d.repair_providers || []).filter(p=>p && p.name);
  const asList = v => Array.isArray(v) ? v : (v ? [v] : []);
  const repairs = (d.repairs||[]).map(r=>({
    id: r.id, item_id: r.item_id || r.itemId,
    fault: r.fault || 'other', description: r.description || null,
    cond_at_open: r.cond_at_open || null,
    // `photo_open` au singulier : sauvegardes antérieures à la v1.18.
    photos_open: asList(r.photos_open || r.photo_open),
    opened_at: r.opened_at || null, opened_by: r.opened_by || null,
    opened_by_name: r.opened_by_name || null,
    provider_id: r.provider_id || null, tracking_ref: r.tracking_ref || null,
    sent_at: r.sent_at || null, received_at: r.received_at || null,
    outcome: r.outcome || null, work_done: r.work_done || null,
    photos_return: asList(r.photos_return || r.photo_return),
    cost: r.cost ?? null, under_warranty: r.under_warranty ?? null,
    closed_at: r.closed_at || null, closed_by: r.closed_by || null,
    destination: r.destination || null, status: r.status || 'open'
  })).filter(r=>r.item_id && r.id);

  /* Packs (v1.20). Même piège qu'en v1.12.2 et v1.18 : sans ces deux
     lignes, une restauration rendrait l'inventaire entier mais aurait
     oublié comment il était rangé. */
  const packs = (d.packs||[]).filter(p=>p && p.id && p.name).map(p=>({
    id:p.id, name:p.name, notes:p.notes||null,
    container_id:p.container_id||null, archived:!!p.archived,
    // v1.22 : monté en permanence, ou simple configuration.
    permanent: !!p.permanent
  }));
  const packItems = (d.packItems || d.pack_items || [])
    .map(l=>({pack_id:l.pack_id, item_id:l.item_id}))
    .filter(l=>l.pack_id && l.item_id);
  /* Les consommables (v1.22). Sans cette ligne, une caisse restaurée
     reviendrait sans son gaffer ni ses piles — la quatrième fois que
     l'on oublie une table à la restauration, après les photos, les
     réparations et les packs. */
  const packExtras = (d.packExtras || d.pack_extras || [])
    .map(e=>({id:e.id, pack_id:e.pack_id, label:e.label,
              qty:e.qty||1, pos:e.pos||0}))
    .filter(e=>e.id && e.pack_id && e.label);

  return {items:d.items||[], users, locations, history, projects:d.projects||[],
          repairs, providers, packs, packItems, packExtras};
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
    if(!confirm(`Import ${d.items.length} item(s), ${d.users.length} borrower(s), ${d.projects.length} project(s), ${d.repairs.length} repair record(s) and ${d.history.length} history entries?\n\nExisting items with the same ID will be overwritten.`)){ inp.value=""; return; }
    try{
      if(d.locations.length) await apiUpsertLocations(d.locations);
      if(d.users.length) await apiUpsertPeople(d.users);
      if(d.items.length) await apiUpsertItems(d.items.map(i=>({
        id:i.id,name:i.name,cat:i.cat||'divers',subcat:i.subcat||'autre',brand:i.brand||"",serial:i.serial||"",cond:normCond(i.cond),
        notes:i.notes||"",photo:i.photo||null,owner:i.owner||"",provider:i.provider||"",price:i.price??null,sales_order:i.sales_order||"",purchase_date:i.purchase_date||null,home:i.home,loc:i.loc,status:i.status||"dispo",out:i.out||null,weight_g:i.weight_g??null,has_case:!!i.has_case,case_note:i.case_note||null,
        ...(db.trashSupported ? {deleted_at:i.deleted_at||null} : {})
      })));
      if(d.packs.length) await apiUpsertPacks(d.packs);
      if(d.packItems.length) await apiUpsertPackItems(d.packItems);
      if(d.packExtras.length) await apiUpsertPackExtras(d.packExtras);
      if(d.providers.length) await apiUpsertProviders(d.providers);
      if(d.repairs.length)   await apiUpsertRepairs(d.repairs);
      if(d.projects.length) await apiUpsertProjects(d.projects.map(p=>({
        id:p.id,name:p.name,description:p.description||"",status:p.status||'inactif',
        item_ids:p.item_ids||[],prep:p.prep||{},last_used:p.last_used||null,
        // v1.22 : les caisses du projet, et le contenu figé au départ.
        pack_ids:p.pack_ids||[],snapshot:p.snapshot||null,
        // Destination, dates et archivage : ajoutés en v1.11, ils étaient
        // perdus à la restauration jusqu'ici.
        loc_name:p.loc_name||null,starts_on:p.starts_on||null,
        ends_on:p.ends_on||null,archived:!!p.archived
      })));
      let histInfo = null;
      if(d.history.length) histInfo = await apiInsertHistoryRows(d.history.map(h=>({
        item_id:h.itemId,type:h.type,date:h.date,detail:h.detail,user_id:h.userId,
        cond:h.cond?normCond(h.cond):null,actor_name:h.actorName||null
      })));
      await loadAll(); render();
      toast(`Import complete — ${d.items.length} item(s) restored` +
            (histInfo && histInfo.ignorées
              ? `, ${histInfo.ignorées} history entries already present`
              : '') + '.', 'ok', null, null, 6000);
    }catch(err){ /* l'erreur est déjà signalée par run() */ }
    inp.value = "";
  };
  r.readAsText(f);
}

/* ============================================================
   NOUVELLE VERSION EN LIGNE

   Le `?v=` sur les scripts protège les scripts, mais rien ne protège
   `index.html` lui-même : un navigateur qui le garde en cache réclame
   les anciennes adresses, qu'il a aussi en cache, et reste sur une
   version périmée sans qu'une seule requête n'atteigne le serveur.
   Seul un rechargement forcé en sort — et personne n'y pense.

   On relit donc `index.html` sans cache et on y lit la version que le
   serveur annonce. Pas de fichier de version à maintenir à côté :
   index.html porte déjà le numéro dans ses balises, et une source
   unique ne peut pas se désynchroniser.
   ============================================================ */
const VERSION_CHECK_MS = 20 * 60 * 1000;
let versionSignalée = null;

async function checkVersion(){
  try{
    const r = await fetch('index.html?_=' + Date.now(), {cache: 'no-store'});
    if(!r.ok) return;
    const m = (await r.text()).match(/js\/app\.js\?v=([\d.]+)/);
    if(!m) return;
    const enLigne = m[1];
    if(enLigne !== APP_VERSION && enLigne !== versionSignalée){
      versionSignalée = enLigne;
      showUpdateBanner(enLigne);
    }
  }catch(e){ /* hors ligne : rien à signaler */ }
}

function showUpdateBanner(v){
  if(document.getElementById('updbar')) return;
  const b = document.createElement('div');
  b.id = 'updbar';
  b.innerHTML = `<span>Version <b></b> is online — you are running ${APP_VERSION}.</span>
    <button class="btn small" id="updgo">Reload</button>
    <button class="cl" id="updno" aria-label="Dismiss">✕</button>`;
  b.querySelector('b').textContent = v;
  document.body.appendChild(b);
  b.querySelector('#updgo').onclick = reloadFresh;
  b.querySelector('#updno').onclick = ()=>b.remove();
}

/* Un rechargement ordinaire peut resservir le même index.html caché.
   Une adresse jamais vue, elle, force une vraie requête. */
function reloadFresh(){
  const u = new URL(location.href);
  u.searchParams.set('_r', Date.now());
  location.replace(u.toString());
}

/* …et on efface aussitôt le paramètre, pour ne pas le laisser traîner
   dans une adresse que quelqu'un mettrait en favori. */
try{
  if(new URL(location.href).searchParams.has('_r')){
    const u = new URL(location.href);
    u.searchParams.delete('_r');
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  }
}catch(e){}

setTimeout(checkVersion, 4000);
setInterval(checkVersion, VERSION_CHECK_MS);
/* Au retour sur l'onglet : c'est le moment où une version a pu sortir
   pendant qu'on faisait autre chose. */
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) checkVersion(); });

/* ---- textes configurables + démarrage ---- */
function applyLabels(){
  document.title = LABELS.appTitle;
  document.querySelector('header h1').textContent = LABELS.appTitle;
  const v = document.getElementById('appVersion');
  if(v){ v.textContent = 'v' + APP_VERSION; v.title = 'Version currently online'; }
  document.querySelectorAll('nav button').forEach(b=>{ if(LABELS.nav[b.dataset.v]) b.textContent = LABELS.nav[b.dataset.v]; });
}
applyLabels();
init();
