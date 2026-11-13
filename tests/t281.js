/* Harnais v2.10.1 — un projet parti AVANT la v2.7 doit s'ouvrir.
 *
 * LEASH est parti le 31 octobre. Son contenu a été figé quand les
 * consommables n'étaient encore que des libellés accrochés aux caisses :
 * chaque ligne porte `kind` à plat, sans objet `supply`. La v2.7 a
 * ensuite fait lire `l.supply.kind` à supplySections() — et LEASH est
 * devenu impossible à ouvrir, sans que personne ne le voie pendant deux
 * semaines.
 *
 * LA CAUSE PROFONDE, comme pour t260 : aucun harnais n'avait jamais
 * affiché un projet en show avec un contenu figé à l'ANCIEN format. On
 * testait le code d'aujourd'hui sur des données d'aujourd'hui. Une
 * archive se relit avec le format de son époque.
 */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const STUBS = `
  var me={role:'admin'};
  var db={items:[],users:[],locations:[],history:[],projects:[],trash:[],
          repairs:[],providers:[],packs:[],packItems:[],packFolders:[],
          supplies:[],supplyLines:[],archived:[],needs:[],
          linkGroups:[],linkMembers:[],
          packsSupported:true,suppliesSupported:true};
  function item(id){ return db.items.find(i=>i.id===id) || db.archived.find(i=>i.id===id); }
  function pack(id){ return db.packs.find(k=>k.id===id); }
  function project(id){ return db.projects.find(p=>p.id===id); }
  function can(){ return true; } function toast(){}
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
`;

const DATA = `
  var mk=(id,name)=>({id,name,brand:'Allen & Heath',cat:'mixage',subcat:'console',
    cond:'bon',status:'sorti',loc:'Trianon',home:'Studio',photo:null,
    out:{projectId:'LEASH',date:'2026-10-31'},weight_g:20000,extra:{}});
  db.items=[mk('MIX-001','SQ5')];

  /* Le contenu figé, TEL QUE LA BASE LE CONTIENT pour LEASH :
     des consommables à plat, sans objet supply. */
  db.projects=[{id:'LEASH', name:'LEASH', status:'show', archived:false,
    starts_on:'2026-10-31', ends_on:'2026-11-01', item_ids:[], pack_ids:['k1'],
    prep:{}, subs:{}, loc_name:'', last_used:'2026-10-31',
    snapshot:{frozen_at:'2026-10-31T08:00:00Z', items:[], needs:[],
      packs:[{id:'k1', name:'LEASH Touring - SQ5+ Kit', permanent:false,
        items:['MIX-001'], needs:[],
        extras:[
          {id:'e1', kind:'consumable', label:'Keyboard', qty:1, spare:false},
          {id:'e2', kind:'consumable', label:'Foam',     qty:2, spare:false},
          {id:'e3', kind:'accessory',  label:'XLR 3 m',  qty:4, spare:true}
        ]}]}}];
`;

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="v-proj"></div></body></html>',
  {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
/* Tout passe par des balises <script>, comme dans le navigateur : les
   `const` de config.js et les `let` de views-projects.js (projView)
   doivent vivre dans la portée globale PARTAGÉE entre fichiers. Un
   eval les enfermerait chacun chez soi, et le harnais testerait un
   montage qui n'existe pas en production. */
function charger(code){
  const sc = dom.window.document.createElement('script');
  sc.textContent = code;
  dom.window.document.body.appendChild(sc);
}
const dbjs = read('js/db.js');
const projProgress = (dbjs.match(/function projProgress\([\s\S]*?\n}\n/)||[''])[0];
if(!projProgress){ console.log('projProgress introuvable dans db.js'); process.exit(1); }
[STUBS, read('js/config.js'), read('js/helpers.js'), projProgress, DATA]
  .forEach(charger);

const R=[]; const T=(c,l)=>R.push([!!c,l]); const S=l=>R.push([null,l]);
const E = s => dom.window.eval(s);

S('1. Une ligne figée à l’ancien format se range');
T(E(`supplyKind({kind:'consumable', label:'Foam'})`) === 'consumable',
  'une ligne d’avant la v2.7 dit sa nature');
T(E(`supplyKind({supply:{kind:'accessory'}})`) === 'accessory',
  'une ligne vivante aussi');
T(E(`supplyKind({label:'???'})`) === 'consumable',
  'et une ligne sans rien ne plante pas');
T(E(`supplyKind(undefined)`) === 'consumable', 'même absente');

let secs = null, erreur = null;
try{ secs = E(`supplySections(projContent(project('LEASH')).extras)
                 .map(s=>s.cle + ':' + s.lignes.length).join(',')`); }
catch(e){ erreur = e.message; }
T(!erreur, 'supplySections() lit le contenu figé de LEASH sans planter' +
  (erreur ? ' — ' + erreur : ''));
T(secs === 'spare:1,consumable:2',
  `les lignes tombent dans les bonnes sections (${secs})`);

/* La fiche, puis le projet : on OUVRE pour de vrai, comme t260 le
   fait pour les fiches. Une seule exception attrapée suffit à dire
   que l'écran est mort. */
S('2. On ouvre LEASH pour de vrai');
const vp = read('js/views-projects.js');
/* Le fichier entier, tel quel : sa seule instruction de haut niveau
   est un écouteur de clic, inoffensif ici. Le découper aurait été
   tester autre chose que ce qui tourne en production. */
charger(vp);
for(const mode of ['prep','edit']){
  let ok = true, msg = '';
  try{
    E(`projView = {mode:'${mode}', id:'LEASH', tab:'items', q:''};`);
    const h = E(mode === 'prep' ? 'projPrep()' : 'projEditor()');
    ok = typeof h === 'string' && h.length > 100;
  }catch(e){ ok = false; msg = ' — ' + e.message; }
  T(ok, (mode === 'prep' ? 'la préparation' : 'la composition') + ' s’affiche' + msg);
}

/* Volontaire : la caisse k1 citée par le contenu figé n'existe PAS
   dans db.packs. C'est le cas d'une caisse supprimée après le départ
   — le harnais l'a d'abord fait par accident, et a trouvé que la
   composition plantait sur sa vignette. Gardé exprès. */
S('3. Une caisse supprimée depuis le départ');
T(!E(`pack('k1')`), 'la caisse du départ n’existe plus');
T(E(`packPhoto(undefined)`) === null, 'sa vignette rend « rien » au lieu de planter');

let fails=0;
for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
  else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
process.exit(fails?1:0);
