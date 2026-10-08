/* ============================================================
   PRÉFÉRENCES D'AFFICHAGE
   Colonnes visibles dans l'inventaire, mémorisées par compte.

   Deux niveaux de stockage :
   — localStorage, lu immédiatement, pour que la première image
     affichée soit déjà la bonne (pas de clignotement) ;
   — table `user_prefs`, source de vérité, qui suit la personne
     d'un appareil à l'autre.

   La table est volontairement SÉPARÉE de `profiles` : donner à
   quelqu'un le droit d'écrire dans sa ligne de `profiles` lui
   permettrait de se passer `role = 'admin'` tout seul.
   ============================================================ */

/* --- Colonnes disponibles dans la liste d'inventaire ---
   `fixed`  : toujours affichée, non décochable.
   `admin`  : réservée aux administrateurs (prix d'achat).
   L'ordre de ce tableau est l'ordre des colonnes à l'écran. */
const INV_COLUMNS = [
  {k:'photo',  label:'Photo',          fixed:false},
  {k:'item',   label:'Item',           fixed:true },
  {k:'id',     label:'ID',             fixed:false},
  {k:'cat',    label:'Category',       fixed:false},
  {k:'family', label:'Family',         fixed:false},
  {k:'status', label:'Status',         fixed:false},
  {k:'loc',    label:'Location',       fixed:false},
  {k:'home',   label:'Home',           fixed:false},
  {k:'cond',   label:'Condition',      fixed:false},
  {k:'weight', label:'Weight',         fixed:false},
  {k:'owner',  label:'Owner',          fixed:false},
  {k:'prov',   label:'Provider',       fixed:false},
  {k:'price',  label:'Purchase price', fixed:false, admin:true},
  {k:'pdate',  label:'Purchase date',  fixed:false},
  {k:'so',     label:'Sales order #',  fixed:false},
  {k:'serial', label:'Serial number',  fixed:false}
];

const INV_DEFAULT_COLS = ['photo','item','id','cat','status','loc','cond'];

/* --- Vues fixes ---
   Deux jeux de colonnes couvrant les deux usages : repérer vite, ou
   tout voir. Le troisième état, « custom », n'est pas une vue : c'est
   simplement le réglage manuel, mémorisé dès qu'on coche une colonne. */
/* --- Colonnes du mobile ---
   INDÉPENDANTES de celles du bureau. C'est le cœur de la v1.16 :
   jusqu'ici la vue mobile reprenait la sélection du bureau et
   transformait chaque colonne en une ligne « label : valeur ».
   Afficher quatorze colonnes produisait quatorze lignes par item, et
   enrichir le tableau dégradait mécaniquement le téléphone.

   Ici elles ne décrivent qu'une chose : ce qui tient sur la ligne de
   repères sous le titre. Le titre et l'action sont toujours là. */
/* Deux repères, pas trois. Sur un téléphone de 390 px, une fois la
   case, la photo et le bouton posés, il reste environ 160 px pour
   cette ligne : l'identifiant et la pastille de statut la remplissent
   déjà. Un troisième champ s'affichait tronqué — il prenait de la
   place sans rien apprendre. Reste ajoutable à la main. */
const MOBILE_DEFAULT_COLS = ['id','status'];
/* Au-delà de quatre, la ligne déborde et la carte redevient illisible. */
const MOBILE_MAX_COLS = 4;
/* Un libellé long n'a pas sa place sur une ligne de repères. */
const MOBILE_COLS = ['id','cat','family','status','loc','home','cond','owner','prov','price','pdate','serial'];

const INV_VIEWS = {
  compact: {label:'Compact', cols:['photo','item','id','status','loc']},
  full:    {label:'Full',    cols:null}      // null = toutes les colonnes
};
const PREFS_KEY = 'afm.prefs.v1';

let prefs = null;
let prefsLoadedRemote = false;
let prefsTimer = null;

function defaultPrefs(){
  return {invCols: INV_DEFAULT_COLS.slice(), invView: null,
          invColsMobile: MOBILE_DEFAULT_COLS.slice(), mobilePhoto: true};
}

/* Lecture tolérante : une colonne supprimée dans une version
   future ne doit pas casser les préférences enregistrées. */
