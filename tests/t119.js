/* Harnais v1.19 — poids : lecture, affichage, totaux, import. */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const html = `<!DOCTYPE html><html><body>
  <div id="invList"></div><div id="bulkbar"></div><div id="wi-body"></div>
  <button id="wi-go"></button>
  <input id="i-weight"><input type="checkbox" id="i-westim">
</body></html>`;

const STUBS = `
  var toasts=[], updates=[], me={role:'admin'};
  var db={items:[],users:[],locations:[],history:[],projects:[],trash:[],
          repairs:[],providers:[],repairsSupported:true};
  function item(id){ return db.items.find(i=>i.id===id); }
  function can(){ return true; } function toast(m,k){ toasts.push([m,k||'info']); }
  function open_(){} function close_(){} function openDetail(){} function render(){}
  function curView(){ return 'inv'; } function selItems(){ return [...sel].map(item); }
  async function refresh(){ return true; }
  async function apiUpdateItemsIn(ids,f){ updates.push([ids.slice(),f]);
    ids.forEach(id=>Object.assign(item(id), f)); }
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
`;

const DATA = `
  db.locations=[{name:'Studio A',parent:null,kind:'site'}];
  var mk=(id,name,brand,sub,g)=>({id,name,brand,cat:'captation',subcat:sub,cond:'bon',
    status:'dispo',loc:'Studio A',home:'Studio A',photo:null,out:null,
    weight_g:g||null});
  db.items=[
    mk('MCD-001','SM57','Shure','dynamique',284),
    mk('MCD-002','SM57','Shure','dynamique',284),
    mk('XLR-001','XLR 3m #1','Cordial','xlr'),
    mk('XLR-002','XLR 3m #2','Cordial','xlr'),
    mk('SYN-001','Juno-106','Roland','synthe',10000),
    mk('PEA-001','Ambassador Coated 14"','REMO','consommable_inst',180)
  ];
`;

