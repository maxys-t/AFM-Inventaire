/* Harnais v1.13 — blocage de sortie, libellés, mise en page. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <header><h1></h1><span id="appVersion"></span></header>
  <input type="search" id="q"><select id="fCat"></select><select id="fSub"></select>
  <select id="fStatus"></select><select id="fLoc"></select><select id="fOwner"></select>
  <select id="fProv"></select><select id="fCond"></select><select id="fSort"><option value=""></option></select>
  <button id="sortDir"></button><button id="btnReset"></button>
  <span class="colbox"><div class="colmenu" id="colMenu"></div></span>
  <div id="invSummary"></div><div id="invList"></div>
  <div id="out-item"></div><input id="out-user"><datalist id="borrowerList"></datalist>
  <input id="out-reason"><datalist id="offsiteList"></datalist>
  <input type="date" id="out-due"><input type="checkbox" id="out-alert">
  <div class="overlay" id="ovOut"></div>
</body></html>`;

const STUBS = `
  var sb = null, me = {role:'admin'}, saved = [], hist = [];
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[],
            repairs:[], providers:[], repairsSupported:true};
  function item(id){ return db.items.find(i=>i.id===id); }
  function can(){ return true; }
  function canSeeValue(){ return true; }
  function openDetail(){} function renderBulkBar(){} function render(){}
  function toast(m,k){ window.__toasts.push([m,k||'info']); }
  function alert(m){ window.__alerts.push(m); }
  function confirm(){ return true; }
  function open_(id){ window.__opened = id; } function close_(){} function openOver(){}
  async function apiLoadPrefs(){ return null; } async function apiSavePrefs(){}
  async function apiUpdateItemsIn(ids,f){ ids.forEach(id=>saved.push([id,f])); }
  async function apiUpdateItem(id,f){ saved.push([id,f]); }
  async function histMany(rows){ hist.push(...rows); }
  async function borrowerId(){ return 'u1'; }
  window.__toasts = []; window.__alerts = []; window.__opened = null;
`;

const DATA = `
  db.locations = [{name:'Studio A', parent:null, kind:'site'}];
  db.users = [{id:'u1', name:'Tom'}];
  var mk = (id, name, cond, status) => ({id, name, brand:'X', cat:'instruments', subcat:'synthe',
    cond, status, loc:'Studio A', home:'Studio A', price:null, purchase_date:null,
    owner:'', provider:'', serial:'', sales_order:'', notes:'', photo:null,
    out: status==='sorti' ? {userId:'u1', date:'2026-09-01T10:00:00Z', reason:'x', due:null} : null});
  db.items = [
    mk('SYN-001','Sain','bon','dispo'),
    mk('SYN-002','A reparer','bon','dispo'),
    mk('SYN-003','En atelier','bon','dispo'),
    mk('SYN-004','Hors service','hs','dispo'),
    mk('SYN-005','Deja sorti','bon','sorti')
  ];
  /* v1.17 : « à réparer » et « en atelier » ne sont plus des états
     mais des dossiers ouverts. */
  db.repairs = [
    {id:'r1', item_id:'SYN-002', fault:'intermittent', status:'open', opened_at:'2026-10-01T10:00:00Z'},
    {id:'r2', item_id:'SYN-003', fault:'power', status:'sent', opened_at:'2026-09-20T10:00:00Z',
     sent_at:'2026-09-21T10:00:00Z', provider_id:'pA'},
    {id:'r3', item_id:'SYN-005', fault:'damage', status:'open', opened_at:'2026-10-02T10:00:00Z'}
  ];
  db.providers = [{id:'pA', name:'Audio Service Paris', archived:false}];
