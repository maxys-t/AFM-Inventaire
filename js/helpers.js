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

/* --- Code périmé (v1.20.3) ---
   Changer la sous-catégorie d'un item ne renumérote pas son
   identifiant, et c'est voulu : un identifiant qui change tout seul
   rend une étiquette fausse sans prévenir. Mais l'écart doit se voir,
   sinon il s'accumule en silence — quatre cas étaient déjà là. */
function codeStale(i){
  if(!i || !i.id) return false;
  const attendu = codeFor(i.cat, i.subcat);
  const actuel = String(i.id).split('-')[0];
  return !!actuel && !!attendu && actuel !== attendu;
}
function staleItems(){ return (db.items||[]).filter(codeStale); }

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
/* ---- Packs (v1.20, simplifiés en v1.20.4, rouverts en v1.22) ----

   UNE seule relation : `pack_items`. Elle n'a jamais changé.

   La v1.20 en portait deux — le plan et la position — et c'est cette
   concurrence, pas la cardinalité, qui rendait l'écran illisible : on
   ne savait jamais laquelle des deux on manipulait. La v1.20.4 a
   supprimé la seconde, et en a profité pour interdire qu'un item
   figure dans plusieurs packs. Correction excessive.

   Car un pack n'est pas l'endroit où vit un item : c'est une RECETTE,
   un préréglage réutilisable. Le même préampli figure dans la config
   du rack studio et dans celle de la Pelicase de tournée ; une seule
   est montée à la fois. Depuis la 024, un item peut donc appartenir à
   plusieurs packs — et « où est-il ? » se lit sur son emplacement et
   son statut de sortie, jamais sur le pack.

   Conséquence : l'arbre devient un graphe. Un pack peut avoir
   plusieurs parents, et apparaître à plusieurs endroits de la liste.
   C'est honnête — la même caisse sert dans deux configurations — mais
   tout parcours vers le haut doit explorer TOUTES les branches, pas
   la première venue.                                                */

function pack(id){ return (db.packs||[]).find(p=>p.id === id) || null; }

/* Les packs dont cet item est le contenant. Depuis la v1.24 la même
   Pelicase peut servir à plusieurs configurations — ce sont des
   recettes, et une seule est montée à la fois. */
function packsOfContainer(itemId){
  return (db.packs||[]).filter(p=>p.container_id === itemId && !p.archived);
}
/* Celui qui RÉPOND de la caisse : l'assemblage monté, s'il existe.
   C'est lui qui porte l'imbrication et le poids — une configuration
   non montée n'occupe pas la boîte, donc ne revendique rien. La base
   garantit qu'il n'y en a qu'un (index packs_container_assembled_uniq). */
function packOfContainer(itemId){
  const l = packsOfContainer(itemId);
  if(!l.length) return null;
  return l.find(p=>p.permanent) || (l.length === 1 ? l[0] : null);
}

/* Ce qui peut servir de contenant. La liste guide, elle n'interdit
   pas : un item déjà contenant reste toujours proposé, sans quoi
   restreindre la liste casserait les caisses existantes. */
function isContainerKind(i){
  if(!i) return false;
  if(typeof CONTAINER_SUBS === 'undefined') return true;
  return CONTAINER_SUBS.includes(i.subcat) || packsOfContainer(i.id).length > 0;
}
/* Le contenu d'un pack. */
function packItemsOf(id){
  return (db.packItems||[]).filter(l=>l.pack_id === id)
    .map(l=>item(l.item_id)).filter(Boolean);
}
/* Les packs où figure un item — zéro, un, ou plusieurs. */
function packsOfItem(itemId){
  return (db.packItems||[]).filter(x=>x.item_id === itemId)
    .map(l=>pack(l.pack_id)).filter(Boolean);
}
/* Le pack « de référence » d'un item, quand il faut en nommer un seul
   (une ligne de tableau, une phrase). Un assemblage monté en
   permanence l'emporte : c'est là que l'objet se trouve vraiment. À
   défaut, l'unique pack s'il n'y en a qu'un. Sinon rien — mieux vaut
   ne rien dire que désigner une recette au hasard. */
