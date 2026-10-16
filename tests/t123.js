/* Harnais v1.23 — quatre états, et plus rien d'écarté en silence. */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const html = `<!DOCTYPE html><html><body>
  <div id="packBody"></div><div id="packActs"></div>
  <div id="poTitle"></div><div id="poBody"></div>
</body></html>`;

const STUBS = `
  var toasts=[], me={role:'admin'}, sel=new Set(), ouvertes=[], vueMontree=null, bulk=0;
  var db={items:[],users:[],locations:[],history:[],projects:[],trash:[],
          repairs:[],providers:[],repairsSupported:true,
          packs:[],packItems:[],packsSupported:true,
          packExtras:[],packExtrasSupported:true};
  function item(id){ return db.items.find(i=>i.id===id); }
  function project(id){ return db.projects.find(p=>p.id===id); }
  function can(){ return true; }
  function toast(m,k){ toasts.push({m,k:k||'info'}); }
  function open_(id){ ouvertes.push(id); }
  function close_(id){ ouvertes = ouvertes.filter(x=>x!==id); }
  function show(v){ vueMontree = v; }
  function renderBulkBar(){}
  function openBulkCheckout(){ bulk++; }
  function userName(){ return 'X'; }
  function outBy(i){ return i.out ? (i.out.reason||'') : ''; }
  function outForRepair(i){ return !!(i.out && i.out.repairId); }
  function locLabel(n){ return n||''; }
  function renderPacks(){} function renderPackDetail(){} async function refresh(){}
  var packShown=null, drag=null, dragFini=0;
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
`;

const DATA = `
  var mk=(id,name,brand,g,cond)=>({id,name,brand,cat:'divers',subcat:'x',cond:cond||'bon',
    status:'dispo', loc:'Studio A', home:'Studio A', photo:null, out:null,
    weight_g:g||null, has_case:false});
  db.items=[
    mk('FLC-001','Flight Case','SKB',10000),
    mk('HPA-008','RA-53b','Rolls',1140,'use'),      // abîmé mais fonctionnel
    mk('INT-014','Madiface','RME',500,'ko'),        // en panne
    mk('CON-005','SQ5+','Allen & Heath',11200,'hs'),// hors service
    mk('CEX-002','UltraFX','Allen & Heath',800),    // chez un réparateur
    mk('CIO-004','SQ Madi','Allen & Heath',600)
  ];
  db.repairs=[{id:'r1', item_id:'CEX-002', status:'sent', fault:'other'},
              {id:'r2', item_id:'CIO-004', status:'open', fault:'other'}];
  db.packs=[{id:'k1', name:'LEASH Kit', container_id:'FLC-001',
             archived:false, permanent:true}];
  db.packItems=['HPA-008','INT-014','CON-005','CEX-002','CIO-004']
    .map(id=>({pack_id:'k1', item_id:id}));
  db.projects=[{id:'pr1', name:'Trianon', status:'inactif', archived:false,
                item_ids:[], pack_ids:['k1'], prep:{}, snapshot:null,
                loc_name:'', starts_on:null, ends_on:null}];
`;

