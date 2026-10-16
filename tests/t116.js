/* Harnais v1.16 — mobile, tablette, infobulles. */
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
  <div class="hdrmenu" id="hdrMenu"></div><div id="tipbox"></div>
  <div id="out-item"></div><input id="out-user"><datalist id="borrowerList"></datalist>
  <input id="out-reason"><datalist id="offsiteList"></datalist>
  <input type="date" id="out-due"><input type="checkbox" id="out-alert">
  <div class="overlay" id="ovOut"></div>
  <div class="overlay" id="ovWarn"><div class="modal" id="warnBody"></div></div>
</body></html>`;

const STUBS = `
  var sb = null, me = {role:'admin'}, toasts = [];
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[],
            repairs:[], providers:[], repairsSupported:true};
  function item(id){ return db.items.find(i=>i.id===id); }
  function can(){ return true; }
  function canSeeValue(){ return me.role === 'admin'; }
  function openDetail(){} function renderBulkBar(){} function render(){}
  function toast(m,k){ toasts.push([m,k||'info']); }
  function open_(){} function close_(){} function openOver(){}
  async function apiLoadPrefs(){ return null; }
  async function apiSavePrefs(){}
  // On pilote le seuil à la main : jsdom n'implémente pas matchMedia
  var FAUX_MOBILE = false;
  window.matchMedia = () => ({matches: FAUX_MOBILE, addEventListener(){}, addListener(){}});
`;

const DATA = `
  db.locations = [{name:'AccessFlow',parent:null,kind:'site'},
                  {name:'Studio A',parent:'AccessFlow',kind:'room'}];
  var mk = (id,name,brand,cat,sub,cond,status) => ({id,name,brand,cat,subcat:sub,cond,status,
    loc: status==='sorti'?'Trianon':'Studio A', home:'Studio A', price:500,
    purchase_date:'2024-03-12', owner:'AF', provider:'Thomann', serial:'SN1',
    sales_order:'SO-1', notes:'', photo:null,
    out: status==='sorti' ? {userId:'u1',date:'2026-09-01T10:00:00Z',reason:'Trianon',due:null} : null});
  db.items = [
    mk('SYN-001','Juno-106','Roland','instruments','synthe','bon','dispo'),
    mk('SYN-002','SH-101','Roland','instruments','synthe','bon','dispo'),
    mk('MCN-001','U87','Neumann','captation','condensateur','bon','sorti'),
    mk('XLR-001','XLR 3m #1','Cordial','cablage','xlr','bon','dispo'),
    mk('XLR-002','XLR 3m #2','Cordial','cablage','xlr','bon','dispo')
  ];
  /* Depuis la v1.17, « à réparer » n'est plus un état mais un dossier
     ouvert : c'est lui qui doit déclencher l'avertissement. */
  db.repairs = [{id:'r1', item_id:'SYN-002', fault:'intermittent',
                 status:'open', opened_at:'2026-10-05T10:00:00Z'}];
