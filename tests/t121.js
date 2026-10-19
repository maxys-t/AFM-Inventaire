/* Harnais v1.21 — conditionnement et regroupement des sorties. */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const html = `<!DOCTYPE html><html><body>
  <div id="outList"></div><input id="oq"><select id="oCat"><option value=""></option></select>
  <select id="oUser"><option value=""></option></select><input id="oDays" value="0">
  <input type="checkbox" id="i-case"><input id="i-weight"><input id="i-copies" value="0">
</body></html>`;

const STUBS = `
  var toasts=[], me={role:'admin'}, sel=new Set();
  var db={items:[],users:[],locations:[],history:[],projects:[],trash:[],
          repairs:[],providers:[],repairsSupported:true,packs:[],packItems:[],packsSupported:true};
  function item(id){ return db.items.find(i=>i.id===id); }
  function can(){ return true; } function toast(m,k){ toasts.push({m,k:k||'info'}); }
  function openDetail(){} function openCheckin(){} function openReceive(){}
  function openBulkCheckin(){ toasts.push({m:'bulkCheckin',sel:[...sel]}); }
  function catOptions(){ return ''; }
  var uidN = 0;
  function uid(){ return 'NEW-' + (++uidN).toString().padStart(3,'0'); }
  async function apiInsertItems(rows){ }
  async function apiUpdateItem(id, f){ Object.assign(item(id)||{}, f); }
  async function histMany(){ }
  function userName(id){ var u=db.users.find(x=>x.id===id); return u?u.name:'?'; }
  function project(){ return null; }
  function outBy(i){
    if(i.out && i.out.repairId) return '🔧 ' + (i.out.reason||'');
    return i.out ? userName(i.out.userId) : '';
  }
  function outForRepair(i){ return !!(i.out && i.out.repairId); }
  function locLabel(n){ return n||''; }
  function overdue(){ return false; }
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
`;

const DATA = `
  db.users=[{id:'u1',name:'Xavier'}];
  var out=(r)=>({userId:'u1',date:'2026-10-12T18:51:00Z',reason:r,due:null});
  var mk=(id,name,brand,g,st,r)=>({id,name,brand,cat:'divers',subcat:'x',cond:'bon',
    status:st||'dispo',loc:st==='sorti'?(r||'Session'):'Studio A',home:'Studio A',
    photo:null,out:st==='sorti'?out(r||'Session'):null,weight_g:g||null,has_case:false});
  db.items=[
    mk('RCK-001','Rack Sidecar','Thon',18000,'sorti'),
    mk('R50-001','Lunchbox','BAE',4990,'sorti'),
    mk('PRE-008','7600 Input Module','API',1200,'sorti'),
    mk('R50-003','Titan','WES Audio',2000,'sorti'),
    mk('GTR-001','Jazz Bass','Fender',4200,'sorti','Trianon'),
    mk('MCD-001','SM57','Shure',284)
  ];
  /* R50-001 est le contenant du Lunchbox ET un membre du rack :
     le Lunchbox est donc imbriqué dans le rack. */
  db.packs=[{id:'p-rack',name:'Rack Sidecar',container_id:'RCK-001',archived:false,permanent:true},
            {id:'p-lbx', name:'BAE Lunchbox',container_id:'R50-001',archived:false,permanent:true}];
  db.packItems=[
    {pack_id:'p-rack', item_id:'R50-001'},
    {pack_id:'p-rack', item_id:'PRE-008'},
    {pack_id:'p-lbx',  item_id:'R50-003'}
  ];
`;

