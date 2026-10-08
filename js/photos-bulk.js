/* ============================================================
   IMPORT GROUPÉ DE PHOTOS
   Le nom du fichier désigne le modèle : « Juno-106.jpg » habille
   tous les exemplaires appelés « Juno-106 ». Les images sont
   recadrées au carré, réduites, puis déposées dans le stockage.
   ============================================================ */

const PHOTO_SIZE = 600;      // côté de l'image enregistrée
let photoPlan = null;        // résultat de l'analyse, en attente de validation

/* Clé de comparaison : sans accents, sans ponctuation, sans casse */
function pkey(s){
  return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'')
                .toLowerCase().replace(/[^a-z0-9]/g,'');
}

/* --- Niveaux de précision d'un nom de fichier ---
   Du plus précis au plus large. Un même nom peut correspondre à
   plusieurs niveaux : on retient toujours le plus précis.

     1  SYN-001.jpg          un item précis
     2  Roland Juno-106.jpg  marque + modèle
     3  Juno-106.jpg         un modèle, tous exemplaires
     4  Cordial XLR.jpg      une marque dans une sous-catégorie
     5  XLR.jpg              toute une sous-catégorie

   Le niveau 4 est celui qui sert aux câbles : une seule photo pour
   tous les Cordial XLR, quelle que soit la longueur, sans habiller
   au passage les XLR d'une autre marque. */
const PH_RANKS = ['', 'item', 'brand + model', 'model', 'brand + sub-category', 'sub-category'];
const PH_WIDE = 4;     // à partir d'ici, la correspondance est large

/* Un index par niveau : photoMatch() descend du plus précis au plus
   large et s'arrête au premier niveau qui connaît ce nom. */
function photoIndex(){
  const levels = [];
  const add = (rank, k, label, id)=>{
    if(!k) return;
    if(!levels[rank]) levels[rank] = new Map();
    const m = levels[rank];
    if(!m.has(k)) m.set(k, {label, ids:new Set()});
    m.get(k).ids.add(id);
  };
  db.items.forEach(i=>{
    const base  = groupKeyOf(i.name) || i.name;
    const brand = (i.brand||'').trim();
    const subL  = subLabel(i.cat, i.subcat) || '';
    const subC  = ((subsOf(i.cat)||{})[i.subcat]||{}).code || '';

    add(1, pkey(i.id), i.id, i.id);
    add(3, pkey(base), base, i.id);
    if(brand) add(2, pkey(brand + ' ' + base), brand + ' ' + base, i.id);

    // La sous-catégorie se désigne par son libellé ou par son code :
    // « XLR.jpg » marche dans les deux cas.
    [subL, subC].filter(Boolean).forEach(s=>{
      add(5, pkey(s), subL || s, i.id);
      if(brand) add(4, pkey(brand + ' ' + s), brand + ' ' + (subL || s), i.id);
    });
  });
  return levels;
}

function photoMatch(levels, key){
  for(let r = 1; r < levels.length; r++){
    const m = levels[r];
    if(m && m.has(key)){
      const e = m.get(key);
      return {label:e.label, ids:[...e.ids], rank:r};
    }
  }
  return null;
}

