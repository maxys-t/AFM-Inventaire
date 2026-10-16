/* Harnais v1.15 — tri et filtres depuis les en-têtes. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <header><h1></h1></header>
  <input type="search" id="q"><button id="btnReset"></button>
  <button id="view-compact"></button><button id="view-full"></button>
  <span class="colbox"><div class="colmenu" id="colMenu"></div></span>
  <div id="invFilters" class="filterbar"></div>
  <div id="invSummary"></div><div id="invList"></div>
  <div class="hdrmenu" id="hdrMenu"></div>
  <div id="out-item"></div><input id="out-user"><datalist id="borrowerList"></datalist>
  <input id="out-reason"><datalist id="offsiteList"></datalist>
  <input type="date" id="out-due"><input type="checkbox" id="out-alert">
  <div class="overlay" id="ovOut"></div>
  <div class="overlay" id="ovWarn"><div class="modal" id="warnBody"></div></div>
</body></html>`;

const STUBS = `
  var sb = null, me = {role:'admin'};
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[]};
  function item(id){ return db.items.find(i=>i.id===id); }
  function can(){ return true; }
  function canSeeValue(){ return me.role === 'admin'; }
  function openDetail(){} function renderBulkBar(){} function render(){}
  function toast(){} function open_(){} function close_(){} function openOver(){}
  var saved = null;
  async function apiLoadPrefs(){ return null; }
  async function apiSavePrefs(p){ saved = JSON.parse(JSON.stringify(p)); }
`;

const DATA = `
  db.locations = [{name:'AccessFlow',parent:null,kind:'site'},
                  {name:'Studio A',parent:'AccessFlow',kind:'room'}];
  var mk = (id,name,brand,cat,sub,cond,status,owner,prov,price,loc) => ({
    id, name, brand, cat, subcat:sub, cond, status,
    loc: loc||'Studio A', home:'Studio A', price, purchase_date:'2024-03-12',
    owner, provider:prov, serial:'', sales_order:'', notes:'', photo:null,
    out: status==='sorti' ? {userId:'u1',date:'2026-09-01T10:00:00Z',reason:'x',due:null} : null});
  db.items = [
    mk('SYN-001','Juno-106','Roland','instruments','synthe','bon','dispo','AF','Thomann',1200),
    mk('SYN-002','Prophet','Sequential','instruments','synthe','bon','dispo','PS','Algam',2400),
    mk('SYN-003','SH-101','Roland','instruments','synthe','attente','dispo','AF','Thomann',900),
    mk('MCN-001','U87','Neumann','captation','condensateur','bon','sorti','PS','Thomann',3000,'Trianon'),
    mk('MCN-002','TLM 103','Neumann','captation','condensateur','bon','dispo','AF','Algam',900),
    mk('XLR-001','XLR 3m','Cordial','cablage','xlr','bon','dispo','','',12)
  ];
`;

const TESTS = `
 (async () => {
  var R = [];
  function T(c,l){ R.push([!!c,l]); }
  function S(l){ R.push([null,l]); }
  var N = () => invFiltered().length;

  S('1. Filtrer depuis un en-tête');
  renderInv();
  T(N() === 6, 'aucun filtre : 6 items');
  toggleFilterValue('owner','AF',true);
  T(N() === 3, 'filtre propriétaire AF : 3 items (' + N() + ')');
  toggleFilterValue('owner','PS',true);
  T(N() === 5, 'deux valeurs cochées : 5 items');
  toggleFilterValue('owner','AF',false);
  T(N() === 2, 'décocher revient en arrière');
  clearFilter('owner');
  T(N() === 6, 'effacer le filtre rend tout');

  S('2. Deux colonnes filtrées se combinent');
  toggleFilterValue('prov','Thomann',true);
  toggleFilterValue('cond','Good',true);
  T(N() === 2, 'Thomann ET en bon état : 2 items (' + N() + ')');
  T(activeFilterKeys().sort().join(',') === 'cond,prov', 'deux filtres recensés');
  resetFilters();
  T(N() === 6 && activeFilterKeys().length === 0, 'remise à zéro');

  S('3. Les colonnes sans texte restent filtrables');
  T(filterValues('status').map(x=>x.v).sort().join(',') === 'Available,Checked out',
    'statut : deux valeurs lisibles');
  T(filterValues('photo').some(x=>x.v === 'No photo'), 'photo : présence / absence');
  toggleFilterValue('status','Checked out',true);
  T(N() === 1, 'un seul item sorti');
  resetFilters();

  S('4. Valeur vide');
  var ow = filterValues('owner');
  T(ow.some(x=>x.v === '(empty)'), 'les champs vides sont une valeur à part entière');
  T(ow[ow.length-1].v === '(empty)', 'rangée en fin de liste');
  toggleFilterValue('owner','(empty)',true);
  T(N() === 1, 'on peut isoler les items sans propriétaire');
  resetFilters();

  S('5. Tri à un niveau');
  sortBy('price', 1, false);
  var ids = sortItems(invFiltered()).map(i=>i.id);
  T(ids[0] === 'XLR-001', 'prix croissant : le moins cher en tête');
  sortBy('price', -1, false);
  ids = sortItems(invFiltered()).map(i=>i.id);
  T(ids[0] === 'MCN-001', 'décroissant : le plus cher en tête');
  T(sortLevels.length === 1, 'un seul niveau');

  S('6. Tri à deux niveaux');
  sortBy('owner', 1, false);
  sortBy('price', -1, true);
  T(sortLevels.length === 2, 'deux niveaux empilés');
  T(sortRank('owner').rang === 1 && sortRank('price').rang === 2, 'rangs corrects');
  ids = sortItems(invFiltered()).map(i=>i.id);
  // (empty) d'abord n'a pas de sens ici : on vérifie l'ordre dans AF
  var af = sortItems(invFiltered()).filter(i=>i.owner==='AF').map(i=>i.price);
  T(af.join(',') === [...af].sort((a,b)=>b-a).join(','),
    'à propriétaire égal, le prix départage : ' + af.join(' '));
  unsortBy('owner');
  T(sortLevels.length === 1 && sortLevels[0].k === 'price', 'on retire un niveau');
  resetFilters();

  S('7. Clic sur l’en-tête');
  headerSortClick('item', false);
  T(sortRank('item').dir === 1, 'premier clic : croissant');
  headerSortClick('item', false);
  T(sortRank('item').dir === -1, 'deuxième clic : décroissant');
  headerSortClick('cat', true);
  T(sortLevels.length === 2, 'maj + clic ajoute un niveau');
  resetFilters();

  S('8. Une colonne triée ou filtrée s’affiche d’office');
  resetCols();
  T(!invColDefs().some(c=>c.k === 'price'), 'le prix n’est pas dans les colonnes par défaut');
  sortBy('price', 1, false);
  T(invColDefs().some(c=>c.k === 'price'), 'trier dessus l’affiche');
  T(!prefs.invCols.includes('price'), 'sans modifier les préférences enregistrées');
  resetFilters();
  T(!invColDefs().some(c=>c.k === 'price'), 'elle disparaît quand le tri est levé');
  toggleFilterValue('prov','Algam',true);
  T(invColDefs().some(c=>c.k === 'prov'), 'filtrer dessus l’affiche aussi');
  resetFilters();

  S('9. Bandeau des filtres actifs');
  renderInv();
  T(document.getElementById('invFilters').style.display === 'none', 'masqué quand il n’y a rien');
  toggleFilterValue('owner','AF',true);
  sortBy('price',-1,false);
  renderInv();
  var fb = document.getElementById('invFilters');
  T(fb.style.display !== 'none', 'affiché dès qu’un filtre ou un tri existe');
  T(fb.innerHTML.includes('Owner') && fb.innerHTML.includes('AF'), 'le filtre est nommé avec sa valeur');
  T(fb.innerHTML.includes('Purchase price'), 'le tri aussi');
  T(fb.innerHTML.includes('Reset all'), 'une remise à zéro est proposée');
  resetFilters(); renderInv();
  T(document.getElementById('invFilters').style.display === 'none', 'il repart quand tout est propre');

  S('10. Vues fixes');
  resetCols();
  var manuel = invColKeys().slice();
  setInvView('compact');
  T(prefs.invView === 'compact', 'la vue Compact est active');
  T(invColKeys().length === 5, 'cinq colonnes');
  setInvView('full');
  T(invColKeys().length === INV_COLUMNS.length, 'la vue Full les montre toutes');
  setInvView('full');
  T(prefs.invView === null, 'recliquer revient au réglage manuel');
  T(invColKeys().join(',') === manuel.join(','), 'et ce réglage est intact');

  S('11. Toucher une colonne quitte la vue fixe');
  setInvView('compact');
  toggleCol('owner', true);
  T(prefs.invView === null, 'on sort de la vue');
  T(invColKeys().includes('owner'), 'la colonne demandée est là');
  T(invColKeys().includes('status'), 'et celles de la vue sont conservées');
  resetCols();

  S('12. Le prix reste réservé aux administrateurs');
  me.role = 'stagiaire';
  setInvView('full');
  T(!invColDefs().some(c=>c.k === 'price'), 'invisible même en vue Full');
  sortBy('price', 1, false);
  T(!invColDefs().some(c=>c.k === 'price'), 'et même en triant dessus');
  me.role = 'admin'; resetFilters(); resetCols();

  S('13. Mémorisation');
  toggleCol('serial', true);
  T(JSON.parse(localStorage.getItem(PREFS_KEY)).invCols.includes('serial'),
    'les colonnes sont enregistrées');
  setInvView('compact');
  T(JSON.parse(localStorage.getItem(PREFS_KEY)).invView === 'compact', 'la vue aussi');
  T(sanitizePrefs({invView:'nimporte quoi'}).invView === null, 'une vue inconnue est ignorée');
  resetCols();

  S('14. Les séparateurs suivent le premier niveau de tri');
  sortBy('cond', 1, false);
  renderInv();
  var seps = [...document.querySelectorAll('.seprow td')].map(t=>t.textContent.trim());
  T(seps.includes('Good'), 'séparateurs par état : ' + seps.join(' / '));
  resetFilters();
  renderInv();
  seps = [...document.querySelectorAll('.seprow td')].map(t=>t.textContent.trim());
  T(seps.includes('Instruments'), 'sans tri, on retrouve les familles');

  S('15. La position de défilement est préservée');
  /* Régression trouvée à l'usage : le tableau défile dans son propre
     cadre depuis la v1.13.1, et renderInv() le reconstruit entièrement.
     Déplier un groupe renvoyait en haut de la liste. */
  renderInv();
  var w = document.querySelector('#invList .invwrap');
  T(!!w, 'le cadre de défilement existe');
  // jsdom ne calcule pas de hauteur : on simule une position
  Object.defineProperty(w, 'scrollTop', {value:480, writable:true, configurable:true});
  var garde = invScrollSave();
  T(garde && garde.top === 480, 'la position est relevée avant le rendu');

  invScrollReset = false;
  T(!invScrollReset, 'par défaut on conserve la position');
  invResetScroll();
  T(invScrollReset, 'une action de tri ou de filtre demande le retour en haut');
  invScrollReset = false;

  // Les actions qui changent l'ordre déclenchent bien le retour en haut
  invScrollReset = false; sortBy('item', 1, false);
  T(invScrollReset === false, 'le drapeau est consommé par le rendu');
  resetFilters();

  S('16. Menu d’en-tête');
  openHeaderMenu('owner', null, null);
  var hm = document.getElementById('hdrMenu');
  T(hm.classList.contains('open'), 'le menu s’ouvre');
  T(hm.innerHTML.includes('Sort A → Z'), 'il propose le tri');
  T(hm.innerHTML.includes('AF') && hm.innerHTML.includes('PS'), 'et les valeurs à filtrer');
  T(hm.innerHTML.includes('Hide this column'), 'ainsi que le masquage');
  openHeaderMenu('owner', null, null);
  T(!hm.classList.contains('open'), 'recliquer le referme');
  openHeaderMenu('item', null, null);
  T(!document.getElementById('hdrMenu').innerHTML.includes('Hide this column'),
    'une colonne obligatoire ne propose pas de se masquer');
  closeHeaderMenu();

  window.__results = R;
 })();
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const app = read('js/app.js');
const pick = re => (app.match(re) || [''])[0];
const script = [STUBS, read('js/config.js'), read('js/helpers.js'), read('js/prefs.js'),
                read('js/views-inventory.js'),
                pick(/function syncInvHeight\(\)\{[\s\S]*?\n}/),
                DATA, TESTS].join('\n;\n');

(async () => {
  try{ dom.window.eval(script); }
  catch(e){ console.log('ERREUR À L’EXÉCUTION : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }
  for(let i=0; i<200 && !dom.window.__results; i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }

  const R = dom.window.__results;
  R.push([null, '17. La barre de filtres a bien disparu']);
  const h = read('index.html');
  ['fCat','fSub','fStatus','fLoc','fOwner','fProv','fCond','fSort'].forEach(id=>
    R.push([!h.includes('id="'+id+'"'), '  plus de menu ' + id]));
  R.push([h.includes('id="hdrMenu"'), 'le menu d’en-tête est dans la page']);
  R.push([h.includes('id="invFilters"'), 'le bandeau de filtres aussi']);
  R.push([h.includes('btn big'), 'le bouton d’ajout est agrandi']);

  let fails = 0;
  for(const [okv, label] of R){
    if(okv === null) console.log('\n' + label);
    else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
  }
  console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
  process.exit(fails ? 1 : 0);
})();
