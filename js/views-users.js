/* ============================================================
   VUE — Utilisateurs (réservée aux administrateurs)
   Inscrire un email = autoriser cette personne à se connecter.
   Tout se fait ici : aucun passage par Supabase nécessaire.
   ============================================================ */

const ROLES = {admin:"Administrateur", stagiaire:"Stagiaire"};

function renderUsers(){
  if(!can('admin')){
    document.getElementById('v-users').innerHTML = '<div class="panel"><div class="empty">Réservé aux administrateurs.</div></div>';
    return;
  }
  const rows = db.profiles.map(p=>{
    const isMe = me && p.id === me.id;
    const connected = !!p.user_id;
    return `<tr>
      <td data-l="Personne">
        <b>${esc(p.name || p.email)}</b>${isMe?' <span class="muted">(vous)</span>':''}
        <br><span class="muted">${esc(p.email)}</span>
      </td>
      <td data-l="Rôle">
        <select onchange="setUserRole('${p.id}', this.value)" ${isMe?'disabled title="Vous ne pouvez pas changer votre propre rôle"':''}>
          ${Object.entries(ROLES).map(([k,v])=>`<option value="${k}" ${p.role===k?'selected':''}>${v}</option>`).join("")}
        </select>
      </td>
      <td data-l="Statut">
        ${p.active===false ? '<span class="tag hs">désactivé</span>'
          : connected ? '<span class="tag dispo">actif</span>'
          : '<span class="tag attente">jamais connecté</span>'}
        ${p.last_seen?`<br><span class="muted">vu le ${fdate(p.last_seen)}</span>`:''}
      </td>
      <td style="white-space:nowrap">
        ${isMe ? '' : `
          <button class="btn small sec" onclick="toggleUserActive('${p.id}')">${p.active===false?'Réactiver':'Désactiver'}</button>
          <button class="btn small danger" onclick="removeUser('${p.id}')">Retirer</button>`}
      </td></tr>`;
  }).join("");

  document.getElementById('v-users').innerHTML = `
    <div class="toolbar">
      <input type="email" id="nu-email" placeholder="email@studio.fr" style="min-width:220px" onkeydown="if(event.key==='Enter')addUserAccount()">
      <input id="nu-name" placeholder="Nom (optionnel)">
      <select id="nu-role">${Object.entries(ROLES).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select>
      <button class="btn" onclick="addUserAccount()">+ Autoriser</button>
    </div>
    <p class="muted" style="margin-bottom:12px">
      Inscris l'email d'une personne pour l'autoriser, puis envoie-lui simplement
      l'adresse du site : elle saisira son email et recevra son lien de connexion.
      Toute personne non inscrite ici ne voit rien.
    </p>
    <div class="panel">${db.profiles.length
      ? `<table><thead><tr><th>Personne</th><th>Rôle</th><th>Statut</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
      : '<div class="empty">Aucun compte.</div>'}</div>
    <div class="panel">
      <h2>Qui peut faire quoi</h2>
      <p class="muted"><b>Administrateur</b> — tout : ajouter, modifier et supprimer du matériel,
      gérer emplacements, personnes, projets et comptes.</p>
      <p class="muted"><b>Stagiaire</b> — consulter l'inventaire, faire des check-out / check-in,
      signaler du matériel à réparer, préparer les projets. Ne peut ni créer, ni modifier,
      ni supprimer de fiches.</p>
    </div>`;
}

async function addUserAccount(){
  const email = (document.getElementById('nu-email').value||"").trim().toLowerCase();
  const name  = (document.getElementById('nu-name').value||"").trim();
  const role  = document.getElementById('nu-role').value;
  if(!email || !email.includes('@')){ toast("Entre une adresse email valide.", 'error'); return; }
  if(db.profiles.some(p=>p.email.toLowerCase()===email)){ toast("Cette personne est déjà autorisée.", 'error'); return; }
  const p = {email, name, role, active:true};
  db.profiles.push({...p, id:'temp-'+Date.now(), user_id:null});
  document.getElementById('nu-email').value = ""; document.getElementById('nu-name').value = "";
  renderUsers();
  await apiInsertProfile(p);
  await refresh();
  toast(`${email} peut maintenant se connecter. Envoie-lui l'adresse du site.`, 'ok', null, null, 6000);
}

async function setUserRole(id, role){
  const p = db.profiles.find(x=>x.id===id); if(!p) return;
  const admins = db.profiles.filter(x=>x.role==='admin' && x.active!==false);
  if(p.role==='admin' && role!=='admin' && admins.length<=1){
    toast("Impossible : il doit rester au moins un administrateur.", 'error');
    renderUsers(); return;
  }
  p.role = role;
  renderUsers();
  await apiUpdateProfile(id, {role});
  toast(`${p.name||p.email} est maintenant ${ROLES[role].toLowerCase()}.`, 'ok');
}

async function toggleUserActive(id){
  const p = db.profiles.find(x=>x.id===id); if(!p) return;
  const next = p.active===false;
  if(!next){
    const admins = db.profiles.filter(x=>x.role==='admin' && x.active!==false);
    if(p.role==='admin' && admins.length<=1){ toast("Impossible : il doit rester au moins un administrateur.", 'error'); return; }
    if(!confirm(`Désactiver ${p.name||p.email} ?\n\nCette personne n'aura plus accès à l'application, mais son historique est conservé.`)) return;
  }
  p.active = next;
  renderUsers();
  await apiUpdateProfile(id, {active:next});
}

async function removeUser(id){
  const p = db.profiles.find(x=>x.id===id); if(!p) return;
  const admins = db.profiles.filter(x=>x.role==='admin' && x.active!==false);
  if(p.role==='admin' && admins.length<=1){ toast("Impossible : il doit rester au moins un administrateur.", 'error'); return; }
  if(!confirm(`Retirer définitivement ${p.name||p.email} de la liste des comptes autorisés ?\n\nSon historique d'actions est conservé.`)) return;
  db.profiles = db.profiles.filter(x=>x.id!==id);
  renderUsers();
  await apiDeleteProfile(id);
}