const TESTS = `
 (async () => {
  var R=[]; function T(c,l){R.push([!!c,l]);} function S(l){R.push([null,l]);}

  S('1. Quatre états, du meilleur au pire');
  T(Object.keys(CONDS).join(',') === 'bon,use,ko,hs',
    'l’ordre des menus descend du bon vers le hors service');
  T(CONDS.ko === 'Faulty', 'la case du milieu existe : en panne');
  T(CONDS.use === 'Damaged, usable', 'et « abîmé mais fonctionnel » se distingue d’elle');
  T(CONDS.hs === 'Out of service', 'hors service garde son nom');

  S('2. Signalé n’est pas introuvable');
  /* Le seul cas réellement impossible : l'objet est chez un
     réparateur, donc pas au studio. */
  T(checkoutImpossible(item('CEX-002')) === true, 'chez un réparateur : impossible');
  T(checkoutImpossible(item('INT-014')) === false, 'en panne : possible');
  T(checkoutImpossible(item('CON-005')) === false, 'hors service : possible');
  T(checkoutImpossible(item('CIO-004')) === false, 'dossier ouvert : possible');
  T(!!checkoutBlockReason(item('INT-014')), 'mais signalé');
  T(/faulty/.test(checkoutBlockReason(item('INT-014'))||''), 'et la raison est nommée');

  S('3. Sortir une caisse ne retire plus rien en silence');
  toasts=[]; ouvertes=[]; sel=new Set(); bulk=0;
  packCheckout('k1');
  T(ouvertes.includes('ovPackOut'), 'une fenêtre s’ouvre');
  T(bulk === 0, 'et rien n’est sorti avant qu’on réponde');
  var cases = [...document.querySelectorAll('#poBody input[data-po]')];
  /* Trois, pas quatre : « abîmé mais fonctionnel » marche, il n'y a
     rien à demander. On ne pose une question que lorsqu'il y en a
     une. */
  T(cases.length === 3, 'les trois items signalés sont listés');
  T(cases.map(c=>c.dataset.po).join(',') === 'INT-014,CON-005,CIO-004',
    'en panne, hors service, dossier ouvert');
  T(cases.every(c=>c.checked), 'cochés par défaut : on part avec');
  T(document.getElementById('poBody').innerHTML.includes('UltraFX'),
    'celui qui est chez le réparateur est mentionné à part');
  T(!cases.some(c=>c.dataset.po === 'CEX-002'),
    'mais sans case à cocher : il n’est pas au studio');

  S('4. On décide, pas l’application');
  packOutConfirm();
  T(sel.size === 5, 'tout coché : les cinq items présents partent');
  T(!sel.has('CEX-002'), 'sauf celui qui est chez le réparateur');
  T(bulk === 1, 'et la sortie groupée s’ouvre');

  toasts=[]; sel=new Set(); bulk=0; ouvertes=[];
  packCheckout('k1');
  packOutTickAll(false);
  packOutConfirm();
  T(sel.size === 2 && sel.has('FLC-001') && sel.has('HPA-008'),
    'tout décoché : restent le contenant et l’item abîmé mais fonctionnel');

  toasts=[]; sel=new Set(); bulk=0; ouvertes=[];
  packCheckout('k1');
  document.querySelector('#poBody input[data-po=\\'CON-005\\']').checked = false;
  packOutConfirm();
  T(sel.size === 4 && !sel.has('CON-005'), 'décocher un seul n’écarte que celui-là');
  T(toasts.some(t=>/left behind/.test(t.m)), 'et l’application dit ce qui reste');

  S('5. Une caisse sans rien de signalé part directement');
  db.items.forEach(i=>{ i.cond = 'bon'; });
  db.repairs = [];
  toasts=[]; ouvertes=[]; sel=new Set(); bulk=0;
  packCheckout('k1');
  T(!ouvertes.includes('ovPackOut'), 'aucune fenêtre inutile');
  T(sel.size === 6 && bulk === 1, 'les six items partent d’un coup');

  S('6. Un projet n’écarte plus un objet signalé');
  db.items.find(i=>i.id==='INT-014').cond = 'ko';
  db.repairs = [{id:'r1', item_id:'CEX-002', status:'sent', fault:'other'},
                {id:'r2', item_id:'CIO-004', status:'open', fault:'other'}];
  var c = projContent(project('pr1'));
  T(c.items.some(i=>i.id === 'INT-014'), 'l’item en panne part avec le projet');
  T(c.items.some(i=>i.id === 'CIO-004'), 'celui qui a un dossier ouvert aussi');
  T(c.écartés === undefined || c.groups[0].écartés.length === 1,
    'un seul est écarté');
  T(c.groups[0].écartés[0].id === 'CEX-002', 'celui qui est chez le réparateur');
  T(itemFlag(item('INT-014')) === 'faulty', 'et la mention suit l’objet');
  T(itemFlag(item('CIO-004')) === 'repair reported', 'chacune la sienne');
  T(itemFlag(item('FLC-001')) === '', 'rien à dire sur un objet en bon état');

  window.__results = R;
 })();
`;