function packOfItem(itemId){
  const l = packsOfItem(itemId);
  if(!l.length) return null;
  const montés = l.filter(p=>p.permanent);
  if(montés.length === 1) return montés[0];
  return l.length === 1 ? l[0] : null;
}

/* L'arbre : un pack est enfant d'un autre si son contenant y est rangé.
   Plusieurs parents sont désormais possibles. */
function packParents(p){
  return (p && p.container_id) ? packsOfItem(p.container_id) : [];
}
/* Un seul parent, pour les cas où l'on n'en affiche qu'un (fil
   d'ariane). Même règle que packOfItem. */
function packParent(p){
  return (p && p.container_id) ? packOfItem(p.container_id) : null;
}
function packChildren(id){
  return (db.packs||[]).filter(p=>packParents(p).some(par=>par.id === id));
}
function packRoots(){
  return (db.packs||[]).filter(p=>!p.archived && !packParents(p).length);
}

/* ---- Défilement pendant un glissement (v1.25.2) ----

   Un glissement interdit à la page de bouger — c'est ce qui le rend
   possible. Mais la caisse où l'on veut déposer est souvent hors de
   l'écran, et l'on se retrouvait à tenir un objet sans pouvoir aller
   là où il va. Le choix était : faire défiler, ou glisser.

   La liste défile donc toute seule quand le doigt approche d'un bord,
   d'autant plus vite qu'il en est près. C'est le conteneur sous le
   doigt qui défile s'il le peut, la page sinon — ainsi le contenu
   d'une caisse défile dans sa fenêtre, et l'arbre défile dans la
   page.                                                            */
const _dragScroll = {raf:0, el:null, v:0};

function _scrollableAncestor(node){
  while(node && node !== document.body && node !== document.documentElement){
    const s = getComputedStyle(node);
    if(/auto|scroll/.test(s.overflowY) && node.scrollHeight > node.clientHeight + 2) return node;
    node = node.parentElement;
  }
  return null;
}

function dragScrollMove(e){
  const ZONE = 72;           // la bande sensible, en pixels
  let cible = null;
  try{ cible = _scrollableAncestor(document.elementFromPoint(e.clientX, e.clientY)); }catch(err){}
  let haut = 0, bas = window.innerHeight;
  if(cible){ const b = cible.getBoundingClientRect(); haut = b.top; bas = b.bottom; }

  let v = 0;
  if(e.clientY < haut + ZONE)      v = -Math.ceil((haut + ZONE - e.clientY) / 3);
  else if(e.clientY > bas - ZONE)  v =  Math.ceil((e.clientY - (bas - ZONE)) / 3);

  _dragScroll.el = cible;
  _dragScroll.v  = Math.max(-28, Math.min(28, v));
  if(_dragScroll.v && !_dragScroll.raf) _dragScrollLoop();
  if(!_dragScroll.v) dragScrollStop();
}

function _dragScrollLoop(){
  _dragScroll.raf = requestAnimationFrame(()=>{
    _dragScroll.raf = 0;
    const v = _dragScroll.v;
    if(!v) return;
    if(_dragScroll.el) _dragScroll.el.scrollTop += v;
    else window.scrollBy(0, v);
    _dragScrollLoop();
  });
}

function dragScrollStop(){
  if(_dragScroll.raf) cancelAnimationFrame(_dragScroll.raf);
  _dragScroll.raf = 0; _dragScroll.el = null; _dragScroll.v = 0;
}

/* ---- Consommables (v1.22) ----
   Gaffer, colliers, piles, un multitool. Des lignes de checklist, pas
   des items : ni identifiant, ni fiche, ni historique, ni poids. Le
   poids d'un projet sert à parler à un transporteur ; y mêler une
   estimation de scotch le rendrait faux. */
