/* Harnais v1.12.1 — correspondance des photos par niveau de précision. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <input type="file" id="ph-file"><div id="ph-preview"></div><button id="ph-go"></button>
  <div class="overlay" id="ovPhotos"></div>
</body></html>`;

const STUBS = `
  var sb = null;
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[]};
  function item(id){ return db.items.find(i=>i.id===id); }
  function open_(){} function close_(){} function toast(){}
  var me = {role:'admin'};
  function canSeeValue(){ return true; }
`;

/* Le cas réel : des câbles XLR de plusieurs longueurs et de deux
   marques, plus un micro pour vérifier qu'il n'est pas emporté. */
const DATA = `
  var mk = (id, name, brand, cat, sub, photo) => ({id, name, brand, cat, subcat:sub,
    cond:'bon', status:'dispo', loc:'Studio A', home:'Studio A', price:null,
    purchase_date:null, owner:'', provider:'', serial:'', sales_order:'', notes:'', photo:photo||null});
  db.items = [
    mk('XLR-001','XLR 3m #1','Cordial','cablage','xlr'),
    mk('XLR-002','XLR 3m #2','Cordial','cablage','xlr'),
    mk('XLR-003','XLR 5m #1','Cordial','cablage','xlr'),
    mk('XLR-004','XLR 10m #1','Cordial','cablage','xlr'),
    mk('XLR-005','XLR 3m #1','Neutrik','cablage','xlr'),
    mk('XLR-006','XLR 6m #1','Neutrik','cablage','xlr'),
    mk('TRS-001','TRS 3m #1','Cordial','cablage','trs'),
    mk('MCN-001','U87','Neumann','captation','condensateur')
  ];
  function fakeFiles(names){
    return names.map(n=>({name:n, size:120000}));
  }
  function run(names){
    onPhotosChosen({files: fakeFiles(names)});
    var by = {};
    photoPlan.lignes.forEach(l=>{ by[l.nom] = l; });
    return by;
  }
`;

const TESTS = `
  var R = [];
  function T(c,l){ R.push([!!c,l]); }
  function S(l){ R.push([null,l]); }

  S('1. Marque + sous-catégorie');
  var r = run(['Cordial XLR.jpg']);
  T(r['Cordial XLR'].ids.length === 4, 'les 4 XLR Cordial sont couverts (' + r['Cordial XLR'].ids.length + ')');
  T(!r['Cordial XLR'].ids.includes('XLR-005'), 'les XLR Neutrik ne sont pas emportés');
  T(!r['Cordial XLR'].ids.includes('TRS-001'), 'les TRS Cordial ne sont pas emportés');
  T(r['Cordial XLR'].rank === 4, 'reconnu comme correspondance marque + sous-catégorie');

  S('2. Les deux marques côte à côte');
  r = run(['Cordial XLR.jpg','Neutrik XLR.jpg']);
  T(r['Cordial XLR'].ids.length === 4 && r['Neutrik XLR'].ids.length === 2,
    'chaque marque reçoit les siens');
  T(!r['Cordial XLR'].doublon && !r['Neutrik XLR'].doublon, 'aucun conflit signalé');

  S('3. Sous-catégorie entière');
  r = run(['XLR.jpg']);
  T(r['XLR'].ids.length === 6, 'les 6 XLR toutes marques confondues');
  T(r['XLR'].rank === 5, 'reconnu comme correspondance sous-catégorie');
  T(!r['XLR'].ids.includes('MCN-001'), 'le micro n’est pas concerné');

  S('4. Le plus précis l’emporte');
  r = run(['Cordial XLR.jpg','XLR 3m.jpg']);
  T(r['XLR 3m'].ids.length === 3, 'le fichier modèle prend les XLR 3m des deux marques');
  T(r['Cordial XLR'].ids.length === 2, 'le fichier large ne garde que 5m et 10m');
  T(r['Cordial XLR'].affine === 2, 'les items repris sont comptés comme affinés');
  T(!r['Cordial XLR'].doublon, 'ce n’est pas signalé comme un conflit');
  T(r['Cordial XLR'].ids.includes('XLR-003') && r['Cordial XLR'].ids.includes('XLR-004'),
    'ce sont bien les bons qui restent');

  S('5. Un item précis passe avant tout');
  r = run(['XLR.jpg','XLR-001.jpg']);
  T(r['XLR-001'].ids.length === 1 && r['XLR-001'].ids[0] === 'XLR-001', 'le fichier item vise un seul item');
  T(r['XLR'].ids.length === 5, 'le fichier large couvre les 5 autres');

  S('6. Vrai conflit : deux fichiers au même niveau');
  r = run(['Cordial XLR.jpg','CORDIAL  xlr.jpg']);
  var conflit = Object.values(r).filter(l=>l.doublon).length;
  T(conflit === 1, 'un seul des deux est signalé en conflit');
  T(Object.values(r).reduce((n,l)=>n+l.ids.length,0) === 4, 'aucun item couvert deux fois');

  S('7. Le code de sous-catégorie fonctionne aussi');
  r = run(['TRS.jpg']);
  T(r['TRS'].ids.length === 1 && r['TRS'].ids[0] === 'TRS-001', 'TRS reconnu par son code');

  S('8. Nom sans correspondance');
  r = run(['Vacances 2026.jpg']);
  T(r['Vacances 2026'].vises.length === 0, 'aucun item visé');
  T(photoPlan.nFiles === 0, 'rien à envoyer');
  T(document.getElementById('ph-go').style.display === 'none', 'bouton masqué');

  S('9. Aperçu honnête');
  r = run(['Cordial XLR.jpg','XLR 3m.jpg']);
  var h = document.getElementById('ph-preview').innerHTML;
  T(h.includes('wide match'), 'une correspondance large est annoncée');
  T(h.includes('brand + sub-category'), 'le niveau est nommé');
  T(h.includes('covered by a more specific file'), 'l’affinage est expliqué');
  T(photoPlan.nItems === 5, 'total couvert = 5 items distincts (' + photoPlan.nItems + ')');

  S('10. Modèle seul, comportement d’origine préservé');
  r = run(['Roland Juno-106.jpg','U87.jpg']);
  T(r['U87'].ids.length === 1 && r['U87'].rank === 3, 'un modèle reste un modèle');
  T(r['Roland Juno-106'].vises.length === 0, 'un modèle inexistant ne correspond à rien');

  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'),
                read('js/photos-bulk.js'), DATA, TESTS].join('\n;\n');

try{ dom.window.eval(script); }
catch(e){ console.log('ERREUR À L’EXÉCUTION : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }

let fails = 0;
for(const [okv, label] of dom.window.__results){
  if(okv === null) console.log('\n' + label);
  else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
}
console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
process.exit(fails ? 1 : 0);
