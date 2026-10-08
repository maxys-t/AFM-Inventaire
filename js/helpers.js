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
/* --- Ordre d'affichage ---
   L'ordre d'écriture des familles et des sous-catégories dans
   config.js EST l'ordre d'affichage. Réordonner le fichier suffit
   à réordonner l'application : inventaire, filtres, sélecteur de
   projet. Une famille inconnue passe en fin de liste plutôt que de
   faire disparaître ses items. */
function catIndex(c){
  const i = Object.keys(CATS).indexOf(c);
  return i === -1 ? 999 : i;
}
function subIndex(c, s){
  const i = Object.keys(subsOf(c)).indexOf(s);
  return i === -1 ? 999 : i;
}
/* Comparateur de la vue par défaut : famille, puis sous-catégorie,
   puis nom. */
function byCatOrder(a, b){
  return catIndex(a.cat) - catIndex(b.cat)
      || subIndex(a.cat, a.subcat) - subIndex(b.cat, b.subcat)
      || itemTitleText(a).localeCompare(itemTitleText(b), 'fr');
}

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
/* ---- Poids (v1.19) ----

   Stocké en grammes entiers, affiché en grammes sous le kilo et en
   kilos au-dessus. Personne n'écrit « 0,284 kg » pour un SM57.

   `parseWeight` accepte ce que les gens écrivent vraiment : virgule
   ou point, unité collée ou non, « env ». C'est exactement ce qui
   m'avait fait lire un tableau à moitié vide alors qu'il était
   rempli — l'indulgence du lecteur n'est pas du confort, c'est ce
   qui évite de perdre des données en silence. */
function parseWeight(v){
  if(v === null || v === undefined) return null;
  let s = String(v).toLowerCase().replace(/env|environ|~|≈/g,'').trim();
  if(!s) return null;
  const enGrammes = /\d\s*g\b/.test(s) && !/\d\s*kg/.test(s);
  s = s.replace(/kgs?\b|grammes?\b|g\b/g,'').trim().replace(',', '.');
  s = s.replace(/[^0-9.]/g,'');
  if(!s || s === '.') return null;
  const x = parseFloat(s);
  if(!isFinite(x) || x <= 0) return null;
  return Math.round(enGrammes ? x : x * 1000);
}

function fweight(g){
  if(g === null || g === undefined || g === '') return '';
  if(g < 1000) return `${Math.round(g)} g`;
  const kg = g / 1000;
  return `${(kg < 10 ? kg.toFixed(2) : kg.toFixed(1)).replace(/\.?0+$/,'')} kg`;
}

/* Le total d'un lot, et ce qu'il vaut. Un total muet sur ses trous
   laisse croire à une précision qu'il n'a pas. */
function weighLot(items){
  let g = 0, pesés = 0, estimés = 0, sans = 0, gEst = 0;
  items.forEach(i=>{
    if(i.weight_g){
      g += i.weight_g; pesés++;
      if(i.weight_est){ estimés++; gEst += i.weight_g; }
    } else sans++;
  });
  return {g, pesés, estimés, sans, gEst, total: items.length};
}
function lotLabel(w){
  if(!w.pesés) return `no weight on ${w.total} item${w.total>1?'s':''}`;
  let t = fweight(w.g);
  if(w.sans)    t += ` · ${w.sans} without a weight`;
  if(w.estimés) t += ` · ${fweight(w.gEst)} estimated`;
  return t;
}

/* ---- Lecture d'une photo (v1.18.1) ----

   Deux problèmes, une seule réponse.

   HEIC : c'est le format par défaut de l'iPhone, et aucun navigateur
   sauf Safari ne sait le décoder. Jusqu'ici le fichier était accepté,
   envoyé tel quel, et ne s'affichait nulle part. La parade tient en
   deux temps : `accept` ne mentionne QUE des formats universels, ce
   qui pousse iOS à convertir tout seul en JPEG au moment du choix ;
   et si un HEIC passe quand même (glisser-déposer, navigateur laxiste),
   on le dit clairement au lieu de stocker un fichier illisible.

   Poids : une photo d'iPhone fait 3 à 5 Mo. Six d'un coup sur une
   connexion de tournée, c'est une minute d'attente. On redimensionne
   à 1600 px avant l'envoi — bien au-delà de ce qu'un écran affiche,
   et dix fois plus léger. */
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
const PHOTO_MAXPX = 1600;

async function decodeImage(file){
  /* createImageBitmap est le chemin rapide, et le seul qui lise le
     HEIC là où le système le sait (Safari). */
  if(typeof createImageBitmap === 'function'){
    try{ return await createImageBitmap(file); }catch(e){}
  }
  const url = URL.createObjectURL(file);
  try{
    return await new Promise((res, rej)=>{
      const im = new Image();
      im.onload = ()=>res(im);
      im.onerror = ()=>rej(new Error('decode'));
      im.src = url;
    });
  } finally { setTimeout(()=>URL.revokeObjectURL(url), 1000); }
}

function photoFormatMessage(file){
  const n = (file && file.name || '').toLowerCase();
  return /\.(heic|heif)$/.test(n) || /heic|heif/.test(file && file.type || '')
    ? `${file.name} is a HEIC photo, which browsers cannot display. On an iPhone: Settings → Camera → Formats → Most Compatible, or export the photo as JPEG.`
    : `${(file && file.name) || 'This file'} could not be read as an image.`;
}

/* Renvoie un data URL JPEG, redimensionné. Lève une erreur parlante. */
async function fileToJpeg(file, maxPx){
  let src;
  try{ src = await decodeImage(file); }
  catch(e){ throw new Error(photoFormatMessage(file)); }
  const max = maxPx || PHOTO_MAXPX;
  const w0 = src.width, h0 = src.height;
  const k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas');
  c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  if(src.close) src.close();
  return c.toDataURL('image/jpeg', 0.85);
}

/* ---- Réparations (v1.17) ----
   Un item n'a qu'un dossier ouvert à la fois : la base l'impose par
   un index unique, donc find() suffit ici. */
function repairOf(id){
  return (db.repairs||[]).find(r=>r.item_id === id && r.status !== 'closed') || null;
}
function repairStage(id){ const r = repairOf(id); return r ? r.status : null; }
function providerOf(pid){ return (db.providers||[]).find(p=>p.id === pid) || null; }
function providerName(pid){ const p = providerOf(pid); return p ? p.name : '—'; }
function repairDays(r){ return daysSince(r.sent_at || r.opened_at); }
function repairStale(r){ return repairDays(r) >= REPAIR_STALE_DAYS; }

/* Relit un état physique, y compris les valeurs d'avant la v1.17
   encore présentes dans l'historique déjà écrit. */
function condLabel(c){ return CONDS[c] || CONDS_LEGACY[c] || c || ''; }
function faultLabel(f){ return FAULTS[f] || f || ''; }

function histBy(h){ return h.actorName ? ` <span class="muted">· by ${esc(h.actorName)}</span>` : ""; }
function histText(h){
  const u = h.userId ? " — " + esc(userName(h.userId)) : "";
  if(h.type==='out') return `checked out${u} (${esc(h.detail)})`;
  if(h.type==='in') return `returned${u}${h.cond?` — condition: ${condLabel(h.cond)}`:""}${h.detail?` (${esc(h.detail)})`:""}`;
  if(h.type==='move') return `moved: ${esc(h.detail)}`;
  if(h.type==='edit') return `edited${h.detail?` (${esc(h.detail)})`:""}`;
  if(h.type==='repair') return esc(h.detail);
  return esc(h.detail)||"created";
}
