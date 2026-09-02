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
  name:      ['nom','name','designation','libelle','materiel','matériel'],
  cat:       ['categorie','catégorie','famille','category'],
  subcat:    ['sous categorie','sous-categorie','souscategorie','sous_categorie','sous categorie','subcategory','type'],
  brand:     ['manufacturer','marque','fabricant','modele','marque modele','marque/modele','brand'],
  serial:    ['serie','numero de serie','n serie','numero serie','serial','sn'],
  cond:      ['etat','état','condition'],
  home:      ['emplacement','lieu','rangement','location'],
  qty:       ['quantite','quantité','qte','qty','nombre'],
  notes:     ['notes','remarques','commentaire','commentaires']
};
function colIndexes(header){
  const idx = {};
  header.forEach((h,i)=>{
    const n = norm(h).replace(/[_-]/g,' ');
    for(const [key,aliases] of Object.entries(CSV_COLS)){
      if(aliases.some(a=>norm(a).replace(/[_-]/g,' ') === n)) idx[key] = i;
    }
  });
  return idx;
}

/* Résolution des libellés vers les clés internes */
function resolveCat(v){
  const n = norm(v); if(!n) return null;
  for(const [k,c] of Object.entries(CATS)) if(k===n || norm(c.label)===n) return k;
  return null;
}
function resolveSub(cat, v){
  const n = norm(v); if(!cat || !n) return null;
  for(const [k,s] of Object.entries(subsOf(cat))) if(k===n || norm(s.label)===n) return k;
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
function openCsvImport(){
  csvPlan = null;
  document.getElementById('csv-file').value = "";
  document.getElementById('csv-preview').innerHTML =
    '<div class="muted">Choisis un fichier CSV pour voir l\'aperçu.</div>';
  document.getElementById('csv-go').style.display = 'none';
  open_('ovCsv');
}

function downloadCsvTemplate(){
  const lignes = [
    'id;manufacturer;nom;categorie;sous_categorie;numero_serie;etat;emplacement;quantite;notes',
    ';Roland;Juno-106;Instruments;Synthé / clavier;JU12345;Bon état;Studio A;1;Révisé en 2025',
    ';;Câble XLR 5m;Câblage & connectique;Câble XLR;;Bon état;Tiroir câbles;12;',
    ';Shure;SM58;Micros & captation;Micro dynamique;;Bon état;Régie;4;'
  ];
  const blob = new Blob(["﻿" + lignes.join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'modele-inventaire.csv';
  a.click();
}

/* Export de l'inventaire au même format (pour corriger dans un tableur
   puis réimporter : les identifiants font la correspondance) */
function exportCsv(){
  const esc2 = v => `"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const head = 'id;manufacturer;nom;categorie;sous_categorie;numero_serie;etat;emplacement;quantite;notes';
  const lines = db.items.map(i=>[
    i.id, i.name, catLabel(i.cat), subLabel(i.cat,i.subcat), i.brand||'', i.serial||'',
    CONDS[i.cond]||i.cond, i.home, 1, i.notes||''
  ].map(esc2).join(';'));
  const blob = new Blob(["﻿" + [head, ...lines].join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'inventaire-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
}

function onCsvChosen(input){
  const f = input.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = e => analyseCsv(e.target.result);
  rd.readAsText(f, 'utf-8');
}

function analyseCsv(text){
  const rows = parseCSV(text);
  const box = document.getElementById('csv-preview');
  const go = document.getElementById('csv-go');
  if(rows.length < 2){
    box.innerHTML = '<div class="alert bad">Fichier vide ou sans ligne de données.</div>';
    go.style.display = 'none'; return;
  }
  const idx = colIndexes(rows[0]);
  const missing = ['name','cat','subcat','home'].filter(k=>idx[k]===undefined);
  if(missing.length){
    const noms = {name:'nom', cat:'categorie', subcat:'sous_categorie', home:'emplacement'};
    box.innerHTML = `<div class="alert bad">Colonnes obligatoires absentes : <b>${missing.map(m=>noms[m]).join(', ')}</b>.<br>
      Utilise le modèle pour repartir sur de bonnes bases.</div>`;
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
    L.qty    = Math.max(1, Math.min(200, parseInt(get(r,'qty')||'1',10) || 1));

    if(!L.name) L.errors.push("nom manquant");

    L.cat = resolveCat(get(r,'cat'));
    if(!L.cat) L.errors.push(`catégorie inconnue « ${get(r,'cat')} »`);
    L.subcat = L.cat ? resolveSub(L.cat, get(r,'subcat')) : null;
    if(L.cat && !L.subcat) L.errors.push(`sous-catégorie inconnue « ${get(r,'subcat')} »`);

    L.cond = resolveCond(get(r,'cond'));
    if(!L.cond){ L.errors.push(`état inconnu « ${get(r,'cond')} »`); L.cond = 'bon'; }

    const rawLoc = get(r,'home');
    L.home = resolveLoc(rawLoc);
    if(!L.home){
      if(rawLoc){ L.home = rawLoc; L.newLoc = true; newLocs.add(rawLoc); }
      else L.errors.push("emplacement manquant");
    }

    if(L.id){
      if(item(L.id)) L.mode = 'update';
      else { L.errors.push(`identifiant inconnu « ${L.id} »`); L.mode = 'error'; }
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
      <td>${esc(L.home||'—')}${L.newLoc?' <span class="tag attente">nouveau</span>':''}</td>
      <td>${L.mode==='error' ? `<span class="tag hs">${esc(L.errors.join(' · '))}</span>`
            : L.mode==='update' ? '<span class="tag cat">mise à jour</span>'
            : '<span class="tag dispo">création</span>'}</td>
    </tr>`).join("");

  box.innerHTML = `
    <div class="csv-sum">
      <span class="tag dispo">${nCreate} à créer</span>
      <span class="tag cat">${nUpdate} à mettre à jour</span>
      ${nError?`<span class="tag hs">${nError} en erreur</span>`:''}
    </div>
    ${csvPlan.newLocs.length ? `<div class="alert">📍 ${csvPlan.newLocs.length} emplacement(s) seront créés :
       <b>${csvPlan.newLocs.map(esc).join(', ')}</b>. Corrige le fichier si ce sont des fautes de frappe.</div>`:''}
    ${nError?`<div class="alert bad">Les lignes en erreur seront ignorées.</div>`:''}
    <div class="csv-table"><table><thead><tr><th>Ligne</th><th>Nom</th><th>Sous-catégorie</th><th>Emplacement</th><th>Résultat</th></tr></thead>
    <tbody>${apercu}</tbody></table>${lignes.length>60?`<div class="muted" style="padding:8px">… et ${lignes.length-60} autres lignes</div>`:''}</div>`;

  go.style.display = (nCreate + nUpdate) ? '' : 'none';
  go.textContent = `Importer (${nCreate + nUpdate})`;
}

async function runCsvImport(){
  if(!csvPlan) return;
  const {lignes, newLocs, nCreate, nUpdate} = csvPlan;
  if(!confirm(`Confirmer l'import ?\n\n• ${nCreate} item(s) créé(s)\n• ${nUpdate} item(s) mis à jour\n• ${newLocs.length} emplacement(s) créé(s)`)) return;

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
                    serial:L.serial, cond:L.cond, home:L.home, notes:L.notes};
      Object.assign(i, vals);
      if(i.status==='dispo') i.loc = L.home;
      await apiUpdateItem(i.id, {...vals, loc:i.loc});
    }
    if(updates.length) await histMany(updates.map(L=>({itemId:L.id, type:'edit', detail:"mis à jour par import CSV"})));

    // 3. créations
    const rows = [];
    lignes.filter(L=>L.mode==='create').forEach(L=>{
      const base = groupKeyOf(L.name) || L.name;
      const start = 1 + db.items.filter(x=>x.name===base || groupKeyOf(x.name)===base).length;
      for(let k=0;k<L.qty;k++){
        const id = uid(L.cat, L.subcat);
        const row = {id, name:(L.qty>1?`${base} #${start+k}`:L.name), cat:L.cat, subcat:L.subcat,
                     brand:L.brand, serial:L.serial, cond:L.cond, notes:L.notes, photo:null,
                     home:L.home, loc:L.home, status:'dispo', out:null};
        db.items.push(row); rows.push(row);
      }
    });
    for(let i=0;i<rows.length;i+=200) await apiInsertItems(rows.slice(i,i+200));
    for(let i=0;i<rows.length;i+=200)
      await histMany(rows.slice(i,i+200).map(r=>({itemId:r.id, type:'create', detail:"Ajout par import CSV"})));

    await refresh();
    toast(`Import terminé : ${rows.length} créé(s), ${updates.length} mis à jour.`, 'ok', null, null, 6000);
  }catch(e){ /* l'erreur est déjà signalée par run() */ }
  csvPlan = null;
}
