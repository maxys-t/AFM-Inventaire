/* Harnais v1.13.1 — matériel abîmé : avertir, puis laisser choisir. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <header><h1></h1></header>
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
  <div class="overlay" id="ovWarn"><div class="modal" id="warnBody"></div></div>
</body></html>`;

const STUBS = `
  var sb = null, me = {role:'admin'}, hist = [];
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[],
            repairs:[], providers:[], repairsSupported:true};
  function item(id){ return db.items.find(i=>i.id===id); }
  function can(){ return true; }
  function canSeeValue(){ return true; }
  function openDetail(){} function renderBulkBar(){} function render(){}
  function toast(m,k){ window.__toasts.push([m,k||'info']); }
  function alert(m){ window.__alerts.push(m); }
  function open_(id){ window.__opened = id; document.getElementById(id).classList.add('open'); }
  function openOver(){}
  async function apiLoadPrefs(){ return null; } async function apiSavePrefs(){}
  async function apiUpdateItemsIn(){} async function apiUpdateItem(){}
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
  function reset(){
    db.items = [
      mk('SYN-001','Sain A','bon','dispo'),
      mk('SYN-002','Sain B','bon','dispo'),
      mk('SYN-003','A reparer','bon','dispo'),
      mk('SYN-004','En atelier','bon','dispo')
    ];
      db.repairs = [
        {id:'r1', item_id:'SYN-003', fault:'intermittent', status:'open', opened_at:'2026-10-01T10:00:00Z'},
        {id:'r2', item_id:'SYN-004', fault:'power', status:'sent', opened_at:'2026-09-20T10:00:00Z',
         sent_at:'2026-09-21T10:00:00Z', provider_id:'pA'}
      ];
      db.providers = [{id:'pA', name:'Audio Service Paris', archived:false}];
    sel = new Set(); allowDamaged = false; damagedWarn = null;
    window.__toasts = []; window.__opened = null; hist = [];
  }
  reset();
`;

const TESTS = `
 (async () => {
  var R = [];
  function T(c,l){ R.push([!!c,l]); }
  function S(l){ R.push([null,l]); }
  var W = () => document.getElementById('warnBody').innerHTML;

  S('1. Le bouton invite à confirmer au lieu d’être inerte');
  T(actionBtn(item('SYN-003')).includes('openCheckout'), 'le bouton reste cliquable');
  T(!actionBtn(item('SYN-003')).includes('disabled'), 'il n’est plus désactivé');
  T(actionBtn(item('SYN-003')).includes('warn'), 'il porte un style d’avertissement');

  S('2. Item seul : on prévient, on ne bloque pas');
  reset();
  openCheckout('SYN-003');
  T(window.__opened === 'ovWarn', 'la fenêtre d’avertissement s’ouvre');
  T(W().includes('flagged for repair'), 'le motif est annoncé');
  T(W().includes('A reparer'), 'l’item est nommé');
  T(W().includes('SYN-003'), 'son identifiant aussi');
  T(W().includes('Check out anyway'), 'l’option de passer outre existe');
  T(W().includes('Cancel'), 'et celle d’annuler');

  S('3. Sortir quand même');
  damagedProceed();
  T(window.__opened === 'ovOut', 'la fenêtre de sortie s’ouvre');
  T(allowDamaged === true, 'l’autorisation est posée');
  document.getElementById('out-user').value = 'Tom';
  document.getElementById('out-reason').value = 'Session';
  await doCheckout();
  T(item('SYN-003').status === 'sorti', 'l’item abîmé est bien sorti');
  T(allowDamaged === false, 'l’autorisation ne survit pas à l’opération');
  T(window.__toasts.some(t=>/flagged for repair/.test(t[0])), 'une trace le signale');

  S('4. Sélection mixte : le retrait est mis en avant');
  reset();
  sel = new Set(['SYN-001','SYN-002','SYN-003','SYN-004']);
  openBulkCheckout();
  T(window.__opened === 'ovWarn', 'l’avertissement passe avant');
  T(W().includes('2 items flagged'), 'les deux items abîmés sont comptés');
  T(W().indexOf('Remove them from the selection') < W().indexOf('Check out anyway'),
    'le retrait est proposé en premier');
  T(/class="btn"[^>]*damagedRemove/.test(W()), 'le retrait est le bouton principal');
  T(/class="btn sec"[^>]*damagedProceed/.test(W()), 'passer outre est secondaire');

  S('5. Retirer de la sélection');
  damagedRemove();
  T(sel.size === 2, 'les deux items abîmés sont retirés');
  T(!sel.has('SYN-003') && !sel.has('SYN-004'), 'ce sont les bons');
  T(sel.has('SYN-001') && sel.has('SYN-002'), 'les items sains restent');
  T(window.__opened === 'ovOut', 'la sortie enchaîne sur le reste');
  T(document.getElementById('out-item').textContent.includes('2 item'), 'deux items annoncés');

  S('6. Sortie groupée en passant outre');
  reset();
  sel = new Set(['SYN-001','SYN-003']);
  openBulkCheckout();
  damagedProceed();
  T(document.getElementById('out-item').textContent.includes('2 item'), 'les deux partent');
  document.getElementById('out-user').value = 'Tom';
  document.getElementById('out-reason').value = 'Session';
  await doCheckout();
  T(item('SYN-001').status === 'sorti' && item('SYN-003').status === 'sorti', 'les deux sont sortis');
  T(allowDamaged === false, 'autorisation remise à zéro');

  S('7. Annuler remet tout à plat');
  reset();
  openCheckout('SYN-003');
  damagedProceed();
  T(allowDamaged === true, 'autorisation posée');
  close_('ovOut');
  T(allowDamaged === false, 'refermer la fenêtre de sortie l’annule');
  openCheckout('SYN-003');
  T(window.__opened === 'ovWarn', 'l’avertissement revient à la tentative suivante');

  S('8. Sélection entièrement saine : rien ne s’interpose');
  reset();
  sel = new Set(['SYN-001','SYN-002']);
  openBulkCheckout();
  T(window.__opened === 'ovOut', 'on va droit à la sortie');

  S('9. Hauteur du tableau');
  db.items = [mk('SYN-001','Sain','bon','dispo')];
  renderInv();
  var w = document.querySelector('#invList .invwrap');
  T(!!w, 'le cadre de défilement existe');
  syncInvHeight();
  T(/^\\d+px$/.test(w.style.maxHeight), 'une hauteur lui est donnée (' + w.style.maxHeight + ')');
  T(parseInt(w.style.maxHeight,10) >= 260, 'jamais en dessous du minimum');

  window.__results = R;
 })();
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const app = read('js/app.js');
const pick = re => (app.match(re) || [''])[0];

const script = [STUBS, read('js/config.js'), read('js/helpers.js'), read('js/prefs.js'),
                read('js/views-inventory.js'),
                // d'app.js on ne prend que ces deux fonctions : le fichier
                // entier écraserait les bouchons de rendu
                pick(/function close_\(id\)\{[\s\S]*?\n}/),
                pick(/function syncInvHeight\(\)\{[\s\S]*?\n}/),
                DATA, TESTS].join('\n;\n');

(async () => {
  try{ dom.window.eval(script); }
  catch(e){ console.log('ERREUR À L’EXÉCUTION : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }
  for(let i=0; i<200 && !dom.window.__results; i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }

  const R = dom.window.__results;
  R.push([null, '10. Mise en page']);
  const css = (fs.existsSync(path.join(SRC,'..','css-a-ajouter-v1.13.1.css'))
    ? fs.readFileSync(path.join(SRC,'..','css-a-ajouter-v1.13.1.css'),'utf8')
    : read('css/styles.css'));
  R.push([/body\.wideview main\{max-width:100%/.test(css), 'l’inventaire n’est plus bridé en largeur']);
  R.push([/\.invwrap\{overflow:auto/.test(css), 'le tableau défile dans son cadre']);
  R.push([/\.invtable thead th\{position:sticky;top:0/.test(css), 'les en-têtes collent au cadre']);

  let fails = 0;
  for(const [okv, label] of R){
    if(okv === null) console.log('\n' + label);
    else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
  }
  console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
  process.exit(fails ? 1 : 0);
})();