const dom = new JSDOM(html,{runScripts:'dangerously',url:'https://inventory.accessflow.fr/'});
const inv = read('js/views-inventory.js');
const packs = read('js/views-packs.js');
const morceau = (src, re) => (src.match(re)||[''])[0];
dom.window.eval([
  STUBS,
  read('js/config.js'),
  read('js/helpers.js'),
  morceau(inv, /function checkoutBlockReason\(i\)\{[\s\S]*?\n}/),
  morceau(inv, /function checkoutImpossible\(i\)\{[\s\S]*?\n}/),
  morceau(inv, /function canCheckout\(i\)\{.*?\n/),
  morceau(packs, /let packOutPending[\s\S]*?\nfunction packOutGo\(p, ids, dehors, laissés\)\{[\s\S]*?\n}/),
  DATA, TESTS
].join('\n;\n'));

(async () => {
  for(let i=0;i<300 && !dom.window.__results;i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }
  const R = dom.window.__results;

  R.push([null,'7. Le quatrième état est proposé partout où il a un sens']);
  const rep = read('js/views-repairs.js'), csv = read('js/import-csv.js'),
        inv2 = read('js/views-inventory.js');
  R.push([/\['ko','Not working'\]/.test(rep),
          'la fenêtre de signalement propose « en panne »']);
  R.push([!/\['hs',/.test(rep.slice(rep.indexOf('rp-conds'), rep.indexOf('rp-conds')+900)),
          'mais jamais « hors service » : un objet en réparation reste au parc']);
  R.push([/recvOutcome === 'unchanged'\s*\?\s*'ko'/.test(rep),
          'revenu sans rien de réparé, l’objet est rendu « en panne »']);
  R.push([/return 'ko'/.test(csv),
          'un fichier importé qui dit « en panne » n’est plus rabattu sur « usé »']);
  R.push([/Object\.keys\(CONDS\)\.indexOf\(i\.cond\)/.test(inv2),
          'le tri par état suit la liste, au lieu de la recopier']);

  R.push([null,'8. Aucune liste d’états recopiée dans le HTML']);
  /* Le défaut du 15 octobre : les deux menus portaient leurs options
     écrites en dur dans index.html. Passer de trois à quatre états
     n'a donc rien changé à l'écran, alors que tout le reste suivait.
     On vérifie qu'il ne reste AUCUNE option d'état dans le HTML, et
     que les deux menus sont remplis depuis CONDS. */
  const hh = read('index.html');
  R.push([!/<option value="(bon|use|ko|hs)"/.test(hh),
          'plus une seule option d’état écrite à la main']);
  R.push([/<select id="i-cond"><\/select>/.test(hh) &&
          /<select id="in-cond"><\/select>/.test(hh),
          'les deux menus sont vides dans le HTML']);
  R.push([/function fillConds/.test(read('js/helpers.js')),
          'et remplis depuis CONDS']);
  const occ = (inv2.match(/fillConds\(/g)||[]).length;
  R.push([occ >= 4, `les quatre ouvertures de fenêtre les remplissent (${occ})`]);

  R.push([null,'9. Cohérence des fichiers']);
  const sql = read('sql/025-etats-materiel.sql'), h = read('index.html'),
        app = read('js/app.js'), css = read('css/styles.css');
  R.push([/check \(cond in \('bon','use','ko','hs'\)\)/.test(sql),
          'la 025 ouvre le quatrième état']);
  R.push([!/update public\.items set cond/.test(sql),
          'et ne touche à aucune donnée']);
  R.push([/id="ovPackOut"/.test(h) && /packOutConfirm\(\)/.test(h),
          'la fenêtre de sortie existe']);
  R.push([/Leave the flagged ones/.test(h) && /Take everything/.test(h),
          'avec ses deux raccourcis']);
  R.push([/\.tag\.ko\{/.test(css) && /\.tag\.use\{/.test(css),
          'les quatre états ont chacun leur couleur']);
  const vApp=(app.match(/APP_VERSION = '([\d.]+)'/)||[])[1];
  const vUniq=[...new Set((h.match(/\?v=[\d.]+/g)||[]).map(t=>t.slice(3)))];
  R.push([vUniq.length===1 && vUniq[0]===vApp, `tous les fichiers en ${vApp}`]);

  let fails=0;
  for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
    else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
  console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
  process.exit(fails?1:0);
})();
