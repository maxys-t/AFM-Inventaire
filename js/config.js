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


/* --- Condition --- */
const CONDS = {bon:"Good", attente:"Needs repair", reparation:"In repair", hs:"Out of service"};
const REPACT = {
  reparation:"sent for repair",
  attente:"flagged as needing repair",
  bon:"repaired / back in service",
  hs:"marked out of service"
};

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
    rep:       "Repairs",
    settings:  "⚙ Settings"
  },
  intro: {
    dash:     "What needs your attention today, and where the gear stands.",
    inv:      "Every item in the studio. Search, filter, sort, and check gear in or out.",
    people:   "Everyone who borrows gear, and what they currently hold.",
    proj:     "Build a gear list for a session or a tour, then tick it off as you pack.",
    out:      "Everything that has left the studio — who has it and since when.",
    rep:      "Gear that is damaged, waiting for repair, or at the shop.",
    settings: "Accounts, locations, import and export, activity log."
  }
};