function packExtrasOf(id){
  return (db.packExtras||[]).filter(e=>e.pack_id === id)
    .sort((a,b)=>(a.pos||0)-(b.pos||0) || String(a.label).localeCompare(String(b.label),'fr'));
}
/* Les consommables d'un pack ET de ses packs imbriqués. */
function packAllExtras(p, vus){
  vus = vus || new Set();
  if(!p || vus.has(p.id)) return [];
  vus.add(p.id);
  let out = packExtrasOf(p.id).map(e=>({...e, packName:p.name}));
  packItemsOf(p.id).forEach(i=>{
    const sous = packOfContainer(i.id);
    if(sous) out = out.concat(packAllExtras(sous, vus));
  });
  return out;
}

/* Poids effectif d'un item : le sien, plus celui du pack dont il est
   le contenant. Un lunchbox « pèse » ses modules. `vus` coupe les
   boucles — la base les refuse, mais un calcul sans fin fige l'écran
   sans rien dire. */
function itemWeightDeep(i, vus){
  vus = vus || new Set();
  if(!i || vus.has(i.id)) return 0;
  vus.add(i.id);
  let g = i.weight_g || 0;
  const p = packOfContainer(i.id);
  if(p) packItemsOf(p.id).forEach(m=>{ g += itemWeightDeep(m, vus); });
  return g;
}
/* Le poids d'un pack : son contenant, plus son contenu.

   Il passait par `itemWeightDeep(contenant)`, qui retrouvait le
   contenu via `packOfContainer`. Tant qu'un contenant n'appartenait
   qu'à un pack, c'était le même chemin. Depuis la v1.24, une caisse
   peut porter deux configurations : `packOfContainer` ne répond plus,
   et chaque configuration aurait alors pesé sa boîte vide. On lit
   donc le contenu du pack qu'on calcule, directement. */
function packWeight(p, vus){
  if(!p) return 0;
  vus = vus || new Set();
  if(vus.has('p:' + p.id)) return 0;
  vus.add('p:' + p.id);
  let g = 0;
  const c = p.container_id ? item(p.container_id) : null;
  if(c && !vus.has(c.id)){ vus.add(c.id); g += c.weight_g || 0; }
  packItemsOf(p.id).forEach(m=>{ g += itemWeightDeep(m, vus); });
  return g;
}
/* Le détail, pour ne pas afficher un total qu'on ne sait pas expliquer. */
function packWeightParts(p){
  const c = p.container_id ? item(p.container_id) : null;
  const dedans = packItemsOf(p.id);
  const sous = dedans.filter(m=>packOfContainer(m.id));
  return {
    contenant: c ? (c.weight_g || 0) : 0,
    sousPacks: sous.reduce((t,m)=>t + itemWeightDeep(m), 0),
    autres: dedans.filter(m=>!packOfContainer(m.id)).reduce((t,m)=>t + (m.weight_g||0), 0),
    nSousPacks: sous.length
  };
}

/* Tout ce qui part physiquement quand on sort un pack : le contenant
   lui-même, ses items, et le contenu des packs imbriqués. Sortir un
   rack sans son meuble, ou sans les modules du lunchbox qui est
   dedans, décrirait un chargement qui n'a jamais eu lieu. */
function packAllItems(p, vus){
  vus = vus || new Set();
  if(!p || vus.has('p:' + p.id)) return [];
  vus.add('p:' + p.id);
  const out = [];
  const c = p.container_id ? item(p.container_id) : null;
  if(c && !vus.has(c.id)){ vus.add(c.id); out.push(c); }
  packItemsOf(p.id).forEach(i=>{
    if(!vus.has(i.id)){ vus.add(i.id); out.push(i); }
    const sous = packOfContainer(i.id);
    if(sous) out.push(...packAllItems(sous, vus));
  });
  return out;
}

/* Ce qui est là, et ce qui n'y est pas. Un item « absent » n'est plus
   un item rangé ailleurs — c'est un item sorti ou en réparation.

   « Absent » n'a pas le même poids selon le pack. Dans un rack monté
   en permanence, un item manquant est un trou : quelque chose cloche.
   Dans une configuration qui n'est pas montée, rien ne manque — elle
   n'est simplement pas assemblée. Le compte est le même, c'est
   l'écran qui en tire des conclusions différentes. */
