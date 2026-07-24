/* ============================================================
   VUE — Inventaire : liste + filtres, formulaire item,
   fiche détail, étiquette/QR, check-out / check-in
   ============================================================ */

/* ---- liste + filtres ---- */
function fillFilters(){
  const fc = document.getElementById('fCat'), keep = fc.value;
  fc.innerHTML = '<option value="">Catégorie : toutes</option>' + Object.entries(CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
  fc.value = keep;
  const fl = document.getElementById('fLoc'), keepL = fl.value;
  fl.innerHTML = '<option value="">Emplacement : tous</option>' + locOptions();
  fl.value = keepL;
}
function renderInv(){
  const q = (document.getElementById('q').value||"").toLowerCase();
  const cat = document.getElementById('fCat').value, st = document.getElementById('fStatus').value;
  const lo = document.getElementById('fLoc').value, co = document.getElementById('fCond').value;
  const rows = db.items.filter(i=>{
    if(q && !(i.name+" "+i.brand+" "+i.serial+" "+i.id+" "+(i.notes||"")).toLowerCase().includes(q)) return false;
    if(cat && i.cat!==cat) return false;
    if(st && i.status!==st) return false;
    if(lo && !inLocFilter(lo,i.loc) && !inLocFilter(lo,i.home)) return false;
    if(co && i.cond!==co) return false;
    return true;
  });
  if(!rows.length){ document.getElementById('invList').innerHTML = '<div class="empty">Aucun item ne correspond.</div>'; return; }
  document.getElementById('invList').innerHTML = `<table><thead><tr>
    <th></th><th>Item</th><th>Catégorie</th><th>Statut</th><th>Emplacement</th><th>État</th><th></th>
  </tr></thead><tbody>` + rows.map(i=>`
    <tr class="rowlink" onclick="openDetail('${i.id}')">
      <td>${i.photo?`<img class="thumb" src="${i.photo}">`:""}</td>
      <td data-l="Item"><b>${esc(i.name)}</b><br><span class="mono">${i.id}</span>${i.brand?` <span class="muted">· ${esc(i.brand)}</span>`:""}</td>
      <td data-l="Catégorie"><span class="tag cat">${CATS[i.cat]||i.cat}</span></td>
      <td data-l="Statut">${statusTag(i)}</td>
      <td data-l="Emplacement">${esc(i.status==='sorti'?i.loc:locLabel(i.loc))}${i.loc!==i.home?` <span class="muted">(réf : ${esc(locLabel(i.home))})</span>`:""}</td>
      <td data-l="État"><span class="tag ${i.cond}">${CONDS[i.cond]||i.cond}</span></td>
      <td onclick="event.stopPropagation()">${actionBtn(i)}</td>
    </tr>`).join("") + "</tbody></table>";
}
function statusTag(i){
  if(i.status==='dispo') return '<span class="tag dispo">Disponible</span>';
  const od = overdue(i);
  return `<span class="tag ${od?'hs':'sorti'}">Sorti · ${daysSince(i.out.date)} j${od?' ⚠️':''}</span>`;
}
function actionBtn(i){
  return i.status==='dispo'
    ? `<button class="btn small" onclick="openCheckout('${i.id}')">Check-out</button>`
    : `<button class="btn small ok" onclick="openCheckin('${i.id}')">Check-in</button>`;
}

/* ---- formulaire item (ajout / modification) ---- */
let editingId = null;
function openItemForm(id){
  editingId = id||null;
  document.getElementById('itemFormTitle').textContent = id?'Modifier l\'item':'Ajouter un item';
  document.getElementById('i-cat').innerHTML = Object.entries(CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
  document.getElementById('i-home').innerHTML = locOptions();
  const i = id?item(id):null;
  document.getElementById('i-name').value = i?i.name:"";
  document.getElementById('i-cat').value = i?i.cat:"cable";
  document.getElementById('i-brand').value = i?i.brand:"";
  document.getElementById('i-serial').value = i?i.serial:"";
  document.getElementById('i-cond').value = i?i.cond:"bon";
  if(i) document.getElementById('i-home').value = i.home;
  document.getElementById('i-notes').value = i?i.notes:"";
  document.getElementById('i-photo').value = "";
  document.getElementById('qtyField').style.display = id?'none':'';
  document.getElementById('i-qty').value = 1;
  open_('ovItem');
}
function saveItem(){
  const name = document.getElementById('i-name').value.trim();
  if(!name){ alert("Le nom est obligatoire."); return; }
  if(!db.locations.length){ alert("Créez d'abord un emplacement (onglet Emplacements)."); return; }
  const vals = {
    name, cat:document.getElementById('i-cat').value, brand:document.getElementById('i-brand').value.trim(),
    serial:document.getElementById('i-serial').value.trim(), cond:document.getElementById('i-cond').value,
    home:document.getElementById('i-home').value, notes:document.getElementById('i-notes').value.trim()
  };
  const file = document.getElementById('i-photo').files[0];
  const finish = async (photo)=>{
    if(editingId){
      const i = item(editingId);
      const movedHome = i.home!==vals.home;
      const condChanged = i.cond!==vals.cond;
      Object.assign(i,vals);
      if(photo) i.photo = photo;
      if(i.status==='dispo' && movedHome) i.loc = vals.home;
      await apiUpdateItem(i.id, {...vals, photo:i.photo, loc:i.loc});
      if(movedHome && i.status==='dispo') await hist(i.id,'move',`nouvel emplacement de référence : ${locLabel(vals.home)}`);
      if(condChanged) await hist(i.id,'repair',REPACT[vals.cond]||`état : ${CONDS[vals.cond]}`,null,vals.cond);
      else await hist(i.id,'edit');
    }else{
      const qty = Math.max(1, Math.min(200, parseInt(document.getElementById('i-qty').value)||1));
      const start = 1 + db.items.filter(x=>x.name===name || x.name.startsWith(name+' #')).length;
      const rows = [];
      for(let k=0;k<qty;k++){
        const id = uid(vals.cat);
        const nm = qty>1 ? `${name} #${start+k}` : name;
        const row = {id,...vals,name:nm,photo:photo||null,loc:vals.home,status:"dispo",out:null};
        db.items.push(row); rows.push(row);
      }
      await apiInsertItems(rows);
      for(const r2 of rows) await hist(r2.id,'create',"Ajout à l'inventaire");
    }
    close_('ovItem'); render();
  };
  if(file){
    const img = new Image(), rd = new FileReader();
    rd.onload = e=>{ img.onload = ()=>{
      const c = document.createElement('canvas'), s = Math.min(1, 400/Math.max(img.width,img.height));
      c.width = img.width*s; c.height = img.height*s;
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      finish(c.toDataURL('image/jpeg',.75));
    }; img.src = e.target.result; };
    rd.readAsDataURL(file);
  } else finish(null);
}
async function deleteItem(id){
  if(!confirm("Supprimer définitivement cet item et son historique ?")) return;
  db.items = db.items.filter(i=>i.id!==id);
  db.history = db.history.filter(h=>h.itemId!==id);
  await apiDeleteItem(id);
  close_('ovDetail'); render();
}

/* ---- check-out / check-in ---- */
let actionId = null;
function openCheckout(id){
  if(!db.users.length){ alert("Ajoutez d'abord une personne (onglet Personnes)."); return; }
  actionId = id;
  document.getElementById('out-item').textContent = item(id).name;
  document.getElementById('out-user').innerHTML = db.users.map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join("");
  document.getElementById('out-reason').value = "";
  document.getElementById('out-due').value = "";
  document.getElementById('out-alert').checked = true;
  open_('ovOut');
}
async function doCheckout(){
  const reason = document.getElementById('out-reason').value.trim();
  if(!reason){ alert("Indiquez la destination ou la raison."); return; }
  const due = document.getElementById('out-due').value || null;
  const alertOn = document.getElementById('out-alert').checked;
  const i = item(actionId), userId = document.getElementById('out-user').value;
  i.status = 'sorti';
  i.out = {userId, date:now(), reason, due, alertOn};
  i.loc = reason;
  await apiUpdateItem(i.id, {status:i.status,out:i.out,loc:i.loc});
  await hist(i.id,'out',reason + (due?` — retour prévu le ${fdateD(due)}`:''),userId);
  close_('ovOut'); render();
}
function openCheckin(id){
  actionId = id;
  const i = item(id);
  document.getElementById('in-item').textContent = i.name;
  document.getElementById('in-cond').value = i.cond;
  document.getElementById('in-note').value = "";
  open_('ovIn');
}
async function doCheckin(){
  const i = item(actionId);
  const cond = document.getElementById('in-cond').value, note = document.getElementById('in-note').value.trim();
  const userId = i.out?i.out.userId:null;
  i.status = 'dispo'; i.cond = cond; i.loc = i.home; i.out = null;
  await apiUpdateItem(i.id, {status:i.status,cond,loc:i.loc,out:null});
  await hist(i.id,'in',note,userId,cond);
  close_('ovIn'); render();
}

/* ---- fiche item ---- */
function openDetail(id){
  const i = item(id);
  const rows = db.history.filter(h=>h.itemId===id).map(h=>
    `<li>${histIcon(h.type)} ${histText(h)}<div class="when">${fdate(h.date)}</div></li>`).join("");
  const outInfo = i.status==='sorti'
    ? `<div class="alert ${overdue(i)?'bad':''}">📤 Sorti depuis le <b>${fdate(i.out.date)}</b> (${daysSince(i.out.date)} j) — <b>${esc(outBy(i))}</b> · ${esc(i.out.reason)}${i.out.due?`<br>Retour prévu le <b>${fdateD(i.out.due)}</b>${overdue(i)?` — <span class="days-late">en retard de ${daysLate(i)} j</span>`:''}`:''}</div>` : "";
  const repBtns = i.cond==='bon'
    ? `<button class="btn sec small" onclick="openRepair('${i.id}','attente')">Signaler à réparer</button>`
    : `<button class="btn small ok" onclick="openRepair('${i.id}','bon')">Marquer réparé</button>`;
  document.getElementById('detailBody').innerHTML = `
    <h3>${esc(i.name)} <span class="mono">${i.id}</span></h3>
    ${i.photo?`<img class="itemphoto" src="${i.photo}">`:""}
    <p style="margin-bottom:10px">
      <span class="tag cat">${CATS[i.cat]||i.cat}</span> ${statusTag(i)} <span class="tag ${i.cond}">${CONDS[i.cond]||i.cond}</span>
    </p>
    ${outInfo}
    <p class="muted" style="margin-bottom:4px">
      ${i.brand?`Marque/modèle : <b>${esc(i.brand)}</b><br>`:""}
      ${i.serial?`N° série : <b>${esc(i.serial)}</b><br>`:""}
      Emplacement de référence : <b>${esc(locLabel(i.home))}</b><br>
      Emplacement actuel : <b>${esc(i.status==='sorti'?i.loc:locLabel(i.loc))}</b>
    </p>
    ${i.notes?`<p class="muted" style="margin-bottom:10px">📝 ${esc(i.notes)}</p>`:""}
    <div class="modal-actions" style="justify-content:flex-start;margin:12px 0;flex-wrap:wrap">
      ${actionBtn(i)}
      ${repBtns}
      <button class="btn sec small" onclick="openItemForm('${i.id}')">Modifier</button>
      <button class="btn sec small" onclick="showLabel('${i.id}')">Étiquette / QR</button>
      <button class="btn danger small" onclick="deleteItem('${i.id}')">Supprimer</button>
    </div>
    <div id="qrzone"></div>
    <h3 style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Historique</h3>
    <ul class="hist">${rows||'<li class="muted">Aucun mouvement</li>'}</ul>
    <div class="modal-actions"><button class="btn sec" onclick="close_('ovDetail')">Fermer</button></div>`;
  open_('ovDetail');
}

/* ---- étiquette / QR ---- */
function showLabel(id){
  const i = item(id), z = document.getElementById('qrzone');
  z.innerHTML = `<div id="qrbox"><div id="qrcode"></div>
    <div style="color:#000;text-align:center;font-family:monospace;font-weight:700;margin-top:6px">${i.id}</div>
    <div style="color:#000;text-align:center;font-size:12px">${esc(i.name)}</div></div>
    <div><button class="btn small sec" onclick="printLabel()">🖨️ Imprimer l'étiquette</button></div>`;
  if(typeof QRCode!=='undefined') new QRCode(document.getElementById('qrcode'),{text:i.id+" | "+i.name,width:110,height:110});
  else document.getElementById('qrcode').innerHTML = '<span style="color:#000;font-size:12px">(QR indisponible hors ligne)</span>';
}
function printLabel(){
  const box = document.getElementById('qrbox');
  if(!box) return;
  const p = document.getElementById('labelPrint');
  p.innerHTML = box.outerHTML; p.style.display = 'block';
  window.print();
  p.style.display = 'none';
}
