/* Harnais v2.0 — le rail, le thème, la fiche en colonnes.

   Ce que cette version change n'est pas ce que l'application calcule,
   mais la façon d'y arriver. Les harnais existants protègent le
   calcul ; celui-ci protège le chemin. */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');
const html = read('index.html'), css = read('css/styles.css'),
      app = read('js/app.js'), auth = read('js/auth.js'),
      prefs = read('js/prefs.js'), inv = read('js/views-inventory.js'),
      set = read('js/views-settings.js');

const R=[]; const T=(c,l)=>R.push([!!c,l]); const S=l=>R.push([null,l]);

S('1. Le rail a remplacé la barre');
const rail = html.slice(html.indexOf('<nav id="rail"'), html.indexOf('</nav>'));
T(/<nav id="rail"/.test(html), 'le rail existe');
T(!/<nav style="display:none">/.test(html), 'et l’ancienne barre a disparu');
const liens = [...rail.matchAll(/data-v="(\w+)"/g)].map(m=>m[1]);
T(liens.length === 8, `les huit destinations y sont (${liens.length})`);
['dash','proj','packs','out','inv','rep','people','settings']
  .forEach(v=>T(liens.includes(v), `${v} est dans le rail`));
/* L'ordre dit la hiérarchie du travail : le projet est la fin. */
T(liens[1] === 'proj', 'Projects juste après le tableau de bord');
T(liens.indexOf('proj') < liens.indexOf('packs'), 'devant les caisses');
T(liens.indexOf('packs') < liens.indexOf('inv'), 'elles-mêmes devant l’inventaire');
T(/railhead">Faire partir</.test(rail) && /railhead">Le parc</.test(rail),
  'et il groupe explicitement les deux familles');
/* Neuf dessins : les huit destinations, plus le bouton de repli. */
T((rail.match(/<svg/g)||[]).length === 9,
  'chaque destination porte son icône — c’est ce qui rend le repli lisible');
T((rail.match(/class="nav"|class="nav active"/g)||[]).length === 8,
  'et chaque icône appartient bien à une destination');

S('2. Une seule coquille à montrer ou cacher');
/* Trois éléments synchronisés à la main finissent par diverger : le
   rail, l'en-tête et le contenu vivent maintenant ensemble. */
T(/<div id="shell"/.test(html), 'le rail, l’en-tête et le contenu sont dans #shell');
T(/set\('shell', which==='app'\)/.test(auth), 'et showScreen ne manipule plus que lui');
T(!/querySelector\('main'\), which==='app'/.test(auth), 'plus de synchronisation à trois');
T(/#shell\{display:grid/.test(css), 'la grille place le rail à gauche');

S('3. Le rail se replie, et s’en souvient');
T(/function toggleRail/.test(app), 'on peut le replier');
T(/body\.railshut #shell\{grid-template-columns:60px/.test(css), 'replié, il ne garde que ses icônes');
T(/@media\(max-width:1000px\)[\s\S]{0,400}grid-template-columns:60px/.test(css),
  'et se replie seul quand l’écran se resserre');
T(/@media\(max-width:700px\)[\s\S]{0,300}bottom:0/.test(css),
  'sur téléphone il devient une barre basse, là où le pouce arrive');
T(/rail: 'auto'/.test(prefs) && /\['auto','shut','open'\]\.includes\(p\.rail\)/.test(prefs),
  'le choix se range dans les préférences de la personne');

S('4. Trois thèmes, et le troisième n’est pas un compromis');
T(/html\[data-theme="light"\]/.test(css), 'le thème clair existe');
T(/function themeEffectif/.test(app) && /prefers-color-scheme/.test(app),
  '« système » lit le réglage de l’appareil');
T(/addEventListener\('change'[\s\S]{0,120}applyTheme/.test(app),
  'et le suit quand il bascule, au lieu de le lire une fois');
T(/document\.documentElement\.setAttribute\('data-theme'/.test(app),
  'le thème vit sur <html> : sinon un éclair sombre précède une page claire');
T(/theme: 'auto'/.test(prefs), 'le choix appartient à la personne, pas à l’appareil');
T(/function paneAppearance/.test(set) && /k:'appearance'/.test(set),
  'et se règle dans Settings → Appearance');

S('5. La fiche d’un item, en colonnes');
T(/<div class="fcols">/.test(inv), 'deux colonnes de cartes');
T(/<div class="fstats">/.test(inv), 'précédées des quatre chiffres qui comptent');
T(/id="detailBody"[\s\S]{0,40}/.test(html) && /class="modal wide" id="detailBody"/.test(html),
  'la fenêtre est élargie pour les accueillir');
['Identité','Rangement','Historique'].forEach(c=>
  T(new RegExp('<h4>'+c).test(inv), `la carte « ${c} » existe`));
T(/@media\(max-width:780px\)\{\.fcols\{grid-template-columns:1fr\}\}/.test(css),
  'et sur écran étroit les colonnes s’empilent');
/* Ce qui était dans le paragraphe doit s'y retrouver, pas disparaître. */
['Numéro de série','Propriétaire','Conditionnement','Fournisseur'].forEach(k=>
  T(inv.includes(`kv('${k}'`), `${k} n’a pas été perdu en chemin`));

S('6. Les vues n’ont pas bougé');
/* La promesse de cette version : la disposition des pages ne change
   pas, seule la façon d'y arriver. Les conteneurs doivent être les
   mêmes, sinon les vues écrivent dans le vide. */
['v-dash','v-inv','v-proj','v-out','v-packs','v-rep','v-people','v-settings']
  .forEach(v=>T(html.includes(`id="${v}"`), `#${v} est toujours là`));

S('7. Cohérence des fichiers');
const vApp=(app.match(/APP_VERSION = '([\d.]+)'/)||[])[1];
const vUniq=[...new Set((html.match(/\?v=[\d.]+/g)||[]).map(t=>t.slice(3)))];
T(vUniq.length===1 && vUniq[0]===vApp, `tous les fichiers en ${vApp}`);

let fails=0;
for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
  else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
process.exit(fails?1:0);
