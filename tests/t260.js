/* Harnais v2.8.0 — l'alias, la garantie, les champs par domaine.

   Le chantier est né d'un tableur Excel de suivi des sept ordinateurs
   du studio. La moitié de ses colonnes existait déjà dans
   l'application ; le reste tient en trois ajouts et une vue dérivée.

   Ce qu'il faut prouver ici : que la vue IT ne DUPLIQUE rien — une
   ligne apparaît parce qu'un ordinateur existe, pas parce qu'on l'a
   créée quelque part. Deux sources de vérité sur le même studio
   finissent toujours par diverger, et c'était tout l'intérêt
   d'absorber le tableur. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <div id="v-it"></div><div id="v-dash"></div>
  <input type="search" id="q">
  <div id="invSummary"></div><div id="invList"></div>
  <span class="colbox"><div class="colmenu" id="colMenu"></div></span>
</body></html>`;

const STUBS = `
  var sb = null, me = {role:'admin'}, toasts = [];
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[], archived:[],
            repairs:[], providers:[], repairsSupported:true,
            packs:[], packItems:[], packsSupported:true, packFolders:[], foldersSupported:true,
            supplies:[], supplyLines:[], suppliesSupported:true,
            needs:[], needsSupported:true,
            linkGroups:[], linkMembers:[], linksSupported:true, projectsError:false};
  function item(id){ return db.items.find(i=>i.id===id); }
  function can(){ return true; }
  function canSeeValue(){ return true; }
  function toast(m,k){ toasts.push({m,k:k||'info'}); }
  function repairOf(){ return null; }
  function overdue(){ return false; }
  function daysLate(){ return 0; }
  function daysSince(){ return 0; }
  function outBy(i){ return i.out ? (i.out.reason||'') : ''; }
  function outForRepair(){ return false; }
  function locLabel(n){ return n||''; }
  function openDetail(){}
  function renderBulkBar(){}
  function show(){}
  function goInventory(){}
  function openItemForm(){}
  function openProjForm(){}
  function openPackDetail(){}
  function packCheckout(){}
  function packCheckin(){}
  function providerName(){ return ''; }
  function repairStale(){ return false; }
  function faultLabel(f){ return f||''; }
  function condLabel(c){ return CONDS[c] || c; }
  async function apiLoadPrefs(){ return null; }
  async function apiSavePrefs(){}
  window.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}});
  window.scrollTo = () => {};
`;

const DATA = `
  db.locations = [{name:'AccessFlow',parent:null},{name:'Studio A',parent:'AccessFlow'}];
  const dans = n => new Date(Date.now() + n*864e5).toISOString().slice(0,10);
  const it = (id,name,extra) => Object.assign(
    {id,name,brand:'Apple',cat:'informatique',subcat:'ordinateur',cond:'bon',status:'dispo',
     loc:'Studio A',home:'Studio A',price:null,purchase_date:null,owner:'',provider:'',
     serial:'',sales_order:'',notes:'',photo:null,weight_g:null,
     alias:null,warranty_until:null,extra:{}}, extra||{});

  db.items = [
    it('CPU-001','Mac Studio M2 Max 2023 96Gb', {alias:'AccessFlow A',
       warranty_until: dans(40),
       extra:{role:'Mixing', os:'macOS 14.5', os_frozen:true,
              os_frozen_why:'Antelope driver not ready', chip:'M2 Max', ram_gb:96,
              hostname:'accessflow-a', filevault:'On'}}),
    it('CPU-002','Mac Studio M2 Max 2023 96Gb', {alias:'AccessFlow B',
       warranty_until: dans(-10),
       extra:{role:'Mastering', os:'macOS 15.1', chip:'M2 Max', ram_gb:96}}),
    it('CPU-003','Mac mini 2018 64Gb', {alias:'AccessFlow Live', extra:{}}),
    /* Un micro : il ne déclare aucun jeu de champs et n'a rien à
       faire dans la vue IT. */
    it('MCN-001','U87', {brand:'Neumann', cat:'captation', subcat:'condensateur',
       warranty_until: dans(500)})
  ];
