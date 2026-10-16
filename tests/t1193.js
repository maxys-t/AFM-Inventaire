/* Harnais v1.19.3 — détection d'une nouvelle version en ligne. */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const dom = new JSDOM('<!DOCTYPE html><body></body>',
  {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});

const STUBS = `
  var LABELS={appTitle:'x',nav:{},intro:{}};
  var fetched = [], reponse = '', okFetch = true;
  function init(){} function applyLabels(){} function render(){}
  function curView(){ return 'dash'; }
  window.fetch = async (url, opt) => { fetched.push([url, opt]);
    if(!okFetch) throw new Error('offline');
    return {ok:true, text: async()=>reponse}; };
  var rechargé = null;
  var fauxLocation = {href:'https://inventory.accessflow.fr/', pathname:'/', search:'', hash:'',
                      replace(u){ rechargé = u; }};
  var fauxHistory = {replaceState(){}};
`;

const app = read('js/app.js');
const bloc = s => (app.match(s) || [''])[0];

const TESTS = `
 (async () => {
  var R=[]; function T(c,l){R.push([!!c,l]);} function S(l){R.push([null,l]);}

  S('1. Le contrôle lit index.html sans cache');
  reponse = '<script src="js/app.js?v=' + APP_VERSION + '"></scr'+'ipt>';
  fetched = [];
  await checkVersion();
  T(fetched.length === 1, 'une requête est faite');
  T(/^index\\.html\\?_=\\d+/.test(fetched[0][0]), 'avec un paramètre anti-cache');
  T(fetched[0][1] && fetched[0][1].cache === 'no-store', 'et le cache explicitement écarté');
  T(!document.getElementById('updbar'), 'même version : aucun bandeau');

  S('2. Une version plus récente est signalée');
  reponse = '<script src="js/app.js?v=9.9.9"></scr'+'ipt>';
  await checkVersion();
  var b = document.getElementById('updbar');
  T(!!b, 'le bandeau apparaît');
  T(b.textContent.includes('9.9.9'), 'il annonce la version en ligne');
  T(b.textContent.includes(APP_VERSION), 'et celle qu’on exécute');

  S('3. Il ne harcèle pas');
  b.remove();
  await checkVersion();
  T(!document.getElementById('updbar'), 'la même version n’est signalée qu’une fois');

  S('4. Recharger force une vraie requête');
  reloadFresh();
  T(typeof rechargé === 'string' && rechargé.includes('_r='),
    'le rechargement passe par une adresse jamais vue');

  S('5. Hors ligne, il se tait');
  versionSignalée = null; okFetch = false;
  var planté = false;
  try{ await checkVersion(); }catch(e){ planté = true; }
  T(!planté, 'une coupure réseau ne lève pas d’erreur');
  T(!document.getElementById('updbar'), 'et n’affiche rien');
  okFetch = true;

  S('6. Une réponse inattendue est ignorée');
  reponse = '<html>page de maintenance</html>';
  await checkVersion();
  T(!document.getElementById('updbar'), 'pas de numéro trouvé, pas de bandeau');

  window.__results = R;
 })();
`;

dom.window.eval([STUBS,
  "const APP_VERSION = '" + (app.match(/APP_VERSION = '([\d.]+)'/)||[])[1] + "';",
  '(function(location, history){',
  bloc(/const VERSION_CHECK_MS[\s\S]*?document\.addEventListener\('visibilitychange'[^\n]*\n/),
  'Object.assign(window, {checkVersion, reloadFresh, showUpdateBanner});',
  'Object.defineProperty(window, "versionSignalée", {get:()=>versionSignalée, set:v=>versionSignalée=v});',
  '})(fauxLocation, fauxHistory);',
  TESTS].join('\n;\n'));

(async () => {
  for(let i=0;i<200 && !dom.window.__results;i++) await new Promise(r=>setTimeout(r,25));
  if(!dom.window.__results){ console.log('Les tests ne se sont jamais terminés.'); process.exit(1); }
  const R = dom.window.__results;
  R.push([null,'7. Cohérence']);
  R.push([/#updbar\{/.test(read('css/styles.css')), 'le bandeau a un style']);
  R.push([/position:fixed/.test(read('css/styles.css').split('#updbar{')[1].slice(0,120)),
          'il reste visible pendant le défilement']);
  R.push([!/version\.json/.test(app), 'aucun fichier de version à maintenir à côté']);

  let fails=0;
  for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
    else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
  console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
  process.exit(fails?1:0);
})();
