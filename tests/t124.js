/* Harnais v1.24 — contenants, contenant partagé, doublons de projet. */
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
  function bindProjDrag(){}
  async function apiUpdateProject(id,f){ sauvé.push({id,f}); }
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
`;

const DATA = `
  var mk=(id,name,brand,sub,g)=>({id,name,brand,cat:'divers',subcat:sub,cond:'bon',
    status:'dispo', loc:'Studio A', home:'Studio A', photo:null, out:null,
    weight_g:g||null, has_case:false});
  db.items=[
    mk('FLC-001','Pelicase 1620','Peli','flightcase',11000),
    mk('BAG-001','Sac câbles','Thon','housse',2000),
    mk('MSD-001','SM57 #1','Shure','micro_dyn',284),
    mk('MSD-002','SM57 #2','Shure','micro_dyn',284),
    mk('MSD-003','SM57 #3','Shure','micro_dyn',284),
    mk('MFT-001','U47 FET','Neumann','micro_stat',1100)
  ];
  /* MSD-002 est dans LES DEUX caisses : c'est tout le problème. */
  db.packs=[
    {id:'k-pel', name:'Pelicase micros', container_id:'FLC-001', archived:false, permanent:false},
    {id:'k-sac', name:'Sac scène',       container_id:'BAG-001', archived:false, permanent:false}
  ];
  db.packItems=[
    {pack_id:'k-pel', item_id:'MSD-001'}, {pack_id:'k-pel', item_id:'MSD-002'},
    {pack_id:'k-sac', item_id:'MSD-002'}, {pack_id:'k-sac', item_id:'MFT-001'}
  ];
  db.projects=[{id:'pr1', name:'Trianon', status:'inactif', archived:false,
                item_ids:[], pack_ids:['k-pel','k-sac'], prep:{}, snapshot:null,
                subs:{}, loc_name:'', starts_on:null, ends_on:null}];
`;

const TESTS = `
 (async () => {
  var R=[]; function T(c,l){R.push([!!c,l]);} function S(l){R.push([null,l]);}

  S('1. Ce qui peut servir de contenant');
  T(isContainerKind(item('FLC-001')) === true, 'un flight case, oui');
  T(isContainerKind(item('BAG-001')) === true, 'un sac, oui');
  T(isContainerKind(item('MSD-003')) === false, 'un SM57, non');
  /* La liste guide, elle n'interdit pas : ce qui sert déjà de
     contenant reste proposé, sinon restreindre casserait l'existant. */
  db.packs.push({id:'k-odd', name:'Console + expansion', container_id:'MFT-001',
                 archived:false, permanent:false});
  T(isContainerKind(item('MFT-001')) === true,
    'un item déjà contenant reste proposé, quelle que soit sa catégorie');
  db.packs = db.packs.filter(p=>p.id !== 'k-odd');

  S('2. Un contenant peut porter plusieurs recettes');
  db.packs.push({id:'k-pel2', name:'Pelicase quintet', container_id:'FLC-001',
                 archived:false, permanent:false});
  T(packsOfContainer('FLC-001').length === 2, 'deux configurations sur la même caisse');
  T(packOfContainer('FLC-001') === null,
    'aucune n’est montée : personne ne répond de la caisse');
  db.packs.find(p=>p.id==='k-pel').permanent = true;
  T(packOfContainer('FLC-001').id === 'k-pel',
    'une seule montée : c’est elle qui répond');
  db.packs.find(p=>p.id==='k-pel').permanent = false;
  db.packs = db.packs.filter(p=>p.id !== 'k-pel2');

  S('2bis. Le poids d’une configuration ne dépend pas des autres');
  /* Le poids passait par « qui répond de cette caisse ». Avec deux
     configurations sur la même Pelicase, plus personne ne répondait,
     et chacune pesait sa boîte vide. */
  T(packWeight(pack('k-pel')) === 11000 + 284 + 284, 'caisse + deux micros');
  db.packs.push({id:'k-pel3', name:'Pelicase quintet', container_id:'FLC-001',
                 archived:false, permanent:false});
  T(packWeight(pack('k-pel')) === 11000 + 284 + 284,
    'une seconde configuration sur la même caisse n’y change rien');
  T(packWeight(pack('k-pel3')) === 11000, 'et la seconde ne pèse que sa boîte, vide');
  db.packs = db.packs.filter(x=>x.id !== 'k-pel3');

  S('3. Un doublon ne disparaît plus en silence');
  var p = project('pr1'), c = projContent(p);
  T(c.items.length === 5, 'cinq objets partent — les deux caisses et trois micros');
  T(c.groups[0].items.map(i=>i.id).join(',') === 'FLC-001,MSD-001,MSD-002',
    'la première caisse emporte le SM57 #2');
  T(c.groups[1].items.map(i=>i.id).join(',') === 'BAG-001,MFT-001',
    'la seconde ne l’a plus');
  T(c.groups[1].doublons.length === 1, 'mais elle le SIGNALE');
  T(c.groups[1].doublons[0].item.id === 'MSD-002', 'en nommant l’objet');
  T(c.groups[1].doublons[0].ailleurs === 'Pelicase micros', 'et la caisse qui l’emporte');

  S('4. Un exemplaire libre peut prendre sa place');
  var libre = projFreeTwin(p, item('MSD-002'));
  T(libre && libre.id === 'MSD-003', 'le SM57 #3, qui ne fait rien');
  await projSwap('k-sac', 'MSD-002', 'MSD-003');
  c = projContent(p);
  T(c.groups[1].items.some(i=>i.id === 'MSD-003'), 'il voyage dans la seconde caisse');
  T(c.groups[1].doublons.length === 0, 'plus de doublon');
  T(c.items.length === 6, 'et six objets partent, le remplaçant compris');
  T(db.packItems.some(l=>l.pack_id==='k-sac' && l.item_id==='MSD-002'),
    'la recette, elle, n’a pas bougé');
  T(sauvé.some(x=>x.f.subs), 'la substitution est enregistrée sur le projet');

  S('5. Plus d’exemplaire libre : on le dit, on n’invente pas');
  p.subs = {};
  db.items = db.items.filter(i=>i.id !== 'MSD-003');
  T(projFreeTwin(p, item('MSD-002')) === null, 'aucun remplaçant disponible');
  T(projContent(p).groups[1].doublons.length === 1, 'le doublon reste signalé');

  window.__results = R;
 })();
