/* Harnais v2.7.0 — trois niveaux de matériel.

   Le pari : un XLR 3 m n'est pas au même rang qu'un Minimoog. On en
   possède quarante, personne ne tient à jour quarante fiches, la
   donnée dérive, et la checklist cesse d'être crue — c'est ce qui a
   fait partir une date sans liste fiable.

   Ce qu'il faut prouver ici n'est pas que l'écran est joli : c'est
   que « × 12 » devient un FAIT, parce que l'application sait ce
   qu'on possède, ce qui est hors service et ce qui reste libre. */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const html = `<!DOCTYPE html><html><body>
  <div id="v-acc"></div><div id="v-cons"></div><div id="v-proj"></div>
  <div class="overlay" id="ovSupply"><h3 id="supTitle"></h3><div id="supBody"></div></div>
  <div class="overlay" id="ovConvert"><div id="cvBody"></div></div>
</body></html>`;

const STUBS = `
  var sb = null, me = {role:'admin'}, toasts = [];
  var db = {items:[], users:[], locations:[], history:[], projects:[], trash:[], archived:[],
            repairs:[], providers:[], repairsSupported:true,
            packs:[], packItems:[], packsSupported:true,
            packFolders:[], foldersSupported:true,
            supplies:[], supplyLines:[], suppliesSupported:true,
            needs:[], needsSupported:true,
            linkGroups:[], linkMembers:[], linksSupported:true, projectsError:false};
  function item(id){ return db.items.find(i=>i.id===id) || db.archived.find(i=>i.id===id); }
  function pack(id){ return db.packs.find(p=>p.id===id); }
  function project(id){ return db.projects.find(p=>p.id===id); }
  function can(){ return true; }
  function toast(m,k){ toasts.push({m,k:k||'info'}); }
  function repairOf(){ return null; }
  function outForRepair(i){ return !!(i.out && i.out.repairId); }
  function outBy(i){ return i.out ? (i.out.reason||'') : ''; }
  function locLabel(n){ return n||''; }
  function locOptions(){ return ''; }
  function openDetail(){}
  function render(){}
  function renderProj(){}
  function renderPackDetail(){}
  function open_(){}
  function close_(){}
  function packPhoto(){ return null; }
  window.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}});
`;

const DATA = `
  db.locations = [{name:'AccessFlow',parent:null},{name:'Studio A',parent:'AccessFlow'}];
  const it = (id,name,extra) => Object.assign(
    {id,name,brand:'Cordial',cat:'cablage',subcat:'xlr',cond:'bon',status:'dispo',
     loc:'Studio A',home:'Studio A',price:42,purchase_date:null,owner:'',provider:'',
     serial:'',sales_order:'',notes:'',photo:null,weight_g:200,archived:false}, extra||{});

  /* Quatre XLR du même modèle : de quoi compter. Deux TS d'un autre
     modèle : pas assez, c'est un choix et non un bac. */
  db.items = [
    it('XLR-001','XLR 3m #1'), it('XLR-002','XLR 3m #2'),
    it('XLR-003','XLR 3m #3'), it('XLR-004','XLR 3m #4'),
    it('TS-001','TS 7m #1', {subcat:'ts'}), it('TS-002','TS 7m #2', {subcat:'ts'}),
    it('CAS-001','Pelicase', {subcat:'flightcase', cat:'supports', weight_g:6000, brand:''}),
    it('MIN-001','Minimoog', {subcat:'synthe', cat:'instruments', weight_g:14000, brand:'Moog'})
  ];

  db.packs = [{id:'pk1', name:'Malle câbles', permanent:false, archived:false,
               container_id:'CAS-001', parent_id:null, folder_id:null}];
  db.packItems = [{pack_id:'pk1', item_id:'XLR-001'}, {pack_id:'pk1', item_id:'XLR-002'}];

  db.supplies = [
    {id:'s1', kind:'accessory',  name:'IEC C13', brand:'', qty_total:40, qty_hs:1,
     weight_g:180, min_qty:null, archived:false, notes:''},
    {id:'s2', kind:'consumable', name:'Gaffer noir', brand:'', qty_total:4, qty_hs:0,
     weight_g:null, min_qty:6, archived:false, notes:''}
  ];
  db.supplyLines = [
    {id:'l1', supply_id:'s1', pack_id:'pk1', qty:12, spare:false, pos:0},
    {id:'l2', supply_id:'s1', pack_id:'pk1', qty:4,  spare:true,  pos:1},
    {id:'l3', supply_id:'s2', pack_id:'pk1', qty:2,  spare:false, pos:2}
  ];
`;

