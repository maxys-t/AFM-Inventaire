/* Harnais v2.4.0 — un item attitré à un autre.

   Le Germanium PSU n'est pas une ligne de checklist : c'est un objet
   avec une valeur, un numéro de série et une histoire. Il doit donc
   rester un item — mais un item qui SUIT son appareil partout, sans
   être inscrit nulle part.

   Ce qu'il faut prouver ici n'est pas que l'affichage est joli, mais
   que la cohérence de l'inventaire tient : on ne doit jamais pouvoir
   lire « disponible au studio » sur un PSU qui est au Trianon. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body><div id="v-proj"></div></body></html>`;

const STUBS = `
  var sb = null, me = {role:'admin'}, toasts = [];
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[],
            repairs:[], providers:[], repairsSupported:true,
            packs:[], packItems:[], packsSupported:true,
            packExtras:[], packExtrasSupported:true,
            needs:[], needsSupported:true, projectsError:false};
  function item(id){ return db.items.find(i=>i.id===id); }
  function project(id){ return db.projects.find(p=>p.id===id); }
  function can(){ return true; }
  function toast(m,k){ toasts.push({m,k:k||'info'}); }
  function outForRepair(i){ return !!(i.out && i.out.repairId); }
  function outBy(i){ return i.out ? (i.out.reason||'') : ''; }
  function locLabel(n){ return n||''; }
  window.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}});
`;

const DATA = `
  db.locations = [{name:'AccessFlow',parent:null},{name:'Studio A',parent:'AccessFlow'}];
  const it = (id,name,extra) => Object.assign(
    {id,name,brand:'',cat:'instruments',subcat:'synthe',cond:'bon',status:'dispo',
     loc:'Studio A',home:'Studio A',price:null,purchase_date:null,owner:'',
     provider:'',serial:'',sales_order:'',notes:'',photo:null,weight_g:null}, extra||{});
  db.items = [
    it('PRE-001','Germanium Preamp/DI', {weight_g:3000}),
    it('PSU-001','Germanium PSU',       {weight_g:1500}),
    it('MIC-001','U47',                 {weight_g:900}),
    it('PSU-002','U47 PSU',             {weight_g:1200}),
    it('CAB-001','U47 cable',           {weight_g:400}),
    it('CAS-001','Pelicase',            {weight_g:6000}),
    it('SYN-001','Juno-106',            {weight_g:12000})
  ];

  /* Le cas du prompt, plus une chaîne à deux maillons : le U47
     réclame son PSU, qui réclame lui-même son câble sept broches. */
  db.needs = [
    {id:'l1', item_id:'PRE-001', kind:'power', label:null,
     needs_item_id:'PSU-001', qty:1, weight_g:null, pos:0},
    {id:'l2', item_id:'MIC-001', kind:'power', label:null,
     needs_item_id:'PSU-002', qty:1, weight_g:null, pos:0},
    {id:'l3', item_id:'PSU-002', kind:'cable', label:null,
     needs_item_id:'CAB-001', qty:1, weight_g:null, pos:0},
    /* Et un besoin ordinaire, pour vérifier qu'ils cohabitent. */
    {id:'l4', item_id:'PRE-001', kind:'power', label:'IEC C13',
     needs_item_id:null, qty:1, weight_g:180, pos:1}
  ];

  db.packs = [{id:'pk1', name:'Pelicase preamps', permanent:false, archived:false,
               container_id:'CAS-001', parent_id:null}];
  db.packItems = [{pack_id:'pk1', item_id:'PRE-001'}];

  db.projects = [{id:'pr1', name:'Trianon', description:'', status:'preparation',
                  item_ids:['MIC-001'], pack_ids:['pk1'], prep:{}, subs:{},
                  snapshot:null, archived:false, loc_name:null,
                  starts_on:null, ends_on:null}];