function sanitizePrefs(p){
  const known = INV_COLUMNS.map(c=>c.k);
  const out = defaultPrefs();
  if(p && Array.isArray(p.invCols)){
    const keep = p.invCols.filter(k=>known.includes(k));
    if(keep.length) out.invCols = keep;
  }
  if(p && (p.invView === 'compact' || p.invView === 'full')) out.invView = p.invView;
  if(p && Array.isArray(p.invColsMobile)){
    const keep = p.invColsMobile.filter(k=>MOBILE_COLS.includes(k)).slice(0, MOBILE_MAX_COLS);
    if(keep.length) out.invColsMobile = keep;
  }
  if(p && typeof p.mobilePhoto === 'boolean') out.mobilePhoto = p.mobilePhoto;
  return out;
}

function loadPrefsLocal(){
  try{
    const raw = localStorage.getItem(PREFS_KEY);
    prefs = sanitizePrefs(raw ? JSON.parse(raw) : null);
  }catch(e){ prefs = defaultPrefs(); }
}
function savePrefsLocal(){
  try{ localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }catch(e){}
}

/* Appelée une seule fois par session, après la connexion.
   Un échec (table absente, hors ligne) laisse simplement les
   préférences locales en place : rien ne casse. */
async function loadPrefsRemote(){
  if(prefsLoadedRemote) return;
  prefsLoadedRemote = true;
  try{
    const p = await apiLoadPrefs();
    if(p){ prefs = sanitizePrefs(p); savePrefsLocal(); }
  }catch(e){}
}

/* Écriture groupée : cocher cinq colonnes d'affilée ne déclenche
   qu'une seule écriture en base. */
function schedulePrefsSave(){
  savePrefsLocal();
  clearTimeout(prefsTimer);
  prefsTimer = setTimeout(()=>{ try{ apiSavePrefs(prefs); }catch(e){} }, 800);
}

/* --- Colonnes réellement affichées --- */
/* Colonnes du jeu courant : la vue choisie, sinon le réglage manuel. */
function invColKeys(){
  if(!prefs) loadPrefsLocal();
  const v = prefs.invView && INV_VIEWS[prefs.invView];
  if(v) return v.cols === null ? INV_COLUMNS.map(c=>c.k) : v.cols.slice();
  return prefs.invCols;
}

/* Une colonne sur laquelle on trie ou on filtre s'affiche d'office.
   Sinon on classerait selon une donnée invisible, ou on filtrerait
   sans trace à l'écran — deux façons de rendre la liste incompréhensible. */
function forcedCols(){
  const f = new Set();
  if(typeof sortLevels !== 'undefined') sortLevels.forEach(l=>f.add(l.k));
  if(typeof colFilters !== 'undefined')
    Object.keys(colFilters).forEach(k=>{ if(colFilters[k] && colFilters[k].size) f.add(k); });
  return f;
}

function invColDefs(){
  const keys = invColKeys(), forcee = forcedCols();
  return INV_COLUMNS.filter(c=>{
    if(c.admin && typeof canSeeValue === 'function' && !canSeeValue()) return false;
    return c.fixed || keys.includes(c.k) || forcee.has(c.k);
  });
}

/* --- Colonnes du mobile --- */
function mobileColDefs(){
  if(!prefs) loadPrefsLocal();
  return INV_COLUMNS.filter(c=>{
    if(c.admin && typeof canSeeValue === 'function' && !canSeeValue()) return false;
    return prefs.invColsMobile.includes(c.k);
  });
}
function toggleMobileCol(k, on){
  if(!MOBILE_COLS.includes(k)) return;
  const set = new Set(prefs.invColsMobile);
  if(on){
    if(set.size >= MOBILE_MAX_COLS){
      if(typeof toast === 'function')
        toast(`${MOBILE_MAX_COLS} fields maximum on mobile — uncheck one first.`, 'error');
      renderColMenu(); return;
    }
    set.add(k);
  }else set.delete(k);
  prefs.invColsMobile = MOBILE_COLS.filter(x=>set.has(x));
  schedulePrefsSave();
  renderColMenu(); renderInv();
}
function toggleMobilePhoto(on){
  prefs.mobilePhoto = !!on;
  schedulePrefsSave();
  renderColMenu(); renderInv();
}

