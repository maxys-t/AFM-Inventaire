/* Harnais v2.1.0 — trois gestes quotidiens remis d'aplomb.

   Filtrer sans perdre sa place, voir d'un coup ce qui est dehors,
   et parcourir l'inventaire du plus large au plus précis. Trois
   corrections nées de l'usage réel, pas d'une relecture de code. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <input type="search" id="q">
  <span class="colbox"><div class="colmenu" id="colMenu"></div></span>
  <div id="invSummary"></div><div id="invList"></div>
  <div id="v-dash"></div>
</body></html>`;

const STUBS = `
  var sb = null, me = {role:'admin'};
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[],
            repairs:[], providers:[], repairsSupported:true,
            packs:[], packItems:[], packsSupported:true,
            packExtras:[], packExtrasSupported:true, projectsError:false};
  function can(){ return true; }
  function canSeeValue(){ return true; }
  function openDetail(){}
  function renderBulkBar(){}
  function item(id){ return db.items.find(i=>i.id===id); }
  function repairOf(){ return null; }
  function overdue(){ return false; }
  function daysLate(){ return 0; }
  function daysSince(){ return 0; }
  function outBy(i){ return i.out ? (i.out.reason||'') : ''; }
  function outForRepair(i){ return !!(i.out && i.out.repairId); }
  function providerName(){ return ''; }
  function repairStale(){ return false; }
  function faultLabel(f){ return f||''; }
  function condLabel(c){ return CONDS[c] || c; }
  function packCheckout(){}
  function packCheckin(){}
  window.scrollTo = () => {};
  function locLabel(n){ return n||''; }
  function show(){}
  function goInventory(){}
  function openItemForm(){}
  function openProjForm(){}
  function openPackDetail(){}
  async function apiLoadPrefs(){ return null; }
  async function apiSavePrefs(){}
  window.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}});
`;

/* Deux familles, et DEUX sous-catégories dans la première : c'est
   précisément ce que la v2.1.0 rend visible. */
const DATA = `
  db.locations = [{name:'AccessFlow',parent:null},{name:'Studio A',parent:'AccessFlow'}];
  const it = (id,name,cat,sub,extra) => Object.assign(
    {id,name,brand:'',cat,subcat:sub,cond:'bon',status:'dispo',loc:'Studio A',
     home:'Studio A',price:null,purchase_date:null,owner:'',provider:'',serial:'',
     sales_order:'',notes:'',photo:null}, extra||{});
  db.items = [
    it('SYN-001','Juno-106','instruments','synthe'),
    it('SYN-002','Minimoog','instruments','synthe'),
    it('PRC-001','Congas','instruments','percussion'),
    it('MCN-001','U87','captation','condensateur'),
    it('MCN-002','SM57','captation','dynamique')
  ];

  /* Deux caisses : une partie, une restée. C'est le cas qui faisait
     défiler le tableau de bord jusqu'en bas. */
  db.packs = [
    {id:'pk1', name:'Pelicase tournée', permanent:false, archived:false,
     container_id:null, parent_id:null},
    {id:'pk2', name:'Rack studio', permanent:true, archived:false,
     container_id:null, parent_id:null}
  ];
  db.packItems = [
    {pack_id:'pk1', item_id:'SYN-002'},
    {pack_id:'pk2', item_id:'MCN-001'}
  ];
  /* Cinq caisses en place : au-delà de trois, le panneau doit replier. */
  ['Ampli', 'Batterie', 'Câbles'].forEach((n,k)=>db.packs.push(
    {id:'pk'+(3+k), name:n, permanent:false, archived:false,
     container_id:null, parent_id:null}));
  item('SYN-002').status = 'sorti';
  item('SYN-002').out = {userId:'u1', date:'2026-10-01', reason:'Trianon',
                         due:null, loc:'Trianon'};
`;

