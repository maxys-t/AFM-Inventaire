/* Harnais v2.6.0 — ce qu'une vraie préparation a révélé.

   Cette version ne vient pas d'une relecture de code mais d'une date
   préparée pour de bon, et abandonnée en cours de route parce que
   l'outil gênait plus qu'il n'aidait. Chaque test ci-dessous
   correspond à un moment où il a fallu poser l'iPad. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <div id="v-packs"></div><div id="v-proj"></div>
</body></html>`;

const STUBS = `
  var sb = null, me = {role:'admin'}, toasts = [];
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[],
            repairs:[], providers:[], repairsSupported:true,
            packs:[], packItems:[], packsSupported:true,
            packExtras:[], packExtrasSupported:true,
            needs:[], needsSupported:true,
            linkGroups:[], linkMembers:[], linksSupported:true, projectsError:false};
  function item(id){ return db.items.find(i=>i.id===id); }
  function pack(id){ return db.packs.find(p=>p.id===id); }
  function project(id){ return db.projects.find(p=>p.id===id); }
  function can(){ return true; }
  function toast(m,k){ toasts.push({m,k:k||'info'}); }
  function outForRepair(i){ return !!(i.out && i.out.repairId); }
  function outBy(i){ return i.out ? (i.out.reason||'') : ''; }
  function repairOf(){ return null; }
  function openDetail(){}
  function renderProj(){}
  function renderPackDetail(){}
  function projDestOptions(){ return ''; }
  function locOptions(){ return ''; }
  window.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}});
`;

const DATA = `
  db.locations = [
    {name:'AccessFlow', parent:null, kind:'site', street:'12 rue du Studio',
     zip:'75011', city:'Paris', phone:'+33 1 11 11 11 11'},
    {name:'Studio A', parent:'AccessFlow', kind:'room'},
    {name:'Trianon', parent:null, kind:'offsite', street:'80 Bd de Rochechouart',
     zip:'75009', city:'Paris', phone:'+33 1 23 45 67 89'},
    {name:'Atelier Dupont', parent:null, kind:'offsite', street:'5 rue des Fleurs',
     zip:'93100', city:'Montreuil'}
  ];
  const it = (id,name,extra) => Object.assign(
    {id,name,brand:'',cat:'instruments',subcat:'synthe',cond:'bon',status:'dispo',
     loc:'Studio A',home:'Studio A',price:null,purchase_date:null,owner:'',
     provider:'',serial:'',sales_order:'',notes:'',photo:null,weight_g:1000}, extra||{});
  db.items = [
    it('SYN-001','Juno-106'), it('MCN-001','U87'),
    it('CAS-001','Pelicase'), it('CAS-002','Flightcase')
  ];

  /* Trois caisses : deux dans un dossier, une sans. */
  db.packs = [
    {id:'pk1', name:'SQ5+ Kit',   folder:'LEASH Touring', permanent:false,
     archived:false, container_id:'CAS-001', parent_id:null},
    {id:'pk2', name:'K10 #1',     folder:'LEASH Touring', permanent:false,
     archived:false, container_id:null, parent_id:null},
    {id:'pk3', name:'Rack studio', folder:null, permanent:true,
     archived:false, container_id:'CAS-002', parent_id:null}
  ];
  db.packItems = [{pack_id:'pk1', item_id:'SYN-001'}];

  db.needs = [{id:'n1', item_id:'SYN-001', kind:'power', label:'IEC C13',
               qty:1, weight_g:180, pos:0}];

  db.projects = [{id:'pr1', name:'Trianon show', description:'', status:'preparation',
                  item_ids:['MCN-001'], pack_ids:['pk1'], prep:{}, subs:{},
                  snapshot:null, archived:false, loc_name:'Trianon',
                  return_loc:null, starts_on:'2026-11-12', ends_on:'2026-11-13'}];