`;

const TESTS = `
  var R = [];
  function T(cond, label){ R.push([!!cond, label]); }
  function S(label){ R.push([null, label]); }

  S('1. Le lien se lit dans les deux sens');
  T(linkedOf('PRE-001').map(i=>i.id).join() === 'PSU-001',
    'le preamp réclame son PSU');
  T((requiredBy('PSU-001')||{}).id === 'PRE-001',
    'et le PSU sait qui le réclame — c’est ce qui empêche de le prêter');
  T(requiredBy('SYN-001') === null, 'un item libre ne répond rien');

  S('2. La chaîne suit jusqu’au bout');
  /* Le U47 réclame son PSU, qui réclame son câble sept broches.
     S'arrêter au premier niveau laisserait le câble au studio. */
  T(linkedDeep(item('MIC-001')).map(i=>i.id).sort().join() === 'CAB-001,PSU-002',
    'le micro entraîne son PSU ET le câble de ce PSU');
  T(linkedOf('MIC-001').length === 1,
    'alors que le premier niveau n’en voit qu’un');

  S('3. Une boucle ne fige rien');
  /* La 030 les refuse, mais une base d'avant la migration peut en
     contenir, et un calcul sans fin fige l’écran sans rien dire. */
  db.needs.push({id:'boucle', item_id:'CAB-001', kind:'power', label:null,
                 needs_item_id:'MIC-001', qty:1, weight_g:null, pos:0});
  var chaine = linkedDeep(item('MIC-001')).map(i=>i.id).sort().join();
  T(chaine === 'CAB-001,PSU-002', 'le calcul se termine et ne compte rien deux fois');
  db.needs = db.needs.filter(n=>n.id !== 'boucle');

  S('4. La caisse emporte le PSU sans qu’on l’y ait mis');
  var pk = db.packs[0];
  var dedans = packAllItems(pk).map(i=>i.id).sort();
  T(dedans.join() === 'CAS-001,PRE-001,PSU-001',
    'le PSU est dans la caisse (' + dedans.join() + ')');
  T(!db.packItems.some(l=>l.item_id === 'PSU-001'),
    'et pourtant rien ne l’y a inscrit : il est déduit, donc rien à désynchroniser');
  T(packWeight(pk) === 6000 + 3000 + 180 + 1500,
    'son poids entre dans le total de la caisse (' + packWeight(pk) + ' g)');

  S('5. Retirer l’appareil retire son PSU');
  db.packItems = [];
  T(packAllItems(pk).map(i=>i.id).join() === 'CAS-001',
    'il ne reste que le contenant');
  T(db.needs.some(n=>n.needs_item_id === 'PSU-001'),
    'et la déclaration est intacte : rien n’a été supprimé');
  db.packItems = [{pack_id:'pk1', item_id:'PRE-001'}];

  S('6. Un item isolé d’un projet entraîne le sien');
  var c = projContent(project('pr1'));
  var ids = c.items.map(i=>i.id).sort();
  T(ids.includes('PSU-002') && ids.includes('CAB-001'),
    'le U47 ajouté seul fait venir son PSU et son câble (' + ids.join() + ')');
  T(ids.includes('PSU-001'), 'et la caisse apporte celui du preamp');
  T(new Set(ids).size === ids.length, 'aucun item compté deux fois');

  S('7. Un lié déjà pris par une caisse n’est pas repris');
  /* Le PSU du preamp vient par la caisse. Si l’on ajoute aussi le
     preamp en item isolé, le PSU ne doit pas apparaître deux fois. */
  project('pr1').item_ids = ['MIC-001','PRE-001'];
  var c2 = projContent(project('pr1'));
  var n1 = c2.items.filter(i=>i.id === 'PSU-001').length;
  T(n1 === 1, 'le PSU n’apparaît qu’une fois (' + n1 + ')');
  project('pr1').item_ids = ['MIC-001'];

  S('8. withLinked ne double jamais');
  var lot = withLinked([item('PRE-001'), item('PSU-001')]);
  T(lot.length === 2, 'un parent et son lié déjà présent ne font que deux lignes');
  T(withLinked([]).length === 0, 'et un lot vide reste vide');

  S('9. La sortie emporte, le retour ramène');
  var src = read_inv;
  T(/const liés = withLinked\\(choisis\\)/.test(src),
    'doCheckout ajoute les liés aux items désignés');
  T(/emportés = liés\\.filter\\(i=>i\\.status === 'dispo'\\)/.test(src),
    'un lié déjà sorti ailleurs n’est pas repris : son emplacement actuel fait foi');
  T(/bloqués/.test(src) && /already out/.test(src),
    'et on le dit, au lieu de bloquer la sortie pour un cordon');
  T(/went out with /.test(src),
    'l’historique dit pourquoi un item est parti sans qu’on l’ait désigné');
  /* La nuance qui compte au retour. */
  T(/const e = choisis\\.includes\\(i\\) \\? cond : i\\.cond;/.test(src),
    'au retour, l’état saisi ne s’applique QU’À ce qu’on a dans les mains');
  T(/came back with /.test(src), 'et le lié revient avec sa propre ligne d’historique');

  S('10. On ne propose que des liens qui seront acceptés');
  /* Un message d’erreur après coup se lit comme une panne de
     l’application. Mieux vaut ne pas proposer. */
  var ok = liablesPour(item('SYN-001')).map(x=>x.id);
  T(!ok.includes('SYN-001'), 'pas lui-même');
  T(!ok.includes('PSU-001'), 'pas un item déjà attitré ailleurs');
  T(ok.includes('CAS-001'), 'mais un item libre, oui');
  var okMic = liablesPour(item('CAB-001')).map(x=>x.id);
  T(!okMic.includes('MIC-001') && !okMic.includes('PSU-002'),
    'et rien de ce qui le réclame déjà, à quelque profondeur que ce soit');

  S('11. La base pose les mêmes garde-fous');
  T(/create unique index item_needs_un_seul_parent/.test(read_sql),
    'un item lié n’a qu’un parent');
  T(/with recursive descendance/.test(read_sql),
    'et le contrôle de boucle remonte TOUTES les branches');
  /* Le corps du déclencheur, pas les commentaires : ceux-ci citent
     justement le « limit 1 » de la 024 pour expliquer pourquoi on ne
     le reprend pas. */
  var corpsTrigger = read_sql.slice(read_sql.indexOf('returns trigger'),
                                    read_sql.indexOf('drop trigger'));
  T(!/limit 1/.test(corpsTrigger),
    'pas de « limit 1 » : c’est l’erreur que la 024 a dû corriger sur les packs');
  T(/profondeur < 20/.test(read_sql), 'avec un filet de profondeur');

  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'),
                'var read_inv = ' + JSON.stringify(read('js/views-inventory.js')) + ';',
                'var read_sql = ' + JSON.stringify(read('sql/030-items-lies.sql')) + ';',
                /* liablesPour vit dans la vue, qui a besoin du DOM complet.
                   On ne reprend que la fonction. */
                read('js/views-inventory.js').slice(
                  read('js/views-inventory.js').indexOf('function liablesPour'),
                  read('js/views-inventory.js').indexOf('async function needLink')),
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
