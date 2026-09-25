/* ============================================================
   VUE — Utilisateurs (réservée aux administrateurs)
   Inscrire un email = autoriser cette personne à se connecter.
   Tout se fait ici : aucun passage par Supabase nécessaire.
   ============================================================ */

const ROLES = {admin:"Administrator", stagiaire:"Assistant"};

function usersBox(){ return document.getElementById('usersBox') || document.getElementById('v-users'); }
function renderUsers(){
  const box = usersBox();
  if(!box) return;
  if(!can('admin')){ box.innerHTML = '<div class="empty">Administrators only.</div>'; return; }
  const rows = db.profiles.map(p=>{
    const isMe = me && p.id === me.id;
    const connected = !!p.user_id;
    return `<tr>
      <td data-l="Personne">
        <b>${esc(p.name || p.email)}</b>${isMe?' <span class="muted">(vous)</span>':''}
        <br><span class="muted">${esc(p.email)}</span>
      </td>
      <td data-l="Role">
        <select onchange="setUserRole('${p.id}', this.value)" ${isMe?'disabled title="You cannot change your own role"':''}>
          ${Object.entries(ROLES).map(([k,v])=>`<option value="${k}" ${p.role===k?'selected':''}>${v}</option>`).join("")}
        </select>
      </td>
      <td data-l="Statut">
        ${p.active===false ? '<span class="tag hs">disabled</span>'
          : connected ? '<span class="tag dispo">actif</span>'
          : '<span class="tag attente">never signed in</span>'}
        ${p.last_seen?`<br><span class="muted">vu le ${fdate(p.last_seen)}</span>`:''}
      </td>
      <td style="white-space:nowrap">
        ${isMe ? '' : `
          <button class="btn small sec" onclick="toggleUserActive('${p.id}')">${p.active===false?'Re-enable':'Disable'}</button>
          <button class="btn small danger" onclick="removeUser('${p.id}')">Retirer</button>`}
      </td></tr>`;
  }).join("");

  box.innerHTML = `
    <h2>Users</h2>
    <p class="muted" style="margin-bottom:10px">
      Inviting someone sends them an email with a link to choose their password.
      There is no sign-up: an account only exists because an administrator created it here.
    </p>
    <div class="toolbar" style="margin-bottom:10px">
      <input type="email" id="nu-email" placeholder="email@studio.com" style="min-width:220px" onkeydown="if(event.key==='Enter')addUserAccount()">
      <input id="nu-name" placeholder="Name (optional)">
      <select id="nu-role">${Object.entries(ROLES).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select>
      <button class="btn" id="nu-btn" onclick="addUserAccount()">+ Invite</button>
    </div>
    ${db.profiles.length
      ? `<table><thead><tr><th>Person</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
      : '<div class="empty">No account yet.</div>'}
    <p class="muted" style="margin-top:12px">
      <b>Administrator</b> — everything: add, edit and delete gear, manage locations,
      borrowers, projects and accounts.<br>
      <b>Assistant</b> — browse the inventory, check gear in and out, flag repairs and
      pack projects. Cannot create, edit or delete item records.
    </p>`;
}

/* Inviter quelqu'un passe par la fonction serveur `invite-user` :
   créer un compte demande la clé secrète, qui n'a rien à faire ici.
   La fonction revérifie côté serveur que l'appelant est bien
   administrateur — ce contrôle-ci n'est que du confort d'interface. */
async function addUserAccount(){
  const email = (document.getElementById('nu-email').value||"").trim().toLowerCase();
  const name  = (document.getElementById('nu-name').value||"").trim();
  const role  = document.getElementById('nu-role').value;
  if(!email || !email.includes('@')){ toast("Enter a valid email address.", 'error'); return; }
  if(db.profiles.some(p=>p.email.toLowerCase()===email)){ toast("That person is already allowed.", 'error'); return; }

  const btn = document.getElementById('nu-btn');
  if(btn){ btn.disabled = true; btn.textContent = "Inviting…"; }

  let res;
  try{
    res = await sb.functions.invoke('invite-user', {body:{email, name, role}});
  }catch(e){
    res = {error:e};
  }
  if(btn){ btn.disabled = false; btn.textContent = "+ Invite"; }

  if(res.error){
    const detail = (res.error && res.error.message) || 'unknown error';
    toast("Could not send the invitation (" + detail + "). Check that the invite-user function is deployed.",
          'error', null, null, 9000);
    return;
  }
  const data = res.data || {};
  if(data.error){ toast(data.error, 'error', null, null, 8000); return; }

  document.getElementById('nu-email').value = "";
  document.getElementById('nu-name').value = "";
  await refresh();
  toast(data.message || `Invitation sent to ${email}.`, 'ok', null, null, 8000);
}

async function setUserRole(id, role){
  const p = db.profiles.find(x=>x.id===id); if(!p) return;
  const admins = db.profiles.filter(x=>x.role==='admin' && x.active!==false);
  if(p.role==='admin' && role!=='admin' && admins.length<=1){
    toast("Not possible — at least one administrator must remain.", 'error');
    renderUsers(); return;
  }
  p.role = role;
  renderUsers();
  await apiUpdateProfile(id, {role});
  toast(`${p.name||p.email} is now ${ROLES[role].toLowerCase()}.`, 'ok');
}

async function toggleUserActive(id){
  const p = db.profiles.find(x=>x.id===id); if(!p) return;
  const next = p.active===false;
  if(!next){
    const admins = db.profiles.filter(x=>x.role==='admin' && x.active!==false);
    if(p.role==='admin' && admins.length<=1){ toast("Not possible — at least one administrator must remain.", 'error'); return; }
    if(!confirm(`Disable ${p.name||p.email}?\n\nThey will lose access to the app, but their history is kept.`)) return;
  }
  p.active = next;
  renderUsers();
  await apiUpdateProfile(id, {active:next});
}

async function removeUser(id){
  const p = db.profiles.find(x=>x.id===id); if(!p) return;
  const admins = db.profiles.filter(x=>x.role==='admin' && x.active!==false);
  if(p.role==='admin' && admins.length<=1){ toast("Not possible — at least one administrator must remain.", 'error'); return; }
  if(!confirm(`Permanently remove ${p.name||p.email} from the allowed accounts?\n\nTheir action history is kept.`)) return;
  db.profiles = db.profiles.filter(x=>x.id!==id);
  renderUsers();
  await apiDeleteProfile(id);
}
