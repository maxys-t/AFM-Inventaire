/* ============================================================
   IMPORT / EXPORT CSV — saisie en masse de l'inventaire
   Remplir un tableur, l'enregistrer en CSV, vérifier l'aperçu,
   puis valider. Rien n'est écrit avant confirmation.
   ============================================================ */

let csvPlan = null;   // résultat de l'analyse, en attente de validation

/* ---------- utilitaires ---------- */
function norm(s){
  return (s==null?'':String(s)).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
}

/* Analyse d'un CSV : gère , ou ; , les guillemets, les retours de ligne */
function parseCSV(text){
  text = text.replace(/^﻿/, '');
  const head = text.split(/\r?\n/)[0] || '';
  const delim = (head.split(';').length > head.split(',').length) ? ';' : ',';
  const rows = []; let row = [], field = '', inQ = false;
  for(let i=0;i<text.length;i++){
    const ch = text[i];
    if(inQ){
      if(ch === '"'){ if(text[i+1] === '"'){ field += '"'; i++; } else inQ = false; }
      else field += ch;
    }else{
      if(ch === '"') inQ = true;
      else if(ch === delim){ row.push(field); field = ''; }
      else if(ch === '\n'){ row.push(field); rows.push(row); row = []; field = ''; }
      else if(ch !== '\r') field += ch;
    }
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows.filter(r=>r.some(c=>String(c).trim() !== ''));
}

/* Colonnes acceptées (plusieurs orthographes tolérées) */
const CSV_COLS = {
  id:        ['id','identifiant','ref','reference'],
  name:      ['nom','name','item','modele','model','designation','libelle','materiel','matériel'],
  cat:       ['categorie','catégorie','famille','category'],
  subcat:    ['sous categorie','sous-categorie','souscategorie','sous_categorie','sous categorie','subcategory','type'],
  brand:     ['manufacturer','marque','fabricant','marque modele','marque/modele','brand'],
  serial:    ['serie','numero de serie','n serie','numero serie','serial','serial #','serial number','sn'],
  owner:     ['owner','proprietaire','propriétaire'],
  provider:  ['provider','fournisseur','vendeur','supplier','magasin'],
  price:     ['purchase price','price','prix','prix d achat','prix dachat','prix achat','cout','coût'],
  order:     ['sales order #','sales order','order #','order','bon de commande','commande','n commande','numero de commande','po','facture'],
  pdate:     ['purchase date','date','date achat','date d achat','date dachat','date de achat','bought','acheté le'],
  cond:      ['etat','état','condition'],
  home:      ['emplacement','lieu','rangement','location'],
  qty:       ['quantite','quantité','quantity','qte','qty','nombre'],
  notes:     ['notes','remarques','commentaire','commentaires']
};
function colIndexes(header){
  const idx = {};
  header.forEach((h,i)=>{
    const n = norm(h).replace(/[_\-/']/g,' ').replace(/\s+/g,' ').trim();
    for(const [key,aliases] of Object.entries(CSV_COLS)){
      if(aliases.some(a=>norm(a).replace(/[_\-/']/g,' ').replace(/\s+/g,' ').trim() === n)) idx[key] = i;
    }
  });
  return idx;
}

/* Anciens libellés français : l'import CSV les accepte toujours. */
const CAT_FR = {
  instruments: "Instruments",
  captation: "Micros & captation",
  peripheriques: "Périphs",
  pedales: "Pédales",
  di: "DI & splitters",
  amplification: "Amplification & écoute",
  consoles: "Consoles",
  mesure: "Mesure",
  informatique: "Informatique & interfaces",
  cablage: "Câblage & connectique",
  supports: "Supports & transport",
  divers: "Infrastructure & divers"
};
const SUB_FR = {
  instruments: {synthe: "Synthé / clavier", boite: "Boîte à rythmes / groovebox", guitare: "Guitare / basse", batterie: "Batterie", percussion: "Percussion", peau10: "Peau 10\"", peau12: "Peau 12\"", peau13: "Peau 13\"", peau14: "Peau 14\"", peau16: "Peau 16\"", peau18: "Peau 18\"", peau22: "Peau 22\"", peau_autre: "Peau — autre taille", autre_inst: "Autre instrument"},
  captation: {condensateur: "Micro condensateur", dynamique: "Micro dynamique", ruban: "Micro ruban", mesure_mic: "Micro de mesure", trigger: "Trigger", accessoire: "Accessoire micro"},
  peripheriques: {compresseur: "Compresseur", eq: "EQ", preampli: "Préampli", effets: "Effets", chassis: "Châssis 500"},
  pedales: {drive: "Drive / Distorsion", modulation: "Modulation", delay: "Delay", reverb: "Reverb", filtre: "Filtre / Wah", pitch: "Pitch / Octave", dynamique_p: "Dynamique", multi: "Multi-effets / Looper", alim: "Alimentation", accordeur: "Accordeur", footswitch: "Footswitch / expression"},
  di: {boite_di: "Boîte de direct", splitter: "Splitter", reamp: "Ré-amp"},
  amplification: {ampli_inst: "Ampli guitare / basse", monitoring: "Enceinte de monitoring", casque: "Casque", ampli_casque: "Ampli casque"},
  consoles: {console: "Console de mixage", extension: "Extension / rack", carte: "Carte I/O"},
  mesure: {outil: "Outil de mesure"},
  informatique: {interface: "Interface audio", ordinateur: "Ordinateur", convertisseur: "Convertisseur", controleur: "Contrôleur MIDI", stockage: "Stockage", reseau: "Réseau", midi: "Interface MIDI"},
  cablage: {xlr: "XLR", trs: "TRS", mini_trs: "Mini TRS", ts: "TS", mini_ts: "Mini TS", rca: "RCA", xlrf_trs: "XLR F / TRS", xlrm_trs: "XLR M / TRS", secteur: "Câble secteur", midi_cable: "MIDI", multipaire: "Multipaire audio", adaptateur: "Adaptateur", patchbay: "Patchbay"},
  supports: {pied: "Pied de micro", stand: "Stand", flightcase: "Flight case", housse: "Housse"},
  divers: {mobilier: "Mobilier", eclairage: "Éclairage", acoustique: "Traitement acoustique", electricite: "Électricité / alimentation", autre: "Divers"}
};

/* Résolution des libellés vers les clés internes.
   Accepte la clé, le libellé anglais actuel, ou l'ancien libellé français. */
function resolveCat(v){
  const n = norm(v); if(!n) return null;
  for(const [k,c] of Object.entries(CATS)) if(k===n || norm(c.label)===n) return k;
  for(const [k,lab] of Object.entries(CAT_FR)) if(norm(lab)===n && CATS[k]) return k;
  return null;
}
function resolveSub(cat, v){
  const n = norm(v); if(!cat || !n) return null;
  for(const [k,s] of Object.entries(subsOf(cat))) if(k===n || norm(s.label)===n) return k;
  const fr = SUB_FR[cat] || {};
  for(const [k,lab] of Object.entries(fr)) if(norm(lab)===n && subsOf(cat)[k]) return k;
  return null;
}
function resolveCond(v){
  const n = norm(v);
  if(!n) return 'bon';
  for(const [k,l] of Object.entries(CONDS)) if(k===n || norm(l)===n) return k;
  if(n.startsWith('bon') || n==='ok' || n==='ras') return 'bon';
  if(n.includes('hs') || n.includes('hors service')) return 'hs';
  if(n.includes('en repar') || n.includes('chez ')) return 'reparation';
  if(n.includes('attente') || n.includes('repar') || n.includes('a revoir')) return 'attente';
  return null;
}
function resolveLoc(v){
  const n = norm(v); if(!n) return null;
  const hit = db.locations.find(l=>norm(l.name)===n);
  return hit ? hit.name : null;
}

/* ---------- écran d'import ---------- */
let csvText = null;   // dernier fichier analysé (pour ré-analyser si l'emplacement par défaut change)
function openCsvImport(){
  csvPlan = null; csvText = null;
  const dl = document.getElementById('csv-defloc');
  if(dl) dl.innerHTML = '<option value="">— none (location becomes required) —</option>' + locOptions();
  document.getElementById('csv-file').value = "";
  document.getElementById('csv-preview').innerHTML =
    '<div class="muted">Pick a CSV file to see the preview.</div>';
  document.getElementById('csv-go').style.display = 'none';
  open_('ovCsv');
}

function downloadCsvTemplate(){
  const lignes = [
    'Categorie;Sous Categorie;Manufacturer;Item;Owner;Serial #;Provider;Sales order #;Purchase date;Quantity;Purchase Price;Emplacement;Etat;Notes;id',
    'Instruments;Synth / keyboard;Roland;Juno-106;AFM;JU12345;Second hand;SO-2024-118;12/03/2024;1;900;Studio A;Good;Serviced in 2025;',
    'Cables & connectors;XLR;;XLR 5m;AFM;;Thomann;;;12;9.90;Cable drawer;;;',
    'Microphones;Dynamic mic;Shure;SM58;AFM;;Thomann;;;4;99;;;;'
  ];
  const blob = new Blob(["﻿" + lignes.join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'inventory-template.csv';
  a.click();
}

/* Export de l'inventaire au même format (pour corriger dans un tableur
   puis réimporter : les identifiants font la correspondance) */
function exportCsv(){
  const esc2 = v => `"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const head = 'Categorie;Sous Categorie;Manufacturer;Item;Owner;Serial #;Provider;Sales order #;Purchase date;Quantity;Purchase Price;Emplacement;Etat;Notes;id';
  const lines = db.items.map(i=>[
    catLabel(i.cat), subLabel(i.cat,i.subcat), i.brand||'', i.name, i.owner||'', i.serial||'', i.provider||'',
    i.sales_order||'', i.purchase_date||'',
    1, i.price!=null?String(i.price).replace('.',','):'', i.home, CONDS[i.cond]||i.cond, i.notes||'', i.id
  ].map(esc2).join(';'));
  const blob = new Blob(["﻿" + [head, ...lines].join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'inventory-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
}

function onCsvChosen(input){
  const f = input.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = e => { csvText = e.target.result; analyseCsv(csvText); };
  rd.readAsText(f, 'utf-8');
}

function reanalyseCsv(){ if(csvText) analyseCsv(csvText); }
function csvDefaultLoc(){ const d = document.getElementById('csv-defloc'); return d ? d.value : ''; }

function analyseCsv(text){
  const rows = parseCSV(text);
  const box = document.getElementById('csv-preview');
  const go = document.getElementById('csv-go');
  if(rows.length < 2){
    box.innerHTML = '<div class="alert bad">Empty file, or no data rows.</div>';
    go.style.display = 'none'; return;
  }
  const idx = colIndexes(rows[0]);
  const missing = ['name','cat','subcat'].filter(k=>idx[k]===undefined);
  if(idx.home===undefined && !csvDefaultLoc()) missing.push('home');
  if(missing.length){
    const noms = {name:'Item', cat:'Category', subcat:'Sub Category', home:'Location (or pick a default location above)'};
    box.innerHTML = `<div class="alert bad">Missing required columns: <b>${missing.map(m=>noms[m]).join(', ')}</b>.<br>
      Use the template to start from a clean base.</div>`;
    go.style.display = 'none'; return;
  }

  const get = (r,k)=> idx[k]===undefined ? '' : String(r[idx[k]]||'').trim();
  const lignes = [], newLocs = new Set();
  let nCreate = 0, nUpdate = 0, nError = 0;

  rows.slice(1).forEach((r,n)=>{
    const L = {line:n+2, errors:[]};
    L.id     = get(r,'id');
    L.name   = get(r,'name');
    L.brand  = get(r,'brand');
    L.serial = get(r,'serial');
    L.notes  = get(r,'notes');
    L.owner  = get(r,'owner');
    L.provider = get(r,'provider');
    L.price  = parsePrice(get(r,'price'));
    if(get(r,'price') && L.price===null) L.errors.push(`unreadable price "${get(r,'price')}"`);
    L.sales_order = get(r,'order');
    L.purchase_date = parseDate(get(r,'pdate'));
    if(get(r,'pdate') && !L.purchase_date) L.errors.push(`unreadable date "${get(r,'pdate')}"`);
    L.qty    = Math.max(1, Math.min(200, parseInt(get(r,'qty')||'1',10) || 1));

    if(!L.name) L.errors.push("missing name");

    L.cat = resolveCat(get(r,'cat'));
    if(!L.cat) L.errors.push(`unknown category "${get(r,'cat')}"`);
    L.subcat = L.cat ? resolveSub(L.cat, get(r,'subcat')) : null;
    if(L.cat && !L.subcat) L.errors.push(`unknown sub-category "${get(r,'subcat')}"`);

    L.cond = resolveCond(get(r,'cond'));
    if(!L.cond){ L.errors.push(`unknown condition "${get(r,'cond')}"`); L.cond = 'bon'; }

    const rawLoc = get(r,'home') || csvDefaultLoc();
    L.home = resolveLoc(rawLoc);
    if(!L.home){
      if(rawLoc){ L.home = rawLoc; L.newLoc = true; newLocs.add(rawLoc); }
      else L.errors.push("missing location");
    }

    if(L.id){
      if(item(L.id)) L.mode = 'update';
      else { L.errors.push(`unknown ID "${L.id}"`); L.mode = 'error'; }
    }else L.mode = 'create';

    if(L.errors.length){ L.mode = 'error'; nError++; }
    else if(L.mode === 'update') nUpdate++;
    else nCreate += L.qty;

    lignes.push(L);
  });

  csvPlan = {lignes, newLocs:[...newLocs], nCreate, nUpdate, nError};

  const apercu = lignes.slice(0,60).map(L=>`<tr class="${L.mode==='error'?'csv-err':''}">
      <td>${L.line}</td>
      <td>${esc(L.name)}${L.qty>1?` <span class="muted">×${L.qty}</span>`:''}</td>
      <td>${L.cat?esc(subLabel(L.cat,L.subcat)||'—'):'—'}</td>
      <td>${esc(L.home||'—')}${L.newLoc?' <span class="tag attente">new</span>':''}</td>
      <td>${L.mode==='error' ? `<span class="tag hs">${esc(L.errors.join(' · '))}</span>`
            : L.mode==='update' ? '<span class="tag cat">update</span>'
            : '<span class="tag dispo">create</span>'}</td>
    </tr>`).join("");

  box.innerHTML = `
    <div class="csv-sum">
      <span class="tag dispo">${nCreate} to create</span>
      <span class="tag cat">${nUpdate} to update</span>
      ${nError?`<span class="tag hs">${nError} with errors</span>`:''}
    </div>
    ${csvPlan.newLocs.length ? `<div class="alert">📍 ${csvPlan.newLocs.length} location(s) will be created:
       <b>${csvPlan.newLocs.map(esc).join(', ')}</b>. Fix the file if these are typos.</div>`:''}
    ${nError?`<div class="alert bad">Rows with errors will be skipped.</div>`:''}
    <div class="csv-table"><table><thead><tr><th>Row</th><th>Name</th><th>Sub-category</th><th>Location</th><th>Result</th></tr></thead>
    <tbody>${apercu}</tbody></table>${lignes.length>60?`<div class="muted" style="padding:8px">… and ${lignes.length-60} more rows</div>`:''}</div>`;

  go.style.display = (nCreate + nUpdate) ? '' : 'none';
  go.textContent = `Import (${nCreate + nUpdate})`;
}

async function runCsvImport(){
  if(!csvPlan) return;
  const {lignes, newLocs, nCreate, nUpdate} = csvPlan;
  if(!confirm(`Confirm the import?\n\n• ${nCreate} item(s) created\n• ${nUpdate} item(s) updated\n• ${newLocs.length} location(s) created`)) return;

  close_('ovCsv');
  try{
    // 1. emplacements manquants
    for(const name of newLocs){
      db.locations.push({name, parent:null});
      await apiInsertLocation({name, parent:null});
    }

    // 2. mises à jour
    const updates = lignes.filter(L=>L.mode==='update');
    for(const L of updates){
      const i = item(L.id);
      const vals = {name:L.name, cat:L.cat, subcat:L.subcat, brand:L.brand,
                    serial:L.serial, cond:L.cond, home:L.home, notes:L.notes,
                    owner:L.owner, provider:L.provider, price:L.price,
                    sales_order:L.sales_order, purchase_date:L.purchase_date};
      Object.assign(i, vals);
      if(i.status==='dispo') i.loc = L.home;
      await apiUpdateItem(i.id, {...vals, loc:i.loc});
    }
    if(updates.length) await histMany(updates.map(L=>({itemId:L.id, type:'edit', detail:"updated by CSV import"})));

    // 3. créations
    const rows = [];
    lignes.filter(L=>L.mode==='create').forEach(L=>{
      const base = groupKeyOf(L.name) || L.name;
      const start = 1 + db.items.filter(x=>x.name===base || groupKeyOf(x.name)===base).length;
      for(let k=0;k<L.qty;k++){
        const id = uid(L.cat, L.subcat);
        const row = {id, name:(L.qty>1?`${base} #${start+k}`:L.name), cat:L.cat, subcat:L.subcat,
                     brand:L.brand, serial:L.serial, cond:L.cond, notes:L.notes, photo:null,
                     owner:L.owner, provider:L.provider, price:L.price,
                     sales_order:L.sales_order, purchase_date:L.purchase_date,
                     home:L.home, loc:L.home, status:'dispo', out:null};
        db.items.push(row); rows.push(row);
      }
    });
    for(let i=0;i<rows.length;i+=200) await apiInsertItems(rows.slice(i,i+200));
    for(let i=0;i<rows.length;i+=200)
      await histMany(rows.slice(i,i+200).map(r=>({itemId:r.id, type:'create', detail:"Added by CSV import"})));

    await refresh();
    toast(`Import complete — ${rows.length} created, ${updates.length} updated.`, 'ok', null, null, 6000);
  }catch(e){ /* l'erreur est déjà signalée par run() */ }
  csvPlan = null;
}
