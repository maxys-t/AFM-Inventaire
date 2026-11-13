/* Harnais v2.9.3 — plus de trou de photo dans l'inventaire.
 *
 * Trois exemplaires du même MacBook Pro, un seul rephotographié sous
 * un autre angle : l'en-tête de groupe exigeait l'unanimité des
 * photos et restait donc vide. Et un exemplaire pas encore
 * photographié laissait une case blanche à côté de son jumeau.
 *
 * La règle retenue : dans une famille « … #1, #2, #3 », n'importe
 * laquelle des photos décrit le modèle — on l'emprunte.
 *
 * La contrepartie à ne jamais perdre : le TRI et le FILTRE « photo »
 * doivent continuer à dire la vérité, sinon on ne sait plus ce qui
 * reste à photographier.
 */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const STUBS = `
  var db={items:[],users:[],locations:[],history:[],projects:[],trash:[],
          repairs:[],providers:[],packs:[],packItems:[],
          supplies:[],supplyLines:[],archived:[]};
  function item(id){ return db.items.find(i=>i.id===id); }
  function toast(){} function can(){ return true; }
  window.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
`;

const DATA = `
  var mk=(id,name,photo)=>({id,name,brand:'Apple',cat:'informatique',
    subcat:'ordinateur',cond:'bon',status:'dispo',loc:'AccessFlow',
    home:'AccessFlow',photo:photo||null,out:null,weight_g:null});
  db.items=[
    mk('CPU-004','Apple MacBook Pro #1','https://x/items/CPU-004.jpg'),
    mk('CPU-005','Apple MacBook Pro #2','https://x/items/CPU-004.jpg'),
    mk('CPU-015','Apple MacBook Pro #3','https://x/items/CPU-015.jpg'),
    mk('CPU-020','Apple MacBook Air #1', null),
    mk('CPU-021','Apple MacBook Air #2','https://x/items/CPU-021.jpg'),
    mk('CPU-030','Mac Mini', null),
    mk('CPU-031','Mac Studio','https://x/items/CPU-031.jpg')
  ];
  var famille = n => db.items.filter(i=>groupKeyOf(i.name)===n);
`;

const TESTS = `
  var R=[]; function T(c,l){R.push([!!c,l]);} function S(l){R.push([null,l]);}

  S('1. L’en-tête d’un groupe montre toujours une photo');
  var mbp = famille('Apple MacBook Pro');
  T(mbp.length === 3, 'trois MacBook Pro dans la famille');
  T(groupPhoto(mbp) === 'https://x/items/CPU-004.jpg',
    'même si le #3 a été rephotographié, l’en-tête en montre une');
  T(groupPhoto(famille('Apple MacBook Air')) === 'https://x/items/CPU-021.jpg',
    'et il suffit d’un seul exemplaire photographié');
  T(groupPhoto([]) === '' && groupPhoto(null) === '',
    'sans aucune photo, on rend vide plutôt que de planter');

  S('2. Un exemplaire sans photo emprunte celle d’un frère');
  T(photoShown(item('CPU-020')) === 'https://x/items/CPU-021.jpg',
    'le MacBook Air #1 montre la photo du #2');
  T(photoShown(item('CPU-021')) === 'https://x/items/CPU-021.jpg',
    'et celui qui en a une garde la sienne');
  T(photoShown(item('CPU-015')) === 'https://x/items/CPU-015.jpg',
    'le #3 n’est pas écrasé par celle de ses frères');

  S('3. Le choix du frère est déterministe');
  /* Sinon la vignette changerait d’un affichage à l’autre — un
     scintillement que personne ne saurait expliquer. */
  db.items.push({...item('CPU-021'), id:'CPU-009',
                 photo:'https://x/items/CPU-009.jpg'});
  T(photoShown(item('CPU-020')) === 'https://x/items/CPU-009.jpg',
    'c’est le plus petit identifiant qui l’emporte');
  db.items = db.items.filter(i=>i.id !== 'CPU-009');

  S('4. Un objet unique n’emprunte rien');
  T(photoShown(item('CPU-030')) === '',
    'le Mac Mini n’appartient à aucune famille : sa case reste vide');
  T(photoShown(null) === '', 'et rien ne plante sur un item absent');

  window.__results = R;
`;

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>',
  {runScripts:'dangerously', url:'https://inventory.accessflow.fr/'});
dom.window.eval([STUBS, read('js/config.js'), read('js/helpers.js'),
                 DATA, TESTS].join('\n;\n'));

const R = dom.window.__results || [];

R.push([null,'5. Le tri et le filtre, eux, disent toujours la vérité']);
/* C'est la contrepartie de l'emprunt : l'affichage comble le trou,
   la donnée le signale. Si ces deux-là se mettaient à lire
   photoShown, la liste « No photo » deviendrait vide et plus
   personne ne saurait ce qui reste à faire. */
const inv = read('js/views-inventory.js');
const occ = (inv.match(/i\.photo \? 'With photo' : 'No photo'/g)||[]).length;
R.push([occ >= 2, `le libellé « No photo » lit i.photo (${occ} endroits)`]);
R.push([/case 'photo':\s*return i\.photo \? 0 : 1;/.test(inv),
        'et le tri aussi']);

R.push([null,'6. Les quatre endroits qui dessinent une vignette ont changé']);
R.push([/const ph = photoShown\(i\)/.test(inv), 'la cellule d’un item']);
R.push([/const ph = groupPhoto\(items\)/.test(inv), 'la cellule d’un groupe']);
R.push([/prefs\.mobilePhoto \? \(photoShown\(i\)/.test(inv), 'la carte mobile']);
R.push([/const photo  = groupPhoto\(items\)/.test(inv), 'la carte mobile de groupe']);
R.push([!/photos\.length===1 && photos\[0\]/.test(inv) &&
        !/ph\.length===1 && ph\[0\]/.test(inv),
        'et l’ancienne règle de l’unanimité a disparu']);

let fails=0;
for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
  else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
process.exit(fails?1:0);