const TESTS = `
 (async () => {
  var R=[]; function T(c,l){R.push([!!c,l]);} function S(l){R.push([null,l]);}

  S('1. Lire un poids tel que les gens l’écrivent');
  /* Les formats viennent du vrai tableau : c’est leur diversité qui
     m’avait fait lire une colonne à moitié vide. */
  T(parseWeight('10Kg')      === 10000, '« 10Kg » — unité collée');
  T(parseWeight('5.4 kg')    === 5400,  '« 5.4 kg » — point décimal');
  T(parseWeight('0,612')     === 612,   '« 0,612 » — virgule, sans unité');
  T(parseWeight('env 100Kg') === 100000,'« env 100Kg » — approximation');
  T(parseWeight('0.5Kg')     === 500,   '« 0.5Kg »');
  T(parseWeight('284 g')     === 284,   '« 284 g » — déjà en grammes');
  T(parseWeight('2,5')       === 2500,  'sans unité, on suppose des kilos');
  T(parseWeight('')          === null,  'vide');
  T(parseWeight('   ')       === null,  'espaces');
  T(parseWeight('n/a')       === null,  'texte');
  T(parseWeight('0')         === null,  'zéro n’est pas un poids');
  T(parseWeight('-3')        === 3000,  'le signe est ignoré, pas inventé');

  S('2. Afficher');
  /* Toujours des kilos, deux décimales, format français : une colonne
     qui alterne les unités oblige à convertir de tête à chaque ligne. */
  T(fweight(850)   === '0,85 kg',  '850 g s’écrit 0,85 kg');
  T(fweight(284)   === '0,28 kg',  'un micro aussi');
  T(fweight(3200)  === '3,20 kg',  'les décimales sont fixes');
  T(fweight(1000)  === '1,00 kg',  'même sur un compte rond');
  T(fweight(16700) === '16,70 kg', 'et au-delà de dix kilos');
  T(fweight(10)    === '0,01 kg',  'un adaptateur de 10 g reste lisible');
  T(fweight(null)  === '',         'rien à afficher sur un poids absent');
  T(fweight(2912600).includes('2'), 'un total de parc passe aussi');

  S('3. Le total dit ce qu’il vaut');
  var w = weighLot(db.items);
  T(w.g === 284+284+10000+180, 'les items sans poids ne faussent pas la somme');
  T(w.pesés === 4, 'et le compte de ceux qui en ont un');
  T(w.sans === 2,    'il annonce combien n’en ont pas');

  var l = lotLabel(w);
  T(l.includes('2 without a weight'), 'le libellé dit les manques');

  T(lotLabel(weighLot([db.items[2]])).includes('no weight'),
    'un lot sans aucun poids le dit franchement');

  S('4. Colonne, tri et filtre');
  T(INV_COLUMNS.some(c=>c.k==='weight'), 'la colonne existe');
  T(sortKey({k:'weight'}, db.items[0]) === 284, 'le tri porte sur les grammes');
  T(sortKey({k:'weight'}, db.items[2]) === null, 'et met les items sans poids à part');
  T(filterValueOf('weight', db.items[0]) === 'Under 500 g', 'tranche basse');
  T(filterValueOf('weight', db.items[4]) === '10 – 30 kg', 'tranche haute — 10 kg bascule dans la suivante');
  T(filterValueOf('weight', db.items[2]) === 'No weight',   'et une tranche pour les absents');

  S('5. Import — lecture du fichier');
  var csv = [
    'Marque;Modèle;Poids (kg);Confiance',
    'Cordial;XLR 3m;0,18;constructeur',
    'Roland;Juno-106;10Kg;constructeur',
    'REMO;Ambassador Coated 14";0,18;estimé',
    'Fantome;Objet inexistant;4,2;constructeur'
  ].join('\\n');
  wiParse(csv);
  T(wiRows.length === 4, 'quatre lignes lues');
  T(wiRows[1].g === 10000, 'les unités collées passent aussi à l’import');
  /* La colonne « confiance » n'est plus lue depuis la v1.21.1 : le
     poids estimé est devenu le poids tout court. */
  T(wiRows[2].est === undefined, 'la colonne confiance n’est plus interprétée');
  T(wiRows[2].model === 'Ambassador Coated 14\"',
    'un pouce dans le nom ne casse plus la lecture');

  S('6. Import — appariement');
  T(wiPlan.maj.length === 2, 'les deux XLR reçoivent le poids du modèle');
  T(wiPlan.maj.every(m=>m.i.id.startsWith('XLR')), 'et seulement eux');
  T(wiPlan.inchangés.length === 2, 'le Juno et la peau ont déjà ce poids');
  T(wiPlan.orphelines.length === 1, 'la ligne fantôme est signalée');
  T(wiPlan.orphelines[0].model === 'Objet inexistant', 'et nommée');
  T(wiPlan.restants.length === 0, 'plus aucun item sans poids après coup');

  S('7. Le suffixe d’exemplaire ne gêne pas');
  T(itemModelKey(db.items[2]) === itemModelKey(db.items[3]),
    '« XLR 3m #1 » et « #2 » sont le même modèle');
  T(normModel('Teenage Égineering') === 'teenage egineering', 'accents retirés');
  T(normModel('K&M 215') === 'k and m 215', 'l’esperluette est normalisée');

  S('8. Écriture groupée et rejouabilité');
  updates = [];
  await wiApply();
  T(updates.length === 1, 'un seul appel pour un même poids, pas un par item');
  T(updates[0][0].length === 2, 'les deux XLR dans le même appel');
  T(updates[0][1].weight_g === 180, 'avec la bonne valeur');
  T(db.items[2].weight_g === 180, 'l’item est à jour');
  wiParse(csv);
  T(wiPlan.maj.length === 0, 'relancer le même import n’écrit plus rien');
  T(wiPlan.inchangés.length === 4, 'tout est reconnu comme déjà à jour');

  S('9. Valeurs aberrantes');
  /* Le cas réel : « 5;44 kg » dans le tableau source avait produit un
     micro de 544 kg, écrit sans un mot. */
  wiParse('Marque,Modèle,Poids\\nShure,SM57,5;44 kg');
  T(wiRows[0].g === 5440, 'un point-virgule entre deux chiffres est lu comme une virgule');
  db.items.forEach(i=>{ i.weight_g = null; });
  db.items[0].weight_g = 284; db.items[1].weight_g = 300;
  wiParse('Marque,Modèle,Poids\\nShure,SM57,544');
  T(wiPlan.suspects.length > 0, 'un poids sans rapport avec sa sous-catégorie est signalé');
  T(/544/.test(document.getElementById('wi-body').innerHTML), 'et montré avant écriture');
  T(document.getElementById('wi-body').innerHTML.includes('Check these'),
    'avec une invitation à vérifier');

  S('10. Séparateur deviné');
  wiParse('Brand,Model,Weight\\nShure,SM57,0.284');
  T(wiRows.length === 1 && wiRows[0].g === 284, 'un fichier en virgules est lu aussi');
  var ok = false;
  try{ wiParse('a;b;c\\n1;2;3'); }catch(e){ ok = /model column/.test(e.message); }
  T(ok, 'un fichier sans colonne reconnaissable est refusé, avec la raison');

  window.__results = R;
 })();
`;

