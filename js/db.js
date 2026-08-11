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
  if(msg) document.getElementById('setupMsg').innerHTML = '⚠️ ' + esc(msg) + '<br>Vérifie l\'URL et la clé ci-dessous.';
}
async function init(){
  const cfg = getCfg();
  if(!cfg || !cfg.url || !cfg.key){ showSetup(); return; }
  sb = supabase.createClient(cfg.url, cfg.key);
  document.getElementById('setup').style.display = 'none';

  // Le lien magique renvoie sur la page avec un jeton : on laisse
  // supabase-js l'exploiter, puis on nettoie l'adresse.
  const {data:{session}} = await sb.auth.getSession();
  if(location.hash.includes('access_token')) history.replaceState(null,'',location.pathname);

  sb.auth.onAuthStateChange((event)=>{
    if(event === 'SIGNED_IN' && !me) startSession();
    if(event === 'SIGNED_OUT'){ me = null; showScreen('login'); }
  });

  if(!session){ showScreen('login'); return; }
  await startSession();
}

/* Une fois connecté : charger le profil, vérifier l'autorisation, démarrer */
async function startSession(){
  const {data:{session}} = await sb.auth.getSession();
  if(!session){ showScreen('login'); return; }

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
    if(msg) msg.textContent = "Connexion à la base impossible : " + (e.message||"");
    return;
  }

  showScreen('app');
  applyRoleUI();
  setSync('ok');
  render();
  subscribe();
  watchConnection();
  touchLastSeen();
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
  const all = it.data.map(i=>({...i,cond:normCond(i.cond)}));
  db.trashSupported = all.length===0 || Object.prototype.hasOwnProperty.call(all[0],'deleted_at');
  db.trash = all.filter(i=>i.deleted_at).sort((a,b)=>new Date(b.deleted_at)-new Date(a.deleted_at));
  db.items = all.filter(i=>!i.deleted_at);
  db.users = pe.data;
  db.locations = lo.data.map(l=>({name:l.name,parent:l.parent||null}));
  db.history = hi.data.map(h=>({itemId:h.item_id,type:h.type,date:h.date,userId:h.user_id,
                                detail:h.detail,cond:h.cond?normCond(h.cond):null,actorName:h.actor_name||null}));
  const pr = await sb.from('projects').select('*').order('created_at');
  db.projectsError = !!pr.error;
  db.projects = pr.error ? [] : pr.data.map(p=>({...p,item_ids:p.item_ids||[],prep:p.prep||{}}));

  const pf = await sb.from('profiles').select('*').order('email');
  db.profiles = pf.error ? [] : pf.data;
}
async function refresh(){
  if(!sb) return false;
  try{ await loadAll(); render(); setSync('ok'); return true; }
  catch(e){ setSync(navigator.onLine === false ? 'off' : 'error'); return false; }
}
function subscribe(){
  let t = null;
  try{
    sb.channel('inv-sync').on('postgres_changes',{event:'*',schema:'public'},()=>{
      clearTimeout(t); t = setTimeout(refresh, 400);
    }).subscribe();
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
  dot.title = state==='ok' ? "Connecté — données synchronisées"
            : state==='off' ? "Hors ligne — les modifications ne sont pas enregistrées"
            : "Problème de synchronisation — recharge la page";
}

/* Un enregistrement réussi : confirmation discrète et groupée
   (une seule notification même si l'action a écrit plusieurs fois). */
let okTimer = null;
function markSynced(){
  setSync('ok');
  clearTimeout(okTimer);
  okTimer = setTimeout(()=>{ if(typeof toast==='function') toast("Enregistré", 'ok'); }, 350);
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
    ? "Pas de connexion — la modification n'a PAS été enregistrée."
    : "Refusé par la base : " + ((e && e.message) || "erreur inconnue");
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
    if(typeof toast==='function') toast("Connexion perdue — ne fais pas de modification tant qu'elle n'est pas rétablie.", 'error', null, null, 8000);
  });
  window.addEventListener('online', async ()=>{
    if(typeof toast==='function') toast("Connexion rétablie — actualisation…", 'info');
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

/* --- personnes --- */
async function apiInsertPerson(u){ await run(sb.from('people').insert(u)); }
async function apiDeletePerson(id){ await run(sb.from('people').delete().eq('id', id)); }

/* --- emplacements --- */
async function apiInsertLocation(l){ await run(sb.from('locations').insert(l)); }
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
