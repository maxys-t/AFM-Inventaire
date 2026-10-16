/* ============================================================
   DB — état en mémoire + connexion Supabase + couche API
   RÈGLE : c'est le SEUL fichier autorisé à parler à Supabase.
   Les vues lisent l'état (db.*) et appellent les fonctions api*.
   ============================================================ */

let sb = null;
let db = {items:[],users:[],locations:[],history:[],projects:[],projectsError:false,
          repairs:[],providers:[],repairsSupported:true,
          packs:[],packItems:[],packsSupported:true,
          packExtras:[],packExtrasSupported:true,
          trash:[],trashSupported:true,profiles:[]};
let syncState = 'off';   // 'ok' | 'off' | 'error'

/* ================= CONNEXION ================= */
function getCfg(){
  if(SUPABASE_URL && SUPABASE_KEY) return {url:SUPABASE_URL,key:SUPABASE_KEY};
  try{ return JSON.parse(localStorage.getItem('sbCfg')); }catch(e){ return null; }
}
function saveCfg(){
  const url = document.getElementById('cfg-url').value.trim().replace(/\/$/,"");
  const key = document.getElementById('cfg-key').value.trim();
  if(!url || !key){ alert("Both fields are required."); return; }
  localStorage.setItem('sbCfg', JSON.stringify({url,key}));
  init();
}
function showSetup(msg){
  document.getElementById('setup').style.display = '';
  document.querySelector('main').style.display = 'none';
  document.querySelector('nav').style.display = 'none';
  if(msg) document.getElementById('setupMsg').innerHTML = '⚠️ ' + esc(msg) + '<br>Check the URL and key below.';
}
async function init(){
  /* Le type de lien se lit AVANT toute chose : la bibliothèque
     Supabase nettoie l'adresse dès qu'elle a consommé le jeton, et
     c'est ce « type » qui distingue une invitation (premier mot de
     passe) d'une réinitialisation d'un simple retour sur le site. */
  let linkType = null;
  try{
    linkType = new URLSearchParams(location.hash.replace(/^#/,'')).get('type');
  }catch(e){}
  if(linkType === 'invite' || linkType === 'recovery') pendingPasswordSetup = true;

  const cfg = getCfg();
  if(!cfg || !cfg.url || !cfg.key){ showSetup(); return; }
  sb = supabase.createClient(cfg.url, cfg.key);
  document.getElementById('setup').style.display = 'none';

  // Arrivée par QR code (…?item=CAB-003) : on retient la fiche à ouvrir.
  // Elle sera affichée après connexion, même si un lien magique passe entre-temps.
  const params = new URLSearchParams(location.search);
  if(params.get('item')){
    localStorage.setItem('pendingItem', params.get('item'));
    history.replaceState(null, '', location.pathname);
  }

  // Le lien magique renvoie sur la page avec un jeton : on laisse
  // supabase-js l'exploiter, puis on nettoie l'adresse.
  const {data:{session}} = await sb.auth.getSession();
  if(location.hash.includes('access_token')) history.replaceState(null,'',location.pathname);

  sb.auth.onAuthStateChange((event)=>{
    if(event === 'PASSWORD_RECOVERY'){ pendingPasswordSetup = true; showSetPassword(false); return; }
    if(event === 'SIGNED_IN' && !me) startSession();
    if(event === 'SIGNED_OUT'){ me = null; pendingPasswordSetup = false; showScreen('login'); }
  });

  if(!session){ showScreen('login'); return; }
  await startSession();
}

/* Une fois connecté : charger le profil, vérifier l'autorisation, démarrer */
async function startSession(){
  const {data:{session}} = await sb.auth.getSession();
  if(!session){ showScreen('login'); return; }

  // Arrivée par une invitation ou une réinitialisation : le mot de
  // passe se choisit avant d'entrer, pas après.
  if(pendingPasswordSetup){ showSetPassword(true); return; }

  me = await loadMe(session.user.id);
  if(!me){
    // Compte non inscrit par un administrateur, ou désactivé
    const em = document.getElementById('denied-mail');
    if(em) em.textContent = session.user.email || '';
    showScreen('denied');
    renderUserChip();
    return;
  }

  try{ await loadAll(); }
  catch(e){
    showScreen('login');
    const msg = document.getElementById('login-msg');
    if(msg) msg.textContent = "Cannot reach the database: " + (e.message||"");
    return;
  }

  showScreen('app');
  applyRoleUI();
  setSync('ok');
  render();
  subscribe();
  watchConnection();
  touchLastSeen();
  if(typeof consumePendingItem === 'function') consumePendingItem();
}
/* Avant la v1.17, `cond` mélangeait état physique et étape de
   réparation. Si la migration 016 n'est pas encore passée, on replie
   les anciennes valeurs sur l'état physique le plus prudent plutôt
   que d'afficher une étape qui n'existe plus. */
function normCond(c){
  if(c === 'attente' || c === 'reparation' || c === 'reparer') return 'use';
  return c || 'bon';
}
async function loadAll(){
  const [it,pe,lo,hi] = await Promise.all([
    sb.from('items').select('*').order('id'),
    sb.from('people').select('*').order('name'),
    sb.from('locations').select('*').order('name'),
    sb.from('history').select('*').order('date',{ascending:false}).limit(1000)
  ]);
  for(const r of [it,pe,lo,hi]) if(r.error) throw r.error;
  // Corbeille : les items portant une date de suppression sont mis de côté.
  // Si la colonne n'existe pas encore (migration 004 non passée), tout reste actif.
  const all = it.data.map(i=>({...i,cond:normCond(i.cond),cat:i.cat||'divers',subcat:i.subcat||'autre'}));
  db.trashSupported = all.length===0 || Object.prototype.hasOwnProperty.call(all[0],'deleted_at');
  db.trash = all.filter(i=>i.deleted_at).sort((a,b)=>new Date(b.deleted_at)-new Date(a.deleted_at));
  db.items = all.filter(i=>!i.deleted_at);
  db.users = pe.data;
  // kind/address/archived : valeurs de repli si la migration 012 n'est
  // pas encore passée, pour que l'application tourne quand même.
  db.locations = lo.data.map(l=>({
    name: l.name,
    parent: l.parent || null,
    kind: l.kind || (l.parent ? 'room' : 'site'),
    // `address` (migration 012) reste lu en secours tant que la 013
    // n'est pas passée : sinon les adresses déjà saisies disparaîtraient.
    street: l.street || l.address || '',
    zip: l.zip || '',
    city: l.city || '',
    extra: l.extra || '',
    phone: l.phone || '',
    archived: !!l.archived
  }));
  db.history = hi.data.map(h=>({itemId:h.item_id,type:h.type,date:h.date,userId:h.user_id,
                                detail:h.detail,cond:h.cond?normCond(h.cond):null,actorName:h.actor_name||null}));
  const pr = await sb.from('projects').select('*').order('created_at');
  db.projectsError = !!pr.error;
  db.projects = pr.error ? [] : pr.data.map(p=>({
    ...p, item_ids:p.item_ids||[], prep:p.prep||{},
    /* pack_ids et snapshot n'existent qu'après la 024 : on les
       normalise ici pour que le reste du code n'ait jamais à se
       demander si la migration est passée. */
    pack_ids:p.pack_ids||[], snapshot:p.snapshot||null, subs:p.subs||{},
    placements:p.placements||{},
    loc_name:p.loc_name||'', starts_on:p.starts_on||null, ends_on:p.ends_on||null,
    archived: !!p.archived
  }));

  const pf = await sb.from('profiles').select('*').order('email');
  db.profiles = pf.error ? [] : pf.data;

  /* Réparations et prestataires (migration 016). Tolérants à son
     absence : sans eux l'application tourne, l'onglet Repairs est
     simplement vide. Un écran en moins vaut mieux qu'un écran blanc. */
  const [rp, pv] = await Promise.all([
    sb.from('repairs').select('*').order('opened_at',{ascending:false}),
    sb.from('repair_providers').select('*').order('name')
  ]);
  /* Packs (migration 019). Tolérant à son absence, comme les
     réparations : sans eux l'onglet est vide, l'app tourne. */
  const [pk, pit, pex] = await Promise.all([
    sb.from('packs').select('*').order('name'),
    sb.from('pack_items').select('*'),
    sb.from('pack_extras').select('*').order('pos')
  ]);
  db.packsSupported = !pk.error;
  db.packs = pk.error ? [] : pk.data.map(p=>({...p, permanent: !!p.permanent}));
  db.packItems = pit.error ? [] : pit.data;
  /* Les consommables datent de la 024 : leur absence ne doit pas
     vider l'onglet Packs, elle doit juste ne rien afficher. */
  db.packExtrasSupported = !pex.error;
  db.packExtras = pex.error ? [] : pex.data;

  db.repairsSupported = !rp.error;
  db.repairs = rp.error ? [] : rp.data.map(r=>({...r, item_id:r.item_id}));
  db.providers = pv.error ? [] : pv.data;

  // Préférences d'affichage : une seule fois par session, sans bloquer
  // le chargement si la migration 011 n'est pas encore passée.
  if(typeof loadPrefsRemote === 'function') await loadPrefsRemote();
}

/* --- Préférences d'affichage (table user_prefs) ---
   Volontairement hors de run() : un échec ici ne doit ni afficher
   d'erreur ni marquer la synchronisation en défaut. Perdre un
   réglage de colonne n'est pas un incident. */
async function apiLoadPrefs(){
  if(!sb) return null;
  const {data:{user}} = await sb.auth.getUser();
  if(!user) return null;
  const r = await sb.from('user_prefs').select('prefs').eq('user_id', user.id).maybeSingle();
  if(r.error || !r.data) return null;
  return r.data.prefs;
}
async function apiSavePrefs(p){
  if(!sb) return;
  const {data:{user}} = await sb.auth.getUser();
  if(!user) return;
  await sb.from('user_prefs').upsert({
    user_id: user.id, prefs: p, updated_at: new Date().toISOString()
  });
}
async function refresh(){
  if(!sb) return false;
  try{ await loadAll(); render(); setSync('ok'); return true; }
  catch(e){ setSync(navigator.onLine === false ? 'off' : 'error'); return false; }
}
/* On s'abonne table par table, et non à tout le schéma : sinon
   le moindre enregistrement de préférence d'affichage déclencherait
   un rechargement complet de l'inventaire à chaque case cochée. */
const SYNC_TABLES = ['items','people','locations','history','projects','profiles',
                     'repairs','repair_providers','packs','pack_items','pack_extras'];
function subscribe(){
  let t = null;
  try{
    const ch = sb.channel('inv-sync');
    SYNC_TABLES.forEach(tb=>{
      ch.on('postgres_changes',{event:'*',schema:'public',table:tb},()=>{
        clearTimeout(t); t = setTimeout(refresh, 400);
      });
    });
    ch.subscribe();
  }catch(e){}
}

/* ================= ÉTAT DE LA SYNCHRONISATION =================
   Objectif : ne jamais laisser croire qu'une action est enregistrée
   alors qu'elle a échoué (wifi capricieux en tournée, par exemple). */

function setSync(state){
  syncState = state;
  const dot = document.getElementById('syncdot');
  if(!dot) return;
  dot.classList.toggle('on', state==='ok');
  dot.classList.toggle('off', state!=='ok');
  dot.title = state==='ok' ? "Connected — data in sync"
            : state==='off' ? "Offline — changes are not being saved"
            : "Sync problem — reload the page";
}

/* Un enregistrement réussi : confirmation discrète et groupée
   (une seule notification même si l'action a écrit plusieurs fois). */
let okTimer = null;
function markSynced(){
  setSync('ok');
  clearTimeout(okTimer);
  okTimer = setTimeout(()=>{ if(typeof toast==='function') toast("Saved", 'ok'); }, 350);
}

function isNetworkError(e){
  if(navigator.onLine === false) return true;
  const m = ((e && (e.message||e.msg)) || '').toLowerCase();
  return m.includes('fetch') || m.includes('network') || m.includes('timeout') || m.includes('connexion');
}
function handleWriteError(e){
  clearTimeout(okTimer);                       // surtout pas de "Enregistré" après un échec
  const network = isNetworkError(e);
  setSync(network ? 'off' : 'error');
  const msg = network
    ? "No connection — the change was NOT saved."
    : "Rejected by the database: " + ((e && e.message) || "unknown error");
  if(typeof toast==='function'){
    toast(msg, 'error', "Recharger", async ()=>{ await refresh(); });
  }else{
    alert(msg);
  }
  // L'état affiché peut diverger de la base : on tente de se resynchroniser.
  setTimeout(()=>{ if(navigator.onLine !== false) refresh(); }, 1200);
}

/* Point de passage unique de TOUTES les écritures. */
async function run(promise){
  let res;
  try{ res = await promise; }
  catch(e){ handleWriteError(e); throw e; }
  if(res && res.error){ handleWriteError(res.error); throw res.error; }
  markSynced();
  return res;
}

/* Surveillance de la connexion du navigateur */
function watchConnection(){
  window.addEventListener('offline', ()=>{
    setSync('off');
    if(typeof toast==='function') toast("Connection lost — avoid making changes until it is back.", 'error', null, null, 8000);
  });
  window.addEventListener('online', async ()=>{
    if(typeof toast==='function') toast("Connection restored — refreshing…", 'info');
    await refresh();
  });
  if(navigator.onLine === false) setSync('off');
}

/* ================= LECTURES (état en mémoire) ================= */
function item(id){ return db.items.find(i=>i.id===id); }
function project(id){ return db.projects.find(p=>p.id===id); }
function userName(id){ const u = db.users.find(u=>u.id===id); return u?u.name:"?"; }
function outBy(i){
  /* Un atelier n'est pas un emprunteur : il n'a ni échéance ni
     responsabilité d'usage. On le nomme, sans le compter comme tel. */
  if(i.out && i.out.repairId) return "🔧 " + (i.out.reason || "Repair shop");
  if(i.out && i.out.projectId){ const p = project(i.out.projectId); return "🎪 " + (p?p.name:"Project"); }
  return i.out ? userName(i.out.userId) : "";
}
function outForRepair(i){ return !!(i.out && i.out.repairId); }
/* Ce qui part réellement : les caisses résolues et les items isolés,
   sans doublon. Le détail est dans helpers.js (projContent), parce
   qu'il dépend des packs. Ces deux fonctions restent le point
   d'entrée simple, utilisé partout depuis la v1.11. */
function projItems(p){ return projContent(p).items; }
function projProgress(p){
  const c = projContent(p);
  const clés = c.items.map(i=>i.id).concat(c.extras.map(e=>e.key));
  return {done: clés.filter(k=>p.prep && p.prep[k]).length, total: clés.length};
}

/* ================= HISTORIQUE ================= */
/* Écriture groupée de l'historique (une seule requête pour tout un lot) */
async function histMany(rows){
  if(!rows.length) return;
  const actorName = me ? (me.name || me.email) : null;
  const date = now();
  const local = rows.map(r=>({itemId:r.itemId,type:r.type,date,detail:r.detail||"",
                              userId:r.userId||null,cond:r.cond||null,actorName}));
  local.forEach(h=>db.history.unshift(h));
  await run(sb.from('history').insert(local.map(h=>({
    item_id:h.itemId,type:h.type,date:h.date,detail:h.detail,user_id:h.userId,
    cond:h.cond,actor_id:me?me.user_id:null,actor_name:actorName
  }))));
}

async function hist(itemId,type,detail,userId,cond){
  const actorName = me ? (me.name || me.email) : null;
  const h = {itemId,type,date:now(),detail:detail||"",userId:userId||null,cond:cond||null,actorName};
  db.history.unshift(h);
  await run(sb.from('history').insert({item_id:itemId,type,date:h.date,detail:h.detail,
    user_id:h.userId,cond:h.cond,actor_id:me?me.user_id:null,actor_name:actorName}));
}

/* ================= API — ÉCRITURES =================
   Toutes les modifications de la base passent par ici. */

/* --- items --- */
async function apiInsertItems(rows){ await run(sb.from('items').insert(rows)); }
async function apiUpdateItem(id, fields){ await run(sb.from('items').update(fields).eq('id', id)); }

/* Corbeille : l'item est marqué supprimé, son historique est conservé. */
async function apiTrashItem(id){ await run(sb.from('items').update({deleted_at:now()}).eq('id', id)); }
async function apiRestoreItem(id){ await run(sb.from('items').update({deleted_at:null}).eq('id', id)); }

/* Suppression définitive (item + historique) — irréversible. */
async function apiPurgeItem(id){
  await run(sb.from('history').delete().eq('item_id', id));
  await run(sb.from('items').delete().eq('id', id));
}

/* --- opérations groupées (une requête pour tout un lot) --- */
/* ---- photos : fichiers dans le stockage Supabase ----
   La fiche ne garde qu'un lien, pas l'image elle-même : la liste
   reste légère même avec des centaines de photos. */
const PHOTO_BUCKET = 'item-photos';

function dataUrlToBlob(d){
  const [head, b64] = d.split(',');
  const mime = (head.match(/:(.*?);/) || [,'image/jpeg'])[1];
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], {type:mime});
}

