/* ============================================================
   VUE — Packs (v1.20)

   Une session Pro Tools : des items dans des dossiers, des dossiers
   dans des dossiers. L'arbre n'est pas stocké, il se déduit — un
   pack est enfant d'un autre si son contenant en est membre.
   ============================================================ */

let packOpen = new Set();      // packs dépliés
let packFilter = '';           // recherche
let packOnlyIncomplete = false;
/* Dossiers repliés. Le choix vit le temps de la session : c'est un
   geste de consultation, pas un réglage à enregistrer. */
let packFolderShut = new Set();

/* ============================================================
   SÉLECTION ET MENU CONTEXTUEL (v2.9.0)

   Les dossiers existaient, mais leurs deux boutons n'apparaissaient
   qu'au SURVOL — et sur un iPad il n'y a pas de survol. Ils étaient
   donc invisibles et inatteignables, et le doigt tombait sur le
   repli du dossier. Supprimer un dossier était impossible depuis la
   tablette, qui est pourtant la cible principale.

   La leçon dépasse ce bouton : une action révélée au survol n'existe
   pas sur un écran tactile. Elle doit être permanente, ou tenir dans
   un menu qu'on ouvre explicitement.

   D'où cette reprise en logique de gestionnaire de fichiers :
   on coche, on choisit une destination, et le menu s'ouvre au clic
   droit comme à l'appui long. Trois façons d'arriver au même endroit,
   parce que personne ne les connaît toutes.
   ============================================================ */
let packSel = new Set();         // caisses cochées
let packMenu = null;             // menu contextuel ouvert

function packSelToggle(id, on){
  if(on) packSel.add(id); else packSel.delete(id);
  redessinePackTree(); renderPackBulk();
}
function packSelClear(){ packSel.clear(); redessinePackTree(); renderPackBulk(); }
function packSelAll(ids){
  const tout = ids.every(x=>packSel.has(x));
  ids.forEach(x=>{ if(tout) packSel.delete(x); else packSel.add(x); });
  redessinePackTree(); renderPackBulk();
}

function renderPacks(){
  const el = document.getElementById('v-packs');
  if(!el) return;
  if(db.packsSupported === false){
    el.innerHTML = `<div class="panel"><h2>Packs</h2><div class="muted">
      This screen needs database migration 019. Run
      <span class="mono">sql/019-packs.sql</span> in Supabase, then reload.</div></div>`;
    return;
  }

  const tous = (db.packs||[]).filter(p=>!p.archived);
  const incomplets = tous.filter(p=>packStatus(p).manque).length;
  /* Le poids total ne somme que les racines : additionner un pack et
     celui qu'il contient compterait deux fois le même matériel. */
  const total = packRoots().reduce((t,p)=>t + packWeight(p), 0);

  el.innerHTML = `
    <div class="repbar">
      <div>
        <h2 style="margin:0">Packs</h2>
        <div class="viewintro" style="margin:2px 0 0">What travels together, and what is missing from it.</div>
      </div>
      <div class="repbar-act">
        ${can('edit') ? `<button class="btn" onclick="openPackForm()">+ New pack</button>` : ''}
        ${(can('edit') && db.foldersSupported) ? `<button class="btn sec" onclick="packNewFolder()">+ New folder</button>` : ''}
      </div>
    </div>

    <div class="packtools">
      <input type="search" id="packq" class="bigsearch" placeholder="Search a pack, or an item inside one"
             value="${esc(packFilter)}" oninput="setPackFilter(this.value)">
      <button class="btn small ${packOnlyIncomplete?'':'sec'}" onclick="togglePackIncomplete()">Incomplete only</button>
    </div>

    <div class="repstats">
      <div class="repstat"><div class="k">Packs</div><div class="n">${tous.length}</div></div>
      <div class="repstat"><div class="k">Incomplete</div>
        <div class="n ${incomplets?'warnv':''}">${incomplets}</div></div>
      <div class="repstat"><div class="k">Total weight</div><div class="n">${esc(fweight(total))}</div></div>
    </div>

    <div class="panel packpanel" id="packTree">${packTreeHTML()}</div>`;
  renderPackBulk();
}

function setPackFilter(v){
  packFilter = v;
  redessinePackTree();
}
function togglePackIncomplete(){ packOnlyIncomplete = !packOnlyIncomplete; renderPacks(); }

function packMatches(p){
  const q = packFilter.trim().toLowerCase();
  if(q){
    const dansLeNom = p.name.toLowerCase().includes(q);
    const dansLeContenu = packItemsOf(p.id).some(i=>
      (itemTitleText(i) + ' ' + i.id).toLowerCase().includes(q));
    if(!dansLeNom && !dansLeContenu) return false;
  }
  if(packOnlyIncomplete && !packStatus(p).manque) return false;
  return true;
}

/* ============================================================
   DES DOSSIERS, PARCE QU'UNE LISTE DE VINGT NE SE LIT PLUS (v2.6.0)

   Vingt-et-une caisses d'affilée, c'est une liste qu'on fait défiler
   en cherchant un nom qu'on connaît déjà — l'écran n'apprend plus
   rien. Un dossier n'est pas une catégorie savante, c'est un tiroir :
   « LEASH Touring », « Studio ».

   Les caisses sans dossier ne sont pas cachées dans un tiroir « à
   ranger » : elles restent EN TÊTE, à plat, sans en-tête. Beaucoup
   de parcs n'auront jamais de dossier du tout, et leur imposer un
   niveau de titre vide serait leur faire payer une fonction qu'ils
   n'utilisent pas.

   Une recherche ignore les dossiers et aplatit tout : on cherche
   justement parce qu'on ne sait pas où c'est rangé.
   ============================================================ */
function packFolders(){
  return [...(db.packFolders||[])]
    .sort((a,b)=>(a.pos||0)-(b.pos||0) || a.name.localeCompare(b.name,'fr'));
}
function folderOf(id){ return (db.packFolders||[]).find(f=>f.id === id) || null; }
function togglePackFolder(id){
  if(packFolderShut.has(id)) packFolderShut.delete(id); else packFolderShut.add(id);
  redessinePackTree();
}

/* ---- Créer, renommer, supprimer ----
   Un dossier se crée VIDE, avant d'avoir quoi que ce soit dedans :
   c'est tout l'intérêt d'une table plutôt que d'une colonne texte.
   On fait ensuite glisser les caisses dedans. */
async function packNewFolder(){
  const nom = (prompt('Folder name — e.g. LEASH Touring') || '').trim();
  if(!nom) return;
  try{
    const f = await apiCreateFolder(nom, packFolders().length);
    db.packFolders.push(f);
    renderPacks();
    toast(`Folder « ${nom} » created — drag cases into it.`, 'ok');
  }catch(err){ toast(String(err.message||err), 'error'); }
}
async function packRenameFolder(id){
  const f = folderOf(id); if(!f) return;
  const nom = (prompt('Rename this folder', f.name) || '').trim();
  if(!nom || nom === f.name) return;
  try{
    await apiRenameFolder(id, nom);
    f.name = nom;
    renderPacks();
  }catch(err){ toast(String(err.message||err), 'error'); }
}
async function packDeleteFolder(id){
  const f = folderOf(id); if(!f) return;
  const dedans = (db.packs||[]).filter(p=>!p.archived && p.folder_id === id);
  /* Supprimer un tiroir ne jette pas ce qu'il y a dedans : les
     caisses remontent à la racine. C'est ce que fait un
     gestionnaire de fichiers, et le seul comportement qui ne perde
     rien par inadvertance. */
  if(!confirm(`Delete the folder « ${f.name} »?\n\n${
    dedans.length ? `Its ${dedans.length} case(s) move back to the top of the list — nothing is deleted.`
                  : 'It is empty.'}`)) return;
  try{
    await apiDeleteFolder(id);
    db.packFolders = db.packFolders.filter(x=>x.id !== id);
    dedans.forEach(p=>{ p.folder_id = null; });
    renderPacks();
    toast('Folder deleted — its cases are back at the top.', 'ok');
  }catch(err){ toast(String(err.message||err), 'error'); }
}