function packStatus(p){
  const présents = [], absents = [];
  packItemsOf(p.id).forEach(i=>{
    if(i.status === 'sorti' || repairOf(i.id)) absents.push({i, où: itemWhere(i)});
    else présents.push(i);
  });
  const dehors = packOut(p);
  return {présents, absents, total: présents.length + absents.length,
          dehors,
          /* Une caisse partie entière n'a rien perdu : elle est en
             déplacement. Crier « il manque trois éléments » quand ils
             sont dans la caisse, à l'autre bout de Paris, apprend le
             contraire de la vérité. */
          manque: !!p.permanent && absents.length > 0 && !dehors};
}

/* Le pack est-il sorti, et pour où ?
   Deux cas comptent : son contenant est sorti — la caisse est partie,
   donc le pack avec — ou tout son contenu est parti ensemble, ce qui
   revient au même sans boîte. On ne compte pas les départs à
   l'atelier : un objet en réparation s'en va seul, le pack reste. */
function packOut(p){
  if(!p) return null;
  const tous = packAllItems(p);
  if(!tous.length) return null;
  const dehors = tous.filter(i=>i.status === 'sorti' && !outForRepair(i));
  if(!dehors.length) return null;

  const c = p.container_id ? item(p.container_id) : null;
  const parContenant = !!(c && c.status === 'sorti' && !outForRepair(c));
  if(!parContenant && dehors.length !== tous.length) return null;

  const réf = parContenant ? c : dehors[0];
  return {
    /* La raison de la sortie d'abord : c'est elle qui porte le lieu
       (« Mustard Factory », « Show — Trianon »). Le nom de
       l'emprunteur ne vient qu'à défaut. */
    où: (réf.out && réf.out.reason) || outBy(réf) || '',
    quand: réf.out ? réf.out.date : null,
    projectId: réf.out ? réf.out.projectId : null,
    partiel: dehors.length < tous.length
  };
}
/* Où se trouve un item, en une phrase. */
function itemWhere(i){
  if(!i) return '';
  if(i.status === 'sorti') return outForRepair(i)
    ? `at ${i.out.reason}` : `checked out · ${i.out ? i.out.reason : ''}`;
  const r = repairOf(i.id);
  if(r) return r.status === 'sent' ? 'at the repair shop' : 'needs repair';
  /* Depuis la v1.22, un pack est une recette : il ne dit plus où
     l'objet se trouve. Seul un assemblage monté en permanence est
     aussi un lieu — sinon c'est l'emplacement qui répond. */
  const p = packOfItem(i.id);
  if(p && p.permanent) return `in ${p.name}`;
  return locLabel(i.loc) || '';
}
/* La photo d'un pack est celle de son contenant. */
function packPhoto(p){
  const c = p.container_id ? item(p.container_id) : null;
  if(c && c.photo) return c.photo;
  const m = packItemsOf(p.id).find(x=>x.photo);
  return m ? m.photo : null;
}
/* Ranger X dans C fermerait-il une boucle ? On part de la CIBLE et on
   remonte ses parents jusqu'au pack que X représente.

   Depuis la v1.22 un pack peut avoir plusieurs parents : remonter une
   seule branche laisserait passer une boucle fermée par l'autre. On
   explore donc tout l'ensemble des ancêtres, `vus` garantissant
   l'arrêt même si une boucle existe déjà en base. */
function packWouldLoop(packId, itemId){
  const pX = packOfContainer(itemId);
  if(!pX) return false;
  if(pX.id === packId) return true;
  const vus = new Set();
  const file = [pack(packId)].filter(Boolean);
  while(file.length){
    const p = file.shift();
    if(vus.has(p.id)) continue;
    vus.add(p.id);
    if(p.id === pX.id) return true;
    packParents(p).forEach(par=>{ if(!vus.has(par.id)) file.push(par); });
  }
  return false;
}

/* ---- Composition d'un projet (v1.22) ----

   Un projet est un mélange de caisses et d'items isolés. Tant qu'il se
   prépare, son contenu SUIT les packs : vider une Pelicase change ce
   qui partira. Au départ, il est FIGÉ dans `snapshot` — sinon, vider
   cette même caisse le lendemain réécrirait ce qui est parti la
   veille, et l'historique mentirait.

   Un item apporté par une caisse n'est pas compté une seconde fois
   s'il traîne aussi dans la liste des items isolés : on le retire de
   l'isolé, la caisse l'emporte. Deux caisses qui se partagent un item
   ne l'emportent qu'une fois, dans la première.                     */

