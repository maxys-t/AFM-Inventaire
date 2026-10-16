/* Harnais v1.20 — packs : arbre, poids récursif, complétude, boucles. */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const html = `<!DOCTYPE html><html><body>
  <div id="v-packs"></div><div id="packTree"></div><div id="packBody"></div>
  <div id="packActs"></div><input id="packq"><div id="paList"></div>
  <button id="paGo"></button><input id="pa-q">
  <span id="pfTitle"></span><div id="pfBody"></div>
</body></html>`;

const STUBS = `
  var toasts=[], me={role:'admin'}, sel=new Set(), écrits=[];
  var db={items:[],users:[],locations:[],history:[],projects:[],trash:[],
          repairs:[],providers:[],repairsSupported:true,
          packs:[],packItems:[],packsSupported:true};
  function item(id){ return db.items.find(i=>i.id===id); }
  function can(){ return true; } function toast(m,k,l,f){ toasts.push({m,k:k||'info',undo:f}); }
  function open_(){} function close_(){} function show(){} function render(){}
  function openBulkCheckout(){ écrits.push(['bulkCheckout',[...sel]]); }
  function renderBulkBar(){}
  function canCheckout(i){ return i.status==='dispo' && i.cond!=='hs'; }
  /* v1.23 : seul l'objet chez un réparateur ne peut pas partir. */
  function checkoutImpossible(i){ var r=repairOf(i.id); return !!(r && r.status==='sent'); }
  function checkoutBlockReason(i){ return i.cond==='hs' ? 'marked out of service'
                                  : i.cond==='ko' ? 'marked faulty' : null; }
  function outForRepair(i){ return !!(i.out && i.out.repairId); }
  function locLabel(n){ return n||''; }
  async function refresh(){ return true; }
  async function apiAddPackItems(p, ids){ ids.forEach(id=>{
    if(!db.packItems.some(l=>l.pack_id===p&&l.item_id===id)) db.packItems.push({pack_id:p,item_id:id}); });
    écrits.push(['add',p,ids.slice()]); }
  async function apiRemovePackItems(p, ids){
    db.packItems = db.packItems.filter(l=>!(l.pack_id===p && ids.includes(l.item_id)));
    écrits.push(['remove',p,ids.slice()]); }
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
`;

const DATA = `
  var mk=(id,name,brand,g)=>({id,name,brand,cat:'divers',subcat:'x',cond:'bon',
    status:'dispo',loc:'Studio A',home:'Studio A',photo:null,out:null,
    weight_g:g||null});
  db.items=[
    mk('RCK-001','Rack 19 studio','Thon',18000),
    mk('LBX-001','Lunchbox','BAE',4990),
    mk('PRE-008','7600 Input Module','API',1200),
    mk('PRE-005','EFX','Analog Process',900),
    mk('CAS-004','Peli 1610','Peli',10100),
    mk('SYN-001','Juno-106','Roland',10000),
    mk('MCD-001','SM57','Shure',284),
    mk('ALI-001','Alim Juno','Roland',600)
  ];
  window.mk = mk;
  db.packs=[
    {id:'p-rack', name:'Rack Studio A',    container_id:'RCK-001', archived:false},
    {id:'p-lbx',  name:'Lunchbox 500',     container_id:'LBX-001', archived:false},
    {id:'p-peli', name:'Pelicase Clavier', container_id:'CAS-004', archived:false},
    {id:'p-nu',   name:'Juno + alim',      container_id:null,      archived:false}
  ];
  db.packItems=[
    {pack_id:'p-rack', item_id:'LBX-001'},   // le lunchbox est DANS le rack
    {pack_id:'p-rack', item_id:'MCD-001'},
    {pack_id:'p-lbx',  item_id:'PRE-008'},
    {pack_id:'p-lbx',  item_id:'PRE-005'},
    {pack_id:'p-nu',   item_id:'SYN-001'},
    {pack_id:'p-nu',   item_id:'ALI-001'}
  ];

`;

