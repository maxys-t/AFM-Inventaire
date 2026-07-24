/* ============================================================
   DB — état en mémoire + connexion Supabase + couche API
   RÈGLE : c'est le SEUL fichier autorisé à parler à Supabase.
   Les vues lisent l'état (db.*) et appellent les fonctions api*.
   ============================================================ */

let sb = null;
let db = {items:[],users:[],locations:[],history:[],projects:[],projectsError:false};

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
  try{ await loadAll(); }
  catch(e){ localStorage.removeItem('sbCfg'); showSetup(e.message||"connexion impossible"); return; }
  document.getElementById('setup').style.display = 'none';
  document.querySelector('main').style.display = '';
  document.querySelector('nav').style.display = 'flex';
  document.getElementById('syncdot').classList.add('on');
  render();
  subscribe();
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
  db.items = it.data.map(i=>({...i,cond:normCond(i.cond)}));
  db.users = pe.data;
  db.locations = lo.data.map(l=>({name:l.name,parent:l.parent||null}));
  db.history = hi.data.map(h=>({itemId:h.item_id,type:h.type,date:h.date,userId:h.user_id,detail:h.detail,cond:h.cond?normCond(h.cond):null}));
  const pr = await sb.from('projects').select('*').order('created_at');
  db.projectsError = !!pr.error;
  db.projects = pr.error ? [] : pr.data.map(p=>({...p,item_ids:p.item_ids||[],prep:p.prep||{}}));
}
async function refresh(){ if(!sb) return; try{ await loadAll(); render(); }catch(e){} }
function subscribe(){
  let t = null;
  try{
    sb.channel('inv-sync').on('postgres_changes',{event:'*',schema:'public'},()=>{
      clearTimeout(t); t = setTimeout(refresh, 400);
    }).subscribe();
  }catch(e){}
}
async function run(promise){
  const {error} = await promise;
  if(error){ alert("Erreur d'enregistrement : " + error.message); throw error; }
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
  const h = {itemId,type,date:now(),detail:detail||"",userId:userId||null,cond:cond||null};
  db.history.unshift(h);
  await run(sb.from('history').insert({item_id:itemId,type,date:h.date,detail:h.detail,user_id:h.userId,cond:h.cond}));
}

/* ================= API — ÉCRITURES =================
   Toutes les modifications de la base passent par ici. */

/* --- items --- */
async function apiInsertItems(rows){ await run(sb.from('items').insert(rows)); }
async function apiUpdateItem(id, fields){ await run(sb.from('items').update(fields).eq('id', id)); }
async function apiDeleteItem(id){
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

/* --- import JSON (upserts en masse) --- */
async function apiUpsertLocations(rows){ await run(sb.from('locations').upsert(rows)); }
async function apiUpsertPeople(rows){ await run(sb.from('people').upsert(rows)); }
async function apiUpsertItems(rows){ await run(sb.from('items').upsert(rows)); }
async function apiUpsertProjects(rows){ await run(sb.from('projects').upsert(rows)); }
async function apiInsertHistoryRows(rows){ await run(sb.from('history').insert(rows)); }
