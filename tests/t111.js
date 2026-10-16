/* Harnais de test v1.11 — lieux, off-site, archivage, dates, mail.
   Tout dans un seul eval (les const d'un eval global ne franchissent
   pas la frontière vers l'eval suivant). */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <input type="search" id="q"><select id="fCat"></select><select id="fSub"></select>
  <select id="fStatus"></select><select id="fLoc"></select><select id="fOwner"></select>
  <select id="fProv"></select><select id="fCond"></select><select id="fSort"><option value=""></option></select>
  <button id="sortDir">↑</button><button id="btnReset"></button>
  <span class="colbox"><div class="colmenu" id="colMenu"></div></span>
  <div id="invSummary"></div><div id="invList"></div>
  <input id="newLoc"><select id="newLocParent"></select><div id="locList"></div>
  <input id="newOff"><input id="newOffAddr"><div id="offList"></div>
  <div id="v-proj"></div><div id="projDetailBody"></div>
  <h3 id="projFormTitle"></h3>
  <input id="p-name"><textarea id="p-desc"></textarea><select id="p-dest"></select>
  <input type="date" id="p-start"><input type="date" id="p-end">
  <input id="p-search"><div id="p-picker"></div><div id="p-count"></div>
  <select id="i-home"></select>
  <input id="out-user"><datalist id="borrowerList"></datalist>
  <input id="out-reason"><datalist id="offsiteList"></datalist>
  <input type="date" id="out-due"><input type="checkbox" id="out-alert">
  <div class="overlay" id="ovOut"></div><div class="overlay" id="ovProj"></div>
  <div class="overlay" id="ovProjDetail"></div><div id="out-item"></div>
</body></html>`;

const STUBS = `
  var sb = null, me = {role:'admin'}, writes = [];
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[], projectsError:false};
  function can(){ return true; }
  function canSeeValue(){ return true; }
  function openDetail(){}
  function renderBulkBar(){}
  function item(id){ return db.items.find(i=>i.id===id); }
  function project(id){ return db.projects.find(p=>p.id===id); }
  function outBy(){ return 'someone'; }
  /* Copies conformes de db.js — ce fichier ne peut pas être chargé ici,
     il ouvre une connexion Supabase au chargement. */
  function projItems(p){ return (p.item_ids||[]).map(id=>item(id)).filter(Boolean); }
  function projProgress(p){
    const its = projItems(p);
    return {done: its.filter(i=>p.prep && p.prep[i.id]).length, total: its.length};
  }
  function toast(){}
  function open_(){} function close_(){} function openOver(){}
  function applyRoleUI(){}
  function alert(m){ window.__alerts.push(m); }
  function confirm(){ return true; }
  function prompt(msg, def){ return window.__promptAnswer; }
  async function apiLoadPrefs(){ return null; }
  async function apiSavePrefs(){}
  async function apiInsertLocation(l){ writes.push(['insertLoc', l]); }
  async function apiUpdateLocation(n,f){ writes.push(['updLoc', n, f]); }
  async function apiDeleteLocation(n){ writes.push(['delLoc', n]); }
  async function apiInsertProject(p){ writes.push(['insProj', p]); }
  async function apiUpdateProject(id,f){ writes.push(['updProj', id, f]); }
  async function apiDeleteProject(id){ writes.push(['delProj', id]); }
  window.__alerts = [];
  window.__promptAnswer = null;
  window.__lastMailto = null;
