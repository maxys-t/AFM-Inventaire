/* Harnais v1.22 — packs-recettes, consommables, composition d'un projet.

   On teste des COMPORTEMENTS, pas des commentaires : chaque assertion
   appelle une fonction et regarde ce qu'elle rend. Les quelques
   vérifications de fichiers, à la fin, portent sur du code (une
   signature, une colonne SQL), jamais sur une phrase. */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const html = `<!DOCTYPE html><html><body><div id="v-proj"></div></body></html>`;

const STUBS = `
  var toasts=[], me={role:'admin'}, retraits=[], ajouts=[];
  var db={items:[],users:[],locations:[],history:[],projects:[],trash:[],
          repairs:[],providers:[],repairsSupported:true,
          packs:[],packItems:[],packsSupported:true,
          packExtras:[],packExtrasSupported:true};
  function item(id){ return db.items.find(i=>i.id===id); }
  function project(id){ return db.projects.find(p=>p.id===id); }
  function can(){ return true; }
  function toast(m,k){ toasts.push({m,k:k||'info'}); }
  function userName(){ return 'X'; }
  function outBy(i){ return i.out ? 'someone' : ''; }
  function outForRepair(i){ return !!(i.out && i.out.repairId); }
  async function apiRemovePackItems(packId, ids){
    retraits.push({packId, ids});
    db.packItems = db.packItems.filter(l=>!(l.pack_id===packId && ids.includes(l.item_id)));
  }
  async function apiAddPackItems(packId, ids){
    ajouts.push({packId, ids});
    ids.forEach(id=>db.packItems.push({pack_id:packId, item_id:id}));
  }
  async function refresh(){} function renderPacks(){} function renderPackDetail(){}
  var packShown=null, drag=null, dragFini=0;
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
`;

const DATA = `
  var mk=(id,name,brand,g,st)=>({id,name,brand,cat:'divers',subcat:'x',cond:'bon',
    status:st||'dispo', loc:'Studio A', home:'Studio A', photo:null,
    out: st==='sorti' ? {userId:'u1',projectId:'autre',date:'2026-10-01',reason:'Session'} : null,
    weight_g:g||null, has_case:false});

  db.items=[
    mk('RCK-001','Rack 12U','Thon',18000),
    mk('PEL-001','Pelicase 1620','Peli',11200),
    mk('LBX-001','Lunchbox 500','BAE',4000),
    mk('PRE-001','1073 MP','BAE',1900),
    mk('PRE-002','1073 MP','BAE',1900),
    mk('MIC-001','U47 FET','Neumann',1100),
    mk('MIC-002','U47 FET','Neumann',1100,'sorti'),
    mk('CBL-001','XLR 5 m #1','Cordial',310),
    mk('CBL-002','XLR 5 m #2','Cordial',310),
    mk('CBL-003','XLR 5 m #3','Cordial',310)
  ];

  /* Le rack studio est monté en permanence ; la Pelicase est une
     configuration de tournée. Le préampli PRE-001 figure dans LES
     DEUX — c'est tout l'objet de la v1.22. */
  db.packs=[
    {id:'k-rack', name:'Rack Studio A',   container_id:'RCK-001', archived:false, permanent:true},
    {id:'k-lbx',  name:'Lunchbox BAE',    container_id:'LBX-001', archived:false, permanent:true},
    {id:'k-pel',  name:'Pelicase tournée',container_id:'PEL-001', archived:false, permanent:false}
  ];
  db.packItems=[
    {pack_id:'k-rack', item_id:'LBX-001'},   // le lunchbox vit dans le rack
    {pack_id:'k-rack', item_id:'PRE-002'},
    {pack_id:'k-lbx',  item_id:'PRE-001'},
    {pack_id:'k-pel',  item_id:'PRE-001'},   // le même préampli, autre recette
    {pack_id:'k-pel',  item_id:'MIC-001'},
    {pack_id:'k-pel',  item_id:'MIC-002'}    // celui-ci est sorti ailleurs
  ];
  db.packExtras=[
    {id:'x1', pack_id:'k-pel', label:'Gaffer noir', qty:2, pos:0},
    {id:'x2', pack_id:'k-pel', label:'Bonnettes',   qty:4, pos:1},
    {id:'x3', pack_id:'k-lbx', label:'Jarretières', qty:8, pos:0}
  ];
  db.projects=[{id:'pr1', name:'Trianon', status:'inactif', archived:false,
                item_ids:['CBL-001','CBL-002','MIC-001'], pack_ids:['k-pel'],
                prep:{}, snapshot:null, loc_name:'', starts_on:null, ends_on:null}];
`;

