/* Harnais v1.12.2 — la restauration ne doit plus rien perdre.
   Deux formats entrent : l'export du bouton de l'application
   (camelCase, champs déjà éclatés) et les sauvegardes nocturnes
   (snake_case, issues directement de la base). */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <header><h1></h1><span id="appVersion"></span></header>
  <nav></nav><main></main>
  <input type="file" id="importFile">
</body></html>`;

const STUBS = `
  var sb = null, me = null;
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[], profiles:[]};
  var upserts = {};
  function init(){}
  function render(){}
  function normCond(c){ return c==='reparer' ? 'attente' : (c||'bon'); }
  function confirm(){ return true; }
  function alert(){}
  async function loadAll(){}
  async function apiUpsertLocations(r){ upserts.locations = r; }
  async function apiUpsertPeople(r){ upserts.people = r; }
  async function apiUpsertItems(r){ upserts.items = r; }
  async function apiUpsertProjects(r){ upserts.projects = r; }
  async function apiInsertHistoryRows(r){ upserts.history = r; }
`;

const DATA = `
  /* Format « sauvegarde nocturne » : lignes brutes de la base. */
  var BACKUP = {
    items: [{id:'SYN-001', name:'Juno-106', cat:'instruments', subcat:'synthe',
             home:'Studio A', loc:'Studio A', status:'dispo', cond:'bon'}],
    people: [{id:'u1', name:'Tom'}],
    locations: [
      {name:'AccessFlow', parent:null, kind:'site', street:'12 rue du Son',
       zip:'75011', city:'Paris', extra:null, phone:null, archived:false},
      {name:'Studio A', parent:'AccessFlow', kind:'room', archived:false},
      {name:'Trianon', parent:null, kind:'offsite', street:'80 Bd de Rochechouart',
       zip:'75018', city:'Paris', extra:'Loading dock', phone:'+33123456789', archived:false},
      {name:'Vieux Lieu', parent:null, kind:'offsite', street:'ailleurs', archived:true}
    ],
    projects: [{id:'p1', name:'Band X', description:'', status:'inactif',
                item_ids:['SYN-001'], prep:{}, last_used:null,
                loc_name:'Trianon', starts_on:'2026-10-12', ends_on:'2026-10-13', archived:false}],
    history: [{item_id:'SYN-001', type:'out', date:'2026-09-01T10:00:00Z',
               detail:'Trianon', user_id:'u1', cond:null, actor_name:'Maxys'}]
  };

  /* Format antérieur à la migration 013 : adresse en champ libre. */
  var VIEUX = {
    items: BACKUP.items, people: BACKUP.people, projects: [], history: [],
    locations: [{name:'Trianon', parent:null, kind:'offsite', address:'80 Bd de Rochechouart, 75018 Paris'}]
  };

  /* Format encore plus ancien : emplacements en simples chaînes. */
  var ANCIEN = {
    items: BACKUP.items, users: BACKUP.people, projects: [], history: [],
    locations: ['Studio A', 'Studio B']
  };
`;

const TESTS = `
  var R = [];
  function T(c,l){ R.push([!!c,l]); }
  function S(l){ R.push([null,l]); }

  S('1. Emplacements : plus rien ne se perd');
  var n = normalizeImport(BACKUP);
  var trianon = n.locations.find(l=>l.name==='Trianon');
  T(n.locations.length === 4, 'les 4 lieux sont repris');
  T(trianon.kind === 'offsite', 'le type est conservé');
  T(trianon.street === '80 Bd de Rochechouart', 'rue conservée');
  T(trianon.zip === '75018' && trianon.city === 'Paris', 'code postal et ville conservés');
  T(trianon.extra === 'Loading dock', 'complément conservé');
  T(trianon.phone === '+33123456789', 'téléphone conservé');
  T(n.locations.find(l=>l.name==='Vieux Lieu').archived === true, 'archivage conservé');
  T(n.locations.find(l=>l.name==='Studio A').parent === 'AccessFlow', 'hiérarchie conservée');

  S('2. Projets : destination, dates et archivage');
  T(n.projects[0].loc_name === 'Trianon', 'destination présente dans les données normalisées');
  T(n.projects[0].starts_on === '2026-10-12', 'date de début présente');

  S('3. Historique : on sait toujours qui a fait quoi');
  T(n.history[0].actorName === 'Maxys', 'auteur conservé');
  T(n.history[0].itemId === 'SYN-001' && n.history[0].userId === 'u1', 'item et emprunteur conservés');

  S('4. Anciennes sauvegardes : adresse en champ libre');
  var v = normalizeImport(VIEUX);
  T(v.locations[0].street === '80 Bd de Rochechouart, 75018 Paris',
    'l’ancien champ address se retrouve dans la rue plutôt que jeté');

  S('5. Sauvegardes très anciennes : emplacements en chaînes');
  var a = normalizeImport(ANCIEN);
  T(a.locations.length === 2 && a.locations[0].name === 'Studio A', 'les chaînes deviennent des lieux');
  T(a.locations[0].kind === 'site', 'un type par défaut est donné');
  T(a.users.length === 1, 'le champ users est accepté comme people');

  S('6. Ce qui part réellement en base');
  importJSON({files:[new File([JSON.stringify(BACKUP)], 'b.json')], value:''});
  window.__wait = true;
  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'), read('js/app.js'), DATA, TESTS].join('\n;\n');

(async () => {
  try{ dom.window.eval(script); }
  catch(e){ console.log('ERREUR À L’EXÉCUTION : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }

  // importJSON lit le fichier de façon asynchrone
  for(let i=0; i<80 && !(dom.window.upserts && dom.window.upserts.locations); i++){
    await new Promise(r=>setTimeout(r, 25));
  }

  const R = dom.window.__results;
  const up = dom.window.upserts || {};
  const add = (c,l)=>R.push([!!c,l]);

  const loc = (up.locations||[]).find(l=>l.name==='Trianon');
  add(loc && loc.phone === '+33123456789', 'le téléphone atteint bien la table locations');
  add(loc && loc.kind === 'offsite', 'le type atteint bien la table locations');
  const arch = (up.locations||[]).find(l=>l.name==='Vieux Lieu');
  add(arch && arch.archived === true, 'l’archivage atteint bien la table locations');

  const pr = (up.projects||[])[0];
  add(pr && pr.loc_name === 'Trianon', 'la destination atteint bien la table projects');
  add(pr && pr.starts_on === '2026-10-12' && pr.ends_on === '2026-10-13', 'les dates atteignent la table projects');
  add(pr && pr.archived === false, 'l’archivage atteint la table projects');

  const h = (up.history||[])[0];
  add(h && h.actor_name === 'Maxys', 'l’auteur atteint bien la table history');
  add(h && h.item_id === 'SYN-001', 'la ligne d’historique est complète');

  let fails = 0;
  for(const [okv, label] of R){
    if(okv === null) console.log('\n' + label);
    else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
  }
  console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
  process.exit(fails ? 1 : 0);
})();
