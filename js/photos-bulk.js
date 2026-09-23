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

/* Toutes les façons de désigner un item : identifiant, modèle, marque + modèle */
function photoIndex(){
  const map = new Map();
  const add = (k, label, id)=>{
    if(!k) return;
    if(!map.has(k)) map.set(k, {label, ids:[]});
    map.get(k).ids.push(id);
  };
  db.items.forEach(i=>{
    const base = groupKeyOf(i.name) || i.name;
    add(pkey(i.id), i.id, i.id);
    add(pkey(base), base, i.id);
    if(i.brand) add(pkey(i.brand + ' ' + base), i.brand + ' ' + base, i.id);
  });
  return map;
}

/* Recadrage carré automatique, centré, réduit à PHOTO_SIZE */
function squareFromFile(file){
  return new Promise((resolve, reject)=>{
    const rd = new FileReader();
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
      img.onerror = ()=> reject(new Error('unreadable image'));
      img.src = e.target.result;
    };
    rd.onerror = ()=> reject(new Error('cannot read file'));
    rd.readAsDataURL(file);
  });
}

/* ---------- écran ---------- */
function openPhotoImport(){
  photoPlan = null;
  document.getElementById('ph-file').value = "";
  document.getElementById('ph-preview').innerHTML =
    '<div class="muted">Pick your images — the file name must match the item model.</div>';
  document.getElementById('ph-go').style.display = 'none';
  open_('ovPhotos');
}

function onPhotosChosen(input){
  const files = [...input.files];
  if(!files.length) return;
  const idx = photoIndex();
  const lignes = files.map(f=>{
    const nom = f.name.replace(/\.[^.]+$/,'');
    const hit = idx.get(pkey(nom));
    return {file:f, nom, cible:hit ? hit.label : null, ids:hit ? hit.ids : [], poids:f.size};
  });
  // Deux fichiers qui visent le même item : le dernier écraserait le premier.
  // On compare les items visés, pas les noms de fichier (« Juno-106 » et
  // « Roland Juno-106 » désignent le même synthé).
  const parItem = {};
  lignes.forEach(l=>l.ids.forEach(id=>{ parItem[id] = (parItem[id]||0)+1; }));
  lignes.forEach(l=>{ l.doublon = l.ids.some(id=>parItem[id] > 1); });

  const ok = lignes.filter(l=>l.ids.length);
  photoPlan = {lignes, nItems: ok.reduce((n,l)=>n+l.ids.length, 0), nFiles: ok.length};

  const sansPhoto = db.items.filter(i=>!i.photo).length;
  const apercu = lignes.slice(0,80).map(l=>`<tr class="${l.ids.length?'':'csv-err'}">
      <td>${esc(l.nom)}</td>
      <td>${l.ids.length
        ? `${esc(l.cible)} <span class="tag dispo">${l.ids.length} cop${l.ids.length>1?'ies':'y'}</span>`
          + (l.doublon ? ' <span class="tag attente">⚠ several files target this item</span>' : '')
        : '<span class="tag hs">no item with that name</span>'}</td>
      <td class="muted">${Math.round(l.poids/1024)} Ko</td>
    </tr>`).join("");

  document.getElementById('ph-preview').innerHTML = `
    <div class="csv-sum">
      <span class="tag dispo">${photoPlan.nFiles} photo(s) matched</span>
      <span class="tag cat">${photoPlan.nItems} item(s) covered</span>
      ${lignes.length-photoPlan.nFiles ? `<span class="tag hs">${lignes.length-photoPlan.nFiles} unmatched</span>`:''}
      ${lignes.some(l=>l.doublon) ? `<span class="tag attente">${lignes.filter(l=>l.doublon).length} duplicate(s)</span>`:''}
      <span class="muted">· ${sansPhoto} item(s) still without a photo</span>
    </div>
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
  if(!confirm(`Upload ${lignes.length} photo(s) and cover ${photoPlan.nItems} item(s)?\n\nExisting photos on those items will be replaced.`)) return;

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
  const vus = new Map();
  db.items.forEach(i=>{
    const base = groupKeyOf(i.name) || i.name;
    const k = pkey(i.brand + ' ' + base);
    if(!vus.has(k)) vus.set(k, {brand:i.brand||'', base, n:0, photo:!!i.photo, cat:catPath(i)});
    const e = vus.get(k); e.n++; if(i.photo) e.photo = true;
  });
  const esc2 = v => `"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const lignes = [...vus.values()]
    .sort((a,b)=> a.cat.localeCompare(b.cat) || a.base.localeCompare(b.base))
    .map(e=>[`${e.brand} ${e.base}`.trim() + '.jpg', e.brand, e.base, e.n, e.photo?'yes':'no', e.cat].map(esc2).join(';'));
  const head = 'Expected file name;Manufacturer;Model;Copies;Photo already set;Category';
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
