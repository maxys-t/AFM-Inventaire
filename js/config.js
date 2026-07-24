/* ============================================================
   AFM Inventory Tracker — CONFIG
   Le seul fichier à modifier pour personnaliser l'application :
   identifiants Supabase, catégories, états, textes, seuils.
   ============================================================ */

/* --- Connexion Supabase --- */
const SUPABASE_URL = "https://umqocgzeafhtqtcoygeo.supabase.co";
const SUPABASE_KEY = "";

/* --- Catégories de matériel ---
   Ajouter une catégorie = une ligne ici + son préfixe d'ID dans CATCODE. */
const CATS = {
  "synthe":"Synthé / clavier","boite":"Boîte à rythmes / groovebox","micro":"Micro","cable":"Câble",
  "ampli":"Ampli","pedale":"Pédale / effet","casque":"Casque","enceinte":"Enceinte / monitoring",
  "interface":"Interface / carte son","instrument":"Instrument","pied":"Pied / support","accessoire":"Accessoire","autre":"Autre"
};
const CATCODE = {synthe:"SYN",boite:"BAR",micro:"MIC",cable:"CAB",ampli:"AMP",pedale:"PED",casque:"CAS",enceinte:"ENC",interface:"INT",instrument:"INS",pied:"PIE",accessoire:"ACC",autre:"DIV"};

/* --- États du matériel --- */
const CONDS = {bon:"Bon état",attente:"En attente de réparation",reparation:"En réparation",hs:"Hors service"};
const REPACT = {reparation:"envoyé en réparation",attente:"mis en attente de réparation",bon:"réparé / remis en service",hs:"déclaré hors service"};

/* --- Statuts des projets --- */
const PSTAT = {inactif:"Inactif",preparation:"Préparation",show:"Show"};
const PTAG = {inactif:"pinactif",preparation:"pprep",show:"pshow"};

/* --- Seuils --- */
const ALERT_DAYS = 7;   // alerte "sorti depuis X jours" (items sans date de retour)

/* --- Textes de l'interface --- */
const LABELS = {
  appTitle: "AFM Inventory Tracker",
  nav: {
    dash: "Tableau de bord",
    inv: "Inventaire",
    proj: "Projets",
    out: "Sortis",
    rep: "Réparations",
    people: "Personnes",
    loc: "Emplacements"
  }
};
