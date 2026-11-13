/* Harnais v2.10 — deux dates qui veulent le même objet.
 *
 * `projBusy()` ne regarde que le présent : un item est occupé s'il
 * est DÉJÀ sorti. Les dates d'un projet ne servaient qu'à
 * l'affichage. Deux dates sur le même week-end pouvaient donc toutes
 * les deux prévoir le U87, et on ne le découvrait qu'au matin du
 * chargement.
 *
 * Ce harnais tient surtout les CAS LIMITES, parce que c'est là qu'un
 * détecteur de conflits devient soit aveugle, soit insupportable :
 * un projet sans dates ne réserve rien, une date passée n'intéresse
 * personne, et un item apporté par une caisse compte autant qu'un
 * item posé à la main.
 */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const STUBS = `
  var db={items:[],users:[],locations:[],history:[],projects:[],trash:[],
          repairs:[],providers:[],packs:[],packItems:[],
          supplies:[],supplyLines:[],archived:[],
          linkGroups:[],linkMembers:[],itemNeeds:[]};
  function item(id){ return db.items.find(i=>i.id===id); }
  function pack(id){ return db.packs.find(k=>k.id===id); }
  function project(id){ return db.projects.find(p=>p.id===id); }
  function toast(){} function can(){ return true; }
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
`;

/* Des dates calculées par rapport à aujourd'hui : un harnais qui
   écrit « 2026-11-20 » en dur passe au vert jusqu'au 20 puis
   ment pour toujours. */
const J = n => { const d=new Date(); d.setDate(d.getDate()+n);
  return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10); };

const DATA = `
  var mk=(id,name)=>({id,name,brand:'',cat:'captation',subcat:'condensateur',
    cond:'bon',status:'dispo',loc:'Studio',home:'Studio',photo:null,out:null,
    weight_g:1000});
  db.items=[mk('MIC-001','U87'),mk('MIC-002','U47'),mk('MIC-003','SM57'),
            mk('PEL-001','Pelicase'),mk('AMP-700','Amp 700'),mk('ENC-001','Amphion')];
  db.packs=[{id:'k1',name:'Malle micros',container_id:'PEL-001',
             archived:false,permanent:false}];
  db.packItems=[{pack_id:'k1',item_id:'MIC-002'}];

  var pj=(id,name,from,to,items,packs,statut)=>({id,name,
    status:statut||'inactif', archived:false,
    starts_on:from, ends_on:to, item_ids:items||[], pack_ids:packs||[],
    prep:{}, snapshot:null, subs:{}, loc_name:'', last_used:null});

  db.projects=[
    pj('A','Trianon',    '${J(10)}','${J(11)}',['MIC-001'],['k1']),
    pj('B','Olympia',    '${J(11)}','${J(12)}',['MIC-001'],[]),
    pj('C','Zénith',     '${J(30)}','${J(31)}',['MIC-001'],[]),
    pj('D','Travel Kit', null,      null,      ['MIC-001'],[]),
    pj('E','Vieille date','${J(-30)}','${J(-29)}',['MIC-001'],[]),
    pj('F','Archivé',    '${J(10)}','${J(11)}',['MIC-003'],[])
  ];
  project('F').archived = true;
`;