`;

const TESTS = `
 (async () => {
  var R = [];
  function T(c,l){ R.push([!!c,l]); }
  function S(l){ R.push([null,l]); }

  S('1. Qui peut sortir, qui ne peut pas');
  T(canCheckout(item('SYN-001')), 'un item en bon état peut sortir');
  T(!canCheckout(item('SYN-002')), 'un item à réparer ne peut pas sortir');
  T(!canCheckout(item('SYN-003')), 'un item à l’atelier ne peut pas sortir');
  T(!canCheckout(item('SYN-004')), 'un item hors service ne peut pas sortir');
  T(checkoutBlockReason(item('SYN-002')).includes('needing repair'), 'la raison est explicite');

  S('2. Le bouton reflète l’état');
  T(actionBtn(item('SYN-001')).includes('openCheckout'), 'bouton actif sur un item sain');
  T(actionBtn(item('SYN-002')).includes('warn'), 'bouton d’avertissement sur un item à réparer');
  T(actionBtn(item('SYN-002')).includes('title='), 'la raison est en infobulle');
  T(actionBtn(item('SYN-005')).includes('openCheckin'), 'un item déjà sorti garde son bouton de retour');

  S('3. Le retour reste toujours possible');
  T(actionBtn(item('SYN-005')).includes('ok'), 'un item abîmé déjà dehors peut rentrer');
  T(!actionBtn(item('SYN-005')).includes('disabled'), 'rien ne bloque le retour');

  /* Les parcours de sortie (avertissement, retrait, passer outre) sont
     désormais couverts par t1131.js, qui possède la fenêtre dédiée.
     On ne garde ici que la règle de base. */
  S('4. Règle de base');
  T(!canCheckout(item('SYN-002')) && canCheckout(item('SYN-001')),
    'la distinction sain / abîmé tient');

  S('7. Cadre de défilement du tableau');
  renderInv();
  var w = document.querySelector('#invList .invwrap');
  T(!!w, 'le tableau est dans un cadre à défilement');
  syncInvHeight();
  T(w && /^\\d+px$/.test(w.style.maxHeight), 'une hauteur lui est calculée');

  window.__results = R;
 })();
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'), read('js/prefs.js'),
                read('js/views-inventory.js'), DATA,
                // On n'extrait d'app.js que la mesure de hauteur : charger
                // le fichier entier écraserait les bouchons de rendu.
                (read('js/app.js').match(/function syncInvHeight\(\)\{[\s\S]*?\n}/)||[''])[0],
                TESTS].join('\n;\n');

(async () => {
  try{ dom.window.eval(script); }
  catch(e){ console.log('ERREUR À L’EXÉCUTION : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }

  for(let i=0; i<200 && !dom.window.__results; i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }

  const R = dom.window.__results;

  // Contrôle hors DOM : plus aucune chaîne française visible
  R.push([null, '8. Interface entièrement en anglais']);
  const FR = /\b(Fermer|Annuler|Supprimer|Modifier|Ajouter|choisir|Aucun|Enregistrer|introuvable|obligatoire|Nouveau projet|Version en ligne|cette personne)\b/;
  const files = ['js/app.js','js/db.js','js/helpers.js','js/views-inventory.js','js/views-projects.js',
                 'js/views-people-loc.js','js/views-settings.js','js/views-users.js','js/views-trash.js',
                 'js/views-out.js','js/views-repairs.js','js/auth.js','js/photos-bulk.js','js/import-csv.js'];
  // On suit les commentaires de bloc : les explications en français
  // dans le code sont voulues, seules les chaînes affichées comptent.
  let coupables = [];
  for(const f of files){
    let dansBloc = false;
    read(f).split('\n').forEach((line, n)=>{
      let code = line;
      if(dansBloc){
        const fin = code.indexOf('*/');
        if(fin === -1) return;
        code = code.slice(fin + 2);
        dansBloc = false;
      }
      const deb = code.indexOf('/*');
      if(deb !== -1){
        const fin = code.indexOf('*/', deb + 2);
        if(fin === -1){ dansBloc = true; code = code.slice(0, deb); }
        else code = code.slice(0, deb) + code.slice(fin + 2);
      }
      code = code.split('//')[0];
      if(FR.test(code)) coupables.push(`${f}:${n+1}`);
    });
  }
  R.push([coupables.length === 0, 'aucun libellé français résiduel' + (coupables.length?' — '+coupables.join(', '):'')]);

  R.push([read('index.html').includes('class="invtop"'), 'la recherche a sa propre ligne']);
  R.push([read('index.html').indexOf('bigsearch') < read('index.html').indexOf('class="invbar"'),
          'la recherche est au-dessus des contrôles']);
  R.push([read('index.html').includes('btn big'), 'le bouton d’ajout est mis en avant']);

  let fails = 0;
  for(const [okv, label] of R){
    if(okv === null) console.log('\n' + label);
    else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
  }
  console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
  process.exit(fails ? 1 : 0);
})();
