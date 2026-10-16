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
  function toast(m,k){ toasts.push({m,k:k||'info'}); }
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
                prep:{}, snapshot:null, subs:{}, placements:{},
                loc_name:'', starts_on:null, ends_on:null}];
`;

const TESTS = `
 (async () => {
  var R=[]; function T(c,l){R.push([!!c,l]);} function S(l){R.push([null,l]);}
  var p = project('pr1');

  S('1. Sans rangement, les items isolés partent en vrac');
  var c = projContent(p);
  T(c.loose.length === 3, 'les trois sont hors caisse');
  T(c.groups[0].rangés.length === 0, 'et aucune caisse n’en porte');
  T(c.items.length === 6, 'six objets partent : deux caisses, un micro, trois isolés');
  var poids0 = c.weight;

  S('2. Ranger un item dans une caisse');
  await projPlace('PST-001', 'k-pel');
  c = projContent(p);
  T(c.loose.length === 2, 'il quitte le hors-caisse');
  T(c.groups[0].rangés.map(i=>i.id).join() === 'PST-001', 'et voyage dans la Pelicase');
  T(c.items.length === 6, 'le total ne change pas : il était déjà du voyage');
  T(c.weight === poids0, 'le poids non plus');
  T(sauvé.some(x=>x.f.placements), 'le rangement est enregistré sur le projet');

  S('3. La recette de la caisse n’est pas touchée');
  T(packItemsOf('k-pel').map(i=>i.id).join() === 'MIC-001',
    'la Pelicase contient toujours le seul U47');
  T(!packItemsOf('k-pel').some(i=>i.id === 'PST-001'), 'et pas le pied');

  S('4. Un item n’est que dans une caisse à la fois');
  await projPlace('PST-001', 'k-sac');
  c = projContent(p);
  T(c.groups[0].rangés.length === 0, 'il a quitté la première');
  T(c.groups[1].rangés.map(i=>i.id).join() === 'PST-001', 'pour la seconde');

  S('5. Le ressortir le remet en vrac');
  await projUnplace('PST-001');
  T(projContent(p).loose.some(i=>i.id === 'PST-001'), 'il revient hors caisse');

  S('6. Retirer une caisse libère ce qu’on y avait rangé');
  await projPlace('PST-002', 'k-sac');
  await projPlace('CBL-001', 'k-sac');
  T(projContent(p).groups[1].rangés.length === 2, 'deux items rangés dedans');
  await projRemovePack('k-sac');
  c = projContent(p);
  T(c.groups.length === 1, 'la caisse est partie');
  T(c.loose.length === 3, 'et les trois items sont de nouveau en vrac');
  T(Object.keys(p.placements).length === 0, 'plus aucun rangement orphelin');
  T(toasts.some(t=>/loose again/.test(t.m)), 'et l’application le dit');
  p.pack_ids = ['k-pel','k-sac'];

  S('7. Un rangement vers une caisse absente est ignoré, pas perdu');
  p.placements = {'PST-001':'k-fantome'};
  c = projContent(p);
  T(c.loose.some(i=>i.id === 'PST-001'), 'l’item retombe en vrac');
  T(c.items.length === 6, 'et reste du voyage');
  p.placements = {};

  S('8. Retirer un item du projet efface son rangement');
  await projPlace('CBL-001', 'k-pel');
  await projRemoveItem('CBL-001');
  T(!p.placements['CBL-001'], 'aucune trace ne subsiste');
  p.item_ids = ['PST-001','PST-002','CBL-001'];

  S('9. Le départ fige le chargement réel, caisse par caisse');
  await projPlace('PST-001', 'k-pel');
  var snap = projSnapshot(p);
  var pel = snap.packs.find(g=>g.id === 'k-pel');
  T(pel.items.includes('MIC-001') && pel.items.includes('PST-001'),
    'la Pelicase emporte sa recette ET ce qu’on y a rangé');
  p.snapshot = snap; p.status = 'show';
  /* Une fois parti, défaire le rangement ne réécrit pas ce qui est
     dans la caisse à l'autre bout de Paris. */
  p.placements = {};
  var gelé = projContent(p);
  T(gelé.frozen === true, 'le contenu est figé');
  T(gelé.groups[0].items.some(i=>i.id === 'PST-001'), 'et le pied y est toujours');
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
  morceau(/async function projPlace\([\s\S]*?\n}/),
  morceau(/async function projUnplace\([\s\S]*?\n}/),
  morceau(/async function projRemovePack\([\s\S]*?\n}/),
  morceau(/async function projRemoveItem\([\s\S]*?\n}/),
  DATA, TESTS
].join('\n;\n'));

(async () => {
  for(let i=0;i<300 && !dom.window.__results;i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }
  const R = dom.window.__results;

  R.push([null,'10. Monter une caisse sans quitter le projet']);
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

  R.push([null,'11. Cohérence des fichiers']);
  const sql = read('sql/027-rangements-projet.sql'), h = read('index.html'),
        app = read('js/app.js'), dbjs = read('js/db.js'), css = read('css/styles.css');
  R.push([/add column if not exists placements jsonb/.test(sql),
          'la 027 ouvre les rangements de projet']);
  R.push([!/update public\.projects set/.test(sql), 'et ne touche à aucune donnée']);
  R.push([/placements:p\.placements\|\|\{\}/.test(dbjs) && /placements:p\.placements\|\|\{\}/.test(app),
          'ils survivent au chargement et à la restauration']);
  R.push([/data-pjcase=/.test(vp) && /\.pjgrp\.hot\{/.test(css),
          'chaque caisse est une cible de dépôt, et le dit']);
  R.push([/d\.kind === 'placer'/.test(vp),
          'un item isolé se glisse dans une caisse']);
  R.push([/projMore\(d\.key, d\.caisse\)/.test(vp),
          'et un item de l’inventaire lâché sur une caisse y atterrit directement']);
  const vApp=(app.match(/APP_VERSION = '([\d.]+)'/)||[])[1];
  const vUniq=[...new Set((h.match(/\?v=[\d.]+/g)||[]).map(t=>t.slice(3)))];
  R.push([vUniq.length===1 && vUniq[0]===vApp, `tous les fichiers en ${vApp}`]);

  let fails=0;
  for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
    else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
  console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
  process.exit(fails?1:0);
})();
