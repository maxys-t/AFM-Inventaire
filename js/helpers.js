/* ============================================================
   HELPERS — utilitaires (dates, texte, IDs, emplacements)
   Aucun accès à Supabase ici. Les fonctions d'historique
   (histIcon/histText) lisent l'état en mémoire via userName().
   ============================================================ */

/* --- Texte --- */
function esc(s){ return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

/* --- Dates --- */
function now(){ return new Date().toISOString(); }
function fdate(iso){ return new Date(iso).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}); }
function fdateD(d){ return new Date(d+'T00:00:00').toLocaleDateString('fr-FR'); }
function daysSince(iso){ return Math.floor((Date.now()-new Date(iso))/864e5); }
function overdue(i){ return !!(i.out && i.out.due && new Date(i.out.due+'T23:59:59') < new Date()); }
function daysLate(i){ return Math.floor((Date.now()-new Date(i.out.due+'T23:59:59'))/864e5)+1; }

/* --- Catégories à deux niveaux --- */
function catLabel(c){ return (CATS[c] && CATS[c].label) || c || '—'; }
function subsOf(c){ return (CATS[c] && CATS[c].subs) || {}; }
function subLabel(c,s){ const x = subsOf(c)[s]; return x ? x.label : (s || '—'); }
function catPath(i){ return catLabel(i.cat) + (i.subcat ? ' › ' + subLabel(i.cat, i.subcat) : ''); }
function catOptions(sel){
  return Object.entries(CATS).map(([k,v])=>`<option value="${k}"${sel===k?' selected':''}>${esc(v.label)}</option>`).join("");
}
function subOptions(c, sel){
  return Object.entries(subsOf(c)).map(([k,v])=>`<option value="${k}"${sel===k?' selected':''}>${esc(v.label)}</option>`).join("");
}
function codeFor(cat, sub){ const x = subsOf(cat)[sub]; return (x && x.code) || 'DIV'; }

/* --- Identifiants uniques (ex : CAB-003), basés sur la sous-catégorie --- */
function uid(cat, sub){
  const code = codeFor(cat, sub);
  let max = 0;
  db.items.forEach(i=>{ const m = i.id.match(new RegExp('^'+code+'-(\\d+)$')); if(m) max = Math.max(max,+m[1]); });
  const all = (db.trash||[]);
  all.forEach(i=>{ const m = i.id.match(new RegExp('^'+code+'-(\\d+)$')); if(m) max = Math.max(max,+m[1]); });
  return code + "-" + String(max+1).padStart(3,"0");
}

/* --- Affichage d'un item : « Manufacturer » en gras puis le modèle --- */
function itemTitle(i){
  const b = (i.brand||'').trim();
  return (b ? `<b>${esc(b)}</b> ` : '') + esc(i.name);
}
function itemTitleText(i){
  const b = (i.brand||'').trim();
  return (b ? b + ' ' : '') + (i.name||'');
}

/* --- Exemplaires multiples ---
   « Câble XLR 5m #3 » appartient à la famille « Câble XLR 5m ».
   Renvoie null si le nom ne suit pas cette convention. */
function groupKeyOf(name){
  const m = (name||'').match(/^(.*\S)\s+#\d+$/);
  return m ? m[1] : null;
}

/* --- Adresse d'une fiche (utilisée par les QR codes) ---
   Calculée depuis l'adresse du site : si le domaine change un jour,
   les nouveaux QR suivent automatiquement. */
function itemUrl(id){
  const base = (typeof APP_URL !== 'undefined' && APP_URL)
    ? APP_URL.replace(/\/$/,'') + '/'
    : location.origin + location.pathname;
  return base + '?item=' + encodeURIComponent(id);
}

/* --- Emplacements hiérarchiques --- */
function locObj(n){ return db.locations.find(l=>l.name===n); }
function locLabel(n){ const l = locObj(n); return l&&l.parent ? l.parent+" › "+n : n; }
function locRoots(){ return db.locations.filter(l=>!l.parent).sort((a,b)=>a.name.localeCompare(b.name)); }
function locChildren(p){ return db.locations.filter(l=>l.parent===p).sort((a,b)=>a.name.localeCompare(b.name)); }
function locOptions(){
  let html = "";
  locRoots().forEach(r=>{
    html += `<option value="${esc(r.name)}">${esc(r.name)}</option>`;
    locChildren(r.name).forEach(c=>{ html += `<option value="${esc(c.name)}">&nbsp;&nbsp;&nbsp;└ ${esc(c.name)}</option>`; });
  });
  db.locations.filter(l=>l.parent && !locObj(l.parent)).forEach(o=>{ html += `<option value="${esc(o.name)}">${esc(o.name)}</option>`; });
  return html;
}
function inLocFilter(sel,name){
  if(name===sel) return true;
  const l = locObj(name);
  return !!(l && l.parent===sel);
}

/* --- Formatage des lignes d'historique --- */
function histIcon(t){ return {create:"➕",out:"📤",in:"📥",move:"📍",edit:"✏️",repair:"🔧"}[t]||"•"; }
function histBy(h){ return h.actorName ? ` <span class="muted">· par ${esc(h.actorName)}</span>` : ""; }
function histText(h){
  const u = h.userId ? " — " + esc(userName(h.userId)) : "";
  if(h.type==='out') return `sortie${u} (${esc(h.detail)})`;
  if(h.type==='in') return `retour${u}${h.cond?` — état : ${CONDS[h.cond]||h.cond}`:""}${h.detail?` (${esc(h.detail)})`:""}`;
  if(h.type==='move') return `déplacé : ${esc(h.detail)}`;
  if(h.type==='edit') return `modifié${h.detail?` (${esc(h.detail)})`:""}`;
  if(h.type==='repair') return esc(h.detail);
  return esc(h.detail)||"créé";
}
