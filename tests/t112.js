/* Harnais de test v1.12 — mot de passe, adresses structurées,
   emprunteurs et retour groupé. Un seul eval (les const d'un eval
   global ne franchissent pas la frontière vers le suivant). */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <div id="login"></div><div id="setpw"></div><div id="denied"></div>
  <nav></nav><main></main><span id="userChip"></span>
  <input id="login-email"><input id="login-pw" type="password">
  <button id="login-btn"></button><p id="login-msg"></p>
  <h2 id="setpw-title"></h2><p id="setpw-intro"></p>
  <input id="setpw-1" type="password"><input id="setpw-2" type="password">
  <button id="setpw-btn"></button><p id="setpw-msg"></p>
  <input id="ch-pw1" type="password"><input id="ch-pw2" type="password">
  <button id="ch-btn"></button><p id="ch-msg"></p>
  <input type="search" id="q"><select id="fCat"></select><select id="fSub"></select>
  <select id="fStatus"></select><select id="fLoc"></select><select id="fOwner"></select>
  <select id="fProv"></select><select id="fCond"></select><select id="fSort"><option value=""></option></select>
  <button id="sortDir"></button><button id="btnReset"></button>
  <span class="colbox"><div class="colmenu" id="colMenu"></div></span>
  <div id="invSummary"></div><div id="invList"></div>
  <div id="peopleList"></div>
  <input id="newLoc"><select id="newLocParent"></select><div id="locList"></div>
  <input id="newOff"><input id="newOffAddr"><div id="offList"></div>
  <h3 id="addrTitle"></h3>
  <input id="ad-street"><input id="ad-extra"><input id="ad-zip"><input id="ad-city">
  <div id="ad-phone-field"><input id="ad-phone"></div>
  <div id="in-item"></div><select id="in-cond"><option value="bon"></option><option value="hs"></option></select>
  <input id="in-note">
  <div id="v-proj"></div><div id="projDetailBody"></div>
  <h3 id="projFormTitle"></h3>
  <input id="p-name"><textarea id="p-desc"></textarea><select id="p-dest"></select>
  <input type="date" id="p-start"><input type="date" id="p-end">
  <input id="p-search"><div id="p-picker"></div><div id="p-count"></div>
  <select id="i-home"></select>
  <input id="out-user"><datalist id="borrowerList"></datalist>
  <input id="out-reason"><datalist id="offsiteList"></datalist>
  <input type="date" id="out-due"><input type="checkbox" id="out-alert">
  <div class="overlay" id="ovIn"></div><div class="overlay" id="ovAddr"></div>
  <div class="overlay" id="ovOut"></div><div class="overlay" id="ovProj"></div>
  <div class="overlay" id="ovProjDetail"></div>
</body></html>`;

const STUBS = `
  var sb = null, writes = [], updated = [], hist = [];
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[], profiles:[], projectsError:false};

  function item(id){ return db.items.find(i=>i.id===id); }
  function project(id){ return db.projects.find(p=>p.id===id); }
  function projItems(p){ return (p.item_ids||[]).map(id=>item(id)).filter(Boolean); }
  function projProgress(p){ const its = projItems(p);
    return {done: its.filter(i=>p.prep && p.prep[i.id]).length, total: its.length}; }
  function outBy(){ return 'someone'; }
  function openDetail(){} function renderBulkBar(){} function render(){}
  function toast(m,k){ window.__toasts.push([m,k]); }
  function open_(id){ window.__opened = id; } function close_(){} function openOver(){}
  function applyRoleUI(){} function renderUserChip(){} function updateTrashBadge(){}
  function alert(m){ window.__alerts.push(m); }
  function confirm(){ return true; }
  async function apiLoadPrefs(){ return null; }  async function apiSavePrefs(){}
  async function apiInsertLocation(l){ writes.push(['insLoc', l]); }
  async function apiUpdateLocation(n,f){ writes.push(['updLoc', n, f]); }
  async function apiDeleteLocation(n){ writes.push(['delLoc', n]); }
  async function apiInsertProject(p){ writes.push(['insProj', p]); }
  async function apiUpdateProject(id,f){ writes.push(['updProj', id, f]); }
  async function apiDeleteProject(id){ writes.push(['delProj', id]); }
  async function apiUpdateItem(id,f){ updated.push([id,f]); }
  async function apiUpdateItemsIn(ids,f){ ids.forEach(id=>updated.push([id,f])); }
  async function histMany(rows){ hist.push(...rows); }
  async function apiInsertPerson(){} async function apiDeletePerson(){}
  window.__alerts = []; window.__toasts = []; window.__opened = null;
