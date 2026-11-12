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
  function renderPacks(){}
  function refresh(){ return Promise.resolve(); }
  function packPhoto(){ return null; }
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

  /* Un dossier, deux caisses dedans, une à la racine — plus un
     dossier VIDE, que seule une table sait porter. */
  db.packFolders = [
    {id:'f1', name:'LEASH Touring', pos:0},
    {id:'f2', name:'Studio',        pos:1}
  ];
  db.packs = [
    {id:'pk1', name:'SQ5+ Kit',   folder_id:'f1', permanent:false,
     archived:false, container_id:'CAS-001', parent_id:null},
    {id:'pk2', name:'K10 #1',     folder_id:'f1', permanent:false,
     archived:false, container_id:null, parent_id:null},
    {id:'pk3', name:'Rack studio', folder_id:null, permanent:true,
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

  S('1. Un dossier existe par lui-même, même vide');
  /* C'est ce qui a imposé une table plutôt qu'une colonne texte :
     on crée le tiroir AVANT d'y glisser quoi que ce soit. */
  T(packFolders().map(f=>f.name).join() === 'LEASH Touring,Studio',
    'les dossiers suivent leur ordre, pas l’alphabet');
  var h = packTreeHTML();
  T(h.includes('>Studio<'), 'un dossier vide s’affiche quand même');
  T(h.includes('Empty — drag a case here'),
    'et dit quoi en faire plutôt que de rester muet');

  S('2. Les caisses s’y rangent, et le dossier se replie');
  T(h.includes('data-drop="folder:f1"'), 'chaque dossier est une zone de dépôt');
  T(h.includes('data-drop="folder:__none"'),
    'et la racine aussi : c’est ainsi qu’on ressort une caisse, sans bouton dédié');
  togglePackFolder('f1');
  var replié = packTreeHTML();
  T(!replié.includes('SQ5+ Kit'), 'replié, il cache ses caisses');
  T(replié.includes('LEASH Touring'), 'mais garde son titre');
  T(replié.includes('2 case(s)'), 'et son compte — un coup d’œil suffit');
  togglePackFolder('f1');
  T(packTreeHTML().includes('SQ5+ Kit'), 'et se rouvre');

  S('2bis. Sans dossier, aucun niveau de hiérarchie');
  /* Un parc qui n'utilise pas la fonction ne doit pas en payer le
     titre. */
  var vrais = db.packFolders; db.packFolders = [];
  var plat = packTreeHTML();
  T(!plat.includes('pkfhead') && !plat.includes('Not in a folder'),
    'la liste reste à plat tant qu’aucun dossier n’existe');
  db.packFolders = vrais;

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

  S('10. Glisser une caisse dans un tiroir');
  /* Le même glissement que pour emboîter deux caisses, avec une
     autre destination : un seul endroit où le défilement
     automatique, l'appui long et le fantôme sont réglés. */
  var vp = read_packs;
  T(vp.includes("cible.startsWith('folder:')"),
    'la dépose distingue un dossier d’une caisse au préfixe');
  T(vp.includes("const ok = drag.type === 'pack';"),
    'seule une caisse se range dans un dossier');
  T(vp.includes('only a case goes in a folder'),
    'et un item s’en voit refuser l’entrée PENDANT le survol, pas après la dépose');
  T(vp.includes('packSetFolder'), 'la dépose enregistre le rangement');
  T(vp.includes("'Undo'"), 'et il s’annule : un glissement est un geste qu’on fait vite');

  S('10bis. Les actions ne dépendent plus du survol');
  /* Les boutons du dossier étaient en opacity:0, révélés au :hover.
     Sur un iPad il n'y a pas de survol : ils étaient invisibles et
     inatteignables, et supprimer un dossier impossible depuis la
     cible principale de l'application. */
  T(!/\.pkfhead:hover \.pkfacts/.test(read_css2),
    'plus de bouton révélé au survol');
  T(read_packs.includes('packFolderMenu'),
    'un bouton permanent ouvre un menu — atteignable au doigt');
  T(read_packs.includes('oncontextmenu="packContextMenu'),
    'et le clic droit mène au même endroit, comme dans un gestionnaire de fichiers');

  S('10ter. Sélectionner plusieurs caisses, puis les ranger');
  T(read_packs.includes('packSel') && read_packs.includes('packSelToggle'),
    'les caisses se cochent');
  T(read_packs.includes('function packSetFolderMany'),
    'et se rangent toutes d’un geste');
  T(read_packs.includes('function packNewFolderWith'),
    'y compris dans un dossier créé au passage — on sélectionne d’abord, on range ensuite');
  T(read_packs.includes("packSel.has(packId) ? [...packSel] : [packId]"),
    'un clic droit hors sélection agit sur la seule ligne visée : la convention qui ne surprend jamais');

  S('11. Supprimer un tiroir ne jette pas ce qu’il y a dedans');
  T(vp.includes('move back to the top of the list — nothing is deleted'),
    'la confirmation le dit');
  T(read_sql.includes('on delete set null'),
    'et la base le garantit, même si quelqu’un supprime la ligne autrement');

  S('12. La base');
  T(read_sql.includes('create table if not exists public.pack_folders'),
    'une table de dossiers, parce qu’un dossier se crée vide');
  T(read_sql.includes('pack_folders_nom_uniq'),
    'deux tiroirs du même nom seraient indiscernables');
  T(read_sql.includes('add column if not exists folder_id'), 'packs.folder_id existe');
  T(read_sql.includes("column_name='folder'"),
    'et la colonne texte d’une version antérieure est reprise puis retirée');
  T(read_sql.includes('add column if not exists return_loc'), 'projects.return_loc aussi');

  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'),
                read('js/views-packs.js'), read('js/views-projects.js'),
                'var read_css  = ' + JSON.stringify(read('css/styles.css')) + ';',
                'var read_proj = ' + JSON.stringify(read('js/views-projects.js')) + ';',
                'var read_sql  = ' + JSON.stringify(read('sql/032-dossiers-et-retour.sql')) + ';',
                'var read_packs = ' + JSON.stringify(read('js/views-packs.js')) + ';',
                'var read_css2 = ' + JSON.stringify(read('css/styles.css')) + ';',
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