/* Envoie une image (data URL) et renvoie son adresse publique. */
async function apiUploadPhoto(dataUrl, path){
  const blob = dataUrlToBlob(dataUrl);
  const { error } = await sb.storage.from(PHOTO_BUCKET)
    .upload(path, blob, {upsert:true, contentType:blob.type, cacheControl:'3600'});
  if(error){
    toast("Could not upload the photo: " + (error.message||error), 'error');
    throw error;
  }
  const { data } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl + '?v=' + Date.now();      // évite l'image en cache après remplacement
}

async function apiUpdateItemsIn(ids, fields){
  if(!ids.length) return;
  await run(sb.from('items').update(fields).in('id', ids));
}
async function apiPurgeItems(ids){
  if(!ids.length) return;
  await run(sb.from('history').delete().in('item_id', ids));
  await run(sb.from('items').delete().in('id', ids));
}

/* --- personnes --- */
async function apiInsertPerson(u){ await run(sb.from('people').insert(u)); }
async function apiDeletePerson(id){ await run(sb.from('people').delete().eq('id', id)); }

/* --- emplacements --- */
async function apiInsertLocation(l){ await run(sb.from('locations').insert(l)); }
async function apiUpdateLocation(name, fields){ await run(sb.from('locations').update(fields).eq('name', name)); }
async function apiDeleteLocation(name){ await run(sb.from('locations').delete().eq('name', name)); }

