/* Harnais v2.2.0 — ce dont un item a besoin pour fonctionner.

   Le pari de cette version est qu'un besoin DÉRIVE de l'item au lieu
   d'être inscrit dans la caisse. Tout l'intérêt du choix est qu'il
   rend certaines pannes impossibles plutôt qu'improbables : pas de
   ligne orpheline, pas de désynchronisation, rien à nettoyer quand on
   retire un appareil. Ce harnais vérifie que c'est bien le cas, et
   pas seulement que l'affichage est joli. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <div id="v-proj"></div><div id="v-packs"></div>
</body></html>`;

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
  function locAddressLines(){ return []; }
  function locPhone(){ return ''; }
  function openDetail(){}
  function renderProj(){}
  function renderPacks(){}
  function renderPackDetail(){}
  window.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}});
`;

const DATA = `
  db.locations = [{name:'AccessFlow',parent:null},{name:'Studio A',parent:'AccessFlow'}];
  const it = (id,name,sub,extra) => Object.assign(
    {id,name,brand:'',cat:'instruments',subcat:sub,cond:'bon',status:'dispo',
     loc:'Studio A',home:'Studio A',price:null,purchase_date:null,owner:'',
     provider:'',serial:'',sales_order:'',notes:'',photo:null,weight_g:null}, extra||{});
  db.items = [
    it('SYN-001','Minimoog','synthe',{weight_g:14000}),
    it('SYN-002','Juno-106','synthe',{weight_g:12000}),
    it('SYN-003','Prophet','synthe',{weight_g:10000}),
    it('CAS-001','Pelicase','synthe',{weight_g:6000})
  ];

  /* Le cas du prompt : le Minimoog réclame son bloc d'alim ET une
     Schuko. Le Juno réclame aussi une Schuko — elles doivent fusionner
     en une ligne « × 2 ». */
  db.needs = [
    {id:'n1', item_id:'SYN-001', kind:'power', label:'External PSU brick',
     needs_item_id:null, qty:1, weight_g:450, pos:0},
    {id:'n2', item_id:'SYN-001', kind:'power', label:'Schuko mains lead',
     needs_item_id:null, qty:1, weight_g:180, pos:1},
    {id:'n3', item_id:'SYN-002', kind:'power', label:'Schuko mains lead',
     needs_item_id:null, qty:1, weight_g:180, pos:0},
    {id:'n4', item_id:'SYN-002', kind:'cable', label:'MIDI DIN',
     needs_item_id:null, qty:2, weight_g:80, pos:1}
  ];

  db.packs = [{id:'pk1', name:'Pelicase synthés', permanent:false, archived:false,
               container_id:'CAS-001', parent_id:null}];
  db.packItems = [{pack_id:'pk1', item_id:'SYN-001'},
                  {pack_id:'pk1', item_id:'SYN-002'}];

  db.projects = [{id:'pr1', name:'Trianon', description:'', status:'preparation',
                  item_ids:['SYN-003'], pack_ids:['pk1'], prep:{}, subs:{},
                  snapshot:null, archived:false, loc_name:null,
                  starts_on:null, ends_on:null}];
