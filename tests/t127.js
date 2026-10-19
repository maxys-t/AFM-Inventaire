/* Harnais v1.27 — la feuille de style.

   Celui-ci ne charge rien : il lit le CSS et vérifie deux invariants
   dont dépend tout le reste de l'apparence. Il n'a pas besoin d'un
   navigateur pour ça, et c'est tant mieux — ces deux-là sont
   exactement ce qu'un œil ne voit pas. */
const fs = require('fs');
const path = require('path');
const SRC = process.argv[2] || path.join(__dirname, '..');
const css = fs.readFileSync(path.join(SRC, 'css/styles.css'), 'utf8');

const R = [];
const T = (c, l) => R.push([!!c, l]);
const S = l => R.push([null, l]);

/* Les blocs de palette — il y en a un par thème depuis la v2.0 — et
   tout le reste. L'invariant n'est pas « une seule palette » mais
   « aucune couleur en dehors d'une palette » : c'est ce qui rend un
   thème possible, et un troisième thème aussi facile que le second. */
const PALETTES = [/:root\{/g, /html\[data-theme="[a-z]+"\]\{/g];
let root = '', corps = css;
PALETTES.forEach(re=>{
  for(const m of css.matchAll(re)){
    const d = m.index, f = css.indexOf('\n}', d);
    root += css.slice(d, f);
    corps = corps.replace(css.slice(d, f + 2), '');
  }
});

S('1. Toutes les couleurs vivent dans la palette');
/* C'est la condition d'un thème clair : une seule couleur écrite
   ailleurs resterait sombre, et donnerait un mode clair à moitié
   noir. Quatre-vingt-neuf littéraux traînaient avant la v1.27. */
const litteraux = corps.match(/rgba?\([0-9 ,.]+\)|#[0-9a-fA-F]{3,8}\b/g) || [];
T(litteraux.length === 0,
  `aucune couleur écrite hors de :root (trouvé : ${litteraux.slice(0,6).join(', ') || 'aucune'})`);

S('2. La palette définit tout ce que la feuille emploie');
const definies = new Set([...root.matchAll(/--([\w-]+)\s*:/g)].map(m => m[1]));
const employees = new Set([...css.matchAll(/var\(--([\w-]+)\)/g)].map(m => m[1]));
const manquantes = [...employees].filter(v => !definies.has(v));
T(manquantes.length === 0,
  `aucune variable employée sans être définie (${manquantes.join(', ') || 'aucune'})`);
const inutiles = [...definies].filter(v => !employees.has(v));
T(inutiles.length === 0,
  `aucune variable définie pour rien (${inutiles.join(', ') || 'aucune'})`);

S('3. Chaque thème définit exactement les mêmes variables');
/* Un thème auquel il manque une variable laisse l'autre thème
   transparaître à cet endroit : une tache sombre dans le mode clair,
   introuvable à la relecture. */
const bloc = re => { const m = css.match(re); if(!m) return null;
  const d = css.indexOf(m[0]), f = css.indexOf('\n}', d);
  return new Set([...css.slice(d, f).matchAll(/--([\w-]+)\s*:/g)].map(x=>x[1])); };
const sombre = bloc(/:root\{/);
const clair  = bloc(/html\[data-theme="light"\]\{/);
T(!!clair, 'le thème clair existe');
if(clair){
  const manquent = [...sombre].filter(v => !clair.has(v) && v !== 'radius');
  const enTrop   = [...clair].filter(v => !sombre.has(v));
  T(manquent.length === 0, `rien ne manque au thème clair (${manquent.join(', ') || 'rien'})`);
  T(enTrop.length === 0,   `et rien n'y est en trop (${enTrop.join(', ') || 'rien'})`);
}
T(/color-scheme:dark/.test(css) && /color-scheme:light/.test(css),
  'chaque thème dit au navigateur quoi faire de ses propres dessins');

S('4. La palette couvre les trois familles');
['bg','panel','txt','muted','accent','ok','warn','bad','info']
  .forEach(v => T(definies.has(v), `--${v} existe`));
['t-accent','t-ok','t-warn','t-bad','t-info','t-neutral']
  .forEach(v => T(definies.has(v), `--${v} : la teinte de fond dérivée`));
['veil','glass','sh-hair','sh-soft','sh-mid','sh-deep']
  .forEach(v => T(definies.has(v), `--${v} : voile ou ombre`));

S('5. Le fichier dit comment il est organisé');
T(/COMMENT CE FICHIER EST ORGANIS/.test(css), 'une table des matières en tête');
/* Les en-têtes disaient « À COLLER À LA FIN » : des instructions de
   livraison, qui ne décrivaient rien du contenu. */
const entetes = (css.match(/À COLLER À LA FIN/g) || []).length;
T(entetes <= 1, `plus d'en-tête « À COLLER À LA FIN » (reste ${entetes}, la mention explicative)`);

let fails = 0;
for (const [ok, l] of R) {
  if (ok === null) console.log('\n' + l);
  else { if (!ok) fails++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + l); }
}
console.log('\n' + (fails ? '=== ' + fails + ' ÉCHEC(S) ===' : '=== ALL_OK ==='));
process.exit(fails ? 1 : 0);