/* --- projets --- */
async function apiInsertProject(p){ await run(sb.from('projects').insert(p)); }
async function apiUpdateProject(id, fields){ await run(sb.from('projects').update(fields).eq('id', id)); }
async function apiDeleteProject(id){ await run(sb.from('projects').delete().eq('id', id)); }

/* --- comptes (réservé aux administrateurs par les règles de la base) --- */
/* ---------------- Réparations (v1.17) ----------------
   Le dossier est la source de vérité de l'étape ; items.cond ne
   porte plus que l'état physique. Les deux ne sont écrits ensemble
   que lorsque l'état physique change vraiment. */
async function apiOpenRepair(row){
  const {data,error} = await sb.from('repairs').insert(row).select().single();
  if(error) throw error;
  return data;
}
async function apiUpdateRepair(id, fields){
  await run(sb.from('repairs').update(fields).eq('id', id));
}
async function apiDeleteRepair(id){ await run(sb.from('repairs').delete().eq('id', id)); }

async function apiInsertProvider(p){ await run(sb.from('repair_providers').insert(p)); }
async function apiUpdateProvider(id, fields){
  await run(sb.from('repair_providers').update(fields).eq('id', id));
}
async function apiDeleteProvider(id){
  await run(sb.from('repair_providers').delete().eq('id', id));
}

