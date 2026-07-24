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

/* --- Identifiants uniques (ex : CAB-003) --- */
function uid(cat){
  const code = CATCODE[cat]||"DIV";
  let max = 0;
  db.items.forEach(i=>{ const m = i.id.match(new RegExp('^'+code+'-(\\d+)$')); if(m) max = Math.max(max,+m[1]); });
  return code + "-" + String(max+1).padStart(3,"0");
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
function histText(h){
  const u = h.userId ? " — " + esc(userName(h.userId)) : "";
  if(h.type==='out') return `sortie${u} (${esc(h.detail)})`;
  if(h.type==='in') return `retour${u}${h.cond?` — état : ${CONDS[h.cond]||h.cond}`:""}${h.detail?` (${esc(h.detail)})`:""}`;
  if(h.type==='move') return `déplacé : ${esc(h.detail)}`;
  if(h.type==='edit') return `modifié${h.detail?` (${esc(h.detail)})`:""}`;
  if(h.type==='repair') return esc(h.detail);
  return esc(h.detail)||"créé";
}
