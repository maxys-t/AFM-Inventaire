/* Harnais v1.28 — ranger les items d'un projet dans ses caisses. */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const html = `<!DOCTYPE html><html><body><div id="v-proj"></div></body></html>`;

const STUBS = `
  var toasts=[], me={role:'admin'}, sauvé=[];
  var db={items:[],users:[],locations:[],history:[],projects:[],trash:[],
          repairs:[],providers:[],repairsSupported:true,
          packs:[],packItems:[],packsSupported:true,
          packExtras:[],packExtrasSupported:true,projectsError:false};
  function item(id){ return db.items.find(i=>i.id===id); }
  function project(id){ return db.projects.find(p=>p.id===id); }
  function can(){ return true; }
  function toast(m,k,lbl,fn){ toasts.push({m,k:k||'info',undo:fn}); }
  async function apiAddPackItems(packId, ids){ ids.forEach(id=>db.packItems.push({pack_id:packId,item_id:id})); }
  async function apiRemovePackItems(packId, ids){
    db.packItems = db.packItems.filter(l=>!(l.pack_id===packId && ids.includes(l.item_id))); }
  function outBy(i){ return i.out ? (i.out.reason||'') : ''; }
  function outForRepair(i){ return !!(i.out && i.out.repairId); }
  function locLabel(n){ return n||''; }
  function renderProj(){}
  async function apiUpdateProject(id,f){ sauvé.push({id,f}); }
  async function projSave(p,f){ await apiUpdateProject(p.id,f); }
  var projView={mode:'edit', id:'pr1', tab:'items', q:''};
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
`;

const DATA = `
  var mk=(id,name,brand,g)=>({id,name,brand,cat:'divers',subcat:'x',cond:'bon',
    status:'dispo', loc:'Studio A', home:'Studio A', photo:null, out:null,
    weight_g:g||null, has_case:false});
  db.items=[
    mk('PEL-001','Pelicase','Peli',11000),
    mk('BAG-001','Sac câbles','Thon',2000),
    mk('MIC-001','U47','Neumann',1100),
    mk('PST-001','Pied #1','K&M',4400),
    mk('PST-002','Pied #2','K&M',4400),
    mk('CBL-001','XLR 5 m','Cordial',310)
  ];
  db.packs=[
    {id:'k-pel', name:'Pelicase micros', container_id:'PEL-001', archived:false, permanent:false},
    {id:'k-sac', name:'Sac scène',       container_id:'BAG-001', archived:false, permanent:false}
  ];
  db.packItems=[{pack_id:'k-pel', item_id:'MIC-001'}];
  db.projects=[{id:'pr1', name:'Trianon', status:'inactif', archived:false,
                item_ids:['PST-001','PST-002','CBL-001'], pack_ids:['k-pel','k-sac'],
                prep:{}, snapshot:null, subs:{},
                loc_name:'', starts_on:null, ends_on:null}];
`;

const TESTS = `
 (async () => {
  var R=[]; function T(c,l){R.push([!!c,l]);} function S(l){R.push([null,l]);}
  var p = project('pr1');

  S('1. Au départ, les items isolés partent en vrac');
  var c = projContent(p);
  T(c.loose.length === 3, 'les trois sont hors caisse');
  T(c.items.length === 6, 'six objets partent : deux caisses, un micro, trois isolés');
  var poids0 = c.weight;

  S('2. Lâcher un item sur une caisse l’y met — pour de bon');
  await projPutInPack('PST-001', 'k-pel');
  T(packItemsOf('k-pel').some(i=>i.id === 'PST-001'),
    'la recette de la Pelicase le contient désormais');
  c = projContent(p);
  T(c.groups[0].items.some(i=>i.id === 'PST-001'), 'il voyage avec elle');
  T(!c.loose.some(i=>i.id === 'PST-001'), 'et quitte le hors-caisse');
  T(!(p.item_ids||[]).includes('PST-001'),
    'retiré des items isolés du projet : sinon il compterait deux fois');
  T(c.items.length === 6, 'le total ne bouge pas');
  T(c.weight === poids0, 'le poids non plus');

  S('3. L’annulation est à portée');
  var t = toasts[toasts.length-1];
  T(/is now part of/.test(t.m), 'l’application dit ce qu’elle a fait');
  T(typeof t.undo === 'function', 'et propose de revenir en arrière');
  await t.undo();
  T(!packItemsOf('k-pel').some(i=>i.id === 'PST-001'), 'la recette revient à l’état d’avant');
  T((p.item_ids||[]).includes('PST-001'), 'et l’item retrouve sa place dans le projet');

  S('4. Un item de l’inventaire lâché sur une caisse y entre directement');
  T(!(p.item_ids||[]).includes('CBL-001') === false, 'CBL-001 est bien dans le projet au départ');
  await projPutInPack('CBL-001', 'k-sac');
  T(packItemsOf('k-sac').some(i=>i.id === 'CBL-001'), 'la caisse le contient');
  T(!(p.item_ids||[]).includes('CBL-001'), 'et il n’est plus isolé');

  S('5. Le départ fige ce qui part');
  var snap = projSnapshot(p);
  var sac = snap.packs.find(g=>g.id === 'k-sac');
  T(sac.items.includes('CBL-001'), 'le câble part dans le sac');
  p.snapshot = snap; p.status = 'show';
  db.packItems = db.packItems.filter(l=>!(l.pack_id==='k-sac' && l.item_id==='CBL-001'));
  var gelé = projContent(p);
  T(gelé.frozen === true, 'le contenu est figé');
  T(gelé.groups[1].items.some(i=>i.id === 'CBL-001'),
    'vider la caisse au studio ne réécrit pas ce qui roule');
  p.status = 'inactif'; p.snapshot = null;

  window.__results = R;
 })();
`;