const TESTS = `
 (async () => {
  var R=[]; function T(c,l){R.push([!!c,l]);} function S(l){R.push([null,l]);}

  S('1. Les sorties d’un même pack se regroupent');
  var sortis = db.items.filter(i=>i.status==='sorti');
  var h = outGroupedHTML(sortis);
  T(h.includes('outpack'), 'une ligne de groupe apparaît');
  T(h.includes('Rack Sidecar'), 'au nom du pack');
  T(/4 items/.test(h), 'avec le compte, contenant et caisse imbriquée compris');
  T(h.includes('Check-in all'), 'et un retour groupé');
  T((h.match(/outpack/g)||[]).length === 1,
    'replié, la caisse imbriquée ne s’affiche pas à côté de sa parente');

  S('2. Un item isolé reste une ligne ordinaire');
  /* La basse est sortie pour une autre destination : mieux vaut pas
     de groupe qu’un groupe d’un seul. */
  T(h.includes('Jazz Bass'), 'elle est bien listée');
  var avantBasse = h.slice(0, h.indexOf('Jazz Bass'));
  T((avantBasse.match(/outpack/g)||[]).length >= 1, 'le groupe la précède');
  T(!/Trianon[\\s\\S]{0,200}outpack/.test(h), 'mais elle n’est pas dans un groupe');

  S('3. Le détail se déplie');
  /* L'identifiant figure aussi dans le bouton « Check-in all » : on
     regarde donc la ligne enfant, pas la chaîne. */
  T(!h.includes('childrow'), 'replié, aucune ligne enfant');
  toggleOutPack([...outOpen, 'x'] && 'p:p-rack|Xavier|Session');
  h = outGroupedHTML(sortis);
  T(h.includes('PRE-008'), 'déplié, il apparaît');
  T(h.includes('childrow'), 'en lignes enfants');
  /* v1.22.2 : l'arborescence des autres onglets vaut ici aussi. Le
     Lunchbox est DANS le rack, il ne part pas à côté. */
  T((h.match(/outpack/g)||[]).length === 2, 'une seconde ligne de caisse apparaît');
  T(h.includes('BAE Lunchbox'), 'la caisse imbriquée, nommée');
  var iRack = h.indexOf('Rack Sidecar'), iLbx = h.indexOf('BAE Lunchbox');
  T(iRack >= 0 && iLbx > iRack, 'et après elle, jamais avant');
  var ligneLbx = h.slice(h.lastIndexOf('<tr', iLbx), iLbx);
  T(/padding-left:34px/.test(ligneLbx), 'décalée d’un niveau');
  /* Son identifiant figure dans le « Check-in all » de la parente :
     on regarde donc s'il a une LIGNE, pas s'il est mentionné. */
  T(!h.includes("openDetail('R50-003')"), 'son contenu reste replié tant qu’on ne l’ouvre pas');
  toggleOutPack('p:p-lbx|Xavier|Session');
  h = outGroupedHTML(sortis);
  T(h.includes("openDetail('R50-003')"), 'ouverte, elle montre le sien');

  S('4. Rentrer une caisse entière');
  sel = new Set(); toasts = [];
  checkinPack('RCK-001,R50-001,PRE-008,R50-003');
  T(sel.size === 4, 'les quatre items sont sélectionnés');
  T(toasts.some(x=>x.m === 'bulkCheckin'), 'et le retour groupé s’ouvre');

  S('5. Un retour de réparation ne se mélange pas');
  var t = item('PRE-008');
  t.out = {userId:null, date:'2026-10-12T18:51:00Z', reason:'Audio Service', due:null, repairId:'r1'};
  sel = new Set(); toasts = [];
  checkinPack('RCK-001,PRE-008');
  T(!sel.has('PRE-008'), 'l’item en réparation est écarté du retour ordinaire');
  T(sel.has('RCK-001'), 'les autres passent');
  T(toasts.some(x=>/repair check/.test(x.m)), 'et l’app explique pourquoi');

  S('6. Conditionnement');
  var m = item('MCD-001');
  T(m.has_case === false, 'par défaut, pas de conditionnement');
  m.has_case = true;
  T(filterValueOf('case', m) === 'Has a case', 'le filtre le reconnaît');
  m.has_case = false;
  T(filterValueOf('case', m) === 'No case', 'et son absence aussi');
  T(INV_COLUMNS.some(c=>c.k === 'case'), 'la colonne existe');

  S('7. Ajouter des exemplaires depuis la fiche');
  /* On découvre souvent après coup qu'on possède deux housses et pas
     une. La convention « #1, #2 » doit être respectée, et le numéro
     de série ne doit jamais être recopié. */
  db.items.push({id:'BAG-001',name:'K12 Bag',brand:'QSC',cat:'supports',subcat:'housse',
    cond:'bon',status:'dispo',loc:'Studio A',home:'Studio A',photo:'p.jpg',
    serial:'SN-123',weight_g:3000,has_case:false,out:null});
  var src = item('BAG-001');
  document.getElementById('i-copies').value = '1';
  await addCopies(src, {name:'K12 Bag', cat:'supports', subcat:'housse', brand:'QSC',
                        cond:'bon', home:'Studio A', serial:'SN-123', weight_g:3000});
  T(src.name === 'K12 Bag #1', 'l’original prend le #1');
  var famille = db.items.filter(i=>groupKeyOf(i.name) === 'K12 Bag');
  T(famille.length === 2, 'il y a maintenant deux exemplaires');
  var copie = famille.find(i=>i.id !== 'BAG-001');
  T(copie.name === 'K12 Bag #2', 'le nouveau prend le #2');
  T(copie.serial === '', 'le numéro de série n’est pas recopié');
  T(copie.photo === 'p.jpg', 'la photo, si');
  T(copie.weight_g === 3000, 'le poids aussi');
  T(copie.id !== 'BAG-001', 'et il a son propre identifiant');

  document.getElementById('i-copies').value = '2';
  await addCopies(src, {name:'K12 Bag #1', cat:'supports', subcat:'housse', brand:'QSC',
                        cond:'bon', home:'Studio A', serial:'', weight_g:3000});
  var noms = db.items.filter(i=>groupKeyOf(i.name)==='K12 Bag').map(i=>i.name).sort();
  T(noms.join(',') === 'K12 Bag #1,K12 Bag #2,K12 Bag #3,K12 Bag #4',
    'la numérotation reprend là où elle s’était arrêtée');

  document.getElementById('i-copies').value = '0';
  var avant = db.items.length;
  await addCopies(src, {name:'K12 Bag #1', cat:'supports', subcat:'housse'});
  T(db.items.length === avant, 'zéro exemplaire n’ajoute rien');

  window.__results = R;
 })();
`;