`;

const TESTS = `
  var R = [];
  function T(cond, label){ R.push([!!cond, label]); }
  function S(label){ R.push([null, label]); }

  S('1. L’alias passe devant le modèle');
  /* Personne ne dit « le Mac Studio numéro 1 » : tout le monde dit
     « le A ». Un nom d'usage bat un numéro d'inventaire. */
  T(itemTitleText(item('CPU-001')) === 'AccessFlow A · Apple Mac Studio M2 Max 2023 96Gb',
    'le titre nomme l’alias, le modèle devient le sous-titre');
  T(itemTitle(item('CPU-001')).includes('ttmodel'),
    'et le modèle est rendu en retrait, pas supprimé');
  T(itemTitleText(item('MCN-001')) === 'Neumann U87',
    'sans alias, rien ne change — marque et modèle, comme avant');
  T(itemModelText(item('CPU-001')) === 'Apple Mac Studio M2 Max 2023 96Gb',
    'le modèle reste accessible seul, pour parler de l’objet et non de l’exemplaire');

  S('2. La recherche trouve l’alias et les champs de domaine');
  document.getElementById('q').value = 'accessflow a';
  T(invFiltered().length === 1 && invFiltered()[0].id === 'CPU-001',
    'on cherche « AccessFlow A », on trouve la machine');
  document.getElementById('q').value = 'accessflow-a';
  T(invFiltered().length === 1, 'et le nom d’hôte aussi — il est dans extra');
  document.getElementById('q').value = '';

  S('3. La garantie, générique et pas informatique');
  T(warrantyDaysLeft(item('CPU-001')) === 40, 'les jours restants se comptent');
  T(warrantySoon(item('CPU-001')), '40 jours : on prévient');
  T(warrantyExpired(item('CPU-002')), 'passée : on le dit');
  T(!warrantySoon(item('MCN-001')) && !warrantyExpired(item('MCN-001')),
    'un U87 sous garantie longue ne déclenche rien — mais il EST concerné');
  T(warrantyDaysLeft(item('CPU-003')) === null, 'sans date, pas d’alerte');
  renderDash();
  var d = document.getElementById('v-dash').innerHTML;
  T(d.includes('warranty ends in') && d.includes('warranty ended'),
    'le tableau de bord les liste avec les autres choses à faire');

  S('4. Les champs propres à un domaine');
  T(!!fieldsetOf(item('CPU-001')), 'un ordinateur déclare un jeu de champs');
  T(!fieldsetOf(item('MCN-001')), 'un micro n’en déclare aucun');
  T(extraOf(item('CPU-001'), 'os') === 'macOS 14.5', 'une valeur se lit');
  T(extraOf(item('CPU-003'), 'os') === '', 'une case vide rend une chaîne vide, jamais undefined');
  /* La version d'OS est une DÉCISION, pas une mesure — d'où le
     drapeau de gel et sa raison. */
  T(extraOf(item('CPU-001'), 'os_frozen') === true, 'une machine peut être gelée');
  T(/Antelope/.test(extraOf(item('CPU-001'), 'os_frozen_why')), 'avec sa raison');

  S('5. Ce qu’on a refusé d’y mettre');
  /* Stockage libre, cycles de batterie, dernière sauvegarde : ça
     dérive en permanence et personne ne le saisira. Un champ que
     personne ne met à jour est pire qu'un champ absent — il a l'air
     d'une réponse. */
  var cles = ITEM_FIELDSETS.ordinateur.champs.map(c=>c.k);
  ['storage_free','battery_cycles','battery_health','last_backup','last_os_update']
    .forEach(k=>T(!cles.includes(k), k + ' n’est pas un champ : ça dérive, personne ne le tiendra'));
  T(cles.includes('os') && cles.includes('os_frozen'),
    'mais la version d’OS et son gel y sont : ce sont des décisions');

  S('6. La vue IT ne duplique rien');
  /* C'est le point de toute la version : la ligne existe parce que
     l'ordinateur existe. Rien à créer, rien à synchroniser. */
  T(itItems().length === 3, 'trois machines, autant que d’items de la sous-catégorie');
  T(!itItems().some(i=>i.id === 'MCN-001'), 'le micro n’y est pas');
  db.items.push({id:'CPU-004', name:'MacBook Pro M2', brand:'Apple', cat:'informatique',
    subcat:'ordinateur', cond:'bon', status:'dispo', loc:'Studio A', home:'Studio A',
    alias:'AccessFlow Remote', extra:{}, notes:'', photo:null});
  T(itItems().length === 4,
    'un ordinateur ajouté à l’inventaire apparaît aussitôt — aucune ligne à créer');
  db.items = db.items.filter(i=>i.id !== 'CPU-004');
  T(itItems().length === 3, 'et disparaît quand il s’en va');

  S('7. Les colonnes suivent ce qui est rempli');
  var cols = itColonnes(itItems()).map(c=>c.k);
  T(cols.includes('os') && cols.includes('chip'), 'ce qui est renseigné a sa colonne');
  T(!cols.includes('mac'), 'ce que personne n’a rempli n’en a pas — une colonne vide rétrécit les autres');
  T(!cols.includes('os_frozen_why'), 'la raison du gel s’affiche avec le gel, pas à part');

  S('8. L’écran');
  renderIT();
  var h = document.getElementById('v-it').innerHTML;
  T(h.includes('AccessFlow A'), 'les machines sont là, sous leur nom d’usage');
  T(h.includes('frozen'), 'le gel se voit d’un coup d’œil');
  T(h.includes('Updates frozen') && h.includes('Warranty ending'),
    'et les deux compteurs qui comptent');
  T(h.includes('filtered read of the'),
    'l’écran dit lui-même qu’il ne duplique rien');
  T(h.includes('Nothing filled in'),
    'et combien de fiches restent à remplir');

  S('9. La base');
  T(/add column if not exists alias/.test(read_sql), 'items.alias existe');
  T(/add column if not exists warranty_until/.test(read_sql), 'items.warranty_until aussi');
  T(/add column if not exists extra/.test(read_sql), 'et items.extra en jsonb');
  T(/btrim\\(alias\\) = ''/.test(read_sql),
    'une chaîne vide n’est pas un alias : c’est l’absence d’alias');
  T(/schema_migrations/.test(read_sql), 'et la migration s’enregistre au journal');

  S('10. Pas d’écran d’administration pour les champs');
  /* CATS, CONDS et NEED_PRESETS se tiennent déjà ainsi. Un studio de
     trois personnes ne gagne rien à une interface pour une liste
     qu'on touche trois fois par an. */
  T(/const ITEM_FIELDSETS/.test(read_cfg), 'les jeux de champs sont déclarés dans config.js');
  T(/const IT_SUBS/.test(read_cfg), 'et le périmètre de la vue aussi');
  T(!/apiInsertFieldset|from\\('fieldsets'\\)/.test(read_it + read_cfg),
    'aucune table, aucun formulaire de définition');

  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'),
                read('js/prefs.js'), read('js/views-inventory.js'),
                read('js/views-dashboard.js'), read('js/views-it.js'),
                'var read_sql = ' + JSON.stringify(read('sql/035-alias-garantie-champs.sql')) + ';',
                'var read_cfg = ' + JSON.stringify(read('js/config.js')) + ';',
                'var read_it  = ' + JSON.stringify(read('js/views-it.js')) + ';',
                DATA, TESTS].join('\n;\n');

try{ dom.window.eval(script); }
catch(e){ console.log('ERREUR À L’EXÉCUTION : ' + e.message + '\n' + (e.stack||'')); process.exit(1); }

let fails = 0;
for(const [okv, label] of dom.window.__results){
  if(okv === null) console.log('\n' + label);
  else { if(!okv) fails++; console.log('  ' + (okv ? '✓' : '✗') + ' ' + label); }
}
console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
process.exit(fails ? 1 : 0);