const TESTS = `
  var R=[]; function T(c,l){R.push([!!c,l]);} function S(l){R.push([null,l]);}
  var A=project('A'), B=project('B'), C=project('C'),
      D=project('D'), E=project('E');

  S('1. Le chevauchement, bornes comprises');
  T(rangesOverlap({from:'2026-01-01',to:'2026-01-03'},
                  {from:'2026-01-03',to:'2026-01-05'}),
    'un seul jour commun suffit — c’est le jour où les deux camions partent');
  T(!rangesOverlap({from:'2026-01-01',to:'2026-01-02'},
                   {from:'2026-01-03',to:'2026-01-04'}),
    'deux jours qui se suivent ne se chevauchent pas');
  T(!rangesOverlap(null, {from:'2026-01-01',to:'2026-01-02'}),
    'et une plage absente ne chevauche rien');

  S('2. Un projet sans dates ne réserve rien');
  /* Ce n’est pas un trou : « Travel Kit » est un modèle qu’on
     recopie, il décrit un contenu, il ne prend pas de date. */
  T(projRange(D) === null, 'Travel Kit n’a pas de plage');
  T(projConflicts(D).size === 0, 'il ne voit aucun conflit…');
  T(!projConflicts(A).has('MIC-001') ||
    !projConflicts(A).get('MIC-001').some(x=>x.name==='Travel Kit'),
    '…et n’en provoque aucun');

  S('3. Deux dates qui se chevauchent se voient');
  var cA = projConflicts(A);
  T(cA.has('MIC-001'), 'le U87 est signalé dans Trianon');
  T(cA.get('MIC-001').some(x=>x.name === 'Olympia'),
    'et l’app nomme le coupable : Olympia');
  T(/Olympia/.test(conflictText(cA.get('MIC-001'))),
    'la phrase affichée le nomme aussi');
  T(/→|\\d/.test(conflictText(cA.get('MIC-001'))),
    'avec ses dates — sans elles on ne sait pas s’il faut s’inquiéter');

  S('4. Ce qui ne doit PAS alerter');
  T(!projConflicts(C).has('MIC-001'),
    'Zénith, trois semaines plus tard, n’est en conflit avec personne');
  T(!cA.get('MIC-001').some(x=>x.name === 'Vieille date'),
    'une date passée n’intéresse plus personne');
  T(!cA.has('MIC-003'),
    'et un projet archivé ne réserve plus rien');

  S('5. Une date passée mais encore en show, si');
  /* Le matériel est dehors, retard ou pas : c’est le cas où se taire
     serait le plus coûteux. */
  E.status = 'show';
  T(projConflicts(A).get('MIC-001').some(x=>x.name === 'Vieille date'),
    'un projet en retard de retour reste un conflit');
  E.status = 'inactif';

  S('6. Un item apporté par une caisse compte autant');
  /* C’est tout l’intérêt de passer par projContent() : on hérite du
     contenu des caisses, du contenant lui-même, des lots et des
     substitutions. Sans ça, on n’aurait détecté que les items
     posés à la main — la moitié du problème. */
  B.item_ids = ['MIC-002'];
  var cB = projConflicts(B);
  T(cB.has('MIC-002'), 'le U47, qui voyage dans la Malle micros de Trianon, est vu');
  T(cB.has('PEL-001'), 'et la Pelicase elle-même, qui est le contenant');
  B.item_ids = ['MIC-001'];

  S('7. Le même objet pris par deux autres dates');
  C.starts_on = '${J(10)}'; C.ends_on = '${J(11)}';
  var l = projConflicts(A).get('MIC-001');
  T(l.length === 2, 'les deux sont listés, pas seulement le premier');
  T(/Olympia/.test(conflictText(l)) && /Zénith/.test(conflictText(l)),
    'et la phrase les nomme tous les deux');

  window.__results = R;
`;

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>',
  {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
dom.window.eval([STUBS, read('js/config.js'), read('js/helpers.js'),
                 DATA, TESTS].join('\n;\n'));

const R = dom.window.__results || [];

R.push([null,'8. La composition le montre, et ne l’impose pas']);
const vp = read('js/views-projects.js');
R.push([/const clash = projConflicts\(p\)/.test(vp),
        'calculé une fois par affichage, pas une fois par ligne']);
R.push([/class="pjclash"/.test(vp), 'un bandeau en haut de la composition']);
R.push([/clash\.has\(i\.id\)\?' clash':''/.test(vp),
        'et chaque ligne concernée se signale']);
/* La règle de la maison depuis la v1.22 : on signale, on n'empêche
   pas. Un item abîmé part quand même, celui qui charge décide. Un
   conflit de dates ne doit pas être plus autoritaire. */
R.push([!/disabled[^>]*clash|clash[^>]*disabled/.test(vp),
        'rien n’est désactivé : on signale, on n’empêche pas']);
R.push([/Nothing is blocked/.test(vp), 'et le bandeau le dit explicitement']);
R.push([/No dates on this project/.test(vp),
        'sans dates, l’app explique pourquoi elle se tait']);
const css = read('css/styles.css');
R.push([/\.pjrow\.clash\{/.test(css) && /\.pjclash\{/.test(css),
        'les styles existent']);
R.push([!/\.pjrow\.clash\{[^}]*opacity/.test(css),
        'et la ligne n’est pas grisée — elle n’a pas été écartée']);

let fails=0;
for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
  else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
process.exit(fails?1:0);
