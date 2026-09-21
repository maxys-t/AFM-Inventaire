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
const APP_URL = "";

/* --- Catégories de matériel -----------------------------------
   Deux niveaux, tous deux obligatoires à la création d'un item.

   Pour ajouter une sous-catégorie : une ligne dans la bonne famille,
   avec un code de 3 lettres UNIQUE (il sert à fabriquer les
   identifiants : MIC-001, DLY-004…).
   Ne jamais réutiliser un code déjà employé par des items existants.
   -------------------------------------------------------------- */
const CATS = {
  instruments: { label:"Instruments", subs:{
    synthe:      {label:"Synthé / clavier",           code:"SYN"},
    boite:       {label:"Boîte à rythmes / groovebox",code:"BAR"},
    guitare:     {label:"Guitare / basse",            code:"GTR"},
    batterie:    {label:"Batterie",                   code:"DRM"},
    percussion:  {label:"Percussion",                 code:"PRC"},
    peau10:      {label:"Peau 10\"",   code:"P10"},
    peau12:      {label:"Peau 12\"",   code:"P12"},
    peau13:      {label:"Peau 13\"",   code:"P13"},
    peau14:      {label:"Peau 14\"",   code:"P14"},
    peau16:      {label:"Peau 16\"",   code:"P16"},
    peau18:      {label:"Peau 18\"",   code:"P18"},
    peau22:      {label:"Peau 22\"",   code:"P22"},
    peau_autre:  {label:"Peau — autre taille", code:"PEA"},
    autre_inst:  {label:"Autre instrument",           code:"INS"}
  }},

  captation: { label:"Micros & captation", subs:{
    condensateur:{label:"Micro condensateur", code:"MIC"},
    dynamique:   {label:"Micro dynamique",    code:"MID"},
    ruban:       {label:"Micro ruban",        code:"MIR"},
    mesure_mic:  {label:"Micro de mesure",   code:"MME"},
    trigger:     {label:"Trigger",           code:"TRG"},
    accessoire:  {label:"Accessoire micro",  code:"MAC"}
  }},

  peripheriques: { label:"Périphs", subs:{
    compresseur: {label:"Compresseur", code:"CMP"},
    eq:          {label:"EQ",          code:"EQU"},
    preampli:    {label:"Préampli",    code:"PRE"},
    effets:      {label:"Effets",      code:"FXR"},
    chassis:     {label:"Châssis 500",        code:"CH5"}
  }},

  pedales: { label:"Pédales", subs:{
    drive:       {label:"Drive / Distorsion",   code:"DRV"},
    modulation:  {label:"Modulation",           code:"MOD"},
    delay:       {label:"Delay",                code:"DLY"},
    reverb:      {label:"Reverb",               code:"RVB"},
    filtre:      {label:"Filtre / Wah",         code:"WAH"},
    pitch:       {label:"Pitch / Octave",       code:"PIT"},
    dynamique_p: {label:"Dynamique",            code:"DYN"},
    multi:       {label:"Multi-effets / Looper",code:"MFX"},
    alim:        {label:"Alimentation",         code:"ALP"},
    accordeur:   {label:"Accordeur",          code:"TUN"},
    footswitch:  {label:"Footswitch / expression", code:"FSW"}
  }},

  di: { label:"DI & splitters", subs:{
    boite_di:    {label:"Boîte de direct", code:"DIB"},
    splitter:    {label:"Splitter",        code:"SPL"},
    reamp:       {label:"Ré-amp",          code:"RMP"}
  }},

  amplification: { label:"Amplification & écoute", subs:{
    ampli_inst:  {label:"Ampli guitare / basse",  code:"AMP"},
    monitoring:  {label:"Enceinte de monitoring", code:"MON"},
    casque:      {label:"Casque",                 code:"CAS"},
    ampli_casque:{label:"Ampli casque",       code:"AMC"}
  }},

  consoles: { label:"Consoles", subs:{
    console:     {label:"Console de mixage", code:"CON"},
    extension:   {label:"Extension / rack",  code:"CEX"},
    carte:       {label:"Carte I/O",         code:"CIO"}
  }},

  mesure: { label:"Mesure", subs:{
    outil:       {label:"Outil de mesure",   code:"MES"}
  }},

  informatique: { label:"Informatique & interfaces", subs:{
    interface:   {label:"Interface audio",  code:"INT"},
    ordinateur:  {label:"Ordinateur",       code:"ORD"},
    convertisseur:{label:"Convertisseur",   code:"CNV"},
    controleur:  {label:"Contrôleur MIDI",  code:"CTL"},
    stockage:    {label:"Stockage",         code:"STK"},
    reseau:      {label:"Réseau",             code:"NET"},
    midi:        {label:"Interface MIDI",     code:"MDI"}
  }},

  cablage: { label:"Câblage & connectique", subs:{
    xlr:         {label:"XLR",             code:"XLR"},
    trs:         {label:"TRS",             code:"TRS"},
    mini_trs:    {label:"Mini TRS",        code:"MTR"},
    ts:          {label:"TS",              code:"TS" },
    mini_ts:     {label:"Mini TS",         code:"MTS"},
    rca:         {label:"RCA",             code:"RCA"},
    xlrf_trs:    {label:"XLR F / TRS",     code:"XFT"},
    xlrm_trs:    {label:"XLR M / TRS",     code:"XMT"},
    secteur:     {label:"Câble secteur",   code:"SEC"},
    midi_cable:  {label:"MIDI",            code:"CMD"},
    multipaire:  {label:"Multipaire audio",code:"MUL"},
    adaptateur:  {label:"Adaptateur",      code:"ADP"},
    patchbay:    {label:"Patchbay",        code:"PBY"}
  }},

  supports: { label:"Supports & transport", subs:{
    pied:        {label:"Pied de micro", code:"PIE"},
    stand:       {label:"Stand",         code:"STD"},
    flightcase:  {label:"Flight case",   code:"FLC"},
    housse:      {label:"Housse",        code:"HOU"}
  }},

  divers: { label:"Infrastructure & divers", subs:{
    mobilier:    {label:"Mobilier",              code:"MOB"},
    eclairage:   {label:"Éclairage",             code:"LUM"},
    acoustique:  {label:"Traitement acoustique", code:"ACO"},
    electricite: {label:"Électricité / alimentation", code:"ELE"},
    autre:       {label:"Divers",                code:"DIV"}
  }}
};

/* --- États du matériel --- */
const CONDS = {bon:"Bon état",attente:"En attente de réparation",reparation:"En réparation",hs:"Hors service"};
const REPACT = {reparation:"envoyé en réparation",attente:"mis en attente de réparation",bon:"réparé / remis en service",hs:"déclaré hors service"};

/* --- Statuts des projets --- */
const PSTAT = {inactif:"Inactif",preparation:"Préparation",show:"Show"};
const PTAG = {inactif:"pinactif",preparation:"pprep",show:"pshow"};

/* --- Seuils --- */
const ALERT_DAYS = 7;              // alerte "sorti depuis X jours" (sans date de retour)
const TRASH_RETENTION_DAYS = 30;   // durée de conservation dans la corbeille

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
    loc: "Emplacements",
    users: "Utilisateurs"
  }
};
