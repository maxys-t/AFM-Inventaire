/* ============================================================
   HELPERS — utilitaires (dates, texte, IDs, emplacements)
   Aucun accès à Supabase ici. Les fonctions d'historique
   (histIcon/histText) lisent l'état en mémoire via userName().
   ============================================================ */

/* --- Texte --- */
function esc(s){ return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

/* --- Dates --- */
function now(){ return new Date().toISOString(); }

/* Toutes les dates de l'interface s'affichent en AAAA/MM/JJ.
   Choix volontaire : 03/04 ne veut pas dire la même chose pour tout
   le monde, alors que 2026/04/03 ne laisse aucun doute — et se classe
   correctement dans l'ordre alphabétique. */
function pad2(n){ return String(n).padStart(2,'0'); }
function ymd(dt){ return dt.getFullYear() + '/' + pad2(dt.getMonth()+1) + '/' + pad2(dt.getDate()); }
function fdate(iso){
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '';
  return ymd(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function fdateD(d){
  if(!d) return '';
  const x = new Date(d + 'T00:00:00');
  return isNaN(x.getTime()) ? '' : ymd(x);
}
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

/* --- Prix --- */
function fprice(v){ return (v==null || v==='' || isNaN(v)) ? '' : Number(v).toLocaleString('fr-FR',{style:'currency',currency:'EUR'}); }
/* « 1 200,50 € » → 1200.5 ; « 1,299.00 » → 1299 ; « 1.200 » → 1200 ; vide → null */
function parsePrice(v){
  let t = String(v==null?'':v).replace(/[^\d,.-]/g,'');
  if(!t) return null;
  const c = t.lastIndexOf(','), d = t.lastIndexOf('.');
  if(c>=0 && d>=0){                       // les deux : le dernier est la décimale
    t = c>d ? t.replace(/\./g,'').replace(',','.') : t.replace(/,/g,'');
  }else if(c>=0){                         // virgule seule
    t = /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g,'') : t.replace(',','.');
  }else if(d>=0){                         // point seul : « 1.200 » = milliers, « 9.90 » = décimale
    if(/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g,'');
  }
  const n = parseFloat(t); return isNaN(n) ? null : Math.round(n*100)/100;
}

/* --- Date d'achat (jour seul, sans heure) --- */
function fdateOnly(d){ return fdateD(d); }
/* Accepte « 12/03/2024 », « 2024-03-12 », « 12.03.2024 » → « 2024-03-12 » ; sinon null */
function parseDate(v){
  const t = String(v==null?'':v).trim();
  if(!t) return null;
  let m = t.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);          // année en premier
  if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m = t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/);            // jour/mois/année
  if(m){
    let [,d,mo,y] = m;
    if(y.length===2) y = (+y > 70 ? '19' : '20') + y;
    if(+d > 31 || +mo > 12) return null;
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  return null;
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

/* --- Emplacements ---
   Deux niveaux, pas plus : un SITE (AccessFlow) contient des SALLES
   (Studio A). À part, les lieux OFF-SITE sont des adresses
   extérieures — une salle de concert, un client — où du matériel
   part temporairement. Un item n'y a jamais son rangement habituel.

   Un lieu archivé disparaît des menus déroulants mais reste dans la
   base : l'historique continue de le nommer correctement. */
function locObj(n){ return db.locations.find(l=>l.name===n); }
function locKind(n){ const l = locObj(n); return (l && l.kind) || (l && l.parent ? 'room' : 'site'); }
function isOffsite(n){ return locKind(n) === 'offsite'; }
function locArchived(n){ const l = locObj(n); return !!(l && l.archived); }

/* --- Adresses ---
   Une adresse se lit sur plusieurs lignes dans un mail et sur une
   seule dans un tableau : d'où les deux fonctions. */
function locAddrParts(n){
  const l = locObj(n) || {};
  return {street:l.street||'', extra:l.extra||'', zip:l.zip||'', city:l.city||'', phone:l.phone||''};
}
function locAddressLines(n){
  const a = locAddrParts(n);
  const out = [];
  if(a.street) out.push(a.street);
  if(a.extra)  out.push(a.extra);
  const cityLine = [a.zip, a.city].filter(Boolean).join(' ').trim();
  if(cityLine) out.push(cityLine);
  return out;
}
function locAddress(n){ return locAddressLines(n).join(', '); }
function locPhone(n){ return locAddrParts(n).phone; }
function hasAddress(n){ return locAddressLines(n).length > 0; }
function locLabel(n){
  const l = locObj(n);
  if(!l) return n;
  return l.parent ? l.parent + " › " + n : n;
}
/* Sites uniquement : un off-site n'est pas une racine d'arborescence. */
function locRoots(){
  return db.locations.filter(l=>!l.parent && l.kind !== 'offsite')
                     .sort((a,b)=>a.name.localeCompare(b.name));
}
function locChildren(p){
  return db.locations.filter(l=>l.parent===p).sort((a,b)=>a.name.localeCompare(b.name));
}
function offsites(includeArchived){
  return db.locations.filter(l=>l.kind === 'offsite' && (includeArchived || !l.archived))
                     .sort((a,b)=>a.name.localeCompare(b.name));
}
/* Orphelins : un sous-emplacement dont le parent a disparu. On les
   affiche quand même, sinon leurs items deviendraient introuvables. */
function locOrphans(){
  return db.locations.filter(l=>l.parent && !locObj(l.parent) && l.kind !== 'offsite');
}

/* Emplacements où un item peut être RANGÉ : sites et salles, jamais
   un off-site. Utilisé par le formulaire d'item et le déplacement groupé. */
function homeOptions(){
  let html = "";
  locRoots().filter(r=>!r.archived).forEach(r=>{
    html += `<option value="${esc(r.name)}">${esc(r.name)}</option>`;
    locChildren(r.name).filter(c=>!c.archived).forEach(c=>{
      html += `<option value="${esc(c.name)}">&nbsp;&nbsp;&nbsp;└ ${esc(c.name)}</option>`;
    });
  });
  locOrphans().forEach(o=>{ html += `<option value="${esc(o.name)}">${esc(o.name)}</option>`; });
  return html;
}
/* Tous les lieux, off-site compris : filtres et destinations. */
function locOptions(){
  let html = homeOptions();
  const off = offsites(false);
  if(off.length){
    html += `<optgroup label="Off-site">`
          + off.map(o=>`<option value="${esc(o.name)}">${esc(o.name)}</option>`).join("")
          + `</optgroup>`;
  }
  return html;
}
function inLocFilter(sel,name){
  if(name===sel) return true;
  const l = locObj(name);
  return !!(l && l.parent===sel);
}

/* --- Formatage des lignes d'historique --- */
function histIcon(t){ return {create:"➕",out:"📤",in:"📥",move:"📍",edit:"✏️",repair:"🔧"}[t]||"•"; }
function histBy(h){ return h.actorName ? ` <span class="muted">· by ${esc(h.actorName)}</span>` : ""; }
function histText(h){
  const u = h.userId ? " — " + esc(userName(h.userId)) : "";
  if(h.type==='out') return `checked out${u} (${esc(h.detail)})`;
  if(h.type==='in') return `returned${u}${h.cond?` — condition: ${CONDS[h.cond]||h.cond}`:""}${h.detail?` (${esc(h.detail)})`:""}`;
  if(h.type==='move') return `moved: ${esc(h.detail)}`;
  if(h.type==='edit') return `edited${h.detail?` (${esc(h.detail)})`:""}`;
  if(h.type==='repair') return esc(h.detail);
  return esc(h.detail)||"created";
}