/* Ranger une caisse dans un tiroir, ou l'en sortir. Annulable :
   c'est un geste de glissement, donc un geste qu'on fait vite. */
async function packSetFolder(packId, folderId){
  const p = pack(packId); if(!p) return;
  const avant = p.folder_id || null;
  if(avant === folderId) return;
  try{
    await apiSetPackFolder(packId, folderId);
    p.folder_id = folderId;
    renderPacks();
    const f = folderId ? folderOf(folderId) : null;
    toast(f ? `${p.name} → ${f.name}` : `${p.name} is back at the top`,
          'ok', 'Undo', async ()=>{
            await apiSetPackFolder(packId, avant);
            p.folder_id = avant; renderPacks();
          }, 8000);
  }catch(err){ toast(String(err.message||err), 'error'); }
}
/* Redessiner l'arbre seul, et seulement s'il est à l'écran : ces
   bascules peuvent être appelées avant le premier rendu. */
function redessinePackTree(){
  const el = document.getElementById('packTree');
  if(el) el.innerHTML = packTreeHTML();
}

function packTreeHTML(){
  /* Une recherche aplatit l'arbre : sinon un pack trouvé au troisième
     niveau resterait caché sous un parent replié. */
  const chercheur = packFilter.trim() || packOnlyIncomplete;
  if(chercheur){
    const liste = (db.packs||[]).filter(p=>!p.archived && packMatches(p))
      .map(p=>packRowHTML(p, 0, true));
    return liste.join('') || '<div class="empty">Nothing matches.</div>';
  }

  const racines = packRoots();
  const dossiers = packFolders();
  const sansDossier = racines.filter(p=>!p.folder_id);

  /* La racine est une zone de dépôt comme les autres : c'est ainsi
     qu'on ressort une caisse d'un tiroir, sans bouton dédié. Elle ne
     porte un titre que s'il existe des dossiers — sinon ce serait un
     niveau de hiérarchie pour une liste qui n'en a pas. */
  let h = '';
  if(dossiers.length){
    h += `<div class="pkroot" data-drop="folder:__none">
      <div class="pkfhead plain"><span class="t muted">Not in a folder</span>
        <span class="muted">${sansDossier.length} case(s)</span></div>
      ${sansDossier.map(p=>packBrancheHTML(p, 0)).join('')
        || '<div class="pkempty">Drag a case here to take it out of its folder.</div>'}
    </div>`;
  }else{
    h += sansDossier.map(p=>packBrancheHTML(p, 0)).join('');
  }

  dossiers.forEach(f=>{
    const dedans = racines.filter(p=>p.folder_id === f.id);
    const replié = packFolderShut.has(f.id);
    const dehors = dedans.filter(p=>packStatus(p).dehors).length;
    const manque = dedans.filter(p=>packStatus(p).manque).length;
    h += `<div class="pkfolder" data-drop="folder:${f.id}">
      <div class="pkfhead" onclick="togglePackFolder('${f.id}')"
           oncontextmenu="packFolderMenu(event,'${f.id}')">
        ${can('edit')?`<label class="pkcheck" onclick="event.stopPropagation()">
          <input type="checkbox" ${dedans.length && dedans.every(p=>packSel.has(p.id))?'checked':''}
                 onchange="packSelAll(${JSON.stringify(dedans.map(p=>p.id)).replace(/"/g,'&quot;')})"></label>`:''}
        <span class="chev">${replié?'▸':'▾'}</span>
        <span class="t">${esc(f.name)}</span>
        <span class="muted">${dedans.length} case(s)</span>
        ${dehors?`<span class="tag sorti">${dehors} out</span>`:''}
        ${manque?`<span class="pkwarn">${manque} incomplete</span>`:''}
        ${can('edit')?`<span class="pkfacts" onclick="event.stopPropagation()">
          <button class="pkfbtn" onclick="packFolderMenu(event,'${f.id}')"
                  title="Rename, delete, select">⋯</button>
        </span>`:''}
      </div>
      ${replié ? '' : (dedans.map(p=>packBrancheHTML(p, 0)).join('')
        || '<div class="pkempty">Empty — drag a case here.</div>')}
    </div>`;
  });

  return h || '<div class="empty">No pack yet.</div>';
}

/* `parentId` : la branche d'où la ligne est affichée. Depuis la v1.22
   un pack peut figurer dans plusieurs autres ; sans cette information,
   un glissement ne saurait pas de QUELLE caisse on sort l'objet, et
   « déplacer » deviendrait « copier » au hasard des branches.
   `vus` coupe les répétitions dans une même descendance. */
function packBrancheHTML(p, niveau, parentId, vus){
  vus = vus || new Set();
  if(vus.has(p.id)) return '';
  vus.add(p.id);
  const enfants = packChildren(p.id);
  const ouvert = packOpen.has(p.id);
  let h = packRowHTML(p, niveau, false, enfants.length, parentId);
  if(ouvert) enfants.forEach(c=>{ h += packBrancheHTML(c, niveau + 1, p.id, new Set(vus)); });
  return h;
}

function packRowHTML(p, niveau, aplati, nEnfants, parentId){
  const st = packStatus(p);
  const ph = packPhoto(p);
  const c = p.container_id ? item(p.container_id) : null;
  const parent = packParent(p);
  const chev = nEnfants
    ? `<span class="chev" onclick="event.stopPropagation();togglePack('${p.id}')">${packOpen.has(p.id)?'▾':'▸'}</span>`
    : '<span class="chev ghost">•</span>';

  /* Un trou dans un rack monté en permanence est un problème ; dans
     une configuration qui n'est pas montée, ce n'en est pas un. Même
     chiffre, deux lectures — l'écran ne doit crier que pour la
     première. */
  const etat = st.dehors
    ? `<span class="tag sorti">out · ${esc(st.dehors.où)}</span>`
    : !st.absents.length
      ? (p.permanent ? `<span class="pkok">all here</span>` : `<span class="pkok">all free</span>`)
      : (st.manque ? `<span class="pkwarn">${st.absents.length} missing</span>`
                   : `<span class="muted">${st.absents.length} in use</span>`);

  /* La case à cocher n'apparaît que sur les racines : une caisse
     imbriquée suit celle qui la contient, la ranger séparément dans
     un dossier n'aurait pas de sens. */
  const coche = (niveau === 0 && can('edit'))
    ? `<label class="pkcheck" onclick="event.stopPropagation()">
         <input type="checkbox" ${packSel.has(p.id)?'checked':''}
                onchange="packSelToggle('${p.id}', this.checked)"></label>`
    : '<span class="pkcheck"></span>';

  return `<div class="packrow${packSel.has(p.id)?' selrow':''}" data-pack="${p.id}" data-drop="${p.id}"
       data-parent="${parentId||''}" style="padding-left:${6 + niveau*26}px"
       onclick="openPackDetail('${p.id}')"
       oncontextmenu="packContextMenu(event,'${p.id}')"
       onpointerdown="packDragStart(event,'pack','${p.id}')">
    ${coche}
    ${chev}
    <span class="pkgrip" title="Drag to move this pack">⠿</span>
    ${ph ? `<img class="repthumb" loading="lazy" src="${ph}">`
         : '<span class="repthumb rnophoto"></span>'}
    <div class="repbody">
      <div class="reptitle"><b>${esc(p.name)}</b>
        ${c ? `<span class="pkcont">▣ ${esc(itemTitleText(c))} · <span class="mono">${esc(c.id)}</span></span>` : ''}</div>
      <div class="repmeta">${st.total} item${st.total>1?'s':''}
        ${aplati && parent ? `· in ${esc(parent.name)}` : (c ? `· ${esc(itemWhere(c))}` : '')}</div>
    </div>
    <div class="pkright">
      <div>${esc(fweight(packWeight(p)))}</div>
      <div>${etat}</div>
    </div>
  </div>`;
}

function togglePack(id){
  if(packOpen.has(id)) packOpen.delete(id); else packOpen.add(id);
  document.getElementById('packTree').innerHTML = packTreeHTML();
}

/* ============================================================
   FICHE D'UN PACK
   ============================================================ */
let packShown = null;

function openPackDetail(id){
  const p = pack(id);
  if(!p) return;
  packShown = id;
  renderPackDetail();
  open_('ovPack');
}

function renderPackDetail(){
  const p = pack(packShown);
  if(!p) return;
  const st = packStatus(p);
  const parts = packWeightParts(p);
  const c = p.container_id ? item(p.container_id) : null;
  const ph = packPhoto(p);

  const ligne = (i, sous) => {
    const sousPack = packOfContainer(i.id);
    const dehors = i.status === 'sorti' || repairOf(i.id);
    return `<div class="pkline${sous?' sub':''}" data-item="${i.id}"
         onpointerdown="packDragStart(event,'item','${i.id}')">
      <span class="pkgrip" title="Drag to move this item">⠿</span>
      ${i.photo ? `<img class="repthumb sm" loading="lazy" src="${i.photo}">`
                : '<span class="repthumb sm rnophoto"></span>'}
      <div class="repbody">
        <div>${itemTitle(i)} <span class="mono">${esc(i.id)}</span>
          ${sousPack ? `<span class="tag rsent">pack · ${packStatus(sousPack).total} items</span>` : ''}</div>
      </div>
      <span class="muted pkw">${esc(fweight(sousPack ? itemWeightDeep(i) : i.weight_g))}</span>
      <span class="pkst">${(dehors && !st.dehors) ? `<span class="pkwarn">⚠ ${esc(itemWhere(i))}</span>` : ''}</span>
      ${can('edit') ? `<button class="btn small sec" onclick="event.stopPropagation();packRemove('${p.id}','${i.id}')">✕</button>` : ''}
    </div>`;
  };

  let contenu = '';
  packItemsOf(p.id).forEach(i=>{
    contenu += ligne(i, false);
    const sp = packOfContainer(i.id);
    if(sp) packItemsOf(sp.id).forEach(m=>{ contenu += ligne(m, true); });
  });

  document.getElementById('packBody').innerHTML = `
    <div class="pkhead">
      ${ph ? `<img class="pkbig" src="${ph}">` : '<span class="pkbig rnophoto"></span>'}
      <div>
        <h3 style="margin:0">${esc(p.name)}
          <span class="tag ${p.permanent?'perm':'conf'}">${p.permanent?'assembled':'config'}</span>
          ${st.dehors?`<span class="tag sorti">checked out</span>`:''}</h3>
        ${st.dehors?`<div style="margin:4px 0 0"><b>📤 Out — ${esc(st.dehors.où)}</b>${
          st.dehors.quand?` <span class="muted">· since ${esc(fdateD(st.dehors.quand))}</span>`:''}</div>`:''}
        <div class="submuted" style="margin:3px 0 0">
          ${c ? `▣ ${esc(itemTitleText(c))} · <span class="mono">${esc(c.id)}</span> · ${esc(itemWhere(c))}`
              : 'No container — a grouping without a box'}</div>
      </div>
    </div>

    <div class="repstats" style="margin:14px 0">
      <div class="repstat"><div class="k">Items</div><div class="n">${st.total}</div></div>
      <div class="repstat"><div class="k">${st.dehors?'Still here':'In the box'}</div>
        <div class="n ${st.manque?'warnv':''}">${st.présents.length}</div></div>
      <div class="repstat"><div class="k">Total weight</div>
        <div class="n">${esc(fweight(packWeight(p)))}</div></div>
    </div>

    <div class="fieldlbl">Contents</div>
    <div class="pklist" data-drop="${p.id}">${contenu || '<div class="muted">Empty.</div>'}</div>

    ${(st.absents.length && !st.dehors) ? `<div class="infoband ${st.manque?'bad':''}" style="display:block">
      <b>${st.manque ? `⚠ Missing from the rack — ${st.absents.length}`
                     : `In use elsewhere — ${st.absents.length}`}</b>
      <div style="margin-top:5px">${st.absents.map(m=>
        `${esc(itemTitleText(m.i))} <span class="muted">· ${esc(m.où || 'location unknown')}</span>`
      ).join('<br>')}</div>
      ${st.manque ? '' : '<div class="hintline" style="margin-top:6px">This pack is a configuration, not a place: these items are simply busy right now.</div>'}
    </div>` : ''}

    ${packNeedsBlock(p)}

    ${packSuppliesBlock(p)}

    <div class="hintline" style="margin-top:12px">Weight:
      container ${esc(fweight(parts.contenant))}${
      parts.nSousPacks ? ` · ${parts.nSousPacks} nested pack${parts.nSousPacks>1?'s':''} ${esc(fweight(parts.sousPacks))}` : ''
      } · other items ${esc(fweight(parts.autres))}</div>`;

  document.getElementById('packActs').innerHTML = `
    ${can('edit') ? `<button class="btn sec" onclick="openPackForm('${p.id}')">Edit</button>` : ''}
    ${can('edit') ? `<button class="btn sec" onclick="openPackAdd('${p.id}')">+ Add items</button>` : ''}
    ${can('checkout') ? (st.dehors
      ? `<button class="btn ok" onclick="packCheckin('${p.id}')">📥 Check in pack</button>`
      : `<button class="btn" onclick="packCheckout('${p.id}')">Check out pack</button>`) : ''}`;
}

/* ============================================================
   CONSOMMABLES (v1.22)

   Gaffer, colliers, piles, un multitool. Des choses qu'on veut voir
   sur la checklist d'une caisse, mais qui ne méritent ni identifiant,
   ni fiche, ni historique, ni étiquette QR. Les inscrire à
   l'inventaire ferait passer le parc de 649 à 700 lignes dont des
   rouleaux de scotch — et « sortir un rouleau de gaffer » n'a aucun
   sens.

   Ce sont donc des lignes de checklist, et elles doivent le rester :
   un libellé, une quantité. Volontairement sans poids — le total d'un
   projet est le chiffre qu'on lit face à un transporteur.
   ============================================================ */
/* ============================================================
   CE QUE LA CAISSE EMPORTE SANS QU'ON L'Y AIT MIS (v2.2.0)

   Les alimentations et les cordons déclarés sur chaque appareil. Ils
   ne sont inscrits nulle part dans la caisse : ils sont déduits de
   son contenu, imbriqués compris. Retirer l'appareil retire son
   alimentation, sans qu'aucun code n'ait à y penser.

   Le bloc est en lecture seule, et c'est volontaire : un besoin
   appartient à l'appareil, pas à la caisse. Le modifier ici
   donnerait l'illusion qu'il vaut pour cette caisse seulement, et
   l'on retrouverait la confusion que la 028 a servi à effacer.
   ============================================================ */
function packNeedsBlock(p){
  if(!db.needsSupported) return '';
  const familles = needsGrouped(packAllItems(p));
  if(!familles.length) return '';

  return familles.map(f=>`
    <div class="fieldlbl" style="margin-top:14px">${esc(f.titre)}
      <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">— from the gear inside</span></div>
    <div class="pklist">
      ${f.lignes.map(n=>`<div class="pkline">
        <div class="repbody"><div>${esc(n.label)} <span class="muted">× ${n.qty}</span></div>
          <div class="repmeta">${n.pour.length} item(s)${
            n.weight_g ? ' · ' + esc(fweight(n.weight_g * n.qty)) : ''}</div></div>
      </div>`).join('')}
    </div>`).join('');
}

/* ============================================================
   LA DOTATION D'UNE CAISSE (v2.7.0)

   « La malle câbles contient toujours douze XLR de 3 m. » Écrit une
   fois, part avec elle.

   Trois sections — accessoires, rab, consommables — et les colonnes
   de droite qui font tout l'intérêt : « ×12 » n'est un fait que
   parce que l'application sait qu'on en possède quarante et qu'il en
   reste vingt-trois de libres.

   Un « spare » n'est pas un concept : c'est une ligne comme une
   autre, avec une case qui ne change que le sous-titre sous lequel
   elle s'affiche. Son utilité est de lecture — au chargement, on
   sait quelles lignes on peut sacrifier si la place manque.
   ============================================================ */
function packSuppliesBlock(p){
  if(db.suppliesSupported === false){
    return `<div class="hintline" style="margin-top:12px">Accessories and consumables need
      <b>sql/034-accessoires-consommables.sql</b> — run it in Supabase, then refresh.</div>`;
  }
  const sections = supplySections(supplyLinesOf(p.id));

  const ligne = l => {
    const s = l.supply;
    const libre = supplyFree(s);
    const court = supplyShort(s);
    return `<div class="pkline">
      <div class="repbody">
        <div>${supplyTitle(s)} <span class="muted">× ${l.qty}</span></div>
        <div class="repmeta">${supplyUsable(s)} usable · ${libre} free${
          s.weight_g ? ' · ' + esc(fweight(s.weight_g * l.qty)) : ''}${
          court ? ` · <span class="pkwarn">${court} short across all cases</span>` : ''}</div>
      </div>
      ${can('edit')?`<button class="btn small sec" onclick="packSupplyDelete('${l.id}')">✕</button>`:''}
    </div>`;
  };

  const blocs = sections.map(sec=>`
    <div class="fieldlbl" style="margin-top:14px">${sec.titre}${
      sec.cle === 'consumable'
        ? ' <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">— they do not come back</span>' : ''}</div>
    <div class="pklist">${sec.lignes.map(ligne).join('')}</div>`).join('');

  const choix = (db.supplies||[]).filter(x=>!x.archived)
    .sort((a,b)=>supplyTitleText(a).localeCompare(supplyTitleText(b),'fr'));

  return blocs + (can('edit') ? `
    <div class="fieldlbl" style="margin-top:14px">Add to this case</div>
    <div class="toolbar" style="margin-top:4px">
      <select id="sl-supply" style="flex:1;min-width:170px">
        <option value="">— pick an accessory or consumable —</option>
        ${choix.map(x=>`<option value="${x.id}">${esc(supplyTitleText(x))}${
          x.kind === 'consumable' ? ' (consumable)' : ''}</option>`).join('')}
      </select>
      <input id="sl-qty" type="number" min="1" max="9999" value="1" style="width:84px">
      <label class="checkline" style="margin:0"><input type="checkbox" id="sl-spare"> spare</label>
      <button class="btn small" onclick="packSupplyAdd('${p.id}')">Add</button>
    </div>
    <div class="hintline">Create a new one from the Accessories or Consumables screen.</div>`
    : (blocs ? '' : '<div class="muted" style="margin-top:12px">Nothing in the loadout.</div>'));
}

async function packSupplyAdd(packId){
  const id = document.getElementById('sl-supply').value;
  if(!id){ toast('Pick one from the list first.', 'warn'); return; }
  const qty = Math.max(1, Math.min(9999, parseInt(document.getElementById('sl-qty').value, 10) || 1));
  const spare = !!document.getElementById('sl-spare').checked;
  /* La même fourniture peut figurer deux fois — douze de service et
     quatre de rab — mais pas deux fois dans le même rôle, sinon
     l'objet apparaîtrait en double sur la checklist. */
  const déjà = (db.supplyLines||[]).find(l=>l.pack_id === packId
                                         && l.supply_id === id && !!l.spare === spare);
  if(déjà){
    toast(`Already in this case${spare?' as a spare':''} — change its quantity instead.`, 'warn');
    return;
  }
  try{
    const row = await apiInsertSupplyLine({supply_id:id, pack_id:packId, qty, spare,
                                           pos: supplyLinesOf(packId).length});
    db.supplyLines.push({...row, spare: !!row.spare});
    renderPackDetail();
    toast('Added to the loadout.', 'ok');
  }catch(err){ toast(String(err.message||err), 'error'); }
}

async function packSupplyDelete(id){
  try{
    await apiDeleteSupplyLine(id);
    db.supplyLines = db.supplyLines.filter(l=>l.id !== id);
    renderPackDetail();
  }catch(err){ toast(String(err.message||err), 'error'); }
}

/* ============================================================
   GLISSER-DÉPOSER
   Pointer events, pas l'API HTML de glisser-déposer : celle-ci ne
   fonctionne pas au doigt, et l'iPad est la cible principale. Un
   seul code pour la souris et le tactile.
   ============================================================ */
let drag = null;
/* Un glissement se termine par un « clic » que le navigateur envoie
   de toute façon. Sans ce garde-fou, déposer un pack ouvre sa fiche
   dans la foulée — on a bougé quelque chose, et une fenêtre s'ouvre
   par-dessus le résultat qu'on voulait voir. */
let dragFini = 0;
document.addEventListener('click', e=>{
  if(Date.now() - dragFini < 350){ e.stopPropagation(); e.preventDefault(); }
}, true);

function packDragStart(e, type, id){
  if(!can('edit')) return;
  if(e.button !== undefined && e.button !== 0) return;
  /* Deux façons de saisir au doigt : la poignée ⠿, immédiate, et
     l'appui long sur la ligne — le geste que la tablette a déjà
     appris à ses utilisateurs. Partout ailleurs, le doigt fait
     défiler. À la souris, la ligne entière reste saisissable : le
     défilement s'y fait à la molette, rien ne se gêne. */
  const parPoignée = !!(e.target.closest && e.target.closest('.pkgrip'));
  if(e.pointerType === 'touch' && !parPoignée){
    const ligne = e.target.closest('.packrow, .pkline');
    armerAppuiLong(e, ()=>packDragArm(e, type, id, 0), ligne);
    return;
  }
  packDragArm(e, type, id);
}

/* La saisie proprement dite. `seuil` est la distance avant que le
   glissement se voie : huit pixels à la souris, pour qu'un clic un
   peu tremblant ne déplace rien — zéro après un appui long, puisque
   l'objet est déjà soulevé et que la personne l'a voulu. */
function packDragArm(e, type, id, seuil){
  const depart = {x:e.clientX, y:e.clientY};
  /* La liste d'où part le geste : c'est en haut d'ELLE que la zone de
     sortie doit apparaître, pas en haut de la fenêtre. Une bande
     flottante au sommet de l'écran n'a aucun rapport avec l'endroit
     où l'on travaille. */
  const conteneur = e.target.closest('#packTree, .pklist');
  /* D'OÙ part le geste. Un item peut désormais appartenir à plusieurs
     packs : sans cette origine, « déplacer » le retirerait d'une
     caisse choisie au hasard, ou de nulle part — et le glissement
     deviendrait une copie silencieuse. */
  const ligne = e.target.closest('.packrow');
  const source = (conteneur && conteneur.classList.contains('pklist'))
    ? (conteneur.dataset.drop || null)
    : (ligne ? (ligne.dataset.parent || null) : null);
  drag = {type, id, depart, actif:false, cible:null, fantome:null, conteneur, source,
          seuil: (seuil === undefined ? 8 : seuil)};
  e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
  const move = ev => packDragMove(ev);
  const up   = ev => { packDragEnd(ev); window.removeEventListener('pointermove', move);
                       window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function packDragMove(e){
  if(!drag) return;
  const d = Math.hypot(e.clientX - drag.depart.x, e.clientY - drag.depart.y);
  /* Un seuil avant de considérer que c'est un glissement : sinon le
     moindre tremblement pendant un clic déplacerait du matériel. */
  if(!drag.actif && d < drag.seuil) return;
  if(!drag.actif){
    drag.actif = true;
    document.body.classList.add('dragging');
    packOutBar(true);
    drag.fantome = document.createElement('div');
    drag.fantome.className = 'dragghost';
    drag.fantome.innerHTML = packDragLabel();
    document.body.appendChild(drag.fantome);
  }
  drag.fantome.style.left = (e.clientX + 14) + 'px';
  drag.fantome.style.top  = (e.clientY + 14) + 'px';
  /* La caisse d'arrivée est souvent hors de l'écran : on fait défiler
     tout seul quand le doigt approche d'un bord. */
  dragScrollMove(e);

  const sous = document.elementFromPoint(e.clientX, e.clientY);
  const zone = sous && sous.closest('[data-drop]');
  const cible = zone ? zone.getAttribute('data-drop') : null;
  if(cible === drag.cible) return;
  document.querySelectorAll('.dropok,.dropno').forEach(x=>x.classList.remove('dropok','dropno'));
  drag.cible = cible;
  if(!cible) return;
  if(cible === '__out'){
    zone.classList.add('dropok');
    drag.boucle = false;
    const par = packDragParent();
    drag.fantome.innerHTML = packDragLabel() +
      `<span class="ok">↥ out of ${esc(par ? par.name : '')}</span>`;
    return;
  }
  /* ============================================================
     RANGER UNE CAISSE DANS UN TIROIR (v2.6.0)

     Même geste que pour emboîter deux caisses, autre destination :
     le préfixe « folder: » suffit à les distinguer. Réutiliser le
     glissement existant plutôt que d'en écrire un second, c'est
     surtout n'avoir qu'un seul endroit où le défilement
     automatique, l'appui long et le fantôme sont réglés.

     Seule une CAISSE se range dans un dossier : un item n'a rien à
     y faire, et le dire pendant le survol vaut mieux que de le
     refuser après la dépose.
     ============================================================ */
  if(cible.startsWith('folder:')){
    const ok = drag.type === 'pack';
    zone.classList.add(ok ? 'dropok' : 'dropno');
    drag.boucle = !ok;
    const id = cible.slice(7);
    const f = id === '__none' ? null : folderOf(id);
    drag.fantome.innerHTML = packDragLabel() + (ok
      ? `<span class="ok">→ ${esc(f ? f.name : 'top of the list')}</span>`
      : `<span class="no">✕ only a case goes in a folder</span>`);
    return;
  }
  const boucle = drag.type === 'item' && packWouldLoop(cible, drag.id);
  zone.classList.add(boucle ? 'dropno' : 'dropok');
  drag.boucle = boucle;
  /* On annonce le résultat AVANT la dépose : le poids et le compte
     qu'on obtiendra, ou la raison du refus. */
  drag.fantome.innerHTML = packDragLabel(cible, boucle);
}

/* La zone de sortie n'apparaît que pendant un glissement, et
   seulement si l'objet est effectivement rangé quelque part. Une
   cible permanente inviterait à des dépôts accidentels. */
function packOutBar(montrer){
  let b = document.getElementById('packout');
  if(!montrer){ if(b) b.remove(); return; }
  if(b || !drag || !drag.conteneur) return;
  const parent = packDragParent();
  if(!parent) return;
  b = document.createElement('div');
  b.id = 'packout';
  b.className = 'packoutrow';
  b.setAttribute('data-drop', '__out');
  b.innerHTML = `↥ Take out of <b>${esc(parent.name)}</b>`;
  drag.conteneur.insertBefore(b, drag.conteneur.firstChild);
}

/* Le pack dont l'objet glissé sort, s'il est rangé quelque part. */
/* La caisse d'où part le geste, pour afficher « sortir de … ». On
   préfère l'origine réelle du glissement à une déduction : un item
   peut appartenir à plusieurs packs depuis la v1.22. */
function packDragParent(){
  if(!drag) return null;
  if(drag.source) return pack(drag.source);
  if(drag.type === 'pack'){
    const p = pack(drag.id);
    return p ? packParent(p) : null;
  }
  return packOfItem(drag.id);
}

function packDragLabel(cibleId, boucle){
  const quoi = drag.type === 'pack' ? pack(drag.id) : item(drag.id);
  const nom = drag.type === 'pack' ? (quoi ? quoi.name : '') : itemTitleText(quoi);
  const poids = drag.type === 'pack' ? packWeight(quoi) : itemWeightDeep(quoi);
  let t = `<b>${esc(nom)}</b> · ${esc(fweight(poids))}`;
  if(!cibleId) return t;
  const cible = pack(cibleId);
  if(!cible) return t;
  if(boucle) return t + `<span class="no">✕ ${esc(cible.name)} is already inside it</span>`;
  const st = packStatus(cible);
  return t + `<span class="ok">→ ${esc(cible.name)} · ${st.total + 1} items · ${esc(fweight(packWeight(cible) + poids))}</span>`;
}

async function packDragEnd(e){
  const d = drag; drag = null;
  dragScrollStop();
  annulerAppuiLong();
  document.querySelectorAll('.lifted').forEach(x=>x.classList.remove('lifted'));
  if(d && d.actif) dragFini = Date.now();
  packOutBar(false);
  document.body.classList.remove('dragging');
  document.querySelectorAll('.dropok,.dropno').forEach(x=>x.classList.remove('dropok','dropno'));
  if(d && d.fantome) d.fantome.remove();
  if(!d || !d.actif || !d.cible) return;
  if(d.boucle){
    toast(String(d.cible).startsWith('folder:')
      ? 'Only a case goes in a folder.'
      : 'That would put a pack inside itself.', 'error');
    return;
  }

  if(d.cible === '__out'){
    const itemId = d.type === 'pack' ? (pack(d.id) || {}).container_id : d.id;
    if(itemId) await packTakeOut(itemId, d.source);
    return;
  }
  if(d.cible.startsWith('folder:')){
    if(d.type !== 'pack'){ toast('Only a case goes in a folder.', 'warn'); return; }
    const id = d.cible.slice(7);
    await packSetFolder(d.id, id === '__none' ? null : id);
    return;
  }
  const cible = pack(d.cible);
  if(!cible) return;
  /* Déposer un pack, c'est déposer son contenant : c'est lui l'objet
     qu'on range, et c'est ce que la personne a en tête. */
  const itemId = d.type === 'pack' ? (pack(d.id) || {}).container_id : d.id;
  if(!itemId){ toast('This pack has no container, so it cannot be put inside another.', 'error'); return; }
  await packMoveInto(cible.id, [itemId], d.source);
}

/* ============================================================
   DÉPLACER, AVEC ANNULATION
   Pas de pile d'historique : dans une app partagée, « annuler »
   trois gestes plus tard écraserait le travail de quelqu'un d'autre.
   On défait ce qu'on vient de faire, tout de suite ou jamais.
   ============================================================ */
async function packMoveInto(packId, itemIds, sourceId){
  const p = pack(packId);
  /* Où chacun était rangé, pour pouvoir revenir en arrière. La source
     est la caisse D'OÙ le geste est parti : depuis la v1.22 un item
     peut appartenir à plusieurs packs, et seule celle-là doit le
     perdre. À défaut d'origine connue (un glissement depuis un pack
     racine), on ne retire rien et le geste ajoute. */
  const avant = itemIds.map(id=>{
    const o = sourceId ? pack(sourceId) : null;
    return {id, pack: (o && packItemsOf(o.id).some(x=>x.id === id)) ? o.id : null};
  });
  try{
    /* Glisser déplace : on retire de la caisse d'origine avant d'ajouter. */
    for(const a of avant) if(a.pack && a.pack !== packId) await apiRemovePackItems(a.pack, [a.id]);
    await apiAddPackItems(packId, itemIds);
    await refresh(); renderPacks();
    if(packShown) renderPackDetail();
    toast(`${itemIds.length} item(s) → ${p.name}`, 'ok',
          'Undo', ()=>packUndoMove(packId, avant), 10000);
  }catch(err){ toast(String(err.message || err), 'error'); }
}

async function packUndoMove(packId, avant){
  try{
    await apiRemovePackItems(packId, avant.map(a=>a.id));
    for(const a of avant) if(a.pack) await apiAddPackItems(a.pack, [a.id]);
    await refresh(); renderPacks();
    if(packShown) renderPackDetail();
    toast('Reverted.', 'ok');
  }catch(err){ toast('Could not undo: ' + (err.message||err), 'error'); }
}

/* Sortir un objet de son pack : il quitte le plan de celui qui le
   contenait et n'est plus rangé nulle part. Ses autres appartenances
   ne bougent pas — on le sort d'une boîte, on ne l'efface pas. */
async function packTakeOut(itemId, sourceId){
  const p = sourceId ? pack(sourceId) : packOfItem(itemId);
  if(!p){ toast('This is not inside a pack.', 'error'); return; }
  try{
    await apiRemovePackItems(p.id, [itemId]);
    await refresh(); renderPacks();
    if(packShown) renderPackDetail();
    toast(`Taken out of ${p.name}.`, 'ok', 'Undo', async ()=>{
      await apiAddPackItems(p.id, [itemId]);
      await refresh(); renderPacks();
      if(packShown) renderPackDetail();
      toast('Reverted.', 'ok');
    }, 10000);
  }catch(err){ toast(String(err.message||err), 'error'); }
}

async function packRemove(packId, itemId){
  try{
    await apiRemovePackItems(packId, [itemId]);
    await refresh(); renderPacks(); renderPackDetail();
    toast('Removed from the pack.', 'ok', 'Undo', async ()=>{
      await apiAddPackItems(packId, [itemId]);
      await refresh(); renderPacks(); renderPackDetail();
    }, 10000);
  }catch(err){ toast(String(err.message||err), 'error'); }
}

/* ============================================================
   CRÉER, MODIFIER, REMPLIR
   ============================================================ */
let packEditing = null;
/* Ce que la liste propose, et à quel item ça correspond. On relisait
   le texte choisi avec une expression régulière — autant dire qu'on
   devinait ce qu'on venait soi-même d'écrire. Un identifiant commençant
   par un chiffre (« 500-001 ») suffisait à tout faire échouer. */
let packContChoix = new Map();

/* Proposer les 649 items pour choisir une caisse était un champ de
   mines : trois lettres et on tombait sur un micro. On ne propose
   donc que les sous-catégories de contenants (CONTAINER_SUBS), plus
   ce qui sert déjà de contenant. La case ci-dessous rouvre la liste
   entière pour les cas qu'on n'a pas prévus. */
let packFormAll = false;
function packFormShowAll(on){ packFormAll = !!on; openPackForm(packEditing, packFormAprès); }

/* Ce qu'on fait de la caisse une fois créée. La fenêtre sert aussi
   depuis la composition d'un projet, où la caisse doit rejoindre le
   projet dans la foulée : sans quoi il faudrait la créer ici, aller
   la chercher là-bas, et se souvenir de son nom entre les deux. */
let packFormAprès = null;

function openPackForm(id, après){
  packEditing = id || null;
  packFormAprès = après || null;
  const p = id ? pack(id) : null;
  /* Depuis la v1.24, un contenant peut porter plusieurs recettes : on
     ne l'écarte plus parce qu'un autre pack s'en sert. Seul un
     deuxième assemblage MONTÉ est refusé, et c'est packSave qui le
     dit — avec la raison. */
  const libres = db.items.filter(i=>packFormAll || isContainerKind(i));
  packContChoix = new Map();
  const étiquette = i => `${itemTitleText(i)} · ${i.id}`;
  libres.forEach(i=>packContChoix.set(étiquette(i).toLowerCase(), i.id));
  /* Le contenant déjà choisi doit rester reconnaissable même s'il
     sort de la liste courte. */
  if(p && p.container_id && item(p.container_id))
    packContChoix.set(étiquette(item(p.container_id)).toLowerCase(), p.container_id);

  document.getElementById('pfTitle').textContent = p ? 'Edit pack' : 'New pack';
  document.getElementById('pfBody').innerHTML = `
    <div class="form-grid">
      <div class="field full"><label>Name *</label>
        <input id="pf-name" value="${esc(p ? p.name : '')}" placeholder="e.g. Rack Studio A"></div>
      <div class="field full">
        <label data-tip="The box, rack or device that holds the others. Its own weight counts in the total, and its photo becomes the pack's.">Container ⓘ</label>
        <input id="pf-cont" list="pf-list" placeholder="Type a name or an ID — leave empty for a grouping without a box"
               value="${p && p.container_id ? esc(étiquette(item(p.container_id))) : ''}">
        <datalist id="pf-list">${libres.map(i=>
          `<option value="${esc(étiquette(i))}">`).join('')}</datalist>
        <label class="checkline">
          <input type="checkbox" ${packFormAll?'checked':''} onchange="packFormShowAll(this.checked)">
          Show all items (${db.items.length}) — not just bags, cases and racks</label></div>
      ${db.foldersSupported ? `<div class="field full">
        <label data-tip="A drawer in the pack list. Create folders from the Packs screen, then drag cases into them — this menu is here for when dragging is not handy.">Folder ⓘ</label>
        <select id="pf-folder">
          <option value="">— top of the list —</option>
          ${packFolders().map(f=>`<option value="${f.id}"${
            p && p.folder_id === f.id ? ' selected' : ''}>${esc(f.name)}</option>`).join('')}
        </select></div>` : ''}
      <div class="field full"><label>Notes</label>
        <input id="pf-notes" value="${esc(p ? (p.notes||'') : '')}"></div>
      <div class="field full">
        <label class="checkline" data-tip="An assembled pack is a real place: a missing item is a gap worth flagging. A configuration is a reusable recipe — nothing is missing until it is built.">
          <input type="checkbox" id="pf-perm" ${p && p.permanent ? 'checked' : ''}>
          Assembled permanently (studio rack, console) ⓘ</label>
        <div class="hintline">Leave unticked for a touring configuration: the same item may belong to several configurations, and only one is built at a time.</div>
      </div>
    </div>
    ${p ? `<div class="modsec"><button class="btn danger small" onclick="packDelete('${p.id}')">Delete this pack</button>
      <div class="hintline">The items stay in the inventory — only the grouping disappears.</div></div>` : ''}`;
  open_('ovPackForm');
}

/* « Roland Juno-106 · SYN-001 » → SYN-001.
   D'abord la correspondance exacte de ce que la liste proposait ;
   ensuite seulement on essaie de deviner, pour la frappe à la main. */
function packPickId(v){
  const t = String(v||'').trim();
  if(!t) return null;
  const connu = packContChoix.get(t.toLowerCase());
  if(connu) return connu;
  if(item(t)) return t;
  /* Le code d'une sous-catégorie peut contenir des chiffres. */
  const m = t.match(/([A-Za-z0-9]+-\d+)\s*$/);
  if(m && item(m[1])) return m[1];
  /* Dernier recours : le nom complet, sans l'identifiant. */
  const parNom = db.items.find(i=>itemTitleText(i).toLowerCase() === t.toLowerCase());
  return parNom ? parNom.id : null;
}

async function packSave(){
  const name = document.getElementById('pf-name').value.trim();
  if(!name){ toast('A name is required.', 'error'); return; }
  const brut = document.getElementById('pf-cont').value.trim();
  const cont = brut ? packPickId(brut) : null;
  if(brut && !cont){ toast('Container not found — pick one from the list.', 'error'); return; }
  const monté = !!(document.getElementById('pf-perm')||{}).checked;
  /* Un contenant peut servir à plusieurs configurations, mais n'être
     monté qu'une fois : deux assemblages montés autour du même meuble
     décriraient deux contenus simultanés du même objet. La base le
     refuse aussi ; on le dit ici, avec le nom du coupable. */
  if(cont && monté){
    const déjà = packsOfContainer(cont).find(x=>x.permanent && x.id !== packEditing);
    if(déjà){
      toast(`${itemTitleText(item(cont))} is already assembled as "${déjà.name}". `
          + `Leave this one as a configuration, or unassemble the other.`, 'error', null, null, 9000);
      return;
    }
  }
  const champDossier = document.getElementById('pf-folder');
  const row = {name, container_id: cont, notes: document.getElementById('pf-notes').value.trim() || null,
               permanent: monté};
  /* Le menu n'existe pas tant que la 032 n'est pas passée : ne rien
     écrire vaut mieux qu'écrire un null qui effacerait un rangement
     fait ailleurs. */
  if(champDossier) row.folder_id = champDossier.value || null;
  try{
    let neuf = null;
    if(packEditing) await apiUpdatePack(packEditing, row);
    else { neuf = await apiInsertPack(row); packShown = neuf.id; }
    close_('ovPackForm');
    await refresh();
    renderPacks();
    if(packShown && document.getElementById('ovPack').classList.contains('open')) renderPackDetail();
    toast('Saved.', 'ok');
    if(neuf && packFormAprès){ const f = packFormAprès; packFormAprès = null; await f(neuf.id); }
  }catch(err){ toast(String(err.message||err), 'error'); }
}

async function packDelete(id){
  const p = pack(id);
  if(!confirm(`Delete the pack "${p.name}"?\n\nThe ${packStatus(p).total} items stay in the inventory.`)) return;
  try{
    await apiDeletePack(id);
    close_('ovPackForm'); close_('ovPack');
    await refresh(); renderPacks();
    toast('Pack deleted.', 'ok');
  }catch(err){ toast(String(err.message||err), 'error'); }
}

/* ---- Ajouter des items à un pack ---- */
let packAddSel = new Set();

function openPackAdd(id){
  packShown = id; packAddSel = new Set();
  document.getElementById('pa-q').value = '';
  renderPackAdd();
  open_('ovPackAdd');
}
function packAddSearch(){ renderPackAdd(); }
function packAddToggle(id){
  if(packAddSel.has(id)) packAddSel.delete(id); else packAddSel.add(id);
  renderPackAdd();
}
function renderPackAdd(){
  const p = pack(packShown);
  const q = (document.getElementById('pa-q').value||'').toLowerCase().trim();
  const déjà = new Set(packItemsOf(p.id).map(i=>i.id));
  const rows = db.items
    .filter(i=>!déjà.has(i.id))
    .filter(i=>!q || (itemTitleText(i)+' '+i.id).toLowerCase().includes(q))
    .slice(0, 80);
  document.getElementById('paList').innerHTML = rows.map(i=>{
    const boucle = packWouldLoop(p.id, i.id);
    const sp = packOfContainer(i.id);
    return `<div class="pkline ${boucle?'muted':''}" ${boucle?'':`onclick="packAddToggle('${i.id}')"`}>
      <input type="checkbox" ${packAddSel.has(i.id)?'checked':''} ${boucle?'disabled':''}>
      ${i.photo ? `<img class="repthumb sm" src="${i.photo}">` : '<span class="repthumb sm rnophoto"></span>'}
      <div class="repbody"><div>${itemTitle(i)} <span class="mono">${esc(i.id)}</span>
        ${sp ? `<span class="tag rsent">pack · ${packStatus(sp).total} items</span>` : ''}</div>
        <div class="repmeta">${esc(itemWhere(i))}${boucle?' · would create a loop':''}</div></div>
    </div>`;
  }).join('') || '<div class="muted">Nothing matches.</div>';
  document.getElementById('paGo').textContent =
    packAddSel.size ? `Add ${packAddSel.size} item${packAddSel.size>1?'s':''}` : 'Add';
  document.getElementById('paGo').disabled = !packAddSel.size;
}
async function packAddApply(){
  if(!packAddSel.size) return;
  close_('ovPackAdd');
  await packMoveInto(packShown, [...packAddSel]);
}

/* ---- Sortir un pack ----
   On sort ce qui est dans la boîte. Ce qui est déjà dehors est
   annoncé, pas embarqué : l'inventaire ne doit jamais affirmer
   qu'un objet part alors qu'il est déjà ailleurs. */
/* ============================================================
   SORTIR UNE CAISSE

   Les items signalés — en panne, hors service, dossier de réparation
   ouvert — étaient retirés de la sélection sans rien demander. On
   emporte pourtant un ampli capricieux quand on en a besoin, et
   découvrir au déchargement qu'il est resté au studio parce que
   l'application a décidé à notre place, c'est le pire moment.

   Une fenêtre les liste donc, cochés par défaut : on part avec, sauf
   si l'on décoche. Seul l'objet qui est CHEZ un réparateur reste
   dehors — aucune case à cocher ne le fera apparaître dans la caisse.
   ============================================================ */
let packOutPending = null;

function packCheckout(id){
  const p = pack(id);
  /* Tout ce qui part : le contenant, son contenu, et celui des packs
     imbriqués. Pas seulement les membres directs. */
  const tout = packAllItems(p);
  const dehors    = tout.filter(i=>i.status === 'sorti');
  const ici       = tout.filter(i=>i.status === 'dispo');
  const absents   = ici.filter(checkoutImpossible);
  const possibles = ici.filter(i=>!checkoutImpossible(i));
  const signalés  = possibles.filter(i=>checkoutBlockReason(i));

  if(!possibles.length){
    toast(dehors.length
      ? 'Everything in this pack is already out.'
      : 'Nothing in this pack can be checked out.', 'error');
    return;
  }

  if(!signalés.length && !absents.length){
    packOutGo(p, possibles.map(i=>i.id), dehors.length, []);
    return;
  }

  packOutPending = {packId:p.id, ids:possibles.map(i=>i.id),
                    dehors:dehors.length, absents:absents.map(i=>i.id)};
  document.getElementById('poTitle').textContent = `Check out ${p.name}`;
  document.getElementById('poBody').innerHTML = `
    <p class="muted">${possibles.length} item(s) will be checked out.
      ${signalés.length} ${signalés.length>1?'are':'is'} flagged — untick what should stay behind.</p>
    <div class="pklist" style="margin-top:10px">
      ${signalés.map(i=>`<label class="pkline" style="cursor:pointer">
        <input type="checkbox" checked data-po="${i.id}" style="width:18px;height:18px;flex:none">
        <div class="repbody"><div>${itemTitle(i)} <span class="mono">${esc(i.id)}</span></div>
          <div class="submuted">${esc(checkoutBlockReason(i))}</div></div>
        <span class="tag ${i.cond}">${esc(CONDS[i.cond]||i.cond)}</span>
      </label>`).join('')}
    </div>
    ${absents.length ? `<div class="infoband bad" style="display:block;margin-top:10px">
      <b>⚠ Not in the studio — ${absents.length}</b>
      <div style="margin-top:5px">${absents.map(i=>
        `${esc(itemTitleText(i))} <span class="muted">· ${esc(itemWhere(i))}</span>`
      ).join('<br>')}</div>
      <div class="hintline" style="margin-top:6px">These are at a repair shop — they cannot leave with the case.</div>
    </div>` : ''}
    ${dehors.length ? `<div class="hintline" style="margin-top:8px">${dehors.length} item(s) of this pack are already out elsewhere.</div>` : ''}`;
  open_('ovPackOut');
}

/* Les deux raccourcis de la fenêtre : tout emporter, ou ne rien
   emporter de ce qui est signalé. */
function packOutTickAll(on){
  document.querySelectorAll('#poBody input[data-po]').forEach(c=>{ c.checked = on; });
}

function packOutConfirm(){
  const d = packOutPending; if(!d) return;
  const refusés = new Set();
  document.querySelectorAll('#poBody input[data-po]').forEach(c=>{
    if(!c.checked) refusés.add(c.dataset.po);
  });
  const ids = d.ids.filter(x=>!refusés.has(x));
  if(!ids.length){ toast('Nothing left to check out.', 'warn'); return; }
  close_('ovPackOut');
  packOutGo(pack(d.packId), ids, d.dehors, [...refusés]);
}

function packOutGo(p, ids, dehors, laissés){
  sel = new Set(ids);
  close_('ovPack');
  show('inv');
  renderBulkBar();
  const bouts = [`${ids.length} item(s) selected`];
  if(dehors) bouts.push(`${dehors} already out`);
  if(laissés.length) bouts.push(`${laissés.length} left behind`);
  if(bouts.length > 1) toast(bouts.join(' · '), 'info', null, null, 7000);
  openBulkCheckout();
}

/* Le retour d'une caisse partie entière. Sans lui, rentrer un pack
   demandait de retrouver ses huit éléments un par un dans l'onglet
   Checked out — alors qu'ils sont revenus ensemble, dans la même
   caisse, par le même geste. */
async function packCheckin(id){
  const p = pack(id); if(!p) return;
  const dehors = packAllItems(p).filter(i=>i.status === 'sorti' && !outForRepair(i));
  if(!dehors.length){ toast('Nothing to check in.', 'warn'); return; }
  if(!confirm(`Check in ${dehors.length} item(s) of "${p.name}"?\n\nEach one goes back to its home location.`)) return;
  try{
    const lignes = [];
    for(const i of dehors){
      i.status = 'dispo'; i.loc = i.home; i.out = null;
      await apiUpdateItem(i.id, {status:'dispo', loc:i.loc, out:null});
      lignes.push({itemId:i.id, type:'in', detail:`Back with ${p.name}`, cond:i.cond});
    }
    await histMany(lignes);
    await refresh(); renderPacks();
    if(packShown) renderPackDetail();
    toast(`${dehors.length} item(s) checked in.`, 'ok');
  }catch(err){ toast(String(err.message||err), 'error'); }
}

/* ============================================================
   LE MENU CONTEXTUEL, LA BARRE DE SÉLECTION, LES DOSSIERS
   (v2.9.0)

   Trois chemins vers les mêmes actions — clic droit, bouton ⋯,
   barre de sélection — parce que personne ne les connaît tous les
   trois, et qu'aucun ne doit dépendre du survol.
   ============================================================ */

function packMenuClose(){
  if(packMenu){ packMenu.remove(); packMenu = null; }
}
document.addEventListener('click', e=>{
  if(packMenu && !e.target.closest('.pkmenu')) packMenuClose();
});
document.addEventListener('keydown', e=>{ if(e.key === 'Escape') packMenuClose(); });

/* Un menu ancré là où l'on a cliqué, borné à l'écran : une liste qui
   dépasse en bas est une liste dont on ne voit pas la dernière
   entrée, et c'est souvent celle qu'on cherche. */
function packMenuOuvrir(x, y, entrees){
  packMenuClose();
  const m = document.createElement('div');
  m.className = 'pkmenu';
  m.innerHTML = entrees.map(e=>{
    if(e.sep) return '<div class="pkmsep"></div>';
    if(e.titre) return `<div class="pkmhead">${esc(e.titre)}</div>`;
    return `<button class="pkmit${e.danger?' danger':''}" data-a="${e.id}">${e.html || esc(e.label)}</button>`;
  }).join('');
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(x, window.innerWidth  - r.width  - 8)) + 'px';
  m.style.top  = Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) + 'px';
  m.addEventListener('click', ev=>{
    const b = ev.target.closest('.pkmit'); if(!b) return;
    const e = entrees.find(x2=>x2.id === b.dataset.a);
    packMenuClose();
    if(e && e.action) e.action();
  });
  packMenu = m;
}

/* ---- Clic droit sur une caisse ---- */
function packContextMenu(ev, packId){
  if(!can('edit')) return;
  ev.preventDefault(); ev.stopPropagation();
  /* Un clic droit sur une ligne non cochée agit sur elle seule ;
     sur une ligne cochée, il agit sur toute la sélection. C'est la
     convention de tous les gestionnaires de fichiers, et la seule
     qui ne surprenne jamais. */
  const cibles = packSel.has(packId) ? [...packSel] : [packId];
  packMenuOuvrir(ev.clientX, ev.clientY, packMenuDeplacer(cibles));
}

/* ---- Les entrées « ranger dans… », partagées ---- */
function packMenuDeplacer(ids){
  const n = ids.length;
  const quoi = n > 1 ? `${n} cases` : (pack(ids[0]) || {}).name || 'this case';
  const dossiers = packFolders();
  const actuel = new Set(ids.map(id=>(pack(id)||{}).folder_id || null));
  const entrees = [{titre: `Move ${quoi} to`}];
  dossiers.forEach(f=>entrees.push({
    id: 'f-' + f.id,
    html: (actuel.size === 1 && actuel.has(f.id) ? '✓ ' : '') + esc(f.name),
    action: ()=>packSetFolderMany(ids, f.id)
  }));
  entrees.push({id:'new', label:'New folder…', action:()=>packNewFolderWith(ids)});
  if(![...actuel].every(x=>x === null))
    entrees.push({id:'none', label:'Top of the list', action:()=>packSetFolderMany(ids, null)});
  entrees.push({sep:true});
  entrees.push({id:'sel', label: packSel.has(ids[0]) ? 'Clear selection' : 'Select this case',
                action: ()=>{ if(packSel.has(ids[0])) packSelClear();
                              else { packSel.add(ids[0]); redessinePackTree(); renderPackBulk(); } }});
  return entrees;
}

/* ---- Le menu ⋯ d'un dossier ---- */
function packFolderMenu(ev, folderId){
  ev.preventDefault(); ev.stopPropagation();
  const f = folderOf(folderId); if(!f) return;
  const dedans = packRoots().filter(p=>p.folder_id === folderId).map(p=>p.id);
  packMenuOuvrir(ev.clientX, ev.clientY, [
    {titre: f.name},
    {id:'ren',  label:'Rename…',            action:()=>packRenameFolder(folderId)},
    {id:'sel',  label:`Select its ${dedans.length} case(s)`,
     action:()=>{ dedans.forEach(x=>packSel.add(x)); redessinePackTree(); renderPackBulk(); }},
    {sep:true},
    {id:'del',  label:'Delete folder', danger:true,
     action:()=>packDeleteFolder(folderId)}
  ]);
}

/* ---- Ranger plusieurs caisses d'un coup ---- */
async function packSetFolderMany(ids, folderId){
  const avant = ids.map(id=>({id, f:(pack(id)||{}).folder_id || null}))
                   .filter(x=>x.f !== folderId);
  if(!avant.length) return;
  try{
    for(const a of avant){
      await apiSetPackFolder(a.id, folderId);
      pack(a.id).folder_id = folderId;
    }
    packSelClear();
    renderPacks();
    const f = folderId ? folderOf(folderId) : null;
    toast(`${avant.length} case(s) → ${f ? f.name : 'top of the list'}`, 'ok', 'Undo', async ()=>{
      for(const a of avant){ await apiSetPackFolder(a.id, a.f); pack(a.id).folder_id = a.f; }
      renderPacks();
    }, 9000);
  }catch(err){ toast(String(err.message||err), 'error'); }
}

/* ---- Créer un dossier ET y ranger la sélection ----
   C'est le geste qu'on fait vraiment : on sélectionne d'abord, on
   range ensuite. Créer un dossier vide puis y glisser les caisses
   une à une demande deux fois plus de gestes pour le même résultat. */
async function packNewFolderWith(ids){
  const nom = (prompt(`New folder for ${ids.length} case(s)`) || '').trim();
  if(!nom) return;
  try{
    const f = await apiCreateFolder(nom, packFolders().length);
    db.packFolders.push(f);
    await packSetFolderMany(ids, f.id);
  }catch(err){ toast(String(err.message||err), 'error'); }
}

/* ---- La barre de sélection ----
   Même emplacement et même logique que celle de l'inventaire : ce
   qu'on a appris là s'applique ici. */
function renderPackBulk(){
  let bar = document.getElementById('packbulk');
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'packbulk'; bar.className = 'bulkbar';
    document.body.appendChild(bar);
  }
  const n = packSel.size;
  if(!n || curView() !== 'packs'){ bar.style.display = 'none'; bar.innerHTML = ''; return; }
  bar.style.display = '';
  const ids = [...packSel];
  const poids = ids.reduce((t,id)=>t + packWeight(pack(id)), 0);
  bar.innerHTML = `
    <span class="count"><b>${n}</b> selected</span>
    <span class="lotw">${esc(fweight(poids))}</span>
    <button class="btn small" onclick="packMenuDepuisBarre(event)">Move to folder…</button>
    <button class="btn small sec" onclick="packSelClear()">Clear</button>`;
}
function packMenuDepuisBarre(ev){
  const r = ev.currentTarget.getBoundingClientRect();
  packMenuOuvrir(r.left, r.top - 8, packMenuDeplacer([...packSel]));
}