const TESTS = `
 (async () => {
  var R=[]; function T(c,l){R.push([!!c,l]);} function S(l){R.push([null,l]);}

  S('1. Un item peut figurer dans plusieurs recettes');
  T(packsOfItem('PRE-001').length === 2, 'PRE-001 appartient à deux packs');
  T(packItemsOf('k-pel').some(i=>i.id==='PRE-001'), 'et reste listé dans chacun');
  T(packItemsOf('k-lbx').some(i=>i.id==='PRE-001'), 'y compris dans le second');

  S('2. Le pack « de référence » privilégie l’assemblage permanent');
  var ref = packOfItem('PRE-001');
  T(ref && ref.id === 'k-lbx', 'c’est le lunchbox monté, pas la caisse de tournée');
  T(packOfItem('MIC-001').id === 'k-pel', 'un seul pack : c’est celui-là');
  T(packOfItem('RCK-001') === null, 'aucun pack : rien à nommer');

  S('3. « Absent » ne veut pas dire la même chose partout');
  T(packStatus(pack('k-pel')).absents.length === 1, 'la Pelicase compte un absent');
  T(packStatus(pack('k-pel')).manque === false, 'mais une configuration ne « manque » de rien');
  db.items.find(i=>i.id==='PRE-002').status='sorti';
  db.items.find(i=>i.id==='PRE-002').out={userId:'u1',projectId:'autre',date:'x',reason:'y'};
  T(packStatus(pack('k-rack')).manque === true, 'un trou dans le rack monté, si');
  db.items.find(i=>i.id==='PRE-002').status='dispo';
  db.items.find(i=>i.id==='PRE-002').out=null;

  S('4. Un pack ne dit plus où se trouve un objet');
  T(itemWhere(item('MIC-001')).indexOf('Pelicase') === -1,
    'une configuration n’est pas un lieu');
  T(itemWhere(item('PRE-001')).indexOf('Lunchbox') === 0 ||
    itemWhere(item('PRE-001')).indexOf('in Lunchbox') === 0,
    'un assemblage permanent, lui, en est un');

  S('5. Les boucles, avec plusieurs parents');
  T(packWouldLoop('k-lbx','RCK-001') === true,
    'ranger le rack dans le lunchbox qui est dedans est refusé');
  T(packWouldLoop('k-pel','PEL-001') === true,
    'une caisse ne se range pas dans elle-même');
  T(packWouldLoop('k-rack','PEL-001') === false,
    'ranger la Pelicase dans le rack reste permis');
  /* La boucle par la SECONDE branche : c’est elle que l’ancien
     parcours à \`limit 1\` laissait passer. */
  db.packItems.push({pack_id:'k-pel', item_id:'LBX-001'});
  T(packWouldLoop('k-lbx','PEL-001') === true,
    'et la boucle fermée par l’autre parent est vue aussi');
  db.packItems = db.packItems.filter(l=>!(l.pack_id==='k-pel' && l.item_id==='LBX-001'));

  S('6. Les consommables sont des lignes, pas des items');
  T(packExtrasOf('k-pel').length === 2, 'la Pelicase a deux consommables');
  T(packAllExtras(pack('k-rack')).length === 1,
    'un pack imbriqué apporte les siens');
  T(packAllItems(pack('k-pel')).every(i=>i.id !== 'x1'),
    'ils n’apparaissent jamais parmi les items');
  T(packWeight(pack('k-pel')) === 11200 + 1900 + 1100 + 1100,
    'et ne pèsent rien dans le total');

  S('7. La composition d’un projet');
  var p = project('pr1'), c = projContent(p);
  T(c.groups.length === 1, 'une caisse');
  T(c.groups[0].items.length === 3, 'trois items disponibles dedans');
  T(c.groups[0].écartés.length === 1, 'et un écarté, indisponible');
  T(c.groups[0].écartés[0].id === 'MIC-002', 'celui qui est sorti ailleurs');
  T(c.loose.length === 2, 'MIC-001 n’est pas compté deux fois');
  T(c.loose.every(i=>i.id !== 'MIC-001'), 'la caisse l’emporte sur l’isolé');
  T(c.items.length === 5, 'cinq items partent');
  T(c.weight === 11200+1900+1100 + 310+310, 'le poids ignore l’écarté et les consommables');
  T(c.extras.length === 2, 'les consommables suivent la caisse');

  S('8. La progression compte aussi les consommables');
  var pr = projProgress(p);
  T(pr.total === 7, 'cinq items et deux consommables');
  p.prep['x:x1'] = true;
  T(projProgress(p).done === 1, 'cocher un consommable compte');
  delete p.prep['x:x1'];

  S('9. Le contenu suit les packs… jusqu’au départ');
  db.packItems.push({pack_id:'k-pel', item_id:'PRE-002'});
  T(projContent(p).items.length === 6, 'remplir la caisse change ce qui partira');
  p.snapshot = projSnapshot(p); p.status = 'show';
  var gelé = projContent(p);
  T(gelé.frozen === true, 'une fois parti, le contenu est figé');
  T(gelé.items.length === 6, 'et vaut ce qu’il valait au départ');
  db.packItems = db.packItems.filter(l=>!(l.pack_id==='k-pel' && l.item_id==='PRE-002'));
  T(projContent(p).items.length === 6, 'vider la caisse ne réécrit pas ce qui est sorti');
  p.status = 'inactif'; p.snapshot = null;
  T(projContent(p).items.length === 5, 'et le projet suivant repart du réel');

  S('10. Les exemplaires se regroupent');
  projView = {mode:'edit', id:'pr1', tab:'items', q:''};
  var g = projGroups().find(x=>x.name === 'XLR 5 m');
  T(!!g, 'les trois XLR forment un groupe');
  T(g.all.length === 3, 'avec leurs trois exemplaires');
  T(projGroups().filter(x=>x.name==='XLR 5 m').length === 1, 'et une seule ligne');

  S('11. Glisser déplace, et seulement depuis la caisse d’origine');
  retraits.length = 0;
  await packMoveInto('k-rack', ['PRE-001'], 'k-pel');
  T(retraits.length === 1 && retraits[0].packId === 'k-pel',
    'l’item quitte la caisse d’où part le geste');
  T(packsOfItem('PRE-001').some(x=>x.id === 'k-lbx'),
    'ses autres appartenances ne bougent pas');
  retraits.length = 0;
  await packMoveInto('k-pel', ['CBL-001'], null);
  T(retraits.length === 0, 'sans origine connue, on ajoute sans rien retirer');

  S('12. Une caisse sortie entière le dit, et dit où');
  /* Le cas vu en production le 14 octobre : la LEASH SQ5+ était partie
     à la Mustard Factory, et la fiche annonçait « ⚠ Missing from the
     rack — 3 ». Rien ne manquait : tout était dans la caisse. */
  var pel = pack('k-pel');
  packAllItems(pel).forEach(i=>{
    i.status='sorti';
    i.out={userId:null, projectId:null, date:'2026-10-14', reason:'Mustard Factory'};
  });
  var stp = packStatus(pel);
  T(!!stp.dehors, 'le pack est reconnu comme sorti');
  T(/Mustard/.test(stp.dehors.où), 'et sa destination est nommée');
  T(stp.manque === false, 'rien n’est « manquant » : tout est dans la caisse');

  /* Une configuration dont le contenant est parti compte aussi, même
     si un élément est resté au studio. */
  db.items.find(i=>i.id==='MIC-001').status='dispo';
  db.items.find(i=>i.id==='MIC-001').out=null;
  T(!!packStatus(pel).dehors, 'le contenant parti suffit à dire que la caisse est partie');
  T(packStatus(pel).dehors.partiel === true, 'et l’on sait qu’il en reste');

  /* Un objet parti seul à l'atelier ne fait pas partir le pack. */
  packAllItems(pel).forEach(i=>{ i.status='dispo'; i.out=null; });
  var un = db.items.find(i=>i.id==='MIC-002');
  un.status='sorti'; un.out={userId:null, repairId:'r1', date:'x', reason:'Atelier'};
  T(packStatus(pel).dehors === null, 'un départ en réparation ne sort pas la caisse');
  un.status='dispo'; un.out=null;

  window.__results = R;
 })();
`;

