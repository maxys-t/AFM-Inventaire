/* Harnais v2.9.1 — hygiène des migrations SQL.
 *
 * Deux règles, nées de deux pannes réelles :
 *
 *  A. Un déclencheur de validation ne doit revalider que ce que la
 *     requête change. En v2.9.0, supprimer un dossier mettait
 *     packs.folder_id à null — donc un UPDATE sur packs — et
 *     packs_container_sane revalidait container_id, qu'on n'avait pas
 *     touché. Une caisse déjà incohérente devenait ainsi
 *     impossible à renommer, à ranger ou à archiver : un verrou
 *     définitif sur toute la ligne.
 *
 *  B. Depuis la 033, chaque migration s'inscrit au journal. Une
 *     migration qui oublie de le faire rend le journal faux, et un
 *     registre faux est pire que pas de registre.
 */
const fs=require('fs'), path=require('path');
const SRC = process.argv[2] || path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC,f),'utf8');

const R=[]; const T=(c,l)=>R.push([!!c,l]); const S=l=>R.push([null,l]);

const fichiers = fs.readdirSync(path.join(SRC,'sql'))
  .filter(f=>/^\d{3}-.*\.sql$/.test(f)).sort();

S('1. Le déclencheur du contenant ne revalide plus l’inchangé');
const m036 = read('sql/036-declencheur-contenant.sql');
T(/create or replace function pack_container_check/.test(m036),
  'la 036 réécrit pack_container_check');
T(/tg_op = 'UPDATE'[\s\S]{0,120}new\.container_id is not distinct from old\.container_id/
    .test(m036),
  'elle sort tout de suite si container_id n’a pas changé');
T(/before insert or update of container_id on public\.packs/.test(m036),
  'et le déclencheur ne s’arme que si la requête mentionne container_id');
/* La 019 porte encore l'ancienne version : c'est normal, une
   migration ne se réécrit pas. Mais elle doit être la DERNIÈRE à
   définir ce déclencheur sans garde. */
const def = fichiers.filter(f=>/create trigger packs_container_sane/
  .test(read('sql/'+f)));
T(def[def.length-1] === '036-declencheur-contenant.sql',
  'c’est la 036 qui a le dernier mot sur packs_container_sane');

S('2. Toute migration depuis la 033 s’inscrit au journal');
const depuis033 = fichiers.filter(f=>parseInt(f,10) >= 33);
T(depuis033.length >= 4, depuis033.length + ' migrations concernées');
for(const f of depuis033){
  const t = read('sql/'+f);
  T(/insert into public\.schema_migrations/.test(t),
    f + ' écrit sa ligne');
}

S('3. Le journal reste rejouable');
/* Chaque insertion au journal — il peut y en avoir plusieurs dans un
   même fichier — doit absorber le doublon, sinon recoller la
   migration après une erreur échoue sur la clé primaire. */
for(const f of depuis033){
  const t = read('sql/'+f);
  const morceaux = t.split('insert into public.schema_migrations').slice(1);
  /* On s'arrête au point-virgule : c'est la fin de l'instruction. */
  T(morceaux.length > 0 &&
    morceaux.every(m=>/on conflict/.test(m.slice(0, m.indexOf(';')+1))),
    f + ' : ses ' + morceaux.length +
    ' insertion(s) au journal absorbent le doublon');
}

S('4. Les noms inscrits sont ceux des fichiers');
const m036nom = (m036.match(/'036-[a-z-]+\.sql'/)||[])[0];
T(m036nom === "'036-declencheur-contenant.sql'",
  'la 036 s’inscrit sous son nom de fichier, comme les 35 précédentes');

S('5. Les fichiers sont numérotés sans doublon');
const nums = fichiers.map(f=>parseInt(f,10));
T(new Set(nums).size === nums.length, 'aucun numéro en double');

let fails=0;
for(const [ok,l] of R){ if(ok===null) console.log('\n'+l);
  else { if(!ok) fails++; console.log('  '+(ok?'✓':'✗')+' '+l); } }
console.log('\n'+(fails?'=== '+fails+' ÉCHEC(S) ===':'=== ALL_OK ==='));
process.exit(fails?1:0);