`;

const DATA = `
  me = {id:'me', email:'max@accessflow.fr', role:'admin', name:'Maxys'};
  db.locations = [
    {name:'AccessFlow', parent:null, kind:'site', street:'12 rue du Son', extra:'', zip:'75011', city:'Paris', phone:'', archived:false},
    {name:'Studio A', parent:'AccessFlow', kind:'room', street:'', extra:'', zip:'', city:'', phone:'', archived:false},
    {name:'Trianon', parent:null, kind:'offsite', street:'80 Bd de Rochechouart', extra:'Loading dock rear',
     zip:'75018', city:'Paris', phone:'+33 1 23 45 67 89', archived:false}
  ];
  db.users = [{id:'u1', name:'Tom'}, {id:'u2', name:'Lea'}];
  var OUT = d => ({userId:'u1', date:d, reason:'Trianon', due:null, alertOn:true});
  db.items = [
    {id:'SYN-001',name:'Juno-106',brand:'Roland',cat:'instruments',subcat:'synthe',cond:'bon',
     status:'sorti',loc:'Trianon',home:'Studio A',price:1200,purchase_date:'2024-03-12',
     owner:'',provider:'',serial:'',sales_order:'',notes:'',photo:null,out:OUT('2026-09-20T10:00:00Z')},
    {id:'MCN-001',name:'U87',brand:'Neumann',cat:'captation',subcat:'condensateur',cond:'bon',
     status:'sorti',loc:'Trianon',home:'Studio A',price:null,purchase_date:null,
     owner:'',provider:'',serial:'',sales_order:'',notes:'',photo:null,out:OUT('2026-09-21T10:00:00Z')},
    {id:'XLR-001',name:'XLR 3m',brand:'Cordial',cat:'cablage',subcat:'xlr',cond:'bon',
     status:'sorti',loc:'atelier',home:'Studio A',price:12,purchase_date:null,
     owner:'',provider:'',serial:'',sales_order:'',notes:'',photo:null,
     out:{userId:'u2', date:'2026-09-01T10:00:00Z', reason:'atelier', due:'2026-09-10', alertOn:true}}
  ];
  db.projects = [{id:'p1', name:'Band X', description:'', status:'inactif',
    item_ids:['SYN-001','MCN-001'], prep:{}, last_used:null,
    loc_name:'Trianon', starts_on:'2026-10-12', ends_on:'2026-10-13', archived:false}];