const TESTS = `
  var R = [];
  function T(cond, label){ R.push([!!cond, label]); }
  function S(label){ R.push([null, label]); }
  var H = () => document.getElementById('invList').innerHTML;
  var niveaux = sel => [...document.querySelectorAll(sel)].map(t=>t.textContent.trim());
  var fam  = () => niveaux('.seprow:not(.sub) td');
  var sous = () => niveaux('.seprow.sub td');

  S('1. L’inventaire se lit du plus large au plus précis');
  renderInv();
  T(fam().join(' / ') === 'Instruments / Microphones',
    'les familles ouvrent chaque section (' + fam().join(' / ') + ')');
  T(sous().length === 4,
    'et chaque sous-catégorie a la sienne (' + sous().length + ')');
  /* L'ordre compte autant que la présence : une sous-catégorie placée
     avant sa famille ne structure rien. On lit donc la suite réelle
     des lignes, pas une position dans une chaîne de caractères. */
  var suite = [...document.querySelectorAll('#invList .seprow')]
    .map(tr=>(tr.classList.contains('sub')?'  ':'') + tr.textContent.trim());
  T(suite.join(' | ') ===
    'Instruments |   Synth / keyboard |   Percussion | Microphones |   Condenser mic |   Dynamic mic',
    'familles et sous-catégories s’enchaînent du large au précis');

  S('2. Trier sur la catégorie donne les deux niveaux');
  sortBy('cat', 1, false);
  T(fam().length === 2 && sous().length === 4,
    'tri par catégorie : deux familles, quatre sous-catégories');
  /* Trier sur autre chose n'a aucune raison de couper deux fois. */
  sortBy('item', 1, false);
  T(sous().length === 0, 'trier par nom ne produit qu’un seul niveau');

  S('3. Un niveau qui change invalide ceux d’en dessous');
  /* Deux familles différentes peuvent porter une sous-catégorie du
     même nom. Si le second niveau n'était comparé qu'à lui-même, le
     deuxième « Synth » ne s’afficherait pas, et ses items paraîtraient
     appartenir à la section précédente. */
  var chaine = [];
  var a = sepsHTML(['Keyboards','Synth'], chaine, 9, false);
  var b = sepsHTML(['Guitars','Synth'], ['Keyboards','Synth'], 9, false);
  T(/Keyboards/.test(a) && /Synth/.test(a), 'la première section écrit ses deux niveaux');
  T(/Guitars/.test(b) && /Synth/.test(b),
    'et la suivante réécrit « Synth » sous sa nouvelle famille');

  S('4. Filtrer ne renvoie plus en haut de liste');
  /* jsdom ne défile pas : ce qui se vérifie ici, c'est l'intention —
     seul ce qui RÉORDONNE la liste demande le retour en haut. */
  var src = INV_SRC;
  var corps = n => { var d = src.indexOf('function '+n+'('),
                         f = src.indexOf('\\nfunction ', d+1);
                     return src.slice(d, f<0?src.length:f); };
  T(!/invResetScroll\\(\\)/.test(corps('toggleFilterValue')),
    'cocher une valeur garde la position');
  T(!/invResetScroll\\(\\)/.test(corps('clearFilter')),
    'vider un filtre aussi');
  T(/invResetScroll\\(\\)/.test(corps('sortBy')),
    'changer le tri revient en haut — là, l’ordre a changé');
  T(/invResetScroll\\(\\)/.test(corps('resetFilters')),
    'et tout remettre à zéro également');
  /* Et le filtre doit continuer de filtrer. */
  sortLevels = []; colFilters = {};
  toggleFilterValue('cat', 'Synth / keyboard', true);
  T(invFiltered().length === 2, 'le filtre retient bien les deux synthés');
  clearFilter('cat');
  T(invFiltered().length === 5, 'et le vider les rend tous');

  S('5. Le tableau de bord sépare ce qui est dehors');
  renderDash();
  var d = document.getElementById('v-dash').innerHTML;
  T(/class="dpcols"/.test(d), 'les caisses sont réparties en groupes');
  T(/dphead">Out/.test(d) && /dphead">In place/.test(d),
    'un groupe nommé pour chacun des deux états');
  T(d.indexOf('>Out ') < d.indexOf('>In place '),
    'et les sorties viennent en premier : c’est la question du matin');
  /* La caisse sortie doit tomber dans le premier groupe, pas quelque
     part plus bas : c'est le groupe qui fait foi, pas la position. */
  var grp = [...document.querySelectorAll('#v-dash .dpgroup')];
  T(grp.length === 2 && /Pelicase tournée/.test(grp[0].innerHTML),
    'et la caisse sortie est bien dans ce premier groupe');

  S('6. Un groupe vide disparaît au lieu de laisser un titre seul');
  item('SYN-002').status = 'dispo'; delete item('SYN-002').out;
  renderDash();
  d = document.getElementById('v-dash').innerHTML;
  T(!/dphead">Out/.test(d), 'plus rien dehors : le groupe « Out » s’effface');
  T(/dphead">In place/.test(d), 'et les deux caisses se retrouvent en place');

  S('7. Le panneau s’arrête à trois caisses par groupe');
  /* Vingt caisses rangées remplissaient le tableau de bord pour ne
     rien dire : en place, elles ne demandent rien. */
  renderDash();
  d = document.getElementById('v-dash').innerHTML;
  var lignes = () => document.querySelectorAll('#v-dash .dpgroup .dpack').length;
  T(lignes() === 3, 'trois lignes visibles sur les cinq caisses (' + lignes() + ')');
  T(d.includes('In place <span class="tag dispo">5<'),
    'mais le titre annonce bien les cinq');
  T(/Show all 5/.test(d), 'et « Show all 5 » les propose');

  dashPacksPlus('in');
  T(lignes() === 5, 'déplié, les cinq apparaissent (' + lignes() + ')');
  T(/Show less/.test(document.getElementById('v-dash').innerHTML),
    'et l’on peut replier');
  dashPacksPlus('in');
  T(lignes() === 3, 'le repli remet l’aperçu à trois');

  S('8. Ce sont les caisses incomplètes qui occupent les trois places');
  /* Si l'on ne montre que trois lignes, ce doivent être celles qui
     demandent quelque chose. « Câbles » passe en dernier par ordre
     alphabétique ; incomplète, elle doit remonter. */
  db.packItems.push({pack_id:'pk5', item_id:'PRC-001'});
  item('PRC-001').status = 'sorti';
  item('PRC-001').out = {userId:'u1', date:'2026-10-01', reason:'ailleurs', due:null};
  renderDash();
  var noms = [...document.querySelectorAll('#v-dash .dpgroup .dpack b')]
    .map(b=>b.textContent.trim());
  T(noms.includes('Câbles'), 'la caisse incomplète est dans les trois (' + noms.join(', ') + ')');
  T(noms[0] === 'Câbles', 'et même en tête de son groupe');

  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const inv = read('js/views-inventory.js');
const script = [STUBS, read('js/config.js'), read('js/helpers.js'),
                read('js/prefs.js'), inv, read('js/views-dashboard.js'),
                'var INV_SRC = ' + JSON.stringify(inv) + ';',
                DATA, TESTS].join('\n;\n');

try{ dom.window.eval(script); }
catch(e){ console.log('ERREUR À L’EXÉCUTION : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }

let fails = 0;
for(const [okv, label] of dom.window.__results){
  if(okv === null) console.log('\n' + label);
  else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
}
console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
process.exit(fails ? 1 : 0);
