/* ============================================================
   DB — état en mémoire + connexion Supabase + couche API
   RÈGLE : c'est le SEUL fichier autorisé à parler à Supabase.
   Les vues lisent l'état (db.*) et appellent les fonctions api*.
   ============================================================ */

let sb = null;
let db = {items:[],users:[],locations:[],history:[],projects:[],projectsError:false,
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
  if(!url || !key){ alert("Les deux champs sont obligatoires."); return; }
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
function normCond(c){ return c==='reparer' ? 'attente' : (c||'bon'); }
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
    loc_name:p.loc_name||'', starts_on:p.starts_on||null, ends_on:p.ends_on||null,
    archived: !!p.archived
  }));

  const pf = await sb.from('profiles').select('*').order('email');
  db.profiles = pf.error ? [] : pf.data;

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
const SYNC_TABLES = ['items','people','locations','history','projects','profiles'];
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
  if(i.out && i.out.projectId){ const p = project(i.out.projectId); return "🎪 " + (p?p.name:"Projet"); }
  return i.out ? userName(i.out.userId) : "";
}
function projItems(p){ return (p.item_ids||[]).map(id=>item(id)).filter(Boolean); }
function projProgress(p){
  const its = projItems(p);
  return {done: its.filter(i=>p.prep && p.prep[i.id]).length, total: its.length};
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
async function apiInsertProfile(p){ await run(sb.from('profiles').insert(p)); }
async function apiUpdateProfile(id, fields){ await run(sb.from('profiles').update(fields).eq('id', id)); }
async function apiDeleteProfile(id){ await run(sb.from('profiles').delete().eq('id', id)); }

/* --- import JSON (upserts en masse) --- */
async function apiUpsertLocations(rows){ await run(sb.from('locations').upsert(rows)); }
async function apiUpsertPeople(rows){ await run(sb.from('people').upsert(rows)); }
async function apiUpsertItems(rows){ await run(sb.from('items').upsert(rows)); }
async function apiUpsertProjects(rows){ await run(sb.from('projects').upsert(rows)); }
async function apiInsertHistoryRows(rows){ await run(sb.from('history').insert(rows)); }