async function apiInsertProfile(p){ await run(sb.from('profiles').insert(p)); }
async function apiUpdateProfile(id, fields){ await run(sb.from('profiles').update(fields).eq('id', id)); }
async function apiDeleteProfile(id){ await run(sb.from('profiles').delete().eq('id', id)); }

/* --- import JSON (upserts en masse) --- */
async function apiUpsertLocations(rows){ await run(sb.from('locations').upsert(rows)); }
async function apiUpsertPeople(rows){ await run(sb.from('people').upsert(rows)); }
async function apiUpsertItems(rows){ await run(sb.from('items').upsert(rows)); }
async function apiUpsertProjects(rows){ await run(sb.from('projects').upsert(rows)); }
/* ---------------- Packs (v1.20) ---------------- */
async function apiInsertPack(p){
  const {data,error} = await sb.from('packs').insert(p).select().single();
  if(error) throw error;
  return data;
}
async function apiUpdatePack(id, f){ await run(sb.from('packs').update(f).eq('id', id)); }
async function apiDeletePack(id){ await run(sb.from('packs').delete().eq('id', id)); }

/* L'appartenance. L'erreur de boucle vient du déclencheur de la base :
   on la laisse remonter telle quelle, son message est déjà lisible. */
async function apiAddPackItems(packId, itemIds){
  const rows = itemIds.map(id=>({pack_id:packId, item_id:id}));
  const {error} = await sb.from('pack_items').upsert(rows, {onConflict:'pack_id,item_id'});
  if(error) throw error;
}
async function apiRemovePackItems(packId, itemIds){
  await run(sb.from('pack_items').delete().eq('pack_id', packId).in('item_id', itemIds));
}