`;

const TESTS = `
 (async () => {
  var R = [];
  function T(c,l){ R.push([!!c,l]); }
  function S(l){ R.push([null,l]); }

  S('1. Règles de mot de passe');
  T(pwProblem('court') !== null, 'un mot de passe trop court est refusé');
  T(pwProblem('assezlongpourpasser') === null, 'un mot de passe assez long passe');
  T(pwProblem('assezlongpourpasser', 'autrechose') !== null, 'la confirmation doit correspondre');
  T(pwProblem('assezlongpourpasser', 'assezlongpourpasser') === null, 'deux saisies identiques passent');
  T(MIN_PW >= 10, 'longueur minimale au moins 10 (' + MIN_PW + ')');

  S('2. Écran de définition du mot de passe');
  showSetPassword(true);
  T(document.getElementById('setpw-title').textContent.includes('Welcome'), 'accueil pour une invitation');
  T(document.getElementById('setpw').style.display !== 'none', 'écran affiché');
  T(document.getElementById('login').style.display === 'none', 'écran de connexion masqué');
  showSetPassword(false);
  T(!document.getElementById('setpw-title').textContent.includes('Welcome'), 'libellé différent pour une réinitialisation');

  S('3. Adresses structurées');
  T(locAddressLines('Trianon').length === 3, 'adresse sur trois lignes');
  T(locAddressLines('Trianon')[2] === '75018 Paris', 'code postal et ville sur la même ligne');
  T(locAddress('Trianon').includes('Rochechouart') && locAddress('Trianon').includes('75018 Paris'),
    'version compacte sur une ligne');
  T(locPhone('Trianon') === '+33 1 23 45 67 89', 'téléphone lu');
  T(hasAddress('Trianon') && !hasAddress('Studio A'), 'une salle sans adresse est reconnue comme telle');
  T(locAddressLines('Studio A').length === 0, 'aucune ligne vide pour un lieu sans adresse');

  S('4. Formulaire d’adresse');
  editLocAddress('Trianon');
  T(document.getElementById('ad-street').value === '80 Bd de Rochechouart', 'champs pré-remplis');
  T(document.getElementById('ad-phone-field').style.display !== 'none', 'téléphone visible sur un off-site');
  editLocAddress('AccessFlow');
  T(document.getElementById('ad-phone-field').style.display === 'none', 'téléphone masqué sur un site du studio');
  editLocAddress('Trianon');
  document.getElementById('ad-zip').value = '75009';
  await saveLocAddress();
  T(locObj('Trianon').zip === '75009', 'modification appliquée');
  T(writes.some(w=>w[0]==='updLoc' && w[2].zip === '75009'), 'écriture envoyée à la base');
  T(writes.some(w=>w[0]==='updLoc' && w[2].extra !== ''), 'les champs vides partent en null, pas en chaîne vide');

  S('5. Mail de livraison avec adresse mise en forme');
  var body = deliveryMailBody(db.projects[0]);
  T(body.includes('80 Bd de Rochechouart'), 'rue reprise');
  T(body.includes('Loading dock rear'), 'complément repris');
  T(body.includes('75009 Paris'), 'code postal et ville repris');
  T(body.includes('Phone: +33 1 23 45 67 89'), 'téléphone de contact repris');
  T(body.split('\\n').filter(l=>l.trim()==='').length > 0, 'le message reste aéré');

  S('6. Emprunteurs : tableau déplié');
  renderPeople();
  var ph = document.getElementById('peopleList').innerHTML;
  T(ph.includes('2 items'), 'Tom a deux items');
  T(!ph.includes('btable'), 'rien n’est déplié au départ');
  toggleBorrower('u1');
  ph = document.getElementById('peopleList').innerHTML;
  T(ph.includes('btable'), 'le détail est un vrai tableau');
  T(ph.includes('Out since') && ph.includes('Due back') && ph.includes('Destination'), 'colonnes attendues');
  T(ph.includes('Check in all (2)'), 'bouton de retour groupé avec le compte');
  T(!ph.includes('bchips'), 'plus de pastilles');

  S('7. Retard signalé');
  toggleBorrower('u2');
  var ph2 = document.getElementById('peopleList').innerHTML;
  T(ph2.includes('lateraw') || ph2.includes('days-late'), 'un retour en retard est mis en évidence');

  S('8. Check in all');
  window.__toasts = [];
  checkInAllFor('u1');
  T(window.__opened === 'ovIn', 'la fenêtre d’état s’ouvre');
  T(document.getElementById('in-item').textContent.includes('2 item'), 'le lot annoncé');
  T(document.getElementById('in-item').textContent.includes('Tom'), 'l’emprunteur est nommé');
  T(checkinTargets && checkinTargets.length === 2, 'deux items ciblés');

  document.getElementById('in-cond').value = 'bon';
  await doCheckin();
  T(db.items[0].status === 'dispo' && db.items[1].status === 'dispo', 'les deux items sont rentrés');
  T(db.items[0].loc === 'Studio A', 'chaque item retrouve son rangement habituel');
  T(db.items[2].status === 'sorti', 'le matériel de l’autre emprunteur n’a pas bougé');
  T(checkinTargets === null, 'la cible est remise à zéro après coup');
  T(hist.length === 2, 'deux lignes d’historique');

  S('9. Aucun risque de confusion avec la sélection d’inventaire');
  T(sel.size === 0, 'la sélection de l’inventaire reste intacte');
  window.__alerts = []; window.__toasts = [];
  checkInAllFor('u1');
  T(window.__toasts.some(t=>t[1]==='error'), 'rien à rentrer : message d’erreur, pas de plantage');

  window.__results = R;
 })();
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/auth.js'), read('js/helpers.js'),
                read('js/prefs.js'), read('js/views-inventory.js'), read('js/views-projects.js'),
                read('js/views-people-loc.js'), DATA, TESTS].join('\n;\n');

try{ dom.window.eval(script); }
catch(e){ console.log('ERREUR À L’EXÉCUTION : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }

(async () => {
for(let i = 0; i < 200 && !dom.window.__results; i++){
  await new Promise(r => setTimeout(r, 25));
}
if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }

let fails = 0;
for(const [okv, label] of dom.window.__results){
  if(okv === null) console.log('\n' + label);
  else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
}
console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
process.exit(fails ? 1 : 0);
})();
