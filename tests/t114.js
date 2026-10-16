/* Harnais v1.14 — ordre d'affichage et rangement des familles. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <header><h1></h1></header>
  <input type="search" id="q"><select id="fCat"></select><select id="fSub"></select>
  <select id="fStatus"></select><select id="fLoc"></select><select id="fOwner"></select>
  <select id="fProv"></select><select id="fCond"></select><select id="fSort"><option value=""></option><option value="name"></option><option value="cat"></option></select>
  <button id="sortDir"></button><button id="btnReset"></button>
  <span class="colbox"><div class="colmenu" id="colMenu"></div></span>
  <div id="invSummary"></div><div id="invList"></div>
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
  function can(){ return true; } function canSeeValue(){ return true; }
  function openDetail(){} function renderBulkBar(){} function render(){}
  function toast(){} function open_(){} function close_(){} function openOver(){}
  async function apiLoadPrefs(){ return null; } async function apiSavePrefs(){}
`;

const DATA = `
  db.locations = [{name:'Studio A', parent:null, kind:'site'}];
  var mk = (id, name, cat, sub) => ({id, name, brand:'K&M', cat, subcat:sub, cond:'bon',
    status:'dispo', loc:'Studio A', home:'Studio A', price:null, purchase_date:null,
    owner:'', provider:'', serial:'', sales_order:'', notes:'', photo:null});
  // Volontairement dans le désordre : c'est l'ordre d'importation Excel
  db.items = [
    mk('OTH-001','Divers','divers','autre'),
    mk('XLR-001','XLR 3m','cablage','xlr'),
    mk('SYN-001','Juno-106','instruments','synthe'),
    mk('CLP-001','Adaptateur 215','supports','adaptateur_stand'),
    mk('ICS-001','Peau 14','instruments','consommable_inst'),
    mk('MCN-001','U87','captation','condensateur'),
    mk('KST-001','Omega Pro','supports','stand_clavier'),
    mk('MST-001','Pied micro','supports','pied'),
    mk('DRM-001','Batterie','instruments','batterie'),
    mk('RCK-001','Rack 19','divers','rack19')
  ];
`;

const TESTS = `
 (async () => {
  var R = [];
  function T(c,l){ R.push([!!c,l]); }
  function S(l){ R.push([null,l]); }

  S('1. La configuration');
  var fams = Object.keys(CATS);
  T(fams.length === 13, '13 familles (' + fams.length + ')');
  T(fams[0] === 'instruments', 'Instruments en premier');
  T(fams[fams.length-1] === 'divers', 'Facility & other en dernier');
  T(fams.indexOf('captation') === 1 && fams.indexOf('peripheriques') === 2
    && fams.indexOf('pedales') === 3, 'micros, outboard, pédales dans cet ordre');
  var codes = fams.flatMap(f=>Object.values(CATS[f].subs).map(s=>s.code));
  T(codes.length === 73, '73 sous-catégories (' + codes.length + ')');
  T(new Set(codes).size === codes.length, 'tous les codes sont uniques');

  S('2. Suppressions');
  T(!subsOf('instruments').peau10 && !subsOf('instruments').peau13
    && !subsOf('instruments').peau18, 'les trois tailles de peaux absentes sont parties');
  T(!subsOf('instruments').autre_inst, '« Other instrument » est parti');
  T(!subsOf('supports').stand, '« Stand » n’existe plus comme fourre-tout');

  S('3. Instruments respire');
  T(Object.keys(subsOf('instruments')).length === 6,
    '6 sous-catégories au lieu de 14 (' + Object.keys(subsOf('instruments')).length + ')');
  T(!!subsOf('instruments').synthe && !!subsOf('instruments').batterie,
    'les vraies familles d’instruments restent');

  S('4. Consommables');
  /* Révisé en v1.15.1 : les cinq tailles de peaux ont fusionné en une
     sous-catégorie d'Instruments. La famille Consumables reste en
     place, vide, pour les consommables sans famille d'instrument. */
  T(!!CATS.consommables, 'la famille Consumables existe toujours');
  T(Object.keys(subsOf('consommables')).length === 0, 'elle est vide pour l’instant');
  T(!!subsOf('instruments').consommable_inst, 'les peaux sont dans Instruments');
  T(subsOf('instruments').consommable_inst.code === 'ICS', 'sous le code ICS');
  T(!subsOf('instruments').peau14 && !subsOf('instruments').peau22,
    'les tailles individuelles ont disparu');

  S('5. Supports éclatés');
  var sup = subsOf('supports');
  T(Object.keys(sup).length === 8, '8 sous-catégories (' + Object.keys(sup).length + ')');
  ['pied','stand_clavier','stand_enceinte','extension_stand','adaptateur_stand','plateau','housse','flightcase']
    .forEach(k=>T(!!sup[k], '  présence de ' + k));
  T(sup.stand_clavier.code === 'KST' && sup.adaptateur_stand.code === 'CLP',
    'codes KST et CLP conformes');

  S('6. Studio rack');
  T(!!subsOf('divers').rack19, 'rangé dans Facility & other');
  T(subsOf('divers').rack19.code === 'RCK', 'code RCK');

  S('7. L’ordre pilote l’affichage');
  T(catIndex('instruments') < catIndex('cablage'), 'Instruments avant Cables');
  T(catIndex('cablage') < catIndex('supports'), 'Cables avant Stands');
  T(catIndex('consommables') < catIndex('divers'), 'Consumables avant Facility');
  T(catIndex('famille_inconnue') === 999, 'une famille inconnue ne fait pas disparaître ses items');
  T(subIndex('instruments','synthe') < subIndex('instruments','percussion'),
    'les sous-catégories suivent aussi l’ordre du fichier');

  S('8. Vue par défaut : regroupée par famille');
  renderInv();
  var h = document.getElementById('invList').innerHTML;
  var seps = [...document.querySelectorAll('.seprow td')].map(t=>t.textContent.trim());
  T(seps.length > 0, 'des séparateurs de famille apparaissent sans tri actif');
  T(seps[0] === 'Instruments', 'Instruments ouvre la liste (' + seps[0] + ')');
  T(seps.indexOf('Instruments') < seps.indexOf('Cables & connectors'), 'ordre respecté');
  T(seps.indexOf('Consumables') < seps.indexOf('Facility & other'), 'jusqu’au bout');
  T(new Set(seps).size === seps.length, 'aucune famille n’apparaît deux fois');

  S('9. Les items suivent leur séparateur');
  var lignes = [...document.querySelectorAll('#invList tbody tr')];
  var famCourante = null, fautes = 0;
  lignes.forEach(tr=>{
    if(tr.classList.contains('seprow')){ famCourante = tr.textContent.trim(); return; }
    var id = (tr.querySelector('.mono')||{}).textContent;
    var it = id && item(id.trim());
    if(it && catLabel(it.cat) !== famCourante) fautes++;
  });
  T(fautes === 0, 'chaque item est sous la bonne famille (' + fautes + ' écart)');

  S('10. Le tri explicite reprend la main');
  sortBy('item', 1, false);
  var s2 = [...document.querySelectorAll('.seprow td')].map(t=>t.textContent.trim());
  T(sortLevels.length === 1 && sortLevels[0].k === 'item', 'le tri par nom est bien actif');
  T(s2.length > 0 && s2.every(x=>x.length <= 5),
    'les séparateurs deviennent des lettres, pas des familles : ' + s2.join(' '));
  T(!s2.includes('Instruments'), 'plus de séparateur de famille');

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

  let fails = 0;
  for(const [okv, label] of dom.window.__results){
    if(okv === null) console.log('\n' + label);
    else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
  }
  console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
  process.exit(fails ? 1 : 0);
})();