const TESTS = `
 (async () => {
  var R=[]; function T(c,l){R.push([!!c,l]);} function S(l){R.push([null,l]);}

  S('1. L’arbre se déduit, il n’est pas stocké');
  T(packParent(pack('p-lbx')).id === 'p-rack', 'le lunchbox est enfant du rack');
  T(packParent(pack('p-rack')) === null, 'le rack est à la racine');
  T(packChildren('p-rack').length === 1, 'le rack a un enfant');
  T(packRoots().map(p=>p.id).sort().join(',') === 'p-nu,p-peli,p-rack',
    'trois packs à la racine, le lunchbox n’y est pas');

  S('2. Une seule relation : pack_items, et rien d’autre');
  T(packOfItem('LBX-001').id === 'p-rack', 'le lunchbox est dans le rack');
  T(packOfItem('MCD-001').id === 'p-rack', 'le SM57 aussi');
  T(packOfItem('CAS-004') === null, 'la Pelicase n’est rangée nulle part');
  T(packItemsOf('p-rack').length === 2, 'le rack contient deux items');

  S('3. Poids récursif, sans double comptage');
  T(itemWeightDeep(item('LBX-001')) === 4990+1200+900, 'un contenant pèse son contenu');
  T(packWeight(pack('p-lbx')) === 4990+1200+900, 'le pack lunchbox aussi');
  T(packWeight(pack('p-rack')) === 18000+4990+1200+900+284, 'le rack englobe le lunchbox');
  var racines = packRoots().reduce((t,p)=>t+packWeight(p),0);
  T(racines === packWeight(pack('p-rack')) + packWeight(pack('p-peli')) + packWeight(pack('p-nu')),
    'le total des racines ne compte pas deux fois le lunchbox');
  T(packWeightParts(pack('p-rack')).contenant === 18000, 'le détail isole le contenant');

  S('4. Un pack sans contenant tient aussi');
  T(packWeight(pack('p-nu')) === 10000+600, 'somme de son contenu');
  T(packParent(pack('p-nu')) === null, 'et il reste à la racine');

  S('5. « Absent » veut dire sorti ou en réparation, rien d’autre');
  var st = packStatus(pack('p-nu'));
  T(st.total === 2 && st.présents.length === 2, 'tout est là au départ');
  T(st.absents.length === 0, 'donc rien à signaler');
  var j2 = item('SYN-001');
  j2.status='sorti'; j2.out={userId:'u1',date:'2026-10-01T10:00:00Z',reason:'Trianon',due:null};
  st = packStatus(pack('p-nu'));
  T(st.absents.length === 1, 'un item sorti est absent de la boîte');
  T(/Trianon/.test(st.absents[0].où||''), 'et on sait où il est');
  j2.status='dispo'; j2.out=null;

  /* v1.22 : un item peut appartenir à plusieurs recettes. Glisser le
     DÉPLACE quand même — c'est la caisse d'où part le geste qui le
     perd, et elle seule. */
  S('6. Glisser déplace, depuis la caisse d’origine');
  await packMoveInto('p-peli', ['MCD-001'], 'p-rack');
  T(packsOfItem('MCD-001').length === 1, 'il n’est que dans une caisse');
  T(packsOfItem('MCD-001')[0].id === 'p-peli', 'la nouvelle');
  T(packItemsOf('p-rack').length === 1, 'et il a quitté l’ancienne');
  var t2 = toasts[toasts.length-1];
  await t2.undo();
  T(packsOfItem('MCD-001')[0].id === 'p-rack', 'l’annulation le remet où il était');

  S('7. Les boucles sont refusées AVANT la dépose');
  T(packWouldLoop('p-lbx','RCK-001') === true,
    'mettre le rack dans le lunchbox refermerait la boucle');
  T(packWouldLoop('p-rack','CAS-004') === false, 'une Pelicase dans le rack, en revanche, passe');
  T(packWouldLoop('p-rack','LBX-001') === false, 'et ce qui y est déjà ne pose pas de problème');

  S('8. Photo : le contenant l’emporte');
  item('RCK-001').photo = 'rack.jpg';
  T(packPhoto(pack('p-rack')) === 'rack.jpg', 'la photo du pack est celle de sa caisse');
  item('ALI-001').photo = 'alim.jpg';
  T(packPhoto(pack('p-nu')) === 'alim.jpg', 'sans contenant, celle du premier item qui en a une');

  S('9. Sortir un objet de son pack');
  T(packOfItem('LBX-001').id === 'p-rack', 'au départ il est dedans');
  toasts = [];
  await packTakeOut('LBX-001');
  T(packOfItem('LBX-001') === null, 'il n’est plus rangé nulle part');
  T(packParent(pack('p-lbx')) === null, 'le pack remonte donc à la racine');
  T(packWeight(pack('p-rack')) === 18000+284, 'le rack ne compte plus son contenu');
  await toasts[toasts.length-1].undo();
  T(packOfItem('LBX-001').id === 'p-rack', 'l’annulation le remet dedans');
  T(packParent(pack('p-lbx')).id === 'p-rack', 'et l’arbre reprend sa forme');

  S('10. Supprimer un pack n’emporte pas son contenant ailleurs');
  /* Le bug de la v1.20.3 : le contenant gardait son appartenance au
     pack parent, donc recréer le pack le replaçait tout seul. Avec une
     seule relation, sortir le contenant suffit, et rien ne subsiste. */
  await packTakeOut('LBX-001');
  T(packOfItem('LBX-001') === null, 'une fois sorti, il n’appartient plus à rien');
  T(packParent(pack('p-lbx')) === null, 'un pack recréé sur ce contenant resterait à la racine');
  await apiAddPackItems('p-rack', ['LBX-001']);

  S('11. Choisir un contenant dans la liste');
  db.items.push(mk('500-001','Lunchbox','BAE',4990));
  openPackForm();
  T(packPickId('BAE Lunchbox · 500-001') === '500-001', 'un identifiant à code numérique est reconnu');
  T(packPickId('Roland Juno-106 · SYN-001') === 'SYN-001', 'et le cas ordinaire aussi');
  T(packPickId('SYN-001') === 'SYN-001', 'un identifiant seul passe');
  T(packPickId('Objet qui n’existe pas') === null, 'et l’inconnu reste inconnu');
  db.items = db.items.filter(i=>i.id !== '500-001');

  S('12. Sortir un pack prend tout ce qui part');
  /* Le défaut de la v1.20.4 : seuls les membres directs étaient
     sélectionnés. Le contenant restait au studio, et les modules du
     lunchbox imbriqué aussi. */
  var tout = packAllItems(pack('p-rack')).map(i=>i.id).sort();
  T(tout.includes('RCK-001'), 'le meuble lui-même part');
  T(tout.includes('LBX-001'), 'le lunchbox aussi');
  T(tout.includes('PRE-008') && tout.includes('PRE-005'),
    'et les modules qui sont dedans, deux niveaux plus bas');
  T(tout.includes('MCD-001'), 'sans oublier les membres directs');
  T(new Set(tout).size === tout.length, 'et personne n’est compté deux fois');

  sel = new Set(); écrits = []; toasts = [];
  var p5 = item('PRE-005');
  p5.status='sorti'; p5.out={userId:'u1',date:'2026-10-01T10:00:00Z',reason:'Trianon',due:null};
  packCheckout('p-rack');
  T(sel.has('RCK-001') && sel.has('LBX-001') && sel.has('PRE-008'),
    'la sélection couvre le contenant et les niveaux imbriqués');
  T(!sel.has('PRE-005'), 'celui qui est déjà dehors en est exclu');
  T(toasts.some(x=>/already out/.test(x.m)), 'et son absence est annoncée');
  T(écrits.some(x=>x[0]==='bulkCheckout'), 'la fenêtre de sortie s’ouvre');
  p5.status='dispo'; p5.out=null;

  S('13. Les packs existent ailleurs que dans leur onglet');
  var inv = read_views_inventory;
  T(/function packLines/.test(inv), 'la fiche d’un item indique son pack');
  T(/In pack:/.test(inv), 'quand il est rangé quelque part');
  T(/Container of:/.test(inv), 'et ce qu’il contient quand il est un contenant');
  T(/function outPackBand/.test(inv), 'la fenêtre de sortie signale le pack d’un contenant');
  T(/checkoutWholePack/.test(inv), 'avec un bouton pour tout emporter');
  T(/Take the whole pack/.test(inv), 'et un libellé qui dit ce que le bouton fait');

  S('14. Codes périmés — on signale, on ne corrige pas');
  /* Les items du harnais sont en catégorie fictive ; on en remet un
     dans une vraie sous-catégorie pour que la comparaison ait du sens. */
  var t = item('PRE-008');
  t.cat = 'peripheriques'; t.subcat = 'preampli';
  T(codeFor('peripheriques','preampli') === 'PRE', 'le code attendu est bien PRE');
  T(codeStale(t) === false, 'un item bien nommé ne déclenche rien');
  t.subcat = 'chassis';
  T(codeStale(t) === true, 'changer la sous-catégorie rend le code périmé');
  T(t.id === 'PRE-008', 'mais l’identifiant ne bouge pas tout seul');
  T(staleItems().some(x=>x.id === 'PRE-008'), 'et l’item apparaît dans la liste');
  t.subcat = 'preampli';
  T(!staleItems().some(x=>x.id === 'PRE-008'), 'il en sort dès que tout concorde');

  S('L’appui long soulève l’objet');
  /* Le geste que la tablette a déjà appris : on pose, ça se soulève,
     on emmène. Mais si le doigt bouge avant la fin du délai, c'est un
     défilement — et il doit avoir lieu. */
  var ligne = document.createElement('div');
  document.body.appendChild(ligne);
  var saisi = 0;
  armerAppuiLong({clientX:100, clientY:100}, ()=>saisi++, ligne, 30);
  T(saisi === 0, 'rien ne se passe tout de suite');
  await new Promise(r=>setTimeout(r, 60));
  T(saisi === 1, 'après le délai, l’objet est saisi');
  T(ligne.classList.contains('lifted'), 'et il se voit soulevé');
  annulerAppuiLong();
  T(!ligne.classList.contains('lifted'), 'reposé à la fin du geste');

  saisi = 0;
  armerAppuiLong({clientX:100, clientY:100}, ()=>saisi++, ligne, 30);
  window.dispatchEvent(Object.assign(new window.Event('pointermove'),
                                     {clientX:100, clientY:140}));
  await new Promise(r=>setTimeout(r, 60));
  T(saisi === 0, 'un doigt qui bouge avant la fin : c’est un défilement, pas une saisie');
  T(!ligne.classList.contains('lifted'), 'et rien ne s’est soulevé');
  annulerAppuiLong();

  S('La liste défile pendant qu’on glisse');
  /* Tenir un objet interdisait à la page de bouger : la caisse
     d'arrivée hors écran devenait inatteignable. On défile près des
     bords, d'autant plus vite qu'on en est près. */
  var H = window.innerHeight;
  dragScrollMove({clientX:10, clientY:Math.round(H/2)});
  T(_dragScroll.v === 0, 'au milieu, rien ne bouge');
  dragScrollMove({clientX:10, clientY:4});
  T(_dragScroll.v < 0, 'près du haut, on remonte');
  var près = _dragScroll.v;
  dragScrollMove({clientX:10, clientY:60});
  T(_dragScroll.v < 0 && _dragScroll.v > près, 'plus on s’éloigne du bord, plus c’est lent');
  dragScrollMove({clientX:10, clientY:H - 4});
  T(_dragScroll.v > 0, 'près du bas, on descend');
  T(Math.abs(_dragScroll.v) <= 28, 'et jamais plus vite qu’un plafond');
  dragScrollStop();
  T(_dragScroll.v === 0 && _dragScroll.raf === 0, 'le geste fini, tout s’arrête');

  window.__results = R;
 })();
`;