function projPacks(p){ return (p.pack_ids||[]).map(id=>pack(id)).filter(Boolean); }

/* Indisponible pour CE projet : physiquement ailleurs. Sorti pour
   ce projet-ci, c'est au contraire la situation normale une fois le
   show commencé.

   Un objet signalé — en panne, hors service, dossier ouvert — n'est
   PAS indisponible : il est au studio, on peut l'emporter si on en a
   besoin. L'écarter d'office revenait à décider à la place de celui
   qui charge. Il part donc avec le projet, en portant sa mention. */
function projBusy(i, p){
  if(!i) return false;
  const r = repairOf(i.id);
  if(r && r.status === 'sent') return true;        // chez un réparateur
  if(i.status === 'sorti') return !(i.out && i.out.projectId === p.id);
  return false;
}

/* Ce qu'il faut signaler sans empêcher, en une phrase. */
function itemFlag(i){
  if(!i) return '';
  const r = repairOf(i.id);
  if(r && r.status !== 'sent') return 'repair reported';
  if(i.cond === 'hs') return 'out of service';
  if(i.cond === 'ko') return 'faulty';
  if(i.cond === 'use') return 'damaged';
  return '';
}

/* Clé de checklist d'un consommable : il n'a pas d'identifiant d'item,
   et `prep` est une table à plat. Le préfixe évite toute collision. */
function extraKey(e){ return 'x:' + e.id; }

/* La substitution décidée pour CE projet : « dans la caisse K, le
   MSD-002 est remplacé par le MSD-005 ». La recette n'est pas
   touchée — deux tournées successives peuvent substituer
   différemment. */
function subKey(packId, itemId){ return packId + '|' + itemId; }
function projSub(p, packId, itemId){
  const id = p && p.subs ? p.subs[subKey(packId, itemId)] : null;
  return id ? item(id) : null;
}

function projContent(p){
  if(!p) return {groups:[], loose:[], items:[], extras:[], doublons:[],
                 weight:0, missing:0, frozen:false};
  if(p.snapshot && p.status === 'show') return projFromSnapshot(p);

  const groups = [], vus = new Set(), doublons = [];
  projPacks(p).forEach(k=>{
    const tous = [];
    packAllItems(k).forEach(brut=>{
      /* Un exemplaire remplacé pour ce projet : c'est le remplaçant
         qui voyage, et la ligne dit d'où il vient. */
      const r = projSub(p, k.id, brut.id);
      const i = (r && !vus.has(r.id)) ? r : brut;
      if(!vus.has(i.id)){ vus.add(i.id); tous.push(i); return; }
      /* Déjà pris par une caisse précédente. Il ne doit SURTOUT pas
         disparaître sans un mot — c'était le défaut : on ne pouvait
         pas comprendre pourquoi la seconde caisse était incomplète. */
      doublons.push({item:i, packId:k.id, packName:k.name,
                     ailleurs:(groups.find(g=>g.items.some(x=>x.id===i.id))||{}).name || ''});
    });
    groups.push({
      packId: k.id, name: k.name, permanent: !!k.permanent,
      items:   tous.filter(i=>!projBusy(i, p)),
      écartés: tous.filter(i=>projBusy(i, p)),
      doublons: doublons.filter(d=>d.packId === k.id),
      extras:  packAllExtras(k).map(e=>({...e, key: extraKey(e)}))
    });
  });

  const loose = (p.item_ids||[])
    .filter(id=>!vus.has(id)).map(id=>item(id)).filter(Boolean);
  loose.forEach(i=>vus.add(i.id));

  const items  = groups.reduce((a,g)=>a.concat(g.items), []).concat(loose);
  const extras = groups.reduce((a,g)=>a.concat(g.extras), []);
  /* Les items supprimés de l'inventaire depuis la création du projet.
     On les compte pour pouvoir le dire, plutôt que de laisser le
     total baisser sans explication. */
  const missing = (p.item_ids||[]).filter(id=>!item(id)).length;

  return {groups, loose, items, extras, doublons,
          weight: items.reduce((t,i)=>t + (i.weight_g||0), 0),
          missing, frozen:false};
}

