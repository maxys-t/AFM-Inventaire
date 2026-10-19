/* Harnais de test v1.10 — colonnes, séparateurs, reset, préférences.
   Tout s'exécute dans UN SEUL eval : les déclarations `const` et `let`
   d'un eval global ne sont pas visibles depuis l'eval suivant. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <input type="search" id="q"><select id="fCat"></select><select id="fSub"></select>
  <select id="fStatus"></select><select id="fLoc"></select><select id="fOwner"></select>
  <select id="fProv"></select><select id="fCond"></select>
  <select id="fSort">
    <option value=""></option><option value="name"></option><option value="price"></option>
    <option value="pdate"></option><option value="cat"></option>
  </select>
  <button id="sortDir">↑</button><button id="btnReset"></button>
  <span class="colbox"><div class="colmenu" id="colMenu"></div></span>
  <div id="invSummary"></div><div id="invList"></div>
</body></html>`;

const STUBS = `
  var sb = null, me = {role:'admin'}, prefsSaves = 0;
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[]};
  function can(){ return true; }
  function canSeeValue(){ return me.role === 'admin'; }
  function openDetail(){}
  function renderBulkBar(){}
  function item(id){ return db.items.find(i=>i.id===id); }
  async function apiLoadPrefs(){ return null; }
  async function apiSavePrefs(){ prefsSaves++; }
`;

const DATA = `
  db.locations = [{name:'AccessFlow',parent:null},{name:'Studio A',parent:'AccessFlow'}];
  db.items = [
    {id:'SYN-001',name:'Juno-106',brand:'Roland',cat:'instruments',subcat:'synthe',cond:'bon',
     status:'dispo',loc:'Studio A',home:'Studio A',price:1200,purchase_date:'2024-03-12',
     owner:'AFM',provider:'Thomann',serial:'JU1',sales_order:'SO-1',notes:'',photo:null},
    {id:'SYN-002',name:'Prophet',brand:'Sequential',cat:'instruments',subcat:'synthe',cond:'attente',
     status:'dispo',loc:'AccessFlow',home:'Studio A',price:80,purchase_date:'2025-07-02',
     owner:'',provider:'',serial:'',sales_order:'',notes:'',photo:null},
    {id:'MCN-001',name:'U87',brand:'Neumann',cat:'captation',subcat:'condensateur',cond:'bon',
     status:'sorti',loc:'Trianon',home:'Studio A',price:null,purchase_date:null,
     owner:'Tom',provider:'',serial:'',sales_order:'',notes:'',
     photo:null,out:{userId:'u1',date:'2026-09-01',reason:'show',due:null}}
  ];
`;

const TESTS = `
  var R = [];
  function T(cond, label){ R.push([!!cond, label]); }
  function S(label){ R.push([null, label]); }
  var H = () => document.getElementById('invList').innerHTML;

  S('1. Colonnes par défaut');
  renderInv();
  /* v2.0.2 : « Pack » rejoint les colonnes par défaut. « Case » est
     le conditionnement propre à l'objet — sa housse ; « Pack » est la
     caisse dans laquelle il voyage. On confondait les deux faute d'en
     voir une. */
  T(invColDefs().map(c=>c.k).join(',') === 'photo,item,id,cat,status,loc,pack,cond',
    'ordre par défaut respecté');
  T(document.querySelectorAll('#invList thead th').length === 10,
    'en-tête = 8 colonnes + case à cocher + actions');
  T(!/<br>/.test(H()), 'plus aucun retour à la ligne dans les cellules');

  S('2. Affichage / masquage');
  toggleCol('price', true); toggleCol('id', false);
  T(invColDefs().map(c=>c.k).join(',') === 'photo,item,cat,status,loc,pack,cond,price',
    'prix ajouté, ID retiré, ordre canonique conservé');
  T(H().includes('col-price'), 'la colonne prix est rendue');
  T(!H().includes('col-id'), 'la colonne ID a disparu');

  S('3. Le prix reste réservé aux administrateurs');
  me.role = 'stagiaire'; renderInv();
  T(!invColDefs().map(c=>c.k).includes('price'), 'colonne prix masquée pour un stagiaire');
  renderColMenu();
  T(!document.getElementById('colMenu').innerHTML.includes('Purchase price'),
    'le prix n’apparaît pas non plus dans le menu');
  me.role = 'admin'; resetCols();

  S('4. Séparateurs de tri');
  sortBy('price', 1, false);
  var h = H();
  T(h.includes('Under 100 €') && h.includes('1 000 – 5 000 €'), 'tranches de prix affichées');
  T(h.includes('No price'), 'section « No price » présente');
  T(h.indexOf('No price') > h.indexOf('Under 100'), 'les valeurs absentes finissent en bas');

  sortBy('pdate', 1, false);
  h = H();
  T(h.includes('March 2024') && h.includes('July 2025'), 'mois affichés pour le tri par date');

  sortBy('item', 1, false);
  T(/class="seprow"/.test(H()), 'séparateurs alphabétiques présents');
  var nbCols = invColDefs().length + 2;
  var spans = [...document.querySelectorAll('.seprow td')].map(t=>Number(t.getAttribute('colspan')));
  T(spans.length > 0 && spans.every(s=>s === nbCols),
    'colspan des séparateurs = nombre de colonnes (' + nbCols + ')');

  S('5. Sans tri, les séparateurs deviennent ceux des familles');
  /* Comportement changé en v1.14 : la vue par défaut est regroupée par
     famille, dans l'ordre de config.js. Auparavant elle n'avait aucun
     séparateur. */
  sortLevels = []; renderInv();
  var sd = [...document.querySelectorAll('.seprow td')].map(t=>t.textContent.trim());
  T(sd.length > 0, 'des séparateurs sont présents');
  T(sd.every(x=>Object.values(CATS).some(c=>c.label === x)),
    'ce sont bien des noms de familles : ' + sd.join(' / '));

  S('6. Reset filters');
  document.getElementById('q').value = 'juno';
  document.getElementById('fCond').value = 'bon';
  renderInv();
  T(filtersActive(), 'filtres détectés comme actifs');
  T(!document.getElementById('btnReset').disabled, 'bouton actif');
  sortBy('price', -1, false);
  resetFilters();
  T(document.getElementById('q').value === '' && document.getElementById('fCond').value === '',
    'champs vidés');
  T(sortLevels.length === 0, 'le tri est levé');
  T(document.getElementById('btnReset').disabled, 'bouton désactivé une fois propre');

  S('7. Préférences');
  T(JSON.parse(localStorage.getItem(PREFS_KEY)).invCols.length > 0,
    'préférences écrites en localStorage');
  T(sanitizePrefs({invCols:['item','colonne_inexistante'], seen:['pack']}).invCols.join(',') === 'item',
    'une colonne inconnue est ignorée sans casser');
  /* v2.0.2 : une colonne nouvelle est proposée UNE fois à qui avait
     déjà réglé les siennes — sinon elle resterait invisible chez tout
     le monde sauf les nouveaux venus. Ensuite, la décocher tient. */
  T(sanitizePrefs({invCols:['item','loc']}).invCols.join(',') === 'item,loc,pack',
    'une colonne nouvelle est glissée une fois après « où »');
  T(sanitizePrefs({invCols:['item','loc'], seen:['pack']}).invCols.join(',') === 'item,loc',
    'et ne revient pas une fois écartée');
  T(sanitizePrefs({invCols:[]}).invCols.join(',') === INV_DEFAULT_COLS.join(','),
    'une liste vide retombe sur les colonnes par défaut');
  T(sanitizePrefs(null).invCols.length === INV_DEFAULT_COLS.length,
    'préférences absentes = valeurs par défaut');

  S('8. Groupes d’exemplaires');
  db.items.push({id:'XLR-001',name:'XLR 3m #1',brand:'Cordial',cat:'cablage',subcat:'xlr',cond:'bon',
    status:'dispo',loc:'Studio A',home:'Studio A',price:12,purchase_date:'2024-01-05',
    owner:'',provider:'',serial:'',sales_order:'',notes:'',photo:null});
  db.items.push({id:'XLR-002',name:'XLR 3m #2',brand:'Cordial',cat:'cablage',subcat:'xlr',cond:'bon',
    status:'dispo',loc:'Studio A',home:'Studio A',price:12,purchase_date:'2024-01-05',
    owner:'',provider:'',serial:'',sales_order:'',notes:'',photo:null});
  renderInv();
  T(H().includes('grouprow') && H().includes('2 copies'),
    'ligne de groupe rendue avec le nombre d’exemplaires');
  T(document.querySelector('.grouprow').querySelectorAll('td').length === invColDefs().length + 2,
    'la ligne de groupe a autant de cellules que l’en-tête');

  S('9. Emplacement différent du rangement habituel');
  toggleCol('home', true); renderInv();
  T(H().includes('awayhome'), 'un item hors de son emplacement habituel est signalé');

  S('10. Robustesse');
  db.items = [];
  renderInv();
  T(H().includes('No item matches'), 'inventaire vide : message, pas d’erreur');
  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'),
                read('js/prefs.js'), read('js/views-inventory.js'), DATA, TESTS].join('\n;\n');

try{ dom.window.eval(script); }
catch(e){ console.log('ERREUR À L’EXÉCUTION : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }

let fails = 0;
for(const [okv, label] of dom.window.__results){
  if(okv === null) console.log('\n' + label);
  else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
}
console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
process.exit(fails ? 1 : 0);
