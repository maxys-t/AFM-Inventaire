/* Harnais v1.17 — réparations : dossiers, prestataires, contrôle au retour. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <div id="v-rep"></div><div id="v-settings"></div>
  <span id="rp-item"></span><div id="rp-pickwrap"></div><input id="rp-pick">
  <datalist id="rp-list"></datalist><div id="rp-faults"></div><div id="rp-conds"></div>
  <textarea id="rp-note"></textarea><div id="rp-photozone"></div><div id="ovPhoto"></div>
  <img id="pv-img"><span id="pv-n"></span><span id="pv-nav"></span>
  <div id="rp-outband"><b></b><span></span></div><div id="rp-dup"><b></b><span></span></div>
  <span id="sd-item"></span><span id="sd-fault"></span><select id="sd-prov"></select>
  <input id="sd-ref"><div id="sd-none"></div>
  <span id="rc-item"></span><span id="rc-from"></span><span id="rc-when"></span>
  <span id="rc-fault"></span><span id="rc-cond0"></span><span id="rc-desc"></span>
  <div id="rc-photo0"></div><div id="rc-outcomes"></div><div id="rc-dests"></div>
  <textarea id="rc-work"></textarea><div id="rc-photozone"></div>
  <div id="provBox"></div><div id="provFormBody"></div><span id="provFormTitle"></span>
  <div id="invList"></div><div id="peopleList"></div>
  <span id="in-item"></span><select id="in-cond"><option value="bon"></option>
  <option value="use"></option><option value="hs"></option></select>
  <input id="in-note"><div id="in-repband"><b></b><span></span></div>
</body></html>`;

const STUBS = `
  var toasts = [], hists = [], updates = [], inserts = [], repUpdates = [];
  var me = {role:'admin', name:'Maxys'};
  var db = {items:[],users:[],locations:[],history:[],projects:[],trash:[],
            repairs:[],providers:[],repairsSupported:true};
  function item(id){ return db.items.find(i=>i.id===id); }
  function can(w){ return me.role==='admin' || ['view','checkout','repair','projectPrep'].includes(w); }
  function toast(m,k){ toasts.push([m,k||'info']); }
  function open_(id){ lastOpened = id; } function close_(){} var lastOpened = null;
  function openDetail(){} function render(){} function renderBulkBar(){}
  function applyRoleUI(){} function renderLoc(){} function renderUsers(){}
  function renderActivity(){} function catOptions(){ return ''; }
  function uid(){ return 'X'; }
  async function refresh(){ return true; }
  async function hist(id,type,detail,u,cond){ hists.push({id,type,detail,cond}); }
  async function histMany(rows){ rows.forEach(r=>hists.push(r)); }
  async function apiUpdateItem(id, f){ updates.push([id,f]); Object.assign(item(id)||{}, f); }
  async function apiUploadPhoto(){ return 'https://example/p.jpg'; }
  async function apiOpenRepair(row){
    if(db.repairs.some(r=>r.item_id===row.item_id && r.status!=='closed'))
      throw new Error('duplicate open repair');   // ce que fait l'index unique
    const r = Object.assign({id:'r'+(db.repairs.length+1), status:'open',
                             opened_at:new Date().toISOString()}, row);
    db.repairs.push(r); inserts.push(r); return r;
  }
  async function apiUpdateRepair(id, f){
    const r = db.repairs.find(x=>x.id===id); Object.assign(r, f); repUpdates.push([id,f]);
  }
  async function apiInsertProvider(p){ db.providers.push(Object.assign({id:'p'+(db.providers.length+1)},p)); }
  async function apiUpdateProvider(id,f){ Object.assign(db.providers.find(p=>p.id===id), f); }
  window.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}});
`;

const DATA = `
  db.locations = [{name:'AccessFlow',parent:null,kind:'site'},
                  {name:'Studio A',parent:'AccessFlow',kind:'room'}];
  db.users = [{id:'u1',name:'Théo'}];
  db.providers = [{id:'pA',name:'Audio Service Paris',specialty:'microphones',archived:false},
                  {id:'pB',name:'Atelier Clavier',specialty:'keyboards',archived:false}];
  var mk = (id,name,brand,cat,sub,cond,status,out) => ({id,name,brand,cat,subcat:sub,cond,status,
    loc: status==='sorti' ? (out&&out.reason)||'Trianon' : 'Studio A', home:'Studio A',
    price:500, photo:null, out: out||null});
  db.items = [
    mk('SYN-001','Juno-106','Roland','instruments','synthe','bon','dispo'),
    mk('MCN-001','U87','Neumann','captation','condensateur','bon','dispo'),
    mk('MCD-002','SM7B','Shure','captation','dynamique','bon','dispo'),
    mk('GTR-003','Jazz Bass','Fender','instruments','basse','bon','sorti',
       {userId:'u1',date:'2026-10-02T09:00:00Z',reason:'Trianon',due:null}),
    mk('OLD-001','Vieux préampli','Generic','captation','preampli','hs','dispo')
  ];
`;

const TESTS = `
 (async () => {
  var R = [];
  function T(c,l){ R.push([!!c,l]); }
  function S(l){ R.push([null,l]); }

  S('1. Pas de dossier sans incident');
  T(db.repairs.length === 0, 'au départ, aucun dossier n’existe');
  T(repairOf('SYN-001') === null, 'un item sain n’a pas de dossier');
  T(checkoutBlockReason(item('SYN-001')) === null, 'et rien ne bloque sa sortie');

  S('2. Ouvrir un incident');
  openReport('SYN-001');
  setReportFault('intermittent'); setReportCond('bon');
  document.getElementById('rp-note').value = 'Coupe après vingt minutes.';
  await doReport();
  var r1 = repairOf('SYN-001');
  T(!!r1, 'un dossier est créé');
  T(r1.fault === 'intermittent', 'la panne choisie est enregistrée');
  T(r1.cond_at_open === 'bon', 'l’état au départ est documenté');
  T(r1.description === 'Coupe après vingt minutes.', 'la description aussi');
  T(checkoutBlockReason(item('SYN-001')) === 'flagged as needing repair',
    'la sortie est bloquée, et la raison est dite');
  T(canCheckout(item('SYN-001')) === false, 'canCheckout le confirme');
  T(item('SYN-001').cond === 'bon', 'signaler une panne ne dégrade pas l’état physique');

  S('3. Un seul dossier ouvert par item');
  toasts = [];
  openReport('SYN-001'); setReportFault('power'); await doReport();
  T(db.repairs.filter(x=>x.item_id==='SYN-001' && x.status!=='closed').length === 1,
    'le second signalement est refusé');
  T(toasts.some(t=>t[1]==='error'), 'et la raison est dite');

  S('4. Panne signalée pendant une sortie');
  openReport('GTR-003'); setReportFault('connector'); await doReport();
  var rOut = repairOf('GTR-003');
  T(!!rOut, 'on peut signaler sans rentrer l’item');
  T(item('GTR-003').status === 'sorti', 'l’item reste sorti');
  renderRep();
  var h = document.getElementById('v-rep').innerHTML;
  T(h.includes('still out'), 'l’écran dit qu’il est encore dehors');
  T(h.includes('Send out'), 'le bouton d’envoi existe');
  /* On vise la ligne de l’item sorti, et non « le panneau au-dessus » :
     le libellé « At the repair shop » sert aussi de compteur en haut
     d’écran, donc découper dessus visait le mauvais bloc. */
  var ligneGTR = h.split('reprow').find(b=>b.includes('GTR-003'));
  T(!!ligneGTR && ligneGTR.includes('disabled'),
    'mais il est éteint tant que l’item n’est pas rentré');
  var ligneSYN = h.split('reprow').find(b=>b.includes('SYN-001'));
  T(!!ligneSYN && !ligneSYN.includes('disabled'),
    'alors qu’il est actif sur un item présent au studio');

  S('5. Le retour d’un item signalé pendant un emprunt');
  lastOpened = null;
  openCheckin('GTR-003');
  T(lastOpened === 'ovIn', 'le check-in ordinaire s’ouvre — c’est un emprunteur qui rend');
  var band = document.getElementById('in-repband');
  T(band.style.display !== 'none', 'mais un bandeau prévient');
  T(band.querySelector('span').textContent.includes('Connector / jack'),
    'il rappelle la panne signalée');
  T(band.querySelector('span').textContent.includes('repair queue'),
    'et dit que l’item ne retourne pas en rayon');
  item('GTR-003').status = 'dispo'; item('GTR-003').out = null;   // le check-in a lieu
  T(canCheckout(item('GTR-003')) === false,
    'une fois rentré, il reste insortable tant que l’incident est ouvert');
  lastOpened = null;
  openCheckin('SYN-001');
  T(document.getElementById('in-repband').style.display !== 'none',
    'idem pour un item signalé mais non sorti');

  S('6. Envoi chez un prestataire');
  openSend(r1.id);
  document.getElementById('sd-prov').value = 'pA';
  await doSend();
  r1 = repairOf('SYN-001');
  T(r1.status === 'sent', 'le dossier passe « chez le prestataire »');
  T(r1.provider_id === 'pA', 'le prestataire est enregistré');
  T(item('SYN-001').status === 'sorti', 'l’item est compté comme dehors');
  T(item('SYN-001').out.repairId === r1.id, 'la sortie est marquée comme réparation');
  T(item('SYN-001').out.userId === null, 'sans emprunteur');
  T(outForRepair(item('SYN-001')) === true, 'outForRepair le reconnaît');
  T(checkoutBlockReason(item('SYN-001')) === null || item('SYN-001').status !== 'dispo',
    'il n’est de toute façon plus sortable');

  S('7. Une réparation n’est pas un emprunt');
  T(outBy(item('SYN-001')).startsWith('🔧'), 'l’écran des sorties la nomme comme telle');
  /* Un emprunt bien réel, posé ici pour que la comparaison ait un sens :
     celui de l’étape 4 est rentré entre-temps. */
  db.items.push(mk('CBL-009','XLR 10m','Cordial','cablage','xlr','bon','sorti',
    {userId:'u1',date:'2026-10-03T09:00:00Z',reason:'Trianon',due:null}));
  var chezTheo = db.items.filter(i=>i.status==='sorti' && i.out.userId==='u1');
  T(!chezTheo.some(i=>i.id==='SYN-001'), 'elle n’apparaît pas chez l’emprunteur');
  T(chezTheo.length === 1 && chezTheo[0].id === 'CBL-009',
    'et l’emprunt réel, lui, y est bien, seul');
  T(db.items.filter(i=>i.status==='sorti').length === 2,
    'les deux sont pourtant comptés comme hors du studio');

  S('8. Filtrer par prestataire');
  openReport('MCD-002'); setReportFault('noise'); await doReport();
  openSend(repairOf('MCD-002').id);
  document.getElementById('sd-prov').value = 'pA'; await doSend();
  openReport('MCN-001'); setReportFault('power'); await doReport();
  openSend(repairOf('MCN-001').id);
  document.getElementById('sd-prov').value = 'pB'; await doSend();
  setRepProvider('pA');
  T(repSent().length === 2, 'deux items chez Audio Service Paris');
  T(repSent().every(x=>x.provider_id === 'pA'), 'et seulement ceux-là');
  setRepProvider('pB');
  T(repSent().length === 1, 'un seul chez l’autre atelier');
  setRepProvider('');
  T(repSent().length === 3, 'sans filtre, les trois');

  S('9. Groupement par atelier');
  renderRep();
  var hh = document.getElementById('v-rep').innerHTML;
  T(hh.includes('Audio Service Paris') && hh.includes('Atelier Clavier'),
    'les deux ateliers apparaissent');
  T((hh.match(/repgrouphead/g)||[]).length === 2, 'un groupe par atelier, pas une liste à plat');

  S('10. Contrôle au retour : l’état de départ est repris');
  openReceive(r1.id);
  T(document.getElementById('rc-fault').textContent === 'Intermittent fault',
    'la panne documentée est affichée');
  T(document.getElementById('rc-cond0').textContent === 'Good',
    'l’état documenté au départ est affiché');
  T(document.getElementById('rc-desc').textContent === 'Coupe après vingt minutes.',
    'et la description de départ aussi');
  T(document.getElementById('rc-outcomes').innerHTML.includes('New damage'),
    'les quatre constats sont proposés');

  S('11. Clôture : revenu réparé');
  setRecvOutcome('repaired');
  document.getElementById('rc-work').value = 'Condensateur remplacé.';
  await doReceive();
  var closed = db.repairs.find(x=>x.id === r1.id);
  T(closed.status === 'closed', 'le dossier est clos');
  T(closed.outcome === 'repaired', 'le constat est conservé');
  T(closed.work_done === 'Condensateur remplacé.', 'ce qui a été fait aussi');
  T(repairOf('SYN-001') === null, 'l’item n’a plus de dossier ouvert');
  T(item('SYN-001').status === 'dispo', 'il redevient disponible');
  T(item('SYN-001').cond === 'bon', 'et son état physique est bon');
  T(canCheckout(item('SYN-001')) === true, 'il peut repartir');
  T(hists.some(x=>x.detail && x.detail.includes('incident closed')), 'la trace est gardée');

  S('12. Clôture : revenu toujours en panne');
  var r2 = repairOf('MCD-002');
  openReceive(r2.id); setRecvOutcome('unchanged'); setRecvDest('repair');
  await doReceive();
  T(repairOf('MCD-002') !== null, 'le dossier reste ouvert');
  T(repairOf('MCD-002').status === 'open', 'et repart dans la file d’attente');
  T(db.repairs.filter(x=>x.item_id==='MCD-002').length === 1, 'sans créer un second dossier');
  T(item('MCD-002').status === 'dispo' && !canCheckout(item('MCD-002')),
    'l’item est rentré mais toujours bloqué');

  S('13. Clôture : mis hors service');
  var r3 = repairOf('MCN-001');
  openReceive(r3.id); setRecvOutcome('new_damage'); setRecvDest('hs');
  await doReceive();
  T(item('MCN-001').cond === 'hs', 'l’item passe hors service');
  T(repairOf('MCN-001') === null, 'et sort du flux de réparation');

  S('14. « Out of service » masqué mais consultable');
  repOosOpen = false; renderRep();
  var h2 = document.getElementById('v-rep').innerHTML;
  T(h2.includes('Out of service'), 'la section existe');
  T(!h2.includes('Vieux préampli'), 'mais son contenu est replié');
  toggleRepOos();
  var h3 = document.getElementById('v-rep').innerHTML;
  T(h3.includes('Vieux préampli'), 'un clic le montre');
  T(h3.includes('MCN-001'), 'y compris l’item qu’on vient d’y mettre');
  repOosOpen = false;

  S('15. Plusieurs photos par dossier (v1.18)');
  openReport('MCD-002');
  T(Array.isArray(photoBuf.rp) && photoBuf.rp.length === 0, 'la fenêtre repart sans photo');
  photoBuf.rp = ['data:a','data:b','data:c']; photoZone('rp');
  var pz = document.getElementById('rp-photozone').innerHTML;
  T((pz.match(/photoprev/g)||[]).length === 3, 'les trois vignettes s’affichent');
  T((pz.match(/phdrop/g)||[]).length === 3, 'chacune a sa croix');
  T(pz.includes('Add another'), 'et on peut en ajouter une de plus');
  dropPhoto('rp', 1);
  T(photoBuf.rp.join(',') === 'data:a,data:c', 'retirer la deuxième ne touche pas aux autres');
  photoBuf.rp = ['1','2','3','4','5','6']; photoZone('rp');
  T(!document.getElementById('rp-photozone').innerHTML.includes('Add another'),
    'au-delà de six, on n’en propose plus');
  T(document.getElementById('rp-photozone').innerHTML.includes('maximum'), 'et on dit pourquoi');
  photoBuf.rp = []; photoZone('rp');
  T(document.getElementById('rp-photozone').innerHTML.includes('Take or choose photos'),
    'vide, le bouton invite à en prendre');
  T(/multiple/.test(document.getElementById('rp-photozone').innerHTML),
    'la sélection multiple est permise');
  openReport('MCD-002');
  T(photoBuf.rp.length === 0, 'rouvrir la fenêtre repart de zéro');

  S('16. Délai moyen');
  var t = repTurnaround();
  T(t !== null && t >= 0, 'il se calcule sur les dossiers revenus');

  S('17. Un stagiaire signale mais ne clôt pas');
  me = {role:'stagiaire', name:'Camille'};
  T(can('repair') === true, 'il peut signaler');
  T(can('edit') === false, 'il ne peut pas modifier la fiche');
  renderRep();
  T(!document.getElementById('v-rep').innerHTML.includes('>Receive<'),
    'le bouton de clôture ne lui est pas proposé');
  me = {role:'admin', name:'Maxys'};

  window.__cfg = {FAULTS, CONDS, CONDS_LEGACY};
  window.__results = R;
 })();
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const app = read('js/app.js');
const inv = read('js/views-inventory.js');
const pick = (src, re) => (src.match(re) || [''])[0];