/* --- Bascule de vue --- */
function setInvView(v){
  if(typeof invResetScroll === 'function') invResetScroll();
  // Recliquer sur la vue active revient au réglage manuel.
  prefs.invView = (prefs.invView === v) ? null : v;
  schedulePrefsSave();
  renderViewButtons();
  renderColMenu();
  renderInv();
}
function renderViewButtons(){
  Object.keys(INV_VIEWS).forEach(v=>{
    const b = document.getElementById('view-' + v);
    if(b) b.classList.toggle('on', prefs && prefs.invView === v);
  });
}
function invColCount(){ return invColDefs().length + 2; }   // + case à cocher + actions

function toggleCol(k, on){
  const c = INV_COLUMNS.find(x=>x.k===k);
  if(!c || c.fixed) return;
  // Toucher une colonne à la main, c'est quitter la vue fixe : on part
  // de ce qui est affiché pour ne rien perdre au passage.
  if(prefs.invView){ prefs.invCols = invColKeys(); prefs.invView = null; }
  const set = new Set(prefs.invCols);
  if(on) set.add(k); else set.delete(k);
  prefs.invCols = INV_COLUMNS.map(x=>x.k).filter(x=>set.has(x));   // on garde l'ordre canonique
  schedulePrefsSave();
  renderColMenu();
  renderInv();
}
function resetMobileCols(){
  prefs.invColsMobile = MOBILE_DEFAULT_COLS.slice();
  prefs.mobilePhoto = true;
  schedulePrefsSave();
  renderColMenu(); renderInv();
}
function resetCols(){
  prefs.invCols = INV_DEFAULT_COLS.slice();
  prefs.invView = null;
  schedulePrefsSave();
  renderViewButtons();
  renderColMenu();
  renderInv();
}

/* --- Menu de sélection des colonnes --- */
function toggleColMenu(){
  const m = document.getElementById('colMenu');
  if(!m) return;
  const open = m.classList.toggle('open');
  if(open) renderColMenu();
}
function renderColMenu(){
  const m = document.getElementById('colMenu');
  if(!m) return;
  if(!prefs) loadPrefsLocal();

  // Sur mobile, ce menu règle la ligne de repères, pas des colonnes.
  if(typeof isMobileView === 'function' && isMobileView()){
    const dispo = INV_COLUMNS.filter(c=>MOBILE_COLS.includes(c.k))
      .filter(c=>!(c.admin && typeof canSeeValue === 'function' && !canSeeValue()));
    m.innerHTML = `<div class="colmenu-head">Shown under the name
        <span class="muted">${prefs.invColsMobile.length}/${MOBILE_MAX_COLS}</span></div>`
      + `<label><input type="checkbox" ${prefs.mobilePhoto?'checked':''}
             onchange="toggleMobilePhoto(this.checked)"> Photo</label>`
      + dispo.map(c=>{
          const on = prefs.invColsMobile.includes(c.k);
          return `<label><input type="checkbox" ${on?'checked':''}
                   onchange="toggleMobileCol('${c.k}',this.checked)"> ${esc(c.label)}</label>`;
        }).join("")
      + `<div class="colmenu-foot">
           <button class="btn sec small" onclick="resetMobileCols()">Reset</button></div>`;
    return;
  }

  const rows = INV_COLUMNS
    .filter(c=>!(c.admin && typeof canSeeValue === 'function' && !canSeeValue()))
    .map(c=>{
      const on = c.fixed || invColKeys().includes(c.k);
      return `<label${c.fixed?' class="fixed"':''}>
        <input type="checkbox" ${on?'checked':''} ${c.fixed?'disabled':''}
               onchange="toggleCol('${c.k}',this.checked)">
        ${esc(c.label)}${c.fixed?' <span class="muted">always</span>':''}
      </label>`;
    }).join("");
  m.innerHTML = rows + `<div class="colmenu-foot">
    <button class="btn sec small" onclick="resetCols()">Reset columns</button></div>`;
}

/* Fermeture du menu au clic à l'extérieur */
document.addEventListener('click', e=>{
  const m = document.getElementById('colMenu');
  if(!m || !m.classList.contains('open')) return;
  if(e.target.closest('.colbox')) return;
  m.classList.remove('open');
});

loadPrefsLocal();
