/* Harnais v2.5.0 — des lots indissociables.

   Trois versions pour trouver la bonne forme. La 030 a posé « A a
   besoin de B », avec un parent et un enfant. La 031 a dû lever
   l'exclusivité pour les deux Amphion. Et l'usage a dit ce
   qu'aucune des deux n'avait vu : ce sont des LOTS. On ne sort
   jamais une enceinte seule, ni un préampli sans son alimentation.

   La relation est symétrique. Ce que ce harnais doit prouver, ce
   n'est pas que l'affichage est joli : c'est que le lot ne se divise
   jamais, et qu'on ne peut donc pas lire « disponible au studio »
   sur un Amp 700 qui est au Trianon. */
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
    it('SYN-001','Juno-106',            {weight_g:12000}),
    /* Le cas qui a démenti la 030 : deux enceintes, UNE alimentation. */
    it('SPK-001','Amphion #1',          {weight_g:9000}),
    it('SPK-002','Amphion #2',          {weight_g:9000}),
    it('AMP-700','Amp 700',             {weight_g:7000})
  ];

  /* Un besoin ORDINAIRE reste dirigé et cohabite avec les lots :
     un appareil a besoin d'un cordon, un cordon n'a besoin de rien. */
  db.needs = [
    {id:'n1', item_id:'PRE-001', kind:'power', label:'IEC C13',
     qty:1, weight_g:180, pos:0}
  ];

  /* Trois lots. Le deuxième en compte trois membres — le U47, son
     alimentation et le câble sept broches — ce que le modèle dirigé
     décrivait comme une chaîne et qui n'est qu'un seul ensemble. */
  db.linkGroups = [
    {id:'g1', name:'Germanium Preamp/DI + Germanium PSU'},
    {id:'g2', name:'U47 + U47 PSU + U47 cable'},
    {id:'g3', name:'Amphion #1 + Amphion #2 + Amp 700'}
  ];
  db.linkMembers = [
    {group_id:'g1', item_id:'PRE-001'}, {group_id:'g1', item_id:'PSU-001'},
    {group_id:'g2', item_id:'MIC-001'}, {group_id:'g2', item_id:'PSU-002'},
    {group_id:'g2', item_id:'CAB-001'},
    {group_id:'g3', item_id:'SPK-001'}, {group_id:'g3', item_id:'SPK-002'},
    {group_id:'g3', item_id:'AMP-700'}
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

  S('1. La relation est symétrique');
  /* Le point de toute la version : aucun membre n’est le parent des
     autres. La fiche de l’Amp 700 doit dire exactement la même chose
     que celle de l’enceinte, sans quoi l’un des deux écrans mentirait
     sur la nature du lien. */
  T(groupMates('SPK-001').map(i=>i.id).sort().join() === 'AMP-700,SPK-002',
    'depuis une enceinte, on voit l’autre et l’ampli');
  T(groupMates('AMP-700').map(i=>i.id).sort().join() === 'SPK-001,SPK-002',
    'et depuis l’ampli, les deux enceintes — même relation, lue de l’autre bout');
  T(groupMates('SYN-001').length === 0, 'un item libre n’entraîne rien');

  S('2. Un item n’appartient qu’à un lot');
  /* Ce n’est pas une restriction, c’est la définition : si A voyage
     avec B et B avec C, alors A, B et C forment un seul lot. */
  var lots = db.items.map(i=>linkGroupOf(i.id)).filter(Boolean);
  T(db.items.every(i=>db.linkMembers.filter(m=>m.item_id === i.id).length <= 1),
    'aucun item n’est dans deux lots');
  T(groupItems('g2').map(i=>i.id).sort().join() === 'CAB-001,MIC-001,PSU-002',
    'ce que l’ancien modèle appelait une chaîne est UN lot de trois');

  S('3. Il ne se divise jamais');
  var lot = withLinked([item('SPK-001')]);
  T(lot.length === 3, 'bouger une enceinte bouge les trois (' + lot.length + ')');
  var lot2 = withLinked([item('SPK-001'), item('SPK-002')]);
  T(lot2.length === 3, 'et désigner les deux n’emporte pas l’ampli deux fois');
  T(withLinked([]).length === 0, 'un lot vide reste vide');

  S('4. La caisse emporte le lot sans qu’on l’y ait mis');
  var pk = db.packs[0];
  var dedans = packAllItems(pk).map(i=>i.id).sort();
  T(dedans.join() === 'CAS-001,PRE-001,PSU-001',
    'le PSU est dans la caisse (' + dedans.join() + ')');
  T(!db.packItems.some(l=>l.item_id === 'PSU-001'),
    'et pourtant rien ne l’y a inscrit : il est déduit, donc rien à désynchroniser');
  T(packWeight(pk) === 6000 + 3000 + 180 + 1500,
    'son poids entre dans le total de la caisse (' + packWeight(pk) + ' g)');

  S('5. Retirer un membre retire le lot');
  db.packItems = [];
  T(packAllItems(pk).map(i=>i.id).join() === 'CAS-001',
    'il ne reste que le contenant');
  T(db.linkMembers.filter(m=>m.group_id === 'g1').length === 2,
    'et le lot est intact : rien n’a été supprimé');
  db.packItems = [{pack_id:'pk1', item_id:'PRE-001'}];

  S('6. Un item isolé d’un projet entraîne le sien');
  var c = projContent(project('pr1'));
  var ids = c.items.map(i=>i.id).sort();
  T(ids.includes('PSU-002') && ids.includes('CAB-001'),
    'le U47 ajouté seul fait venir tout son lot (' + ids.join() + ')');
  T(ids.includes('PSU-001'), 'et la caisse apporte celui du preamp');
  T(new Set(ids).size === ids.length, 'aucun item compté deux fois');

  S('7. Un membre déjà pris par une caisse n’est pas repris');
  project('pr1').item_ids = ['MIC-001','PRE-001'];
  var n1 = projContent(project('pr1')).items.filter(i=>i.id === 'PSU-001').length;
  T(n1 === 1, 'le PSU n’apparaît qu’une fois (' + n1 + ')');
  project('pr1').item_ids = ['MIC-001'];

  S('8. Les besoins ordinaires cohabitent, et restent dirigés');
  /* Un appareil a besoin d’un cordon ; un cordon n’a besoin de rien.
     C’est la seule partie de la 029 qui décrivait une vraie
     dépendance, et elle ne bouge pas. */
  T(needsOf('PRE-001').length === 1 && needsOf('PRE-001')[0].label === 'IEC C13',
    'le preamp garde son cordon secteur');
  T(needsOf('PSU-001').length === 0, 'et le cordon ne réclame rien en retour');
  T(needsForItems([item('PRE-001')])[0].label === 'IEC C13',
    'l’agrégation des besoins ignore les lots');

  S('9. La sortie et le retour, d’un bloc');
  var src = read_inv;
  T(src.includes('const liés = withLinked(choisis)'),
    'doCheckout ajoute le lot aux items désignés');
  T(src.includes("emportés = liés.filter(i=>i.status === 'dispo')"),
    'un membre déjà sorti ailleurs n’est pas repris : son emplacement fait foi');
  T(src.includes('i.out.reason === reason'),
    'et déjà parti à la MÊME destination n’est pas un conflit — il y est');
  T(src.includes('went out with ') && src.includes('groupLabel(lot)'),
    'l’historique nomme le LOT, pas un parent : il n’y en a plus');

  S('10. La règle de rattrapage de la v2.5 a disparu');
  /* C’est la preuve que le modèle était tordu : il réclamait de
     retenir un item tant qu’un autre « parent » était dehors. Un lot
     ne se divise pas, donc il n’y a plus de moitié à retenir. */
  T(!src.includes('parentsDehors'), 'plus de « parents encore dehors » à calculer');
  T(!src.includes('stayed out — still needed by'), 'ni de message pour l’expliquer');
  T(!src.includes('requiredBy'), 'ni de sens à la relation');
  /* La nuance qui reste, elle, compte toujours. */
  T(src.includes('const e = choisis.includes(i) ? cond : i.cond;'),
    'au retour, l’état saisi ne s’applique QU’À ce qu’on a dans les mains');

  S('11. On ne propose que ce qui sera accepté');
  var ok = liablesPour(item('SYN-001')).map(x=>x.id);
  T(!ok.includes('SYN-001'), 'pas lui-même');
  T(!ok.includes('AMP-700'), 'pas un item déjà dans un autre lot');
  T(ok.includes('CAS-001'), 'mais un item libre, oui');
  var okSpk = liablesPour(item('SPK-001')).map(x=>x.id);
  T(!okSpk.includes('SPK-002') && !okSpk.includes('AMP-700'),
    'et depuis un membre, pas ses propres co-équipiers');

  S('12. Un lot d’un seul item n’est pas un lot');
  T(read_inv.includes('Set dissolved'),
    'retirer l’avant-dernier membre dissout le lot');
  T(read_inv.includes('if(!g){') && read_inv.includes('apiCreateLinkGroup'),
    'et il ne naît qu’au moment où il a deux membres');

  S('13. La base');
  T(read_sql31.includes('create unique index if not exists item_link_un_seul_lot'),
    'un item n’appartient qu’à un lot');
  T(read_sql31.includes('update public.item_link_members set group_id = g1'),
    'la conversion fusionne deux lots que relie une paire — les Amphion arrivent en deux paires');
  T(read_sql31.includes('drop column     if exists needs_item_id'),
    'et l’ancien lien dirigé est retiré : un seul mécanisme, pas deux');
  /* Le script doit pouvoir repartir d'un essai interrompu : toute
     lecture de la colonne passe par du SQL dynamique, qui n'est lu
     qu'à l'exécution. */
  T(read_sql31.includes('for paire in execute'),
    'et il se relance après un échec, sans jamais nommer une colonne disparue');
  T(read_sql31.includes('item_needs_label_chk'),
    'un besoin porte désormais toujours un libellé');

  S('14. Une sauvegarde d’avant la v3 se relit');
  /* Sans cette conversion, restaurer une sauvegarde de la v2.4
     rendrait un parc dont tous les liens auraient disparu — en
     silence, ce qui est la pire façon de perdre des données. */
  T(read_app.includes('anciens.length && !linkMembers.length'),
    'l’ancien lien dirigé est converti en lot à la lecture');
  T(read_app.includes('lotDe.forEach((v,k)=>{ if(v === g2) lotDe.set(k, g1); })'),
    'avec la même fusion transitive que la migration');

  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'),
                'var read_inv = ' + JSON.stringify(read('js/views-inventory.js')) + ';',
                'var read_sql31 = ' + JSON.stringify(read('sql/031-lots-indissociables.sql')) + ';',
                'var read_app = ' + JSON.stringify(read('js/app.js')) + ';',
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