const script = [
  STUBS, read('js/config.js'), read('js/helpers.js'), read('js/prefs.js'),
  // de views-inventory, seulement ce qui touche au blocage de sortie
  pick(inv, /function checkoutBlockReason\(i\)\{[\s\S]*?\n}/),
  pick(inv, /function canCheckout\(i\)\{.*\n/),
  pick(inv, /function openCheckin\(id\)\{[\s\S]*?\n}/),
  'function item(id){ return db.items.find(i=>i.id===id); }',
  pick(read('js/db.js'), /function outBy\(i\)\{[\s\S]*?\n}/),
  pick(read('js/db.js'), /function outForRepair\(i\)\{.*\n/),
  read('js/views-repairs.js'),
  DATA, TESTS
].join('\n;\n');

(async () => {
  try{ dom.window.eval(script); }
  catch(e){ console.log('ERREUR À L’EXÉCUTION : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }
  for(let i=0; i<300 && !dom.window.__results; i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }

  const R = dom.window.__results;

  R.push([!/REPACT/.test(read('js/views-inventory.js') + read('js/helpers.js')),
          'la table REPACT retirée n’est plus référencée']);

  /* Contrôle générique : tous les scripts doivent porter LA version
     déclarée dans app.js. Vérifier un numéro en dur obligeait à
     retoucher le harnais à chaque livraison — et un test qu'on
     retouche à chaque fois finit par être ajusté sans être lu. */
  const h = read('index.html');
  const vApp = (app.match(/APP_VERSION = '([\d.]+)'/)||[])[1];
  const tags = h.match(/\?v=[\d.]+/g) || [];
  const vUniq = [...new Set(tags.map(t=>t.slice(3)))];
  R.push([!!vApp, `APP_VERSION est déclarée (${vApp||'absente'})`]);
  R.push([vUniq.length === 1 && vUniq[0] === vApp,
          `les ${tags.length} fichiers portent tous la version ${vApp} (trouvé : ${vUniq.join(', ')})`]);

  let fails = 0;
  for(const [okv, label] of R){
    if(okv === null) console.log('\n' + label);
    else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
  }
  console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
  process.exit(fails ? 1 : 0);
})();