`;

const TESTS = `
  var R = [];
  function T(cond, label){ R.push([!!cond, label]); }
  function S(label){ R.push([null, label]); }

  S('1. Un besoin appartient à l’item, jamais à la caisse');
  /* C'est la décision centrale de la 029 : une alimentation attitrée
     ne peut pas être en conflit, puisque l'appareil qu'elle sert n'est
     qu'à un endroit à la fois. */
  T(needsOf('SYN-001').length === 2, 'le Minimoog déclare ses deux besoins');
  T(needsOf('CAS-001').length === 0, 'la Pelicase n’en déclare aucun');
  T(!db.items.some(i=>i.id.startsWith('PSU')),
    'et aucune alimentation n’est entrée dans l’inventaire');
  T(!db.packItems.some(l=>db.needs.some(n=>n.id === l.item_id)),
    'ni dans le contenu d’une caisse : rien n’est inscrit, tout est déduit');

  S('2. Quatre appareils, un seul cordon à cocher');
  var agr = needsForItems([item('SYN-001'), item('SYN-002')]);
  var schuko = agr.find(n=>n.label === 'Schuko mains lead');
  T(!!schuko && schuko.qty === 2, 'les deux Schuko fusionnent en « × 2 »');
  T(schuko.pour.length === 2, 'et la ligne sait quels appareils la réclament');
  T(agr.length === 3, 'trois lignes pour quatre déclarations (' + agr.length + ')');
  /* La fusion se fait sur le libellé, pas sur l'identifiant de ligne :
     « Schuko » saisi sur deux fiches désigne le même cordon. */
  T(needKeyOf(db.needs[1]) === needKeyOf(db.needs[2]),
    'deux saisies du même cordon partagent leur clé');

  S('3. Les alimentations avant les cordons');
  var fam = needsGrouped([item('SYN-001'), item('SYN-002')]);
  T(fam.map(f=>f.kind).join(',') === 'power,cable',
    'on branche avant de câbler (' + fam.map(f=>f.kind).join(',') + ')');
  T(fam[0].lignes.length === 2 && fam[1].lignes.length === 1,
    'deux alimentations, un cordon');

  S('4. Le poids compte, mais seulement celui qu’on a mesuré');
  T(needsWeight([item('SYN-001')]) === 630, 'PSU 450 g + Schuko 180 g = 630 g');
  T(needsWeight([item('SYN-002')]) === 180 + 160,
    'et une quantité de 2 pèse deux fois (MIDI 80 g × 2)');
  db.needs.push({id:'n5', item_id:'SYN-003', kind:'cable', label:'Unweighed lead',
                 needs_item_id:null, qty:3, weight_g:null, pos:0});
  T(needsWeight([item('SYN-003')]) === 0,
    'un besoin sans poids n’ajoute rien — un total incomplet vaut mieux qu’un total inventé');

  S('5. La caisse hérite, sans qu’on y ait rien mis');
  var pk = db.packs[0];
  var dedans = needsGrouped(packAllItems(pk));
  T(dedans.length === 2, 'la caisse montre les deux familles');
  T(packWeight(pk) === 6000 + 14000 + 630 + 12000 + 340,
    'et son poids inclut les besoins (' + packWeight(pk) + ' g)');

  S('6. Retirer l’appareil retire son alimentation — sans nettoyage');
  /* C'est l'argument décisif du modèle dérivé : il n'y a aucun état à
     synchroniser, donc aucune ligne orpheline possible. */
  db.packItems = db.packItems.filter(l=>l.item_id !== 'SYN-001');
  var après = needsForItems(packAllItems(pk));
  T(!après.some(n=>n.label === 'External PSU brick'),
    'le bloc d’alim du Minimoog a disparu de la caisse');
  T((après.find(n=>n.label === 'Schuko mains lead')||{}).qty === 1,
    'et la Schuko retombe à × 1, puisque le Juno la réclame encore');
  T(db.needs.filter(n=>n.item_id === 'SYN-001').length === 2,
    'les déclarations du Minimoog, elles, sont intactes : rien n’a été supprimé');
  db.packItems.push({pack_id:'pk1', item_id:'SYN-001'});

  S('7. Un projet les coche, caisse par caisse');
  var p = project('pr1');
  var c = projContent(p);
  T(c.groups[0].needs.length === 2, 'la caisse du projet porte ses deux familles');
  T(c.looseNeeds.length === 1, 'et l’item isolé porte la sienne');
  var clés = projNeedKeys(c);
  T(clés.length === 4, 'quatre lignes à cocher (' + clés.length + ')');
  T(clés.every(k=>k.includes('/')), 'chaque clé porte le nom de sa caisse');
  /* La même alimentation dans deux caisses reste deux gestes : c'est
     pour ça que la clé est préfixée. */
  T(new Set(clés).size === clés.length, 'et deux caisses ne partagent jamais une clé');

  var avant = projProgress(p);
  p.prep = {}; p.prep[clés[0]] = true;
  T(projProgress(p).done === 1, 'cocher une alimentation fait avancer la barre');
  T(avant.total === projProgress(p).total && avant.total > c.items.length,
    'les besoins comptent dans le total : une caisse sans son alim n’est pas finie');

  S('8. Le départ fige les besoins avec le reste');
  /* Déclarer une alimentation de plus le lendemain ne doit pas
     réécrire ce qui est déjà parti — même règle que le contenu. */
  p.snapshot = projSnapshot(p);
  p.status = 'show';
  var gelé = projContent(p);
  T(gelé.frozen === true, 'le projet lit sa photographie');
  T(gelé.groups[0].needs.length === 2, 'elle contient les besoins');
  db.needs.push({id:'n6', item_id:'SYN-001', kind:'cable', label:'Added later',
                 needs_item_id:null, qty:1, weight_g:null, pos:9});
  T(!JSON.stringify(projContent(p)).includes('Added later'),
    'et une déclaration ajoutée après coup n’y entre pas');
  p.status = 'preparation'; p.snapshot = null;
  db.needs = db.needs.filter(n=>n.id !== 'n6');

  S('9. Une photographie d’avant la v2.2 se relit quand même');
  /* Les projets déjà partis n'ont pas de besoins dans leur snapshot.
     Les relire doit rendre un projet sans besoins, pas une erreur. */
  p.snapshot = {frozen_at:'2026-01-01', packs:[{id:'pk1', name:'Pelicase synthés',
                permanent:false, items:['SYN-001'], extras:[]}], items:[]};
  p.status = 'show';
  var vieux = projContent(p);
  T(vieux.groups[0].needs.length === 0 && vieux.items.length === 1,
    'ancien format : aucun besoin, aucune erreur');
  p.status = 'preparation'; p.snapshot = null;

  S('10. La recopie n’écrase jamais');
  /* Déclarer six cents items un par un est un travail qu'on abandonne
     au trentième. Mais écraser ferait perdre en silence une
     déclaration propre à un exemplaire. */
  var src = read_views;
  T(/Nothing is overwritten/.test(src), 'la confirmation le dit à l’utilisateur');
  T(/déjà\\.has\\(needKeyOf\\(n\\)\\)/.test(src), 'et le code saute ce qui existe déjà');
  T(/if\\(n\\.needs_item_id\\) return;/.test(src),
    'un besoin suivi comme un item ne se duplique pas : c’est un objet unique');

  S('11. Un item ne peut pas avoir besoin de lui-même');
  T(/item_needs_pas_soi_chk/.test(read_sql), 'la base le refuse');
  T(/item_needs_cible_chk/.test(read_sql),
    'et une ligne sans désignation aussi : une case à cocher vide ne veut rien dire');
  T(/on delete cascade/.test(read_sql),
    'supprimer l’item emporte ses besoins');
  T(/needs_item_id[\\s\\S]{0,120}on delete set null/.test(read_sql),
    'mais supprimer une alimentation partagée laisse la ligne, vidée de sa cible');

  S('12. Sans la migration, l’app tourne quand même');
  T(/db\\.needsSupported = !bes\\.error/.test(read_db),
    'l’absence de la table est tolérée');
  T(/if\\(!db\\.needsSupported\\)/.test(src),
    'et l’écran dit quoi lancer plutôt que de rester blanc');
  T(/d\\.needs \\|\\| d\\.item_needs/.test(read_app),
    'la restauration ne perd pas la table — la cinquième qu’elle aurait pu perdre');

  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'),
                read('js/views-packs.js'), read('js/views-projects.js'),
                'var read_views = ' + JSON.stringify(read('js/views-inventory.js')) + ';',
                'var read_sql  = ' + JSON.stringify(read('sql/029-besoins-items.sql')) + ';',
                'var read_db   = ' + JSON.stringify(read('js/db.js')) + ';',
                'var read_app  = ' + JSON.stringify(read('js/app.js')) + ';',
                /* projProgress vit dans db.js, qui parle à Supabase. On ne
                   charge donc que la fonction, pas le fichier. */
                'function projProgress(p){' +
                '  const c = projContent(p);' +
                '  const clés = c.items.map(i=>i.id).concat(c.extras.map(e=>e.key))' +
                '    .concat(projNeedKeys(c));' +
                '  return {done: clés.filter(k=>p.prep && p.prep[k]).length, total: clés.length};' +
                '}',
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
