/* ============================================================
   AUTH — connexion par lien magique, session, rôles
   L'application n'affiche rien tant qu'un compte autorisé
   n'est pas connecté.
   ============================================================ */

let me = null;                      // profil du compte connecté (ligne de profiles)
let pendingPasswordSetup = false;   // arrivé par un lien d'invitation ou de réinitialisation

/* ---- Droits côté interface ----
   ⚠️ La vraie sécurité est dans la base (fonctions can_edit_inventory /
   can_delete de sql/005-comptes.sql). Ici on décide seulement quels
   boutons afficher, pour ne pas proposer une action qui serait refusée.

   POUR AUTORISER LES STAGIAIRES À CRÉER / MODIFIER :
   ajouter 'edit' dans la liste STAGIAIRE_CAN ci-dessous
   (et faire la modification correspondante côté base). */
const STAGIAIRE_CAN = ['view','checkout','repair','projectPrep'];

/* La valeur d'achat cumulée n'est montrée qu'aux administrateurs. */
function canSeeValue(){ return !!(me && me.role === 'admin'); }

function can(what){
  if(!me) return false;
  if(me.role === 'admin') return true;
  return STAGIAIRE_CAN.includes(what);
}

/* ---- Écrans ---- */
function showScreen(which){          // 'login' | 'setpw' | 'denied' | 'app'
  const set = (id,on)=>{ const el = typeof id==='string' ? document.getElementById(id) : id; if(el) el.style.display = on ? '' : 'none'; };
  set('login',  which==='login');
  set('setpw',  which==='setpw');
  set('denied', which==='denied');
  set(document.querySelector('main'), which==='app');
  set(document.querySelector('nav'),  which==='app');
  const nav = document.querySelector('nav');
  if(nav && which==='app') nav.style.display = 'flex';
  set('userChip', which==='app' || which==='denied');
}

/* ============================================================
   CONNEXION
   Email + mot de passe uniquement. Personne ne peut créer de
   compte : un administrateur invite une adresse depuis
   Settings → Users, ce qui déclenche un mail. Le lien de ce mail
   amène directement à l'écran « choisis ton mot de passe ».
   ============================================================ */

const MIN_PW = 10;   // aligné sur le réglage Supabase demandé

function pwProblem(pw, confirm){
  if(pw.length < MIN_PW) return `Password must be at least ${MIN_PW} characters.`;
  if(confirm !== undefined && pw !== confirm) return "The two passwords do not match.";
  return null;
}

function loginMsg(text, kind){
  const el = document.getElementById('login-msg');
  if(!el) return;
  el.textContent = text || '';
  el.className = 'muted' + (kind==='ok' ? ' okmsg' : kind==='error' ? ' errmsg' : '');
}

async function signInPassword(){
  const email = (document.getElementById('login-email').value||"").trim().toLowerCase();
  const pw = document.getElementById('login-pw').value || "";
  const btn = document.getElementById('login-btn');
  if(!email || !email.includes('@')){ loginMsg("Enter a valid email address.", 'error'); return; }
  if(!pw){ loginMsg("Enter your password.", 'error'); return; }

  btn.disabled = true; btn.textContent = "Signing in…";
  const {error} = await sb.auth.signInWithPassword({email, password:pw});
  btn.disabled = false; btn.textContent = "Sign in";

  if(error){
    // Message volontairement vague : préciser « cet email n'existe pas »
    // révélerait qui travaille ici à n'importe quel visiteur.
    loginMsg("Wrong email or password.", 'error');
    return;
  }
  loginMsg("");
}

/* Mot de passe oublié — sert aussi de rattrapage si l'invitation
   s'est perdue, tant que l'adresse a bien un compte. */
async function sendReset(){
  const email = (document.getElementById('login-email').value||"").trim().toLowerCase();
  if(!email || !email.includes('@')){ loginMsg("Enter your email address first.", 'error'); return; }
  const {error} = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: (typeof APP_URL !== 'undefined' && APP_URL) ? APP_URL : location.origin + location.pathname
  });
  if(error){ loginMsg("Could not send the email: " + error.message, 'error'); return; }
  // Même réponse que l'adresse existe ou non, pour la même raison.
  loginMsg("If that address has an account, a reset link is on its way.", 'ok');
}

/* Écran « choisis ton mot de passe » : première connexion via une
   invitation, ou retour depuis un lien de réinitialisation. */
function showSetPassword(first){
  const t = document.getElementById('setpw-title');
  const p = document.getElementById('setpw-intro');
  if(t) t.textContent = first ? "Welcome — choose your password" : "Choose a new password";
  if(p) p.textContent = first
    ? "Your account is ready. Pick a password to finish setting it up."
    : "Pick a new password for your account.";
  const a = document.getElementById('setpw-1'), b = document.getElementById('setpw-2');
  if(a) a.value = ""; if(b) b.value = "";
  const m = document.getElementById('setpw-msg'); if(m) m.textContent = "";
  showScreen('setpw');
}

async function saveNewPassword(){
  const a = document.getElementById('setpw-1').value || "";
  const b = document.getElementById('setpw-2').value || "";
  const msg = document.getElementById('setpw-msg');
  const problem = pwProblem(a, b);
  if(problem){ msg.textContent = problem; msg.className = 'muted errmsg'; return; }

  const btn = document.getElementById('setpw-btn');
  btn.disabled = true; btn.textContent = "Saving…";
  const {error} = await sb.auth.updateUser({password:a});
  btn.disabled = false; btn.textContent = "Save password";

  if(error){
    // Supabase refuse par exemple un mot de passe déjà connu des fuites.
    msg.textContent = error.message;
    msg.className = 'muted errmsg';
    return;
  }
  pendingPasswordSetup = false;
  await startSession();
}

/* Changement de mot de passe depuis Settings → Account */
async function changeMyPassword(){
  const a = (document.getElementById('ch-pw1')||{}).value || "";
  const b = (document.getElementById('ch-pw2')||{}).value || "";
  const msg = document.getElementById('ch-msg');
  const btn = document.getElementById('ch-btn');
  const problem = pwProblem(a, b);
  if(problem){ if(msg){ msg.textContent = problem; msg.className = 'muted errmsg'; } return; }

  if(btn){ btn.disabled = true; btn.textContent = "Saving…"; }
  const {error} = await sb.auth.updateUser({password:a});
  if(btn){ btn.disabled = false; btn.textContent = "Change password"; }

  if(error){
    if(msg){ msg.textContent = error.message; msg.className = 'muted errmsg'; }
    return;
  }
  document.getElementById('ch-pw1').value = "";
  document.getElementById('ch-pw2').value = "";
  if(msg){ msg.textContent = "Password changed."; msg.className = 'muted okmsg'; }
  if(typeof toast === 'function') toast("Password changed.", 'ok');
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
  if(!me){ el.innerHTML = `<button class="btn sec small" onclick="signOut()">Sign out</button>`; return; }
  el.innerHTML = `<span class="who" title="${esc(me.email)}">${esc(me.name || me.email)}</span>
    <span class="tag ${me.role==='admin'?'cat':'pinactif'}">${me.role==='admin'?'admin':'stagiaire'}</span>
    <button class="btn sec small" onclick="signOut()">Sign out</button>`;
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