/* Recadrage carré automatique, centré, réduit à PHOTO_SIZE */
async function squareFromFile(file){
  /* Passe par le décodeur commun : il lit ce que le navigateur sait
     lire, et nomme le format quand il ne sait pas — un HEIC échouait
     ici sous un « unreadable image » qui n'aidait personne. */
  const prepared = await fileToJpeg(file, 2048);
  return new Promise((resolve, reject)=>{
    const rd = {onload:null, onerror:null,
      readAsDataURL(){ this.onload({target:{result: prepared}}); }};
    rd.onload = e=>{
      const img = new Image();
      img.onload = ()=>{
        const side = Math.min(img.width, img.height);
        const c = document.createElement('canvas');
        c.width = c.height = PHOTO_SIZE;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,PHOTO_SIZE,PHOTO_SIZE);
        ctx.drawImage(img, (img.width-side)/2, (img.height-side)/2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = ()=> reject(new Error(photoFormatMessage(file)));
      img.src = e.target.result;
    };
    rd.onerror = ()=> reject(new Error(photoFormatMessage(file)));
    rd.readAsDataURL(file);
  });
}

/* ---------- écran ---------- */
function openPhotoImport(){
  photoPlan = null;
  document.getElementById('ph-file').value = "";
  document.getElementById('ph-preview').innerHTML =
    '<div class="muted">Pick your images — the file name decides what they cover.</div>';
  document.getElementById('ph-go').style.display = 'none';
  open_('ovPhotos');
}

function onPhotosChosen(input){
  const files = [...input.files];
  if(!files.length) return;
  const levels = photoIndex();

  const lignes = files.map(f=>{
    const nom = f.name.replace(/\.[^.]+$/,'');
    const hit = photoMatch(levels, pkey(nom));
    return {file:f, nom, poids:f.size,
            cible: hit ? hit.label : null,
            rank: hit ? hit.rank : 99,
            vises: hit ? hit.ids : [],      // ce que le nom désigne
            ids: []};                        // ce qui lui restera après arbitrage
  });

  /* Arbitrage : le fichier le plus précis l'emporte.
     « XLR 3m.jpg » et « Cordial XLR.jpg » dans le même lot, ce n'est
     pas un conflit mais une hiérarchie : les câbles de 3 m prennent
     leur photo dédiée, les autres Cordial XLR la générique. Sans
     cette règle, l'ordre de traitement déciderait à ta place. */
  const prisPar = new Map();                 // id -> niveau qui l'a pris
  lignes.filter(l=>l.vises.length)
        .sort((a,b)=>a.rank - b.rank)
        .forEach(l=>{
    const perdus = [];
    l.vises.forEach(id=>{
      if(!prisPar.has(id)){ prisPar.set(id, l.rank); l.ids.push(id); }
      else perdus.push(prisPar.get(id));
    });
    l.affine  = perdus.filter(r=>r < l.rank).length;   // repris par plus précis : normal
    l.doublon = perdus.filter(r=>r === l.rank).length; // deux fichiers au même niveau : conflit
  });

  const ok = lignes.filter(l=>l.ids.length);
  photoPlan = {lignes, nItems: ok.reduce((n,l)=>n+l.ids.length, 0), nFiles: ok.length};

  const sansPhoto = db.items.filter(i=>!i.photo).length;
  const nLarge = ok.filter(l=>l.rank >= PH_WIDE).length;
  const nVides = lignes.filter(l=>l.vises.length && !l.ids.length).length;

  const apercu = lignes.slice(0,80).map(l=>{
    if(!l.vises.length) return `<tr class="csv-err"><td>${esc(l.nom)}</td>
      <td><span class="tag hs">nothing matches that name</span></td>
      <td class="muted">${Math.round(l.poids/1024)} Ko</td></tr>`;
    const large = l.rank >= PH_WIDE;
    return `<tr class="${l.ids.length?'':'csv-warn'}">
      <td>${esc(l.nom)}</td>
      <td>${esc(l.cible)}
        <span class="tag ${large?'attente':'dispo'}">${l.ids.length} item${l.ids.length===1?'':'s'}</span>
        <span class="muted">${PH_RANKS[l.rank]}</span>
        ${l.affine ? `<span class="muted">· ${l.affine} covered by a more specific file</span>` : ''}
        ${l.doublon ? ' <span class="tag hs">⚠ another file targets the same items</span>' : ''}
        ${!l.ids.length ? ' <span class="tag pinactif">nothing left to cover</span>' : ''}</td>
      <td class="muted">${Math.round(l.poids/1024)} Ko</td></tr>`;
  }).join("");

  document.getElementById('ph-preview').innerHTML = `
    <div class="csv-sum">
      <span class="tag dispo">${photoPlan.nFiles} photo(s) matched</span>
      <span class="tag cat">${photoPlan.nItems} item(s) covered</span>
      ${nLarge ? `<span class="tag attente">${nLarge} wide match(es)</span>`:''}
      ${lignes.length - ok.length - nVides ? `<span class="tag hs">${lignes.length - ok.length - nVides} unmatched</span>`:''}
      ${lignes.some(l=>l.doublon) ? `<span class="tag hs">${lignes.filter(l=>l.doublon).length} conflict(s)</span>`:''}
      <span class="muted">· ${sansPhoto} item(s) still without a photo</span>
    </div>
    ${nLarge ? `<div class="alert">A wide match replaces the photo of every item it covers.
      Check the counts below before uploading.</div>` : ''}
    <div class="csv-table"><table><thead><tr><th>File</th><th>Match</th><th>Size</th></tr></thead>
    <tbody>${apercu}</tbody></table>
    ${lignes.length>80?`<div class="muted" style="padding:8px">… and ${lignes.length-80} more</div>`:''}</div>`;

  const go = document.getElementById('ph-go');
  go.style.display = photoPlan.nFiles ? '' : 'none';
  go.textContent = `Upload ${photoPlan.nFiles} photo(s)`;
}

async function runPhotoImport(){
  if(!photoPlan || !photoPlan.nFiles) return;
  const lignes = photoPlan.lignes.filter(l=>l.ids.length);
  const larges = lignes.filter(l=>l.rank >= PH_WIDE);
  const detail = larges.length
    ? `\n\nWide matches:\n` + larges.slice(0,8).map(l=>`  • ${l.cible} → ${l.ids.length} items`).join('\n')
      + (larges.length>8 ? `\n  … and ${larges.length-8} more` : '')
    : '';
  if(!confirm(`Upload ${lignes.length} photo(s) and cover ${photoPlan.nItems} item(s)?`
    + `\n\nExisting photos on those items will be replaced.` + detail)) return;

  const bar = document.getElementById('ph-preview');
  let faits = 0, echecs = [];
  for(const l of lignes){
    bar.innerHTML = `<div class="alert">📤 Uploading… <b>${faits}/${lignes.length}</b><br>
      <span class="muted">${esc(l.nom)}</span></div>`;
    try{
      const data = await squareFromFile(l.file);
      const url  = await apiUploadPhoto(data, `models/${pkey(l.cible)}.jpg`);
      l.ids.forEach(id=>{ const it = item(id); if(it) it.photo = url; });
      await apiUpdateItemsIn(l.ids, {photo:url});
      faits++;
    }catch(e){ echecs.push(l.nom); }
  }
  close_('ovPhotos');
  await refresh();
  if(echecs.length) toast(`${faits} photo(s) uploaded, ${echecs.length} failed: ${echecs.slice(0,3).join(', ')}`, 'error', null, null, 10000);
  else toast(`${faits} photo(s) uploaded — ${photoPlan.nItems} item(s) covered.`, 'ok', null, null, 6000);
  photoPlan = null;
}

/* Liste des noms de fichiers attendus, pour préparer la séance photo */
function listeNomsPhotos(){
  /* Deux sections : un nom par mod\u00e8le, puis un nom par marque dans
     chaque sous-cat\u00e9gorie. C'est cette seconde liste qui sert aux
     c\u00e2bles, o\u00f9 une photo couvre toutes les longueurs d'une marque. */
  const parModele = new Map(), parMarqueSub = new Map();

  db.items.forEach(i=>{
    const base  = groupKeyOf(i.name) || i.name;
    const brand = (i.brand||'').trim();
    const cat   = catPath(i);

    const km = pkey(brand + ' ' + base);
    if(!parModele.has(km)) parModele.set(km, {nom:`${brand} ${base}`.trim(), n:0, photo:false, cat, scope:'model'});
    const m = parModele.get(km); m.n++; if(i.photo) m.photo = true;

    const subL = subLabel(i.cat, i.subcat) || '';
    if(subL){
      const ks = pkey(brand + ' ' + subL);
      if(!parMarqueSub.has(ks)) parMarqueSub.set(ks, {nom:`${brand} ${subL}`.trim(), n:0, photo:false, cat, scope:'brand + sub-category'});
      const s = parMarqueSub.get(ks); s.n++; if(i.photo) s.photo = true;
    }
  });

  const esc2 = v => `"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const ligne = e => [e.nom + '.jpg', e.scope, e.n, e.photo?'some':'no', e.cat].map(esc2).join(';');
  const tri = (a,b)=> a.cat.localeCompare(b.cat) || a.nom.localeCompare(b.nom);

  // Une marque qui n'a qu'un seul item dans sa sous-cat\u00e9gorie n'a pas
  // besoin d'une ligne \u00ab large \u00bb : son nom de mod\u00e8le suffit.
  const lignes = [
    ...[...parModele.values()].sort(tri).map(ligne),
    ...[...parMarqueSub.values()].filter(e=>e.n > 1).sort(tri).map(ligne)
  ];
  const head = 'Expected file name;Scope;Items covered;Photo already set;Category';
  const blob = new Blob(["\ufeff" + [head, ...lignes].join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'expected-photo-names.csv';
  a.click();
}

/* ---------- reprise des photos enregistrées avant le stockage ---------- */
async function migrerPhotos(){
  const vieilles = db.items.filter(i=>i.photo && i.photo.startsWith('data:'));
  if(!vieilles.length){ toast("No photo to move — everything is already in storage.", 'ok'); return; }
  if(!confirm(`Move ${vieilles.length} photo(s) from the database to storage?\n\nNothing changes visually — the app simply gets faster.`)) return;
  let n = 0;
  for(const i of vieilles){
    try{
      const url = await apiUploadPhoto(i.photo, `items/${i.id}.jpg`);
      i.photo = url;
      await apiUpdateItem(i.id, {photo:url});
      n++;
    }catch(e){ /* signalé par apiUploadPhoto */ }
  }
  await refresh();
  toast(`${n} photo(s) moved to storage.`, 'ok', null, null, 6000);
}