/* Un exemplaire libre du même modèle, pour prendre la place de celui
   qu'une autre caisse a déjà pris. « Libre » veut dire : ni déjà
   engagé dans ce projet, ni physiquement ailleurs. */
function projFreeTwin(p, i){
  if(!i) return null;
  const c = projContent(p);
  const pris = new Set(c.items.map(x=>x.id));
  (p.item_ids||[]).forEach(id=>pris.add(id));
  const base = groupKeyOf(i.name) || i.name;
  return db.items.find(x=>
    x.id !== i.id && !pris.has(x.id) &&
    x.subcat === i.subcat && (x.brand||'') === (i.brand||'') &&
    (groupKeyOf(x.name) || x.name) === base &&
    !projBusy(x, p)) || null;
}

/* Le contenu figé, relu tel quel. Un item disparu de l'inventaire
   depuis le départ est compté comme manquant, pas effacé. */
function projFromSnapshot(p){
  const s = p.snapshot || {};
  let missing = 0;
  const résoudre = ids => (ids||[]).map(id=>{
    const i = item(id); if(!i) missing++; return i;
  }).filter(Boolean);

  const groups = (s.packs||[]).map(g=>({
    packId: g.id, name: g.name, permanent: !!g.permanent,
    items: résoudre(g.items), écartés: [], doublons: [],
    extras: (g.extras||[]).map(e=>({...e, key: extraKey(e)}))
  }));
  const loose  = résoudre(s.items);
  const items  = groups.reduce((a,g)=>a.concat(g.items), []).concat(loose);
  const extras = groups.reduce((a,g)=>a.concat(g.extras), []);
  return {groups, loose, items, extras, doublons:[],
          weight: items.reduce((t,i)=>t + (i.weight_g||0), 0),
          missing, frozen:true};
}

/* La photographie prise au moment du départ. */
function projSnapshot(p){
  const c = projContent(p);
  return {
    frozen_at: new Date().toISOString(),
    packs: c.groups.map(g=>({
      id: g.packId, name: g.name, permanent: g.permanent,
      items: g.items.map(i=>i.id),
      extras: g.extras.map(e=>({id:e.id, label:e.label, qty:e.qty}))
    })),
    items: c.loose.map(i=>i.id)
  };
}

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

/* Toujours en kilos, jamais en grammes. Une colonne qui alterne
   « 284 g » et « 16.7 kg » ne se compare pas d'un coup d'œil : il
   faut convertir de tête à chaque ligne. Deux décimales fixes et la
   même unité partout, et la colonne se lit comme une colonne.
   Format français, comme les prix de l'application. */
function fweight(g){
  if(g === null || g === undefined || g === '') return '';
  return (g / 1000).toLocaleString('fr-FR',
    {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' kg';
}

/* Le total d'un lot, et ce qui lui manque. Un total muet sur ses
   trous laisse croire à une précision qu'il n'a pas. */
function weighLot(items){
  let g = 0, pesés = 0, sans = 0;
  items.forEach(i=>{ if(i.weight_g){ g += i.weight_g; pesés++; } else sans++; });
  return {g, pesés, sans, total: items.length};
}
function lotLabel(w){
  if(!w.pesés) return `no weight on ${w.total} item${w.total>1?'s':''}`;
  return fweight(w.g) + (w.sans ? ` · ${w.sans} without a weight` : '');
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

/* Remplit un menu d'états depuis CONDS. Les deux menus de l'appli
   portaient leurs options écrites en dur dans index.html : passer de
   trois à quatre états n'a donc rien changé à l'écran, alors que le
   reste du code suivait. Une liste recopiée finit toujours par
   diverger de l'originale. */
function fillConds(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.innerHTML = Object.entries(CONDS)
    .map(([k,l])=>`<option value="${k}">${esc(l)}</option>`).join('');
}
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