`;

const dom = new JSDOM(html,{runScripts:'dangerously',url:'https://inventory.accessflow.fr/'});
const vp = read('js/views-projects.js');
dom.window.eval([
  STUBS,
  read('js/config.js'),
  read('js/helpers.js'),
  (vp.match(/async function projSwap\([\s\S]*?\n}/)||[''])[0],
  'var projView={mode:"edit",id:"pr1",tab:"items",q:""};',
  'function renderProj(){} async function projSave(p,f){ await apiUpdateProject(p.id,f); }',
  DATA, TESTS
].join('\n;\n'));

(async () => {
  for(let i=0;i<300 && !dom.window.__results;i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }
  const R = dom.window.__results;

  R.push([null,'6. La page projet au travail']);
  const vpj = read('js/views-projects.js');
  /* Une page de réglages, pas un volet : l'appli grossira, et chaque
     fonction nouvelle doit avoir un endroit où aller plutôt qu'un
     bouton de plus au milieu des autres. */
  R.push([/function projSettings\(\)/.test(vpj) &&
          /projView\.mode === 'settings'/.test(vpj),
          'les réglages sont une page à part entière']);
  R.push([/projGo\('settings'/.test(vpj), 'ouverte par un engrenage depuis le projet']);
  ['duplicateProj','archiveProj','deleteProj','resetPrep'].forEach(f=>{
    const bloc = vpj.slice(vpj.indexOf('function projSettings()'),
                           vpj.indexOf('function projLine'));
    R.push([bloc.includes(f + "('"), `${f} y est`]);
  });
  /* Les métadonnées aussi : elles traînaient dans l'en-tête de la
     composition, entre deux boutons. */
  const entete = vpj.slice(vpj.indexOf('<div class="pjhead">'), vpj.indexOf('<div class="pjedit">'));
  R.push([!/type="date"/.test(entete) && !/pj-dest/.test(entete),
          'la destination et les dates ont quitté l’en-tête de la composition']);
  /* La carte entière ouvre le projet. */
  const liste = vpj.slice(vpj.indexOf('function projList'), vpj.indexOf('async function openProjForm'));
  R.push([/pjcard[^`]*clickable[\s\S]{0,200}onclick="projGo\('prep'/.test(liste),
          'la carte entière ouvre le projet']);
  R.push([!/>Open<\/button>/.test(liste) && !/Edit gear/.test(liste),
          'et ne porte plus ni « Open » ni « Edit gear »']);
  const actions = vpj.slice(vpj.indexOf("let actions = ''"), vpj.indexOf('return `\n  <div class="pjhead">'));
  R.push([!/resetPrep/.test(actions),
          'et plus sous la checklist, à côté de « Go on show »']);
  R.push([/Untick all \$\{faites\} line\(s\)/.test(vpj),
          'remettre la checklist à zéro demande confirmation']);
  R.push([/function pjThumb/.test(vpj) && (vpj.match(/pjThumb\(/g)||[]).length >= 5,
          'les vignettes reviennent dans la composition']);
  R.push([/vignette/.test(vpj) && /photo:i\.photo/.test(vpj),
          'et dans la checklist de préparation']);

  R.push([null,'7. Cohérence des fichiers']);
  const sql = read('sql/026-contenants-partages.sql'), h = read('index.html'),
        app = read('js/app.js'), packs = read('js/views-packs.js'), dbjs = read('js/db.js');
  R.push([/drop index if exists public\.packs_container_uniq/.test(sql),
          'la 026 lève l’unicité du contenant']);
  R.push([/packs_container_assembled_uniq[\s\S]*?where container_id is not null and permanent/.test(sql),
          'mais garde un seul assemblage monté par contenant']);
  R.push([/add column if not exists subs jsonb/.test(sql),
          'et ouvre les substitutions de projet']);
  R.push([/CONTAINER_SUBS/.test(read('js/config.js')),
          'la liste des contenants est dans la config, modifiable sans migration']);
  R.push([/Show all items/.test(packs),
          'et la fenêtre garde une échappatoire']);
  R.push([/is already assembled as/.test(packs),
          'un second assemblage monté est refusé, avec le nom du premier']);
  R.push([/subs:p\.subs\|\|\{\}/.test(dbjs) && /subs:p\.subs\|\|\{\}/.test(app),
          'les substitutions survivent au chargement et à la restauration']);
  const vApp=(app.match(/APP_VERSION = '([\d.]+)'/)||[])[1];
  const vUniq=[...new Set((h.match(/\?v=[\d.]+/g)||[]).map(t=>t.slice(3)))];
  R.push([vUniq.length===1 && vUniq[0]===vApp, `tous les fichiers en ${vApp}`]);

  let fails=0;
  for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
    else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
  console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
  process.exit(fails?1:0);
})();
