/* Harnais v2.9.5 — un clic est un appui ET un relâchement au même
 * endroit.
 *
 * Le navigateur déclenche `click` dès que l'appui et le relâchement
 * partagent un ancêtre commun. D'où deux agacements qui n'en font
 * qu'un :
 *
 *  - commencer une sélection dans un formulaire, dépasser le cadre,
 *    relâcher sur le fond : la fenêtre se fermait sans enregistrer ;
 *  - sélectionner le nom d'un item pour le copier : la fiche
 *    s'ouvrait au relâchement.
 *
 * Ce harnais rejoue ces gestes avec de vrais événements.
 */
const fs=require('fs'), path=require('path'), {JSDOM}=require('jsdom');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const html = `<!DOCTYPE html><html><body>
  <table><tr id="row" class="rowlink"><td id="nom">Minimoog #1</td>
    <td><button id="out">Out</button></td>
    <td><input id="cb" type="checkbox"></td></tr></table>
  <div id="ov" class="overlay open"><div id="box">
    <input id="champ"><button id="save">Save</button></div></div>
</body></html>`;

const dom = new JSDOM(html, {runScripts:'dangerously',
  url:'https://inventory.accessflow.fr/'});
const w = dom.window, d = w.document;

/* On ne charge que le morceau d'app.js qui nous intéresse : le reste
   réclame Supabase. Le découpage est ancré sur les noms des
   constantes, qui ne bougeront pas sans qu'on s'en aperçoive ici. */
const app = read('js/app.js');
const i0 = app.indexOf('const GESTE_SEUIL');
const i1 = app.indexOf('/* ---- export / import JSON ---- */');
if(i0 < 0 || i1 < 0){ console.log('Morceau introuvable dans app.js'); process.exit(1); }
w.eval(app.slice(i0, i1));

const R=[]; const T=(c,l)=>R.push([!!c,l]); const S=l=>R.push([null,l]);

/* Un geste : appui en (x0,y0), relâchement en (x1,y1), clic sur
   `cible`. On rend ce que le gestionnaire a laissé passer. */
function geste(départ, cible, x0,y0, x1,y1, texteSélectionné){
  w.getSelection = () => ({isCollapsed: !texteSélectionné,
                           toString: () => texteSélectionné || ''});
  /* jsdom n'a pas PointerEvent ; un MouseEvent du même type porte
     tout ce que le gestionnaire lit (type, cible, coordonnées). */
  départ.dispatchEvent(new w.MouseEvent('pointerdown',
    {bubbles:true, clientX:x0, clientY:y0}));
  const ev = new w.MouseEvent('click',
    {bubbles:true, cancelable:true, clientX:x1, clientY:y1});
  let arrivé = false;
  const témoin = () => { arrivé = true; };
  d.body.addEventListener('click', témoin);
  cible.dispatchEvent(ev);
  d.body.removeEventListener('click', témoin);
  return arrivé;
}

const row = d.getElementById('row'), nom = d.getElementById('nom'),
      out = d.getElementById('out'), cb  = d.getElementById('cb'),
      ov  = d.getElementById('ov'),  box = d.getElementById('box'),
      champ = d.getElementById('champ');

S('1. Un clic franc reste un clic');
T(geste(nom, nom, 100,100, 100,100), 'immobile : la fiche s’ouvre');
T(geste(nom, nom, 100,100, 102,101), 'deux pixels de tremblement aussi');

S('2. Sélectionner un nom n’ouvre plus la fiche');
T(!geste(nom, nom, 100,100, 160,100, 'Minimoog'),
  'glisser sur le texte et relâcher : le clic est étouffé');
T(!geste(nom, nom, 100,100, 104,100, 'Mini'),
  'même une sélection courte, dès lors qu’il y a du texte pris');
T(geste(nom, nom, 100,100, 104,100, ''),
  'mais un petit glissement SANS sélection reste un clic');

S('3. Les commandes ne sont jamais étouffées');
/* Frémir de dix pixels sur un bouton ou une case à cocher doit
   continuer à l’actionner : sinon on casse l’usage pour réparer
   un agacement. */
T(geste(out, out, 100,100, 140,100), 'le bouton Out répond quand même');
T(geste(cb, cb, 100,100, 140,100), 'la case à cocher aussi');
T(geste(champ, champ, 100,100, 180,100, 'texte'),
  'et sélectionner dans un champ ne gêne rien');

S('4. La fenêtre ne se ferme plus par accident');
const ouverte = () => ov.classList.contains('open');
T(ouverte(), 'au départ elle est ouverte');

/* Le geste fautif : appui DANS la boîte, relâchement sur le fond.
   L’ancêtre commun étant l’overlay, le navigateur vise `ov`. */
geste(champ, ov, 100,100, 900,900, 'du texte');
T(ouverte(), 'une sélection qui dépasse le cadre ne ferme rien');

geste(box, ov, 100,100, 900,900);
T(ouverte(), 'un glissement parti de l’intérieur non plus');

S('5. Mais elle se ferme toujours quand on le veut');
T(geste(ov, ov, 900,900, 900,900) || true, 'clic franc sur le fond');
T(!ouverte(), 'la fenêtre s’est bien fermée');

let fails=0;
for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
  else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
process.exit(fails?1:0);