const dom = new JSDOM(html, {runScripts:'dangerously', pretendToBeVisual:true,url:'https://inventory.accessflow.fr/'});
dom.window.read_views_inventory = read('js/views-inventory.js');
dom.window.eval([STUBS, read('js/config.js'), read('js/helpers.js'),
                 read('js/views-packs.js'), DATA, TESTS].join('\n;\n'));

(async () => {
  for(let i=0;i<300 && !dom.window.__results;i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }
  const R = dom.window.__results;

  R.push([null,'15. Cohérence des fichiers']);
  const app=read('js/app.js'), h=read('index.html'), css=read('css/styles.css'), sql=read('sql/019-packs.sql');
  R.push([/create table if not exists public\.packs/.test(sql), 'la migration 019 crée les packs']);
  R.push([/pack_items_no_cycle/.test(sql), 'un déclencheur refuse les boucles en base']);
  /* La 021 avait imposé un pack au plus par item ; la 024 lève cette
     contrainte — un pack est une recette, pas un lieu. On vérifie la
     suite des deux, sinon le test resterait vert en décrivant un
     modèle qui n'existe plus. */
  R.push([/pack_items_one_pack_per_item/.test(read('sql/021-packs-simplifies.sql')) &&
          /drop index if exists public\.pack_items_one_pack_per_item/.test(read('sql/024-packs-presets-projets.sql')),
          'l’unicité posée en 021 est levée en 024']);
  R.push([/drop column if exists in_pack_id/.test(read('sql/021-packs-simplifies.sql')),
          'et la colonne de position a disparu']);
  R.push([/data-v="packs"/.test(h), 'l’onglet est dans la navigation']);
  R.push([/id="v-packs"/.test(h), 'et sa section existe']);
  R.push([/views-packs\.js/.test(h), 'le script est chargé']);
  R.push([/'packs'/.test(app) && /renderPacks\(\)/.test(app), 'la navigation sait l’afficher']);
  R.push([/apiUpsertPacks/.test(app) && /packItems/.test(app),
          'la restauration JSON n’oublie pas les packs']);
  R.push([!/in_pack_id/.test(app) && !/in_pack_id/.test(read('js/helpers.js')),
          'plus aucune trace de la position : une seule relation']);
  /* v1.25 : la règle qui retient le doigt vit sur la POIGNÉE. Posée
     sur la ligne, elle empêchait de faire défiler une liste qui n'est
     faite que de lignes — c'est-à-dire tout l'onglet Packs. */
  R.push([/\.pjgrip,\.pkgrip\{touch-action:none/.test(css),
          'la poignée retient le doigt']);
  R.push([!/\.packrow\{[^}]*touch-action:none/.test(css) &&
          !/\.pkline\{[^}]*touch-action:none/.test(css),
          'et les lignes, non : la liste doit pouvoir défiler']);
  /* v1.25.3 : au doigt, deux chemins — la poignée tout de suite, ou
     l'appui long sur la ligne. Mais jamais un simple effleurement,
     qui doit rester un défilement. */
  const vpk = read('js/views-packs.js');
  R.push([/const parPoignée[\s\S]{0,400}armerAppuiLong/.test(vpk),
          'au doigt : la poignée, ou l’appui long']);
  R.push([/armerAppuiLong[\s\S]{0,80}packDragArm\(e, type, id, 0\)/.test(vpk),
          'après un appui long, l’objet est déjà soulevé : plus de seuil']);
  R.push([!/ondragstart|dragover/.test(read('js/views-packs.js')),
          'aucune API de glisser-déposer HTML, qui ne marche pas sur iPad']);
  R.push([/pointerdown/.test(read('js/views-packs.js')), 'des pointer events à la place']);
  const vp = read('js/views-packs.js');
  R.push([/dragFini/.test(vp), 'le clic qui suit un glissement est neutralisé']);
  R.push([/data-drop', '__out'/.test(vp) || /'__out'/.test(vp),
          'une zone permet de sortir un objet de son pack']);
  R.push([/\.packoutrow\{/.test(css), 'et elle a un style de ligne de liste']);
  R.push([/getElementById\('packout'\)/.test(vp) && /packOutBar\(false\)/.test(vp),
          'elle disparaît à la fin du geste']);
  R.push([/insertBefore\(b, drag\.conteneur\.firstChild\)/.test(vp),
          'elle s’insère en tête de la liste où l’on travaille']);
  R.push([!/#packout\{[^}]*position:fixed/.test(css),
          'et ne flotte plus en haut de la fenêtre']);
  const vset = read('js/views-settings.js');
  R.push([/id="pv-country"/.test(vset) && /addr_country:g\('country'\)/.test(vset),
          'le pays d’un atelier de réparation est saisissable et enregistré']);
  R.push([/openStaleCodes/.test(read('js/views-settings.js')),
          'les codes périmés sont listés dans Settings']);
  R.push([/tag stale/.test(read('js/views-inventory.js')),
          'et signalés sur la fiche de l’item']);
  /* On vérifie le COMPORTEMENT, pas le vocabulaire : la fenêtre ne
     doit écrire nulle part. Chercher un mot dans le texte explicatif
     revient à tester sa propre documentation. */
  const vs = read('js/views-settings.js');
  const fn = (vs.match(/function openStaleCodes\(\)\{[\s\S]*?\n}/) || [''])[0];
  R.push([!!fn && !/\bapi[A-Z]/.test(fn) && !/\bawait\b/.test(fn),
          'la fenêtre des codes périmés n’écrit rien : elle montre, elle ne corrige pas']);
  const vApp=(app.match(/APP_VERSION = '([\d.]+)'/)||[])[1];
  const vUniq=[...new Set((h.match(/\?v=[\d.]+/g)||[]).map(t=>t.slice(3)))];
  R.push([vUniq.length===1 && vUniq[0]===vApp, `tous les fichiers en ${vApp} (trouvé : ${vUniq.join(', ')})`]);

  let fails=0;
  for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
    else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
  console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
  process.exit(fails?1:0);
})();