const dom = new JSDOM(html,{runScripts:'dangerously',url:'https://inventory.accessflow.fr/'});
const inv = read('js/views-inventory.js');
dom.window.eval([STUBS, read('js/config.js'), read('js/helpers.js'), read('js/prefs.js'),
  "function filterValueOf(k,i){ return k==='case' ? (i.has_case?'Has a case':'No case') : ''; }",
  read('js/views-out.js'),
  (inv.match(/async function addCopies\(src, vals\)\{[\s\S]*?\n}/) || [''])[0],
  DATA, TESTS].join('\n;\n'));

(async () => {
  for(let i=0;i<300 && !dom.window.__results;i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }
  const R = dom.window.__results;
  R.push([null,'8. Cohérence des fichiers']);
  const app=read('js/app.js'), h=read('index.html'), sql=read('sql/022-conditionnement.sql');
  R.push([/has_case\s+boolean/.test(sql), 'la migration 022 ajoute le conditionnement']);
  R.push([/id="i-case"/.test(h), 'la case est dans le formulaire']);
  R.push([/has_case:!!i\.has_case/.test(app), 'et la sauvegarde ne l’oublie pas']);
  R.push([/outGroupedHTML/.test(read('js/views-out.js')), 'les sorties sont regroupées']);
  R.push([/id="i-copies"/.test(h) && /copiesField/.test(h),
          'le champ « exemplaires » n’apparaît qu’en édition']);
  R.push([/serial: ''/.test(inv), 'et un exemplaire ne reprend pas le numéro de série']);
  /* v2.0 : la fiche est passée en cartes thématiques. Le
     conditionnement a quitté le paragraphe pour la carte Rangement,
     mais il doit toujours y figurer, et toujours être nommé. */
  R.push([/kv\('Conditionnement'/.test(inv) && /case_note \|\| 'oui, non précisé'/.test(inv),
          'la fiche d’un item indique son conditionnement, nommé quand il l’est']);
  const vApp=(app.match(/APP_VERSION = '([\d.]+)'/)||[])[1];
  const vUniq=[...new Set((h.match(/\?v=[\d.]+/g)||[]).map(t=>t.slice(3)))];
  R.push([vUniq.length===1 && vUniq[0]===vApp, `tous les fichiers en ${vApp}`]);

  let fails=0;
  for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
    else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
  console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
  process.exit(fails?1:0);
})();