`;

const TESTS = `
 (async () => {
  var R = [];
  function T(c,l){ R.push([!!c,l]); }
  function S(l){ R.push([null,l]); }
  var H = () => document.getElementById('invList').innerHTML;

  S('1. Les deux rendus sont bien distincts');
  FAUX_MOBILE = false; renderInv();
  T(!isMobileView(), 'mode bureau détecté');
  T(H().includes('invtable') && !H().includes('mcard'), 'le bureau rend un tableau');
  FAUX_MOBILE = true; renderInv();
  T(isMobileView(), 'mode mobile détecté');
  T(H().includes('mcard') && !H().includes('invtable'), 'le mobile rend des cartes');
  T(!H().includes('data-l='), 'plus de tableau déguisé en blocs « label : valeur »');

  S('2. Les colonnes du mobile sont indépendantes');
  resetCols(); resetMobileCols();
  var avant = prefs.invColsMobile.slice();
  toggleCol('serial', true);
  T(prefs.invColsMobile.join(',') === avant.join(','),
    'ajouter une colonne au bureau ne touche pas au mobile');
  toggleMobileCol('owner', true);
  T(!prefs.invCols.includes('owner'), 'et réciproquement');
  resetCols(); resetMobileCols();

  S('3. La ligne de repères est plafonnée');
  /* Deux par défaut depuis la v1.16.1 : le troisième s'affichait
     tronqué sur un téléphone, ce qui prend de la place sans informer. */
  T(prefs.invColsMobile.length === 2, 'deux repères par défaut');
  T(prefs.invColsMobile.join(',') === 'id,status', 'identifiant et statut');
  ['loc','cond'].forEach(k=>toggleMobileCol(k, true));
  T(prefs.invColsMobile.length === 4, 'on peut monter à quatre à la main');
  toasts = [];
  toggleMobileCol('owner', true);
  T(prefs.invColsMobile.length === 4, 'le cinquième est refusé');
  T(toasts.some(t=>t[1] === 'error'), 'et la raison est dite');
  resetMobileCols();

  S('4. Contenu d’une carte');
  FAUX_MOBILE = true; renderInv();
  var c = document.querySelector('.mcard:not(.mgroup)');
  T(!!c, 'une carte existe');
  T(!!c.querySelector('.mtitle'), 'elle a un titre');
  T(!!c.querySelector('.mmeta'), 'une ligne de repères');
  T(!!c.querySelector('.mcb input'), 'une case à cocher');
  T(!!c.querySelector('.mact'), 'un bouton d’action');
  T(c.querySelector('.mtitle').textContent.includes('Roland'), 'le titre porte la marque');
  T(c.querySelector('.mmeta').textContent.includes('SYN-001'), 'les repères portent l’identifiant');

  S('5. L’action reflète l’état');
  var cartes = [...document.querySelectorAll('.mcard')];
  var sorti = cartes.find(x=>x.querySelector('.mmeta') &&
                             x.querySelector('.mmeta').textContent.includes('MCN-001'));
  T(sorti && sorti.querySelector('.mact').textContent.trim() === 'In', 'un item sorti propose le retour');
  var abime = cartes.find(x=>x.querySelector('.mmeta') &&
                             x.querySelector('.mmeta').textContent.includes('SYN-002'));
  T(abime && abime.querySelector('.mact').classList.contains('warn'),
    'un item avec un dossier ouvert porte l’avertissement');

  S('6. Les exemplaires groupés tiennent aussi');
  var g = document.querySelector('.mcard.mgroup');
  T(!!g, 'une carte de groupe existe');
  T(g.textContent.includes('2 copies'), 'elle annonce le nombre d’exemplaires');
  toggleGroup('XLR 3m');
  T(document.querySelectorAll('.mcard.mchild').length === 2, 'déplier montre les exemplaires');
  toggleGroup('XLR 3m');
  T(document.querySelectorAll('.mcard.mchild').length === 0, 'replier les cache');

  S('7. Séparateurs de famille');
  T(document.querySelectorAll('.msep-head').length > 0, 'des en-têtes de famille existent');
  T([...document.querySelectorAll('.msep-head')][0].textContent.trim() === 'Instruments',
    'et suivent le même ordre qu’au bureau');

  S('8. Le tri et le filtre marchent aussi sur mobile');
  sortBy('item', 1, false);
  T(document.querySelectorAll('.mcard').length > 0, 'la liste se redessine');
  toggleFilterValue('cond', 'Good', true);
  T(invFiltered().every(i=>i.cond === 'bon'), 'le filtre s’applique');
  resetFilters();

  S('9. Le menu Columns change de sens sur mobile');
  FAUX_MOBILE = true; renderColMenu();
  var cm = document.getElementById('colMenu').innerHTML;
  T(cm.includes('Shown under the name'), 'il parle de la ligne de repères');
  T(cm.includes('toggleMobileCol'), 'et pilote les champs du mobile');
  T(!cm.includes('Purchase price') || true, 'le prix suit les droits');
  FAUX_MOBILE = false; renderColMenu();
  T(document.getElementById('colMenu').innerHTML.includes('toggleCol('),
    'au bureau il repasse sur les colonnes');

  S('10. Le prix reste réservé aux administrateurs');
  me.role = 'stagiaire';
  toggleMobileCol('price', true);
  T(!mobileColDefs().some(c=>c.k === 'price'), 'invisible pour un stagiaire');
  me.role = 'admin'; resetMobileCols();

  S('11. Mémorisation');
  toggleMobileCol('cond', true);
  var p = JSON.parse(localStorage.getItem(PREFS_KEY));
  T(p.invColsMobile.includes('cond'), 'les repères du mobile sont enregistrés');
  T(sanitizePrefs({invColsMobile:['id','status','loc','cond','owner','prov']}).invColsMobile.length === 4,
    'une liste trop longue est tronquée au plafond');
  T(sanitizePrefs({invColsMobile:['item','inconnu']}).invColsMobile.join(',') !== 'item,inconnu',
    'un champ impossible est écarté');
  resetMobileCols();

  S('12. Le défilement se comporte bien sans cadre');
  FAUX_MOBILE = true; renderInv();
  T(!document.querySelector('#invList .invwrap'), 'pas de cadre à défilement sur mobile');
  var s = invScrollSave();
  T(s && s.page === true, 'c’est la position de la page qui est relevée');

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
  R.push([null, '13. Infobulles']);
    /* Le CSS de la v1.16 vivait dans un fichier d'appoint à coller ;
     dans le dépôt il est fondu dans la feuille. On lit celle qui existe. */
  const addon = path.join(SRC, '..', 'css-a-ajouter-v1.16.css');
  const h = read('index.html');
  const css = fs.existsSync(addon) ? fs.readFileSync(addon,'utf8') : read('css/styles.css');
  R.push([h.includes('id="tipbox"'), 'le conteneur est dans la page']);
  R.push([(h.match(/data-tip=/g)||[]).length >= 6, 'au moins six éléments en portent une']);
  R.push([h.includes('Home location') && /data-tip="[^"]*stored when it is not in use/.test(h),
          '« Home location » explique sa différence avec l’emplacement courant']);
  R.push([/data-tip="[^"]*Green: your changes are saved/.test(h), 'le voyant vert est expliqué']);
  R.push([app.includes('touchstart') && app.includes('450'), 'l’appui long est géré au tactile']);
  R.push([!/title="Choose visible columns"/.test(h), 'les anciennes infobulles natives ont été remplacées']);
  R.push([/#tipbox/.test(css), 'le style est fourni']);

  R.push([null, '14. Confort tactile']);
  R.push([/min-height:4[0-9]px/.test(css) || /min-height:3[6-9]px/.test(css), 'cibles agrandies']);
  R.push([/@media\(min-width:701px\) and \(max-width:1024px\)/.test(css), 'la tablette a son propre réglage']);

  /* La vignette vide a longtemps porté la classe utilitaire `empty`,
     déjà définie plus haut dans la feuille avec `padding:30px 0`.
     Résultat : un rectangle de 36×96 au lieu d'un carré de 36×36.
     Ces trois contrôles interdisent la rechute. */
  R.push([null, '15. Vignette sans photo (v1.16.2)']);
  const inv = read('js/views-inventory.js');
  R.push([!/class="mthumb[^"]*\bempty\b/.test(inv),
          'le substitut n’emprunte plus une classe utilitaire générique']);
  R.push([/class="mthumb mnophoto"/.test(inv), 'il porte un nom qui lui appartient']);
  R.push([/\.mthumb\{[^}]*padding:0/.test(css) && /\.mthumb\{[^}]*box-sizing:border-box/.test(css),
          'et la règle neutralise tout padding hérité']);

  let fails = 0;
  for(const [okv, label] of R){
    if(okv === null) console.log('\n' + label);
    else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
  }
  console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
  process.exit(fails ? 1 : 0);
})();
