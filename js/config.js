/* ============================================================
   AFM Inventory Tracker — CONFIG
   Le seul fichier à modifier pour personnaliser l'application.

   ⚠️ CE FICHIER T'APPARTIENT : il n'est jamais remplacé par une
   nouvelle version de l'app. Garde-le tel quel lors des mises à jour.
   ============================================================ */

/* --- Connexion Supabase ---------------------------------------
   Ces clés sont "publishable" : conçues pour être publiques, elles
   ne donnent accès à rien sans compte autorisé.
   ⚠️ Ne JAMAIS mettre ici la clé "secret" (sb_secret_…).
   -------------------------------------------------------------- */
const SUPABASE_URL = "https://umqocgzeafhtqtcoygeo.supabase.co";
const SUPABASE_KEY = "sb_publishable_s9Yip985Howj4yDog-2TTA_ufNaQPVk";

/* --- Adresse du site (optionnel) ------------------------------
   Laisser vide : les QR codes utilisent l'adresse courante.
   -------------------------------------------------------------- */
const APP_URL = "https://inventory.accessflow.fr/";

/* --- Catégories de matériel -----------------------------------
   Deux niveaux, tous deux obligatoires à la création d'un item.

   Pour ajouter une sous-catégorie : une ligne dans la bonne famille,
   avec un code de 3 lettres UNIQUE (il sert à fabriquer les
   identifiants : MIC-001, DLY-004…).
   Ne jamais réutiliser un code déjà employé par des items existants.
   -------------------------------------------------------------- */
/* --- Categories: family › sub-category ---
   L'ORDRE DE CE FICHIER EST L'ORDRE D'AFFICHAGE, partout :
   inventaire, filtres, sélecteur de projet. Pour réordonner,
   il suffit de déplacer les blocs. --- */
const CATS = {
  instruments: { label:"Instruments", subs:{
    synthe:           {label:"Synth / keyboard",         code:"SYN"},
    boite:            {label:"Drum machine / groovebox", code:"DMC"},
    guitare:          {label:"Guitar / bass",            code:"GTR"},
    batterie:         {label:"Drums",                    code:"DRM"},
    percussion:       {label:"Percussion",               code:"PRC"},
    consommable_inst: {label:"Instrument consumables",   code:"ICS"}
  }},

  captation: { label:"Microphones", subs:{
    condensateur: {label:"Condenser mic",   code:"MCN"},
    dynamique:    {label:"Dynamic mic",     code:"MDY"},
    ruban:        {label:"Ribbon mic",      code:"MRB"},
    mesure_mic:   {label:"Measurement mic", code:"MMS"},
    trigger:      {label:"Trigger",         code:"TRG"},
    accessoire:   {label:"Mic accessory",   code:"MAC"}
  }},

  peripheriques: { label:"Outboard", subs:{
    compresseur: {label:"Compressor",      code:"CMP"},
    eq:          {label:"EQ",              code:"EQU"},
    preampli:    {label:"Preamp",          code:"PRE"},
    effets:      {label:"Effects",         code:"FXR"},
    chassis:     {label:"500 series rack", code:"R50"}
  }},

  pedales: { label:"Pedals", subs:{
    drive:       {label:"Drive / distortion",      code:"DRV"},
    modulation:  {label:"Modulation",              code:"MOD"},
    delay:       {label:"Delay",                   code:"DLY"},
    reverb:      {label:"Reverb",                  code:"REV"},
    filtre:      {label:"Filter / wah",            code:"WAH"},
    pitch:       {label:"Pitch / octave",          code:"PIT"},
    dynamique_p: {label:"Dynamics",                code:"DYN"},
    multi:       {label:"Multi-effects / looper",  code:"MFX"},
    alim:        {label:"Power supply",            code:"PSU"},
    accordeur:   {label:"Tuner",                   code:"TUN"},
    footswitch:  {label:"Footswitch / expression", code:"FSW"}
  }},

  consoles: { label:"Consoles", subs:{
    console:   {label:"Mixing console",  code:"CON"},
    extension: {label:"Expander / rack", code:"CEX"},
    carte:     {label:"I/O card",        code:"CIO"}
  }},

  di: { label:"DI & splitters", subs:{
    boite_di: {label:"DI box",   code:"DIB"},
    splitter: {label:"Splitter", code:"SPL"},
    reamp:    {label:"Reamp",    code:"RMP"}
  }},

  informatique: { label:"Computers & interfaces", subs:{
    interface:     {label:"Audio interface", code:"INT"},
    ordinateur:    {label:"Computer",        code:"CPU"},
    convertisseur: {label:"Converter",       code:"CNV"},
    controleur:    {label:"MIDI controller", code:"CTL"},
    stockage:      {label:"Storage",         code:"STG"},
    reseau:        {label:"Network",         code:"NET"},
    midi:          {label:"MIDI interface",  code:"MDI"}
  }},

  amplification: { label:"Amps & monitoring", subs:{
    ampli_inst:   {label:"Guitar / bass amp", code:"AMP"},
    monitoring:   {label:"Studio monitor",    code:"MON"},
    casque:       {label:"Headphones",        code:"HPH"},
    ampli_casque: {label:"Headphone amp",     code:"HPA"}
  }},

  cablage: { label:"Cables & connectors", subs:{
    xlr:        {label:"XLR",             code:"XLR"},
    trs:        {label:"TRS",             code:"TRS"},
    mini_trs:   {label:"Mini TRS",        code:"MTR"},
    ts:         {label:"TS",              code:"TS"},
    mini_ts:    {label:"Mini TS",         code:"MTS"},
    rca:        {label:"RCA",             code:"RCA"},
    xlrf_trs:   {label:"XLR F / TRS",     code:"XFT"},
    xlrm_trs:   {label:"XLR M / TRS",     code:"XMT"},
    secteur:    {label:"Power cable",     code:"PWC"},
    midi_cable: {label:"MIDI",            code:"MID"},
    multipaire: {label:"Audio multicore", code:"MUL"},
    adaptateur: {label:"Adapter",         code:"ADP"},
    patchbay:   {label:"Patchbay",        code:"PBY"}
  }},

  supports: { label:"Stands & cases", subs:{
    pied:             {label:"Mic stand",                   code:"MST"},
    stand_clavier:    {label:"Keyboard / instrument stand", code:"KST"},
    stand_enceinte:   {label:"Speaker stand",               code:"SST"},
    extension_stand:  {label:"Stand extension",             code:"EXT"},
    adaptateur_stand: {label:"Stand adapter & clamp",       code:"CLP"},
    plateau:          {label:"Table & tray",                code:"TRY"},
    housse:           {label:"Bag",                         code:"BAG"},
    flightcase:       {label:"Flight case",                 code:"FLC"}
  }},

  consommables: { label:"Consumables", subs:{
    /* Vide pour l'instant : réservée aux consommables qui ne
       rattachent à aucune famille d'instruments (piles, gaffer…). */
  }},

  mesure: { label:"Measurement", subs:{
    outil: {label:"Measurement tool", code:"MSR"}
  }},

  divers: { label:"Facility & other", subs:{
    mobilier:    {label:"Furniture",          code:"FRN"},
    rack19:      {label:"Studio rack",        code:"RCK"},
    eclairage:   {label:"Lighting",           code:"LGT"},
    acoustique:  {label:"Acoustic treatment", code:"ACO"},
    electricite: {label:"Power / electrical", code:"ELC"},
    autre:       {label:"Other",              code:"OTH"}
  }}
};