`;

const DATA = `
  db.locations = [
    {name:'AccessFlow', parent:null, kind:'site', street:'12 rue du Son', zip:'75011', city:'Paris', archived:false},
    {name:'Studio A',   parent:'AccessFlow', kind:'room', street:'', archived:false},
    {name:'Trianon',    parent:null, kind:'offsite', street:'80 Bd de Rochechouart', zip:'75018', city:'Paris', archived:false},
    {name:'Vieux Lieu', parent:null, kind:'offsite', street:'ailleurs', archived:true}
  ];
  db.items = [
    {id:'SYN-001',name:'Juno-106',brand:'Roland',cat:'instruments',subcat:'synthe',cond:'bon',
     status:'dispo',loc:'Studio A',home:'Studio A',price:1200,purchase_date:'2024-03-12',
     owner:'',provider:'',serial:'',sales_order:'',notes:'',photo:null},
    {id:'MCN-001',name:'U87',brand:'Neumann',cat:'captation',subcat:'condensateur',cond:'bon',
     status:'dispo',loc:'Studio A',home:'Studio A',price:null,purchase_date:null,
     owner:'',provider:'',serial:'',sales_order:'',notes:'',photo:null}
  ];
  db.projects = [
    {id:'p1', name:'Band X Tour', description:'', status:'inactif', item_ids:['SYN-001','MCN-001'],
     prep:{}, last_used:null, loc_name:'Trianon', starts_on:'2026-10-12', ends_on:'2026-10-13', archived:false},
    {id:'p2', name:'Vieille tournée', description:'', status:'inactif', item_ids:['SYN-001'],
     prep:{}, last_used:null, loc_name:'', starts_on:null, ends_on:null, archived:true}
  ];