`;

const TESTS = `
  var R = [];
  function T(cond, label){ R.push([!!cond, label]); }
  function S(label){ R.push([null, label]); }

  S('1. Les caisses se rangent dans des tiroirs');
  /* Vingt-et-une caisses d'affilée, c'est une liste qu'on fait
     défiler en cherchant un nom qu'on connaît déjà. */
  T(packFolders().join() === 'LEASH Touring', 'les dossiers existants sont listés');
  var h = packTreeHTML();
  T(h.includes('pkfhead'), 'l’arbre porte un en-tête de dossier');
  T(h.includes('LEASH Touring'), 'et il est nommé');
  /* Une caisse sans dossier reste À PLAT, en tête : beaucoup de parcs
     n'en auront jamais, et leur imposer un titre vide serait leur
     faire payer une fonction qu'ils n'utilisent pas. */
  T(h.indexOf('Rack studio') < h.indexOf('pkfhead'),
    'les caisses sans dossier restent en tête, sans en-tête');

  S('2. Un dossier se replie');
  togglePackFolder('LEASH Touring');
  var replié = packTreeHTML();
  T(!replié.includes('SQ5+ Kit'), 'replié, il cache ses caisses');
  T(replié.includes('LEASH Touring'), 'mais garde son titre');
  T(replié.includes('2 case(s)'), 'et son compte — un coup d’œil suffit');
  togglePackFolder('LEASH Touring');
  T(packTreeHTML().includes('SQ5+ Kit'), 'et se rouvre');

  S('3. Une recherche ignore les dossiers');
  /* On cherche justement parce qu'on ne sait pas où c'est rangé. */
  setPackFilter('K10');
  var cherché = packTreeHTML();
  T(cherché.includes('K10 #1'), 'la caisse est trouvée');
  T(!cherché.includes('pkfhead'), 'et l’arbre est aplati');
  setPackFilter('');

  S('4. L’e-mail de livraison, relu sur un quai');
  var body = deliveryMailBody(project('pr1'));
  var lignes = body.split(String.fromCharCode(10));
  /* Gmail et Apple Mail basculent un bloc indenté en chasse fixe :
     le message arrivait avec deux polices sans qu'on sache pourquoi. */
  T(lignes.every(l=>l === l.replace(/^[ \\t]+/, '')),
    'aucune ligne ne commence par une espace');
  T(body.includes('DELIVER TO') && body.includes('RETURN TO'),
    'où ça va, et où ça revient');
  T(body.indexOf('DELIVER TO') < body.indexOf('RETURN TO'),
    'dans cet ordre : on livre avant de ramener');
  T(body.includes('12/11/2026 → 13/11/2026'), 'dates à la française');
  T(!body.includes('2026-11-12') && !body.includes('2026/11/12'),
    'et aucune date au format machine');

  S('5. Par défaut, on ramène au studio');
  T(projReturnLoc(project('pr1')) === 'AccessFlow',
    'le lieu racine fait foi quand rien n’est précisé');
  T(body.includes('12 rue du Studio'), 'et son adresse part dans le mail');
  project('pr1').return_loc = 'Atelier Dupont';
  var body2 = deliveryMailBody(project('pr1'));
  T(projReturnLoc(project('pr1')) === 'Atelier Dupont', 'un choix explicite l’emporte');
  T(body2.includes('5 rue des Fleurs'), 'et c’est son adresse qui part');
  /* Un lieu disparu ne doit pas vider l'adresse en silence : on
     retombe sur le studio, qui est toujours vrai. */
  project('pr1').return_loc = 'Lieu supprimé';
  T(projReturnLoc(project('pr1')) === 'AccessFlow',
    'un lieu qui n’existe plus retombe sur le studio');
  project('pr1').return_loc = null;

  S('6. Les niveaux se lisent sans retrait');
  /* Un titre est en capitales et souligné : la hiérarchie passe par
     la nature de la ligne, jamais par un retrait. */
  T(body.includes('SQ5+ KIT'), 'chaque caisse est un titre');
  T(body.includes('─'), 'souligné, pour tenir même si le client recompose tout');
  T(body.includes('- Juno-106 [SYN-001]'), 'son contenu est une liste à tirets');
  T(body.includes('Power supplies :'), 'ses alimentations ont leur intitulé');
  T(body.includes('- IEC C13 x1'), 'et leur propre ligne');

  S('7. L’écran de composition : la source reste à l’écran');
  /* La colonne de droite grandit avec le projet ; en défilant pour
     atteindre la quatrième caisse, on perdait les onglets et la
     recherche — donc la possibilité de glisser quoi que ce soit. */
  T(read_css.includes('.pjcol.src{position:sticky'),
    'la colonne source colle en haut');
  T(read_css.includes('max-height:calc(100vh - 24px)'),
    'et sa hauteur suit l’écran, pas une part arbitraire de la page');

  S('8. Les caisses se plient dans la composition');
  T(read_proj.includes('pjCaseShut'), 'chaque caisse se replie');
  T(read_css.includes('.pjgrp.shut>.bd{display:none}'), 'sur son seul titre');
  /* Repliée, elle doit rester une cible de dépôt : c'est .pjgrp qui
     porte data-pjcase, pas son contenu. Sinon replier reviendrait à
     s'interdire d'y ranger quoi que ce soit. */
  T(read_proj.includes('shut') && read_proj.includes('data-pjcase=') &&
    read_proj.indexOf('data-pjcase=') > read_proj.indexOf('pjgrp$'),
    'et reste une cible de dépôt : c’est .pjgrp qui la porte, pas son contenu');
  T(read_proj.includes('pjFoldAll'), 'tout plier d’un geste, avec huit caisses');

  S('9. Plus de vignette vide sur les lignes sans fiche');
  /* La règle existait pour les consommables et ne connaissait pas
     les alimentations dérivées de la v2.2 : elles réservaient la
     place d'une image qui n'arriverait jamais. */
  T(read_proj.includes('const sansFiche = l.extra || l.besoin;'),
    'une ligne dérivée est traitée comme un consommable');
  T(!read_proj.includes('const vignette = l.extra ?'),
    'l’ancienne règle, qui ne voyait que les consommables, a disparu');

  S('10. La base');
  T(read_sql.includes('add column if not exists folder'), 'packs.folder existe');
  T(read_sql.includes('packs_folder_chk'), 'et refuse un nom aberrant');
  T(read_sql.includes("btrim(folder) = ''"),
    'une chaîne vide n’est pas un dossier : c’est l’absence de dossier');
  T(read_sql.includes('add column if not exists return_loc'), 'projects.return_loc aussi');

  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'),
                read('js/views-packs.js'), read('js/views-projects.js'),
                'var read_css  = ' + JSON.stringify(read('css/styles.css')) + ';',
                'var read_proj = ' + JSON.stringify(read('js/views-projects.js')) + ';',
                'var read_sql  = ' + JSON.stringify(read('sql/032-dossiers-et-retour.sql')) + ';',
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