const TESTS = `
  var R = [];
  function T(cond, label){ R.push([!!cond, label]); }
  function S(label){ R.push([null, label]); }

  S('1. Trois niveaux, et ce qui les sépare');
  T(suppliesOfKind('accessory').length === 1 && suppliesOfKind('consumable').length === 1,
    'accessoires et consommables cohabitent dans la même table');
  T(supply('s1').kind === 'accessory' && supply('s2').kind === 'consumable',
    'ils ne diffèrent que par le retour');
  /* Les séparer en deux tables aurait donné deux fois le même écran
     à maintenir — et c'est ainsi qu'ils divergent. */
  T(/kind in \\('accessory','consumable'\\)/.test(read_sql),
    'une seule table, une contrainte qui dit laquelle est laquelle');

  S('2. « × 12 » n’est un fait que grâce aux chiffres');
  T(supplyUsable(supply('s1')) === 39, '40 possédés moins 1 hors service = 39 utilisables');
  T(supplyCommitted('s1') === 16, 'les caisses en réclament 16 (12 + 4 de rab)');
  T(supplyOut('s1') === 0, 'rien n’est dehors tant que la caisse est au studio');
  T(supplyFree(supply('s1')) === 39, 'donc 39 sont libres au studio');
  T(supplyShort(supply('s1')) === 0, 'et il n’en manque aucun');

  S('3. Ce qui part réellement');
  item('CAS-001').status = 'sorti';
  item('CAS-001').out = {userId:'u1', date:'2026-11-10', reason:'Trianon', due:null};
  item('XLR-001').status = 'sorti';
  item('XLR-001').out = {userId:'u1', date:'2026-11-10', reason:'Trianon', due:null};
  item('XLR-002').status = 'sorti';
  item('XLR-002').out = {userId:'u1', date:'2026-11-10', reason:'Trianon', due:null};
  T(supplyOut('s1') === 16, 'caisse sortie : ses 16 câbles sont dehors');
  T(supplyFree(supply('s1')) === 23, 'il en reste 23 d’utilisables au studio');
  item('CAS-001').status = 'dispo'; delete item('CAS-001').out;
  item('XLR-001').status = 'dispo'; delete item('XLR-001').out;
  item('XLR-002').status = 'dispo'; delete item('XLR-002').out;

  S('4. Un manque se voit à la préparation, pas sur le quai');
  supply('s1').qty_total = 10;
  T(supplyShort(supply('s1')) === 7,
    '10 possédés, 1 HS, 16 réclamés : il en manque 7');
  supply('s1').qty_total = 40;
  T(supplyLow(supply('s2')), 'et un consommable sous son seuil se signale');
  T(!supplyLow(supply('s1')), 'sans seuil, rien ne se déclenche');

  S('5. Hors service n’est pas disparu');
  /* Décrémenter ferait baisser la valeur du parc alors que l'objet
     est encore là, et effacerait la trace de ce qu'il y a à réparer. */
  T(supply('s1').qty_total === 40 && supply('s1').qty_hs === 1,
    'les deux chiffres coexistent');
  T(/qty_hs >= 0 and qty_hs <= qty_total/.test(read_sql),
    'et la base refuse plus de casse que de matériel');

  S('6. La dotation d’une caisse se lit en trois sections');
  var secs = supplySections(supplyLinesOf('pk1'));
  T(secs.map(x=>x.cle).join() === 'accessory,spare,consumable',
    'accessoires, rab, consommables — dans l’ordre où l’on charge');
  T(secs[1].lignes.length === 1 && secs[1].lignes[0].qty === 4,
    'le rab est une ligne comme une autre, sous son propre titre');
  /* Un « spare » n'est pas un concept : c'est une case qui ne change
     que le sous-titre. */
  T(/spare      boolean not null default false/.test(read_sql),
    'une case sur la ligne, pas une seconde mécanique');
  T(/supply_lines_uniq/.test(read_sql),
    'et la même fourniture ne peut pas figurer deux fois dans le même rôle');

  S('7. Une dotation pesée compte dans le transport');
  T(supplyLinesWeight(supplyLinesOf('pk1')) === 180 * 16,
    '16 câbles à 180 g : 2,88 kg');
  T(supplyLinesWeight([{supply:{weight_g:null}, qty:99}]) === 0,
    'une fourniture sans poids n’ajoute rien — un total incomplet vaut mieux qu’un total inventé');

  S('8. La bascule ne propose que ce qu’il y a à compter');
  var c = convertCandidats();
  var xlr = c.find(g=>g.modele === 'XLR 3m');
  var ts  = c.find(g=>g.modele === 'TS 7m');
  T(!!xlr && xlr.n === 4, 'les quatre XLR du même modèle sont candidats');
  T(!!ts && ts.n === 2, 'les deux TS aussi, mais avec deux exemplaires seulement');
  T(!c.some(g=>g.modele === 'Pelicase'),
    'le contenant d’une caisse est écarté d’office : il doit garder sa fiche');
  T(!c.some(g=>g.modele === 'Minimoog'), 'et un exemplaire unique n’est pas du stock');
  openConvert();
  T(convertChoix.has(xlr.cle), 'XLR coché d’office — trois exemplaires ou plus');
  T(!convertChoix.has(ts.cle), 'TS décoché — deux, c’est un choix, pas un bac');
  T(xlr.dansPacks === 2, 'et l’écran sait que deux d’entre eux vivent dans une caisse');

  S('9. Ce que la bascule promet');
  var vs = read_sup;
  T(vs.includes('apiArchiveItemsIn'),
    'les items sont archivés, pas supprimés');
  T(vs.includes('apiInsertSupplyLine') && vs.includes('apiRemovePackItems'),
    'et les caisses qui les contenaient reçoivent la dotation correspondante');
  T(vs.includes('declare needs') || vs.includes('declarations stay'),
    'les besoins déclarés sont annoncés, pas jetés en silence');
  T(/Archived — converted into the counted accessory/.test(vs),
    'et l’historique de chaque item dit ce qui lui est arrivé');

  S('10. Archivé n’est pas la corbeille');
  /* La corbeille marque « expiré » au bout de trente jours : cent
     soixante-dix câbles y deviendraient un bruit permanent. */
  db.archived.push({id:'ZZZ-001', name:'Ancien câble', archived:true});
  T(!!item('ZZZ-001'), 'un item archivé reste retrouvable — sinon on trouerait le passé');
  T(!db.items.some(i=>i.id === 'ZZZ-001'), 'mais il ne figure plus dans le parc courant');
  T(/items_archived_idx/.test(read_sql) && /distinct de la corbeille|Distinct de la corbeille/.test(read_sql),
    'et la base distingue les deux');

  S('11. Les écrans');
  renderSupplies('accessory');
  var h = document.getElementById('v-acc').innerHTML;
  T(h.includes('Owned') && h.includes('Free'),
    'le tableau porte les chiffres qui font tout l’intérêt');
  T(h.includes('Convert items…'), 'et l’accès à la bascule');
  renderSupplies('consumable');
  T(document.getElementById('v-cons').innerHTML.includes('Below threshold'),
    'les consommables ont leur alerte de réapprovisionnement');
  T(read_html.includes('data-v="acc"') && read_html.includes('data-v="cons"'),
    'deux entrées de rail : on les consulte en préparant, pas en fouillant');

  S('12. La reprise des consommables de la v1.22');
  T(/insert into public\\.supplies \\(kind, name, notes\\)/.test(read_sql),
    'chaque libellé distinct devient une ligne');
  T(/drop table public\\.pack_extras/.test(read_sql),
    'et l’ancienne table part : deux mécanismes concurrents, c’est la v1.20');
  T(/Stock à renseigner/.test(read_sql),
    'le stock part à zéro plutôt qu’inventé');
  T(read_app.includes('anciensExtras'),
    'une sauvegarde antérieure se relit, convertie à la lecture');

  S('13. Une liste longue ne remonte pas à chaque clic');
  /* Soixante-trois modèles à arbitrer : si la liste repart de son
     sommet à chaque case cochée, on renonce au trentième. Même
     défaut et même remède qu'au menu des filtres en v2.1.2. */
  T(vs.includes("document.querySelector('#cvBody .cvlist')"),
    'la position de défilement est relevée avant le rendu');
  T(vs.includes('liste.scrollTop = top0'), 'et remise après');

  window.__results = R;
`;

const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
const script = [STUBS, read('js/config.js'), read('js/helpers.js'),
                read('js/views-supplies.js'),
                'var read_sql  = ' + JSON.stringify(read('sql/034-accessoires-consommables.sql')) + ';',
                'var read_sup  = ' + JSON.stringify(read('js/views-supplies.js')) + ';',
                'var read_app  = ' + JSON.stringify(read('js/app.js')) + ';',
                'var read_html = ' + JSON.stringify(read('index.html')) + ';',
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