/* --- Condition physique (v1.17) ---
   Ce champ ne dit plus QUE l'état de l'objet. L'étape de réparation
   — signalé, chez un prestataire — vit dans un dossier à part. Les
   deux étaient confondus jusqu'ici, ce qui rendait impossible de
   dire « revenu réparé mais reste fragile ». */
/* --- Ce qui peut servir de contenant à un pack (v1.24) ---
   Proposer les 649 items pour choisir une caisse était un champ de
   mines : on tapait trois lettres et on tombait sur un micro.

   La liste n'est pas une interdiction. Une console qui porte son rack
   d'expansion, une lunchbox qui porte ses modules : ce sont de vrais
   contenants qui ne sont ni des sacs ni des flight cases. La fenêtre
   garde donc une case « Show all items », et un item déjà utilisé
   comme contenant reste toujours proposé. Ajouter une
   sous-catégorie ici ne demande aucune migration. */
const CONTAINER_SUBS = [
  'housse',      // Bag
  'flightcase',  // Flight case
  'rack19',      // Studio rack
  'chassis',     // 500 series rack — une lunchbox porte ses modules
  'extension',   // Expander / rack
  'plateau',     // Table & tray
  'mobilier'     // Furniture — un meuble de studio porte son contenu
];

/* Quatre états depuis la v1.23. Il manquait la case du milieu :
   entre « usé mais ça marche » et « sorti du parc », il y a l'objet
   qui ne fonctionne plus et qu'on va réparer. Faute de pouvoir le
   dire, on le marquait hors service — ce qui le retirait du parc.

   La frontière entre `ko` et `hs` n'est pas un degré de gravité,
   c'est une décision : `ko` se répare, `hs` a été retiré du parc.
   L'ordre des clés est celui des menus déroulants : du meilleur au
   pire, pour qu'on descende la liste sans réfléchir. */
const CONDS = {bon:"Good", use:"Damaged, usable", ko:"Faulty", hs:"Out of service"};

/* Les valeurs d'avant la v1.17, gardées pour relire l'historique
   déjà écrit. Ne jamais les proposer à la saisie. */
const CONDS_LEGACY = {attente:"Needs repair", reparation:"In repair", reparer:"Needs repair"};