`;

const TESTS = `
  var R = [];
  function T(c,l){ R.push([!!c,l]); }
  function S(l){ R.push([null,l]); }

  S('1. Format de date AAAA/MM/JJ');
  T(fdateD('2026-10-12') === '2026/10/12', 'fdateD : ' + fdateD('2026-10-12'));
  T(fdateOnly('2024-03-12') === '2024/03/12', 'fdateOnly : ' + fdateOnly('2024-03-12'));
  T(/^\\d{4}\\/\\d{2}\\/\\d{2} \\d{2}:\\d{2}$/.test(fdate('2026-09-25T14:05:00Z')), 'fdate : ' + fdate('2026-09-25T14:05:00Z'));
  T(fdateD('') === '' && fdateOnly(null) === '', 'date absente = chaîne vide, pas « Invalid Date »');
  T(parseDate(fdateD('2026-10-12')) === '2026-10-12', 'aller-retour parseDate sans perte');

  S('2. Séparation des lieux');
  T(locRoots().map(l=>l.name).join(',') === 'AccessFlow', 'un off-site n’est pas une racine');
  T(offsites(false).map(l=>l.name).join(',') === 'Trianon', 'les archivés sortent de la liste');
  T(offsites(true).length === 2, 'mais restent accessibles si on les demande');
  T(isOffsite('Trianon') && !isOffsite('Studio A'), 'kind correctement lu');
  T(locAddress('Trianon').includes('Rochechouart'), 'adresse lue');

  S('3. Un item ne peut pas habiter un off-site');
  T(!homeOptions().includes('Trianon'), 'Trianon absent des rangements possibles');
  T(homeOptions().includes('Studio A') && homeOptions().includes('AccessFlow'), 'sites et salles présents');
  T(locOptions().includes('Trianon'), 'mais Trianon reste une destination valable');
  T(!locOptions().includes('Vieux Lieu'), 'un off-site archivé sort aussi des destinations');

  S('4. Suggestions à la sortie de matériel');
  prepCheckoutForm();
  T(document.getElementById('offsiteList').innerHTML.includes('Trianon'), 'Trianon proposé');
  T(!document.getElementById('offsiteList').innerHTML.includes('Vieux Lieu'), 'archivé non proposé');

  S('5. Vue des emplacements');
  renderLoc();
  var lh = document.getElementById('locList').innerHTML;
  var oh = document.getElementById('offList').innerHTML;
  T(lh.includes('AccessFlow') && lh.includes('Studio A'), 'site et salle listés');
  T(!lh.includes('Trianon'), 'les off-site ne polluent pas la liste du studio');
  T(oh.includes('Trianon') && oh.includes('Rochechouart'), 'off-site listé avec son adresse');
  T(oh.includes('Show archived (1)'), 'bouton d’accès aux archives');
  toggleArchivedLoc();
  T(document.getElementById('offList').innerHTML.includes('Vieux Lieu'), 'les archivés réapparaissent sur demande');
  toggleArchivedLoc();

  S('6. Archivage plutôt que suppression');
  window.__alerts = [];
  db.items[0].loc = 'Trianon';
  archiveLoc('Trianon');
  T(window.__alerts.length === 1 && !locObj('Trianon').archived,
    'refus d’archiver un lieu où du matériel se trouve encore');
  db.items[0].loc = 'Studio A';
  archiveLoc('Trianon');
  T(locObj('Trianon').archived === true, 'archivage accepté une fois le matériel rentré');
  archiveLoc('Trianon');
  T(locObj('Trianon').archived === false, 'restauration possible');

  window.__alerts = [];
  delLoc('Trianon');
  T(window.__alerts.length === 1 && !!locObj('Trianon'),
    'suppression refusée tant qu’un projet pointe dessus');

  /* La modification d'adresse est passée d'un prompt() à une vraie
     fenêtre en v1.12 : elle est testée en détail dans t112.js. */

  S('8. Projets : dates, archivage');
  T(projDates(db.projects[0]) === '2026/10/12 → 2026/10/13', 'plage de dates : ' + projDates(db.projects[0]));
  db.projects[0].ends_on = '2026-10-12';
  T(projDates(db.projects[0]) === '2026/10/12', 'un seul jour ne s’affiche pas deux fois');
  db.projects[0].ends_on = '2026-10-13';
  renderProj();
  var ph = document.getElementById('v-proj').innerHTML;
  T(ph.includes('Band X Tour') && !ph.includes('Vieille tournée'), 'les projets archivés sont masqués');
  T(ph.includes('Show archived (1)'), 'bouton d’accès aux archives');
  T(ph.includes('Trianon') && ph.includes('2026/10/12'), 'destination et dates en colonnes');
  toggleArchivedProj();
  T(document.getElementById('v-proj').innerHTML.includes('Vieille tournée'), 'réapparition sur demande');
  toggleArchivedProj();

  S('9. Brouillon de mail de livraison');
  var body = deliveryMailBody(db.projects[0]);
  T(body.includes('Destination: Trianon'), 'destination reprise');
  T(body.includes('Rochechouart'), 'adresse du lieu reprise');
  T(body.includes('2026/10/12 → 2026/10/13'), 'dates au bon format');
  T(body.includes('[SYN-001]') && body.includes('[MCN-001]'), 'identifiants du matériel listés');
  /* v1.22 : la liste suit les caisses, pas les sous-catégories —
     c'est elle qu'on lit sur un quai. */
  T(/items: 2/.test(body), 'compte du matériel');
  T(body.includes('Loose items'), 'liste groupée par caisse, le reste à part');
  T(/total weight/.test(body), 'et le poids total, pour le transporteur');

  db.projects[0].item_ids = ['SYN-001','MCN-001','FANTOME-999'];
  T(deliveryMailBody(db.projects[0]).includes('no longer in the inventory'),
    'un item supprimé de l’inventaire est signalé');
  db.projects[0].item_ids = ['SYN-001','MCN-001'];

  /* v1.22 : plus de fenêtre, une page. v1.25 : les métadonnées sont
     passées dans les réglages du projet. Les mêmes pièges restent. */
  S('10. Page de réglages du projet');
  projGo('settings','p1');
  T(document.getElementById('pj-dest').value === 'Trianon', 'destination pré-remplie');
  T(document.getElementById('v-proj').innerHTML.includes('value="2026-10-12"'),
    'date de début pré-remplie');
  locObj('Trianon').archived = true;
  projGo('settings','p1');
  T(document.getElementById('pj-dest').value === 'Trianon' &&
    document.getElementById('v-proj').innerHTML.includes('Trianon (archived)'),
    'une destination archivée reste sélectionnée et n’est pas effacée en silence');
  locObj('Trianon').archived = false;
  projGo('list');

  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'), read('js/prefs.js'),
                read('js/views-inventory.js'), read('js/views-projects.js'),
                read('js/views-people-loc.js'), DATA, TESTS].join('\n;\n');

try{ dom.window.eval(script); }
catch(e){ console.log('ERREUR À L’EXÉCUTION : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }

let fails = 0;
for(const [okv, label] of dom.window.__results){
  if(okv === null) console.log('\n' + label);
  else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
}
console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
process.exit(fails ? 1 : 0);