const dom = new JSDOM(html,{runScripts:'dangerously',url:'https://inventory.accessflow.fr/'});
const vp = read('js/views-projects.js');
const morceau = re => (vp.match(re)||[''])[0];
dom.window.eval([
  STUBS,
  read('js/config.js'),
  read('js/helpers.js'),
  morceau(/async function projPutInPack\([\s\S]*?\n}\n/),
  morceau(/async function projRemovePack\([\s\S]*?\n}/),
  morceau(/async function projRemoveItem\([\s\S]*?\n}/),
  DATA, TESTS
].join('\n;\n'));

(async () => {
  for(let i=0;i<300 && !dom.window.__results;i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }
  const R = dom.window.__results;

  R.push([null,'6. Monter une caisse sans quitter le projet']);
  const vpk = read('js/views-packs.js');
  R.push([/function projNewPack/.test(vp) && /openPackForm\(null, async id/.test(vp),
          'la composition sait ouvrir le formulaire de caisse']);
  R.push([/function openPackForm\(id, après\)/.test(vpk),
          'le formulaire accepte une suite']);
  R.push([/if\(neuf && packFormAprès\)/.test(vpk),
          'et la caisse créée rejoint le projet']);
  /* C'est une VRAIE caisse : pas de seconde sorte de caisse, pas de
     contenant jetable visible nulle part ailleurs. */
  R.push([/await apiInsertPack\(row\)/.test(vpk),
          'créée par le même chemin que depuis l’onglet Packs — donc visible partout']);

  R.push([null,'7. Cohérence des fichiers']);
  const h = read('index.html'),
        app = read('js/app.js'), dbjs = read('js/db.js'), css = read('css/styles.css');
  /* La 027 avait ouvert un rangement « pour ce projet seulement ».
     Faute de cas d'usage, la 028 le retire : une caisse, c'est ce
     qu'il y a dedans. Une colonne inutilisée finit toujours par être
     réemployée pour autre chose. */
  R.push([/drop column placements/.test(read('sql/028-rangements-retires.sql')),
          'la 028 retire la colonne des rangements']);
  const mot = /\bplacements\b/;   /* « emplacements » n'en est pas un */
  R.push([!mot.test(dbjs) && !mot.test(app) && !mot.test(vp),
          'et plus rien dans le code ne s’y réfère']);
  R.push([/data-pjcase=/.test(vp) && /\.pjgrp\.hot\{/.test(css),
          'chaque caisse est une cible de dépôt, et le dit']);
  R.push([/d\.kind === 'placer'/.test(vp),
          'un item isolé se glisse dans une caisse']);
  R.push([/projMore\(d\.key, d\.caisse\)/.test(vp),
          'et un item de l’inventaire lâché sur une caisse y atterrit directement']);
  R.push([/function projScrollSave/.test(vp) && /projScrollRestore/.test(vp),
          'redessiner ne renvoie plus la colonne de gauche tout en haut']);
  const vApp=(app.match(/APP_VERSION = '([\d.]+)'/)||[])[1];
  const vUniq=[...new Set((h.match(/\?v=[\d.]+/g)||[]).map(t=>t.slice(3)))];
  R.push([vUniq.length===1 && vUniq[0]===vApp, `tous les fichiers en ${vApp}`]);

  let fails=0;
  for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
    else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
  console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
  process.exit(fails?1:0);
})();