/* --- Catégories de pannes (v1.17) ---
   Liste courte et universelle, valable pour un câble comme pour un
   synthé. C'est ce qui rend les pannes comptables un jour : le texte
   libre seul ne se compte pas. Modifiable ici sans migration. */
const FAULTS = {
  connector:    "Connector / jack",
  power:        "Power",
  noise:        "Noise / hiss",
  intermittent: "Intermittent fault",
  damage:       "Physical damage",
  wear:         "Normal wear",
  electronic:   "Electronic",
  software:     "Software / firmware",
  other:        "Other"
};

/* Ce qu'on constate au retour, et où part l'item ensuite. Deux
   questions séparées : un item peut revenir réparé et être quand
   même mis de côté. */
const OUTCOMES = {repaired:"Repaired", partial:"Partly repaired",
                  unchanged:"Unchanged", new_damage:"New damage"};
const DESTINATIONS = {service:"Back in service", repair:"Still needs repair",
                      hs:"Out of service"};

/* Au-delà, un dossier est signalé comme traînant. Un matériel oublié
   chez un réparateur est un matériel perdu. */
const REPAIR_STALE_DAYS = 30;

/* ============================================================
   BESOINS COURANTS (v2.2)

   Ce qu'on retape sans arrêt. Déclarer les besoins de six cents
   items à la main est un travail qu'on abandonne au trentième : la
   bibliothèque n'est pas un confort, c'est ce qui décide si la
   fonction sert ou pourrit.

   Les poids sont volontairement vides. Un « DC 12V » couvre aussi
   bien une prise murale de 100 g qu'un bloc d'un kilo : remplir ces
   champs d'avance reviendrait à inventer le total qu'on lit face à
   un transporteur. Mieux vaut un total incomplet qu'un total faux.
   Quand un type d'alimentation aura été pesé une fois, son poids a
   sa place ici — il se préremplira à chaque saisie suivante.

   Liste modifiable ici, sans migration : elle ne sert qu'à la
   saisie, c'est le libellé qui est enregistré.
   ============================================================ */
const NEED_PRESETS = [
  // Secteur
  {kind:'power', label:'IEC C13',        g:null},
  {kind:'power', label:'IEC C7',         g:null},
  {kind:'power', label:'IEC 5',          g:null},
  {kind:'power', label:'Powercon',       g:null},
  // Continu
  {kind:'power', label:'DC 48V',         g:null},
  {kind:'power', label:'DC 24V',         g:null},
  {kind:'power', label:'DC 12V',         g:null},
  {kind:'power', label:'DC 9V',          g:null},
  {kind:'power', label:'DC 5V',          g:null},
  {kind:'power', label:'USB PSU',        g:null},
  // Un adaptateur, pas une alimentation — mais il vit dans la même
  // poche et c'est son oubli qui empêche l'appareil de s'allumer.
  {kind:'power', label:'DC Polarity Inverter', g:null},
  // Données : ce sont des liaisons, pas des alimentations.
  {kind:'cable', label:'USB C',          g:null},
  {kind:'cable', label:'USB B - USB C',  g:null},
  {kind:'cable', label:'USB B - USB A',  g:null},
  {kind:'cable', label:'USB 3.0',        g:null},
  {kind:'cable', label:'USB Micro',      g:null}
];

/* --- Project status --- */
const PSTAT = {inactif:"Idle", preparation:"Packing", show:"On show"};
const PTAG  = {inactif:"pinactif", preparation:"pprep", show:"pshow"};

/* --- Thresholds --- */
const ALERT_DAYS = 7;              // flag gear out for more than X days with no due date
const TRASH_RETENTION_DAYS = 30;   // how long deleted items stay in the trash

/* --- Interface copy --- */
const LABELS = {
  appTitle: "AFM Inventory Tracker",
  tagline: "Keep track of every piece of studio gear: where it lives, who has it, and what needs fixing.",
  nav: {
    dash:      "Dashboard",
    inv:       "Inventory",
    people:    "Borrowers",
    proj:      "Projects",
    out:       "Checked out",
    packs:     "Packs",
    rep:       "Repairs",
    /* Pas de pictogramme dans le libellé : le rail dessine déjà le
       sien, et les deux se chevauchaient. */
    settings:  "Settings",
    trash:     "Trash"
  },
  intro: {
    dash:     "What needs your attention today, and where the gear stands.",
    inv:      "Every item in the studio. Search, filter, sort, and check gear in or out.",
    people:   "Everyone who borrows gear, and what they currently hold.",
    proj:     "Build a gear list for a session or a tour, then tick it off as you pack.",
    out:      "Everything that has left the studio — who has it and since when.",
    packs:    "What travels together: racks, cases, and the gear inside them.",
    rep:      "Gear that is damaged, waiting for repair, or at the shop.",
    settings: "Accounts, locations, import and export, activity log."
  }
};

