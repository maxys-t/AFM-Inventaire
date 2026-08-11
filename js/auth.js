/* ============================================================
   AUTH — connexion par lien magique, session, rôles
   L'application n'affiche rien tant qu'un compte autorisé
   n'est pas connecté.
   ============================================================ */

let me = null;          // profil du compte connecté (ligne de la table profiles)

/* ---- Droits côté interface ----
   ⚠️ La vraie sécurité est dans la base (fonctions can_edit_inventory /
   can_delete de sql/005-comptes.sql). Ici on décide seulement quels
   boutons afficher, pour ne pas proposer une action qui serait refusée.

   POUR AUTORISER LES STAGIAIRES À CRÉER / MODIFIER :
   ajouter 'edit' dans la liste STAGIAIRE_CAN ci-dessous
   (et faire la modification correspondante côté base). */
const STAGIAIRE_CAN = ['view','checkout','repair','projectPrep'];

function can(what){
  if(!me) return false;
  if(me.role === 'admin') return true;
  return STAGIAIRE_CAN.includes(what);
}

/* ---- Écrans ---- */
function showScreen(which){          // 'login' | 'denied' | 'app'
  const set = (id,on)=>{ const el = typeof id==='string' ? document.getElementById(id) : id; if(el) el.style.display = on ? '' : 'none'; };
  set('login',  which==='login');
  set('denied', which==='denied');
  set(document.querySelector('main'), which==='app');
  set(document.querySelector('nav'),  which==='app');
  const nav = document.querySelector('nav');
  if(nav && which==='app') nav.style.display = 'flex';
  set('userChip', which==='app' || which==='denied');
}

/* ---- Connexion ---- */
async function sendMagicLink(){
  const email = (document.getElementById('login-email').value||"").trim().toLowerCase();
  const btn = document.getElementById('login-btn');
  const msg = document.getElementById('login-msg');
  if(!email || !email.includes('@')){ msg.textContent = "Entre une adresse email valide."; return; }
  btn.disabled = true; btn.textContent = "Envoi…";
  const {error} = await sb.auth.signInWithOtp({
    email,
    options:{ emailRedirectTo: location.href.split('#')[0].split('?')[0] }
  });
  btn.disabled = false; btn.textContent = "Recevoir mon lien de connexion";
  if(error){
    msg.textContent = "Impossible d'envoyer le lien : " + error.message;
    return;
  }
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('login-sent').style.display = '';
  document.getElementById('login-sent-mail').textContent = email;
}

async function signOut(){
  try{ await sb.auth.signOut(); }catch(e){}
  me = null;
  location.reload();
}

/* ---- Profil du compte connecté ----
   Si aucune ligne n'est rattachée à ce compte, on tente un rattachement
   par email (cas d'un compte créé avant la mise en place des comptes),
   puis on réessaie une fois. */
async function loadMe(userId){
  let p = await fetchProfile(userId);
  if(!p){
    try{ await sb.rpc('claim_profile'); }catch(e){}
    p = await fetchProfile(userId);
  }
  if(!p || p.active === false) return null;
  return p;
}
async function fetchProfile(userId){
  const {data,error} = await sb.from('profiles').select('*').eq('user_id',userId).limit(1);
  if(error || !data || !data.length) return null;
  return data[0];
}

function renderUserChip(){
  const el = document.getElementById('userChip');
  if(!el) return;
  if(!me){ el.innerHTML = `<button class="btn sec small" onclick="signOut()">Déconnexion</button>`; return; }
  el.innerHTML = `<span class="who" title="${esc(me.email)}">${esc(me.name || me.email)}</span>
    <span class="tag ${me.role==='admin'?'cat':'pinactif'}">${me.role==='admin'?'admin':'stagiaire'}</span>
    <button class="btn sec small" onclick="signOut()">Déconnexion</button>`;
}

/* ---- Adapter l'interface au rôle ---- */
function applyRoleUI(){
  document.querySelectorAll('[data-req]').forEach(el=>{
    el.style.display = can(el.dataset.req) ? '' : 'none';
  });
  renderUserChip();
}

/* ---- Suivi de la dernière connexion (indicatif) ---- */
async function touchLastSeen(){
  if(!me) return;
  try{ await sb.from('profiles').update({last_seen:new Date().toISOString()}).eq('id',me.id); }catch(e){}
}
