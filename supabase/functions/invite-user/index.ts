/* ============================================================
   EDGE FUNCTION — invite-user
   Invite une adresse email à rejoindre l'inventaire.

   Pourquoi du code serveur : inviter quelqu'un demande la clé
   SECRÈTE de Supabase, qui donne un accès total à la base. Elle ne
   peut donc pas se trouver dans l'application, qui est un site
   statique lisible par tous. Ici elle reste chez Supabase.

   Le point de sécurité qui compte : la fonction vérifie que
   l'APPELANT est administrateur avant d'inviter qui que ce soit.
   Sans cette vérification, n'importe qui disposant de la clé
   publique — c'est-à-dire n'importe quel visiteur — pourrait créer
   des comptes sur le projet.

   DÉPLOIEMENT (aucun outil à installer) :
     Supabase → Edge Functions → Deploy a new function
     → nom : invite-user → coller ce fichier → Deploy.

   Aucune variable à configurer : SUPABASE_URL et
   SUPABASE_SERVICE_ROLE_KEY sont fournies automatiquement.
   ============================================================ */

import { createClient } from 'jsr:@supabase/supabase-js@2';

/* Adresse de l'application : c'est là que le lien d'invitation
   ramène la personne. À modifier si le domaine change. */
const APP_URL = Deno.env.get('APP_URL') ?? 'https://inventory.accessflow.fr/';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });

const ROLES = ['admin', 'stagiaire'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  /* --- 1. Qui appelle ? --- */
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Not signed in' }, 401);

  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: { user }, error: userErr } = await asCaller.auth.getUser();
  if (userErr || !user) return json({ error: 'Not signed in' }, 401);

  /* --- 2. Est-il administrateur ? ---
     Lu avec la clé secrète : on ne fait pas confiance à ce que le
     navigateur prétend être, on relit le rôle dans la base. */
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: prof } = await admin
    .from('profiles')
    .select('role, active')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!prof || prof.active === false || prof.role !== 'admin') {
    return json({ error: 'Administrators only' }, 403);
  }

  /* --- 3. Que demande-t-il ? --- */
  let body: { email?: string; name?: string; role?: string };
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid request' }, 400); }

  const email = (body.email ?? '').trim().toLowerCase();
  const name = (body.name ?? '').trim();
  const role = ROLES.includes(body.role ?? '') ? body.role! : 'stagiaire';

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'Invalid email address' }, 400);
  }

  /* --- 4. Autoriser d'abord, inviter ensuite ---
     La ligne dans `profiles` est ce qui ouvre réellement l'accès.
     On l'écrit avant l'envoi du mail : si l'invitation échoue, la
     personne pourra quand même entrer via « Forgot password ». */
  const { data: existing } = await admin
    .from('profiles').select('id').eq('email', email).limit(1).maybeSingle();

  if (existing) {
    await admin.from('profiles')
      .update({ role, active: true, ...(name ? { name } : {}) })
      .eq('id', existing.id);
  } else {
    const { error: insErr } = await admin.from('profiles')
      .insert({ email, name: name || null, role, active: true });
    if (insErr) return json({ error: 'Could not add the account: ' + insErr.message }, 500);
  }

  /* --- 5. Inviter --- */
  const { error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: APP_URL
  });

  if (invErr) {
    const already = /already|registered|exists/i.test(invErr.message);
    return json({
      ok: true,
      invited: false,
      // Un compte déjà existant n'est pas un échec : la personne est
      // autorisée, elle passera simplement par « Forgot password ».
      message: already
        ? `${email} already has an account and is now allowed in. Ask them to sign in, or to use "Forgot password".`
        : `${email} was added, but the invitation email could not be sent (${invErr.message}). They can use "Forgot password" to set a password.`
    });
  }

  return json({ ok: true, invited: true, message: `Invitation sent to ${email}.` });
});