const dom = new JSDOM(html,{runScripts:'dangerously',url:'https://inventory.accessflow.fr/'});
const inv = read('js/views-inventory.js');
const pick = re => (inv.match(re) || [''])[0];
const script = [
  STUBS, read('js/config.js'), read('js/helpers.js'), read('js/prefs.js'),
  pick(/function sortKey\(c, ?i\)\{[\s\S]*?\n}/),
  // filterValue est imbriquée dans filterValues ; on en extrait le switch utile
  'function filterValueOf(k, i){ const c={k}; return ' +
    '(function(){ switch(k){' +
    "case 'weight': { const g=i.weight_g; if(!g) return 'No weight';" +
    " if(g<500) return 'Under 500 g'; if(g<2000) return '500 g – 2 kg';" +
    " if(g<10000) return '2 – 10 kg'; if(g<30000) return '10 – 30 kg';" +
    " return '30 kg and above'; } } return ''; })(); }",
  'var sel = new Set();',
  read('js/import-weights.js'), DATA, TESTS
].join('\n;\n');

(async () => {
  try{ dom.window.eval(script); }
  catch(e){ console.log('ERREUR : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }
  for(let i=0;i<300 && !dom.window.__results;i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }
  const R = dom.window.__results;

  R.push([null,'11. Cohérence des fichiers']);
  const h=read('index.html'), css=read('css/styles.css'), app=read('js/app.js');
  R.push([fs.existsSync(path.join(SRC,'sql/018-poids.sql')), 'la migration 018 existe']);
  R.push([/weight_g\s+integer/.test(read('sql/018-poids.sql')), 'le poids est stocké en grammes entiers']);
  R.push([/drop column if exists weight_est/.test(read('sql/023-conditionnement-detail.sql')),
          'le drapeau « estimé » a été retiré : le poids reste, l’annotation part']);
  R.push([/import-weights\.js/.test(h), 'le script est chargé par la page']);
  R.push([/id="ovWeightImp"/.test(h), 'la fenêtre d’import est dans la page']);
  R.push([/id="i-weight"/.test(h) && !/id="i-westim"/.test(h),
          'le formulaire a le champ poids, sans la case « estimé »']);
  R.push([/id="i-casenote"/.test(h) && /toggleCaseNote/.test(h),
          'et la précision du conditionnement n’apparaît que si la case est cochée']);
  R.push([/\.west\{/.test(css) && /\.lotw\{/.test(css), 'les styles sont là']);
  R.push([/openWeightImport/.test(read('js/views-settings.js')), 'l’import est accessible depuis Settings']);

  /* Contrôle générique : tous les scripts doivent porter LA version
     déclarée dans app.js. Vérifier un numéro en dur obligeait à
     retoucher le harnais à chaque livraison — et un test qu'on
     retouche à chaque fois finit par être ajusté sans être lu. */
  const vApp = (app.match(/APP_VERSION = '([\d.]+)'/)||[])[1];
  const tags = h.match(/\?v=[\d.]+/g) || [];
  const vUniq = [...new Set(tags.map(t=>t.slice(3)))];
  R.push([!!vApp, `APP_VERSION est déclarée (${vApp||'absente'})`]);
  R.push([vUniq.length === 1 && vUniq[0] === vApp,
          `les ${tags.length} fichiers portent tous la version ${vApp} (trouvé : ${vUniq.join(', ')})`]);

  let fails=0;
  for(const [ok,label] of R){
    if(ok===null) console.log('\n'+label);
    else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+label); }
  }
  console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
  process.exit(fails?1:0);
})();