const dom = new JSDOM(html,{runScripts:'dangerously',url:'https://inventory.accessflow.fr/'});
const packs = read('js/views-packs.js');
const proj  = read('js/views-projects.js');
dom.window.eval([
  STUBS,
  read('js/config.js'),
  read('js/helpers.js'),
  // Les deux fonctions testées, extraites : le reste de views-packs.js
  // touche au DOM de l'onglet, qui n'existe pas ici.
  // projItems / projProgress vivent dans db.js, qui parle à Supabase :
  // on n'en prend que ces deux fonctions.
  (read('js/db.js').match(/function projItems\(p\)\{[\s\S]*?\n}\s*\n/)||[''])[0],
  (read('js/db.js').match(/function projProgress\(p\)\{[\s\S]*?\n}/)||[''])[0],
  (packs.match(/async function packMoveInto\(packId, itemIds, sourceId\)\{[\s\S]*?\n}/)||[''])[0],
  (proj.match(/function projGroups\(\)\{[\s\S]*?\n}/)||[''])[0],
  'var projView = {mode:"list", id:null, tab:"items", q:""};',
  DATA, TESTS
].join('\n;\n'));

(async () => {
  for(let i=0;i<300 && !dom.window.__results;i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }
  const R = dom.window.__results;

  R.push([null,'13. Cohérence des fichiers']);
  const vp = read('js/views-projects.js');
  /* Le glissement doit écouter la FENÊTRE : avec la seule capture de
     pointeur, le fantôme se figeait dès que le doigt quittait la
     ligne, et le dépôt n'avait jamais lieu. */
  R.push([/window\.addEventListener\('pointermove'/.test(vp) &&
          /window\.addEventListener\('pointerup'/.test(vp),
          'le glissement survit à la sortie de la ligne']);
  R.push([/function packCheckin/.test(read('js/views-packs.js')),
          'une caisse sortie se rentre d’un geste']);
  const app = read('js/app.js'), h = read('index.html'),
        dbjs = read('js/db.js'), sql = read('sql/024-packs-presets-projets.sql');

  R.push([null,'12bis. Les packs sont une surface principale']);
  /* La v1.22 les avait mis en tête. La v1.29.1 a replacé les projets
     devant : le projet est la fin, les caisses existent pour le
     servir. Les packs restent en haut de barre, deuxième. */
  const nav = h.slice(h.indexOf('<nav'), h.indexOf('</nav>'));
  const ordre = [...nav.matchAll(/data-v="(\w+)"/g)].map(m=>m[1]);
  R.push([ordre[2] === 'packs', 'Packs vient juste après les projets']);
  R.push([ordre.indexOf('packs') < ordre.indexOf('inv'), 'avant l’inventaire']);
  R.push([ordre.indexOf('packs') < ordre.indexOf('people'), 'et avant les emprunteurs']);
  const dash = read('js/views-dashboard.js');
  R.push([/function dashPacksHTML/.test(dash) && /dashPacksHTML\(\)/.test(dash),
          'le tableau de bord liste les caisses']);
  R.push([/packCheckout\('\$\{p\.id\}'\)/.test(dash),
          'et permet d’en envoyer une sans passer par l’onglet']);
  R.push([/packRoots\(\)/.test(dash),
          'seules les caisses racines sont proposées']);

  R.push([null,'12ter. Une seule largeur, partout']);
  const css = read('css/styles.css');
  /* La v1.22.4 avait élargi certaines vues et pas d'autres. La v2.0.1
     a supprimé la distinction : le rail ayant pris sa part, le contenu
     prend le reste — partout, et sans condition. */
  R.push([!/WIDE_VIEWS/.test(app), 'plus de liste de vues « larges »']);
  R.push([!/wideview/.test(css), 'ni de classe qui en décide']);
  R.push([/main\{padding:20px 22px;max-width:none/.test(css),
          'le contenu occupe toute la place laissée par le rail']);
  R.push([/\.viewintro,\.hero p\{max-width:75ch\}/.test(css),
          'seuls les textes longs gardent une largeur de lecture']);
  /* Aucune cellule ne doit se replier : un en-tête coupé en deux
     double la hauteur de toute la ligne. */
  ['v-out','v-proj','v-rep','v-people'].forEach(v=>{
    R.push([new RegExp(`#${v} table th, #${v} table td`).test(css),
            `${v} : les cellules ne se coupent pas`]);
  });
  R.push([/@media\(max-width:700px\)\{[\s\S]*?#v-out table th[\s\S]*?white-space:normal/.test(css),
          'sauf sur téléphone, où le tableau devient des cartes']);

  R.push([/drop index if exists public\.pack_items_one_pack_per_item/.test(sql),
          'la 024 lève l’unicité d’appartenance']);
  R.push([/create table if not exists public\.pack_extras/.test(sql),
          'et crée la table des consommables']);
  R.push([/packs\s*\n?\s*add column if not exists permanent boolean/.test(sql.replace(/\s+/g,' ').replace(/packs add/,'packs\n  add')) ||
          /add column if not exists permanent boolean/.test(sql),
          'les packs portent le drapeau « monté en permanence »']);
  R.push([/with recursive anc\(pack_id, profondeur\)/.test(sql),
          'le contrôle de boucle explore tous les ancêtres']);
  R.push([/pack_ids jsonb/.test(sql) && /add column if not exists snapshot jsonb/.test(sql),
          'les projets accueillent des caisses et un contenu figé']);
  R.push([/new\.pack_ids::text/.test(sql),
          'et la composition reste réservée aux administrateurs']);

  R.push([/from\('pack_extras'\)\.select/.test(dbjs), 'les consommables sont chargés']);
  R.push([/'pack_extras'\]/.test(dbjs) || /pack_items','pack_extras'/.test(dbjs),
          'et suivis en temps réel']);
  R.push([/pack_ids:p\.pack_ids\|\|\[\]/.test(dbjs), 'les caisses d’un projet sont normalisées']);

  R.push([/packExtras/.test(app) && /apiUpsertPackExtras/.test(app),
          'la restauration rend les consommables']);
  R.push([/permanent: !!p\.permanent/.test(app), 'et le drapeau des packs']);
  R.push([/pack_ids:p\.pack_ids\|\|\[\]/.test(app), 'et les caisses des projets']);

  R.push([!/id="ovProj"/.test(h) && !/id="ovProjDetail"/.test(h),
          'les anciennes fenêtres des projets ont disparu']);
  const cssp = read('css/styles.css');
  R.push([/\.pjgrip,\.pkgrip\{touch-action:none/.test(cssp),
          'la poignée retient le doigt pendant le glissement']);
  R.push([!/\.pjrow\{[^}]*touch-action:none/.test(cssp),
          'mais la ligne entière ne bloque plus le défilement']);
  R.push([/pointerType === 'touch'[\s\S]{0,120}pjgrip[\s\S]{0,120}armerAppuiLong/.test(vp),
          'et au doigt : la poignée, ou l’appui long sur la ligne']);

  const vApp=(app.match(/APP_VERSION = '([\d.]+)'/)||[])[1];
  const vUniq=[...new Set((h.match(/\?v=[\d.]+/g)||[]).map(t=>t.slice(3)))];
  R.push([vUniq.length===1 && vUniq[0]===vApp, `tous les fichiers en ${vApp}`]);

  let fails=0;
  for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
    else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
  console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
  process.exit(fails?1:0);
})();