/* ---------------- Consommables d'un pack (v1.22) ----------------
   Gaffer, colliers, piles : des lignes de checklist, pas des items.
   Elles n'ont ni poids ni état, et c'est volontaire — voir la 024. */
async function apiInsertPackExtra(e){
  const {data,error} = await sb.from('pack_extras').insert(e).select().single();
  if(error) throw error;
  return data;
}
async function apiUpdatePackExtra(id, f){ await run(sb.from('pack_extras').update(f).eq('id', id)); }
async function apiDeletePackExtra(id){ await run(sb.from('pack_extras').delete().eq('id', id)); }
/* ---------------- Lecture complète, pour la sauvegarde ----------------

   `loadAll` plafonne l'historique à 1 000 lignes : c'est un choix
   d'affichage, l'écran n'en montre jamais autant. Mais l'export
   exportait ce qui était chargé, donc la sauvegarde s'arrêtait elle
   aussi à 1 000 — silencieusement. À 1 495 lignes, un tiers de
   l'historique manquait déjà. Découvert par l'essai de restauration
   du 14 octobre 2026, jamais par relecture.

   PostgREST plafonne en plus chaque réponse à 1 000 lignes, d'où la
   pagination : on ne peut pas se contenter de retirer la limite. */
async function apiFetchAll(table, order){
  const PAGE = 1000;
  const out = [];
  for(let de = 0; ; de += PAGE){
    let q = sb.from(table).select('*').range(de, de + PAGE - 1);
    if(order) q = q.order(order);
    const {data, error} = await q;
    if(error) throw error;
    out.push(...data);
    if(data.length < PAGE) return out;
  }
}

async function apiUpsertPacks(rows){ await run(sb.from('packs').upsert(rows)); }
async function apiUpsertPackItems(rows){
  await run(sb.from('pack_items').upsert(rows, {onConflict:'pack_id,item_id'}));
}
async function apiUpsertPackExtras(rows){ await run(sb.from('pack_extras').upsert(rows)); }

async function apiUpsertRepairs(rows){ await run(sb.from('repairs').upsert(rows)); }
async function apiUpsertProviders(rows){ await run(sb.from('repair_providers').upsert(rows)); }
/* L'historique n'a pas de clé naturelle : ses lignes sont numérotées
   par la base. Un import répété les ajoutait donc en double — les
   autres tables, elles, se réécrivent par `upsert` et sont rejouables
   depuis toujours. Révélé par le second import de l'essai du
   14 octobre 2026 : 1 000 lignes tronquées + 1 496 complètes = 2 496.

   On écarte ici ce qui est déjà en base, sur la signature qui définit
   une ligne d'historique : quel item, quel type d'événement, quand. */
async function apiInsertHistoryRows(rows){
  if(!rows.length) return;
  const existantes = new Set();
  try{
    const dejaLa = await apiFetchAll('history');
    dejaLa.forEach(h => existantes.add(`${h.item_id}|${h.type}|${h.date}`));
  }catch(e){ /* base vide ou illisible : on insère tout */ }
  const neuves = rows.filter(r => !existantes.has(`${r.item_id}|${r.type}|${r.date}`));
  if(neuves.length) await run(sb.from('history').insert(neuves));
  return {insérées: neuves.length, ignorées: rows.length - neuves.length};
}
