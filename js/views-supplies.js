/* ============================================================
   VUES — Accessoires et consommables (v2.7)

   Le troisième niveau du parc, et celui qui manquait. Un XLR 3 m
   n'est pas au même rang qu'un Minimoog : on en possède quarante,
   personne ne tient à jour quarante fiches, et la checklist finit
   par n'être plus crue. On compte.

   Les deux écrans sont le MÊME code : accessoires et consommables ne
   diffèrent que par le retour. Les séparer aurait donné deux fois le
   même tableau à maintenir — et c'est ainsi qu'ils divergent.

   Ce qui distingue vraiment cette page de l'inventaire, ce sont les
   trois chiffres de droite : possédés, hors service, libres. « XLR
   3 m × 12 » dans une caisse n'est un fait que parce qu'ils existent.
   ============================================================ */

const SUPPLY_KINDS = {
  accessory:  {titre:'Accessories',  vue:'acc',
               intro:'Counted, not tracked one by one — and they come back.'},
  consumable: {titre:'Consumables', vue:'cons',
               intro:'Counted, and they do not come back.'}
};

let supplyFilter = '';
let supplyOnlyShort = false;

function setSupplyFilter(v){
  supplyFilter = v;
  ['acc','cons'].forEach(k=>{
    const el = document.getElementById('supList-' + k);
    if(el) el.innerHTML = supplyTableHTML(k === 'acc' ? 'accessory' : 'consumable');
  });
}
function toggleSupplyShort(){ supplyOnlyShort = !supplyOnlyShort; render(); }

function renderSupplies(kind){
  const vue = SUPPLY_KINDS[kind].vue;
  const el = document.getElementById('v-' + vue);
  if(!el) return;
  if(db.suppliesSupported === false){
    el.innerHTML = `<div class="panel"><h2>${SUPPLY_KINDS[kind].titre}</h2><div class="muted">
      This screen needs database migration 034. Run
      <span class="mono">sql/034-accessoires-consommables.sql</span> in Supabase, then reload.</div></div>`;
    return;
  }

  const tous = suppliesOfKind(kind);
  const manque = tous.filter(s=>supplyShort(s)).length;
  const bas    = tous.filter(s=>supplyLow(s)).length;
  const hs     = tous.reduce((t,s)=>t + (s.qty_hs||0), 0);
  const total  = tous.reduce((t,s)=>t + (s.qty_total||0), 0);

  el.innerHTML = `
    <div class="repbar">
      <div>
        <h2 style="margin:0">${SUPPLY_KINDS[kind].titre}</h2>
        <div class="viewintro" style="margin:2px 0 0">${SUPPLY_KINDS[kind].intro}</div>
      </div>
      <div class="repbar-act">
        ${can('edit') ? `<button class="btn" onclick="openSupplyForm(null,'${kind}')">+ New ${
          kind === 'accessory' ? 'accessory' : 'consumable'}</button>` : ''}
        ${(can('edit') && kind === 'accessory')
          ? `<button class="btn sec" onclick="openConvert()">Convert items…</button>` : ''}
      </div>
    </div>

    <div class="packtools">
      <input type="search" class="bigsearch" placeholder="Search"
             value="${esc(supplyFilter)}" oninput="setSupplyFilter(this.value)">
      <button class="btn small ${supplyOnlyShort?'':'sec'}" onclick="toggleSupplyShort()">Short only</button>
    </div>

    <div class="repstats">
      <div class="repstat"><div class="k">Lines</div><div class="n">${tous.length}</div></div>
      <div class="repstat"><div class="k">Units owned</div><div class="n">${total}</div></div>
      <div class="repstat"><div class="k">Out of service</div>
        <div class="n ${hs?'warnv':''}">${hs}</div></div>
      <div class="repstat"><div class="k">Short for the cases</div>
        <div class="n ${manque?'warnv':''}">${manque}</div></div>
      ${kind === 'consumable'
        ? `<div class="repstat"><div class="k">Below threshold</div>
             <div class="n ${bas?'warnv':''}">${bas}</div></div>` : ''}
    </div>

    <div class="panel" id="supList-${vue}">${supplyTableHTML(kind)}</div>`;
}

function supplyMatches(s){
  const q = supplyFilter.trim().toLowerCase();
  if(q && !(supplyTitleText(s) + ' ' + (s.notes||'') + ' ' + (s.loc||''))
            .toLowerCase().includes(q)) return false;
  if(supplyOnlyShort && !supplyShort(s) && !supplyLow(s)) return false;
  return true;
}

function supplyTableHTML(kind){
  const liste = suppliesOfKind(kind).filter(supplyMatches);
  if(!liste.length)
    return `<div class="empty">${supplyFilter.trim() || supplyOnlyShort
      ? 'Nothing matches.' : 'Nothing here yet.'}</div>`;

  /* Les trois chiffres de droite sont la raison d'être de l'écran.
     « Libres » déduit le hors service ET ce qui est physiquement
     parti : c'est le seul nombre sur lequel on peut compter en
     préparant. */
  const ligne = s => {
    const util  = supplyUsable(s);
    const dehors = supplyOut(s.id);
    const libre = supplyFree(s);
    const pris  = supplyCommitted(s.id);
    const court = supplyShort(s);
    const bas   = supplyLow(s);
    return `<tr class="rowlink" onclick="openSupplyDetail('${s.id}')">
      <td data-l="Item">${supplyTitle(s)}
        ${court?`<span class="pkwarn" title="The cases ask for more than you own">short ${court}</span>`:''}
        ${bas?'<span class="tag attente">low</span>':''}
        ${s.loc?`<div class="s muted">${esc(locLabel(s.loc))}</div>`:''}</td>
      <td data-l="Owned" class="num">${s.qty_total||0}</td>
      <td data-l="Out of service" class="num ${s.qty_hs?'warnv':'muted'}">${s.qty_hs||0}</td>
      <td data-l="Out" class="num ${dehors?'':'muted'}">${dehors||'—'}</td>
      <td data-l="Free" class="num"><b>${libre}</b></td>
      <td data-l="In cases" class="num ${court?'warnv':'muted'}">${pris||'—'}</td>
      <td data-l="Unit weight" class="num muted">${s.weight_g?esc(fweight(s.weight_g)):'—'}</td>
    </tr>`;
  };

  return `<div class="invwrap"><table class="invtable suptable">
    <thead><tr>
      <th>Item</th><th class="num">Owned</th><th class="num">HS</th>
      <th class="num">Out</th><th class="num">Free</th>
      <th class="num" title="Total asked by all case loadouts">In cases</th>
      <th class="num">Unit weight</th>
    </tr></thead>
    <tbody>${liste.map(ligne).join('')}</tbody></table></div>`;
}

/* ============================================================
   LA FICHE D'UNE FOURNITURE
   Moins qu'un item — pas d'historique, pas de sortie, pas de QR —
   mais elle doit dire OÙ elle est réclamée, sans quoi « il en manque
   trois » ne mène nulle part.
   ============================================================ */
let supplyShown = null;

function openSupplyDetail(id){
  const s = supply(id); if(!s) return;
  supplyShown = id;
  renderSupplyDetail();
  open_('ovSupply');
}
function renderSupplyDetail(){
  const s = supply(supplyShown); if(!s) return;
  const lignes = (db.supplyLines||[]).filter(l=>l.supply_id === s.id)
    .map(l=>({...l, p: pack(l.pack_id)}))
    .filter(l=>l.p && !l.p.archived);
  const court = supplyShort(s);

  document.getElementById('supTitle').innerHTML = supplyTitle(s);
  document.getElementById('supBody').innerHTML = `
    <div class="fstats">
      <div class="fstat"><div class="k">Owned</div><div class="v">${s.qty_total||0}</div></div>
      <div class="fstat"><div class="k">Out of service</div>
        <div class="v ${s.qty_hs?'warnv':''}">${s.qty_hs||0}</div></div>
      <div class="fstat"><div class="k">Out</div><div class="v">${supplyOut(s.id)}</div></div>
      <div class="fstat"><div class="k">Free</div><div class="v">${supplyFree(s)}</div></div>
    </div>

    ${court?`<div class="alert bad">⚠ The case loadouts ask for ${supplyCommitted(s.id)} of these,
      and only ${supplyUsable(s)} are usable. <b>${court} short.</b>
      Raise the stock, or lower a loadout.</div>`:''}
    ${supplyLow(s)?`<div class="alert">Below the ${s.min_qty} you set as a threshold —
      time to order some.</div>`:''}

    <div class="fcols">
      <div>
        <div class="fcard">
          <h4>Identity</h4>
          ${s.brand?`<div class="kv"><span class="k">Brand</span><span class="v">${esc(s.brand)}</span></div>`:''}
          <div class="kv"><span class="k">Kind</span><span class="v">${
            s.kind === 'accessory' ? 'Accessory — comes back' : 'Consumable — does not come back'}</span></div>
          ${s.cat?`<div class="kv"><span class="k">Category</span>
            <span class="v">${esc(catLabel(s.cat))} › ${esc(subLabel(s.cat, s.subcat))}</span></div>`:''}
          ${s.loc?`<div class="kv"><span class="k">Kept in</span>
            <span class="v">${esc(locLabel(s.loc))}</span></div>`:''}
          ${s.weight_g?`<div class="kv"><span class="k">Unit weight</span>
            <span class="v">${esc(fweight(s.weight_g))}</span></div>`:''}
          ${s.price!=null?`<div class="kv"><span class="k">Unit price</span>
            <span class="v">${esc(fprice(s.price))}</span></div>`:''}
          ${s.provider?`<div class="kv"><span class="k">Supplier</span>
            <span class="v">${esc(s.provider)}</span></div>`:''}
        </div>
        ${s.notes?`<div class="fcard"><h4>Notes</h4>
          <div class="muted" style="font-size:13.5px;line-height:1.5">${esc(s.notes)}</div></div>`:''}
      </div>
      <div>
        <div class="fcard">
          <h4>Asked for by ${lignes.length} case(s)</h4>
          ${lignes.length ? lignes.map(l=>`<div class="ndline">
              <span class="ndlbl"><a class="ndlink" onclick="close_('ovSupply');show('packs');openPackDetail('${l.p.id}')">${esc(l.p.name)}</a>
                ${l.spare?'<span class="tag conf">spare</span>':''}</span>
              <span class="muted ndw">× ${l.qty}</span>
            </div>`).join('')
            : '<div class="muted" style="font-size:13.5px">No case asks for it yet.</div>'}
        </div>
      </div>
    </div>

    <div class="ffoot">
      ${can('edit')?`<button class="btn sec small" onclick="openSupplyForm('${s.id}')">Edit</button>`:''}
      ${can('delete')?`<button class="btn danger small" onclick="supplyDelete('${s.id}')">Delete</button>`:''}
      <span style="flex:1"></span>
      <button class="btn sec" onclick="close_('ovSupply')">Close</button>
    </div>`;
}

/* ---- Formulaire ---- */
let supplyEditing = null;

function openSupplyForm(id, kind){
  const s = id ? supply(id) : null;
  supplyEditing = id || null;
  const k = s ? s.kind : (kind || 'accessory');
  document.getElementById('sfTitle').textContent =
    s ? 'Edit' : ('New ' + (k === 'accessory' ? 'accessory' : 'consumable'));
  document.getElementById('sfBody').innerHTML = `
    <div class="form-grid">
      <div class="field full"><label>Name *</label>
        <input id="sf-name" value="${esc(s ? s.name : '')}"
               placeholder="${k === 'accessory' ? 'e.g. XLR 3 m' : 'e.g. Black gaffer tape'}"></div>
      <div class="field"><label>Brand</label>
        <input id="sf-brand" value="${esc(s ? (s.brand||'') : '')}" placeholder="optional"></div>
      <div class="field">
        <label data-tip="An accessory comes back — cables, adapters. A consumable does not — tape, batteries, drumheads.">Kind ⓘ</label>
        <select id="sf-kind">
          <option value="accessory"${k==='accessory'?' selected':''}>Accessory — comes back</option>
          <option value="consumable"${k==='consumable'?' selected':''}>Consumable — does not</option>
        </select></div>

      <div class="field"><label>Owned</label>
        <input id="sf-qty" type="number" min="0" max="99999" value="${s ? (s.qty_total||0) : 0}"></div>
      <div class="field">
        <label data-tip="Broken but still here. Kept apart so the purchase value stays right and you remember there is something to fix or bin.">Out of service ⓘ</label>
        <input id="sf-hs" type="number" min="0" max="99999" value="${s ? (s.qty_hs||0) : 0}"></div>

      <div class="field"><label>Alert below</label>
        <input id="sf-min" type="number" min="0" max="99999"
               value="${s && s.min_qty!=null ? s.min_qty : ''}" placeholder="optional"></div>
      <div class="field">
        <label data-tip="Per unit. Multiplied by the quantity in the transport total. Leave empty when it is too light to matter.">Unit weight ⓘ</label>
        <input id="sf-weight" value="${s && s.weight_g ? esc(fweight(s.weight_g)) : ''}"
               placeholder="optional"></div>

      <div class="field"><label>Kept in</label>
        <select id="sf-loc">${locOptions()}</select></div>
      <div class="field"><label>Unit price</label>
        <input id="sf-price" value="${s && s.price!=null ? String(s.price).replace('.',',') : ''}"
               placeholder="optional"></div>

      <div class="field full"><label>Supplier</label>
        <input id="sf-provider" value="${esc(s ? (s.provider||'') : '')}" placeholder="optional"></div>
      <div class="field full"><label>Notes</label>
        <input id="sf-notes" value="${esc(s ? (s.notes||'') : '')}"></div>
    </div>
    ${s ? `<div class="modsec"><div class="hintline">Deleting removes it from every case loadout.
      The cases themselves are untouched.</div></div>` : ''}`;
  if(s && s.loc){ const el = document.getElementById('sf-loc'); if(el) el.value = s.loc; }
  open_('ovSupplyForm');
}

async function supplySave(){
  const name = (document.getElementById('sf-name').value || '').trim();
  if(!name){ toast('A name is required.', 'error'); return; }
  const qty = Math.max(0, parseInt(document.getElementById('sf-qty').value, 10) || 0);
  const hs  = Math.max(0, parseInt(document.getElementById('sf-hs').value, 10) || 0);
  /* Plus de hors service que de possédés décrirait un parc
     impossible. La base le refuse aussi ; on le dit ici, avant. */
  if(hs > qty){ toast('There cannot be more out of service than owned.', 'error'); return; }
  const minv = document.getElementById('sf-min').value.trim();
  const row = {
    name, brand: (document.getElementById('sf-brand').value||'').trim(),
    kind: document.getElementById('sf-kind').value,
    qty_total: qty, qty_hs: hs,
    min_qty: minv === '' ? null : Math.max(0, parseInt(minv, 10) || 0),
    weight_g: parseWeight(document.getElementById('sf-weight').value),
    loc: document.getElementById('sf-loc').value || null,
    price: parsePrice(document.getElementById('sf-price').value),
    provider: (document.getElementById('sf-provider').value||'').trim(),
    notes: (document.getElementById('sf-notes').value||'').trim()
  };
  try{
    if(supplyEditing){
      await apiUpdateSupply(supplyEditing, row);
      Object.assign(supply(supplyEditing), row);
    }else{
      const neuf = await apiInsertSupply(row);
      db.supplies.push(neuf);
      supplyShown = neuf.id;
    }
    close_('ovSupplyForm');
    render();
    if(document.getElementById('ovSupply').classList.contains('open')) renderSupplyDetail();
    toast('Saved.', 'ok');
  }catch(err){ toast(String(err.message||err), 'error'); }
}

async function supplyDelete(id){
  const s = supply(id); if(!s) return;
  const n = (db.supplyLines||[]).filter(l=>l.supply_id === id).length;
  if(!confirm(`Delete "${supplyTitleText(s)}"?${
    n ? `\n\nIt is asked for by ${n} case loadout(s) — those lines go too. The cases themselves are untouched.` : ''}`)) return;
  try{
    await apiDeleteSupply(id);
    db.supplies = db.supplies.filter(x=>x.id !== id);
    db.supplyLines = db.supplyLines.filter(l=>l.supply_id !== id);
    close_('ovSupply'); close_('ovSupplyForm');
    render();
    toast('Deleted.', 'ok');
  }catch(err){ toast(String(err.message||err), 'error'); }
}

/* ============================================================
   LA BASCULE DES ITEMS EN ACCESSOIRES COMPTÉS (v2.7.0)

   Cent soixante-dix câbles suivis à l'unité, c'est cent soixante-dix
   fiches que personne ne tient à jour. La donnée dérive, la
   checklist cesse d'être crue, et l'on pack à l'œil. C'est ce qui
   est arrivé.

   LA RÈGLE : on bascule par MODÈLE, pas par sous-catégorie. Le
   critère tient en une question — y a-t-il quelque chose à compter ?
   En dessous de trois exemplaires du même modèle, non : vingt pieds
   de micro pour neuf modèles sont un choix, pas un bac ; et un Grace
   Design m900 seul de son espèce n'est pas du stock.

   Rien d'automatique : l'écran propose, on arbitre, une fois.
   ============================================================ */
const CONVERT_SEUIL = 3;
let convertChoix = null;   // Set des clés cochées

/* Les modèles candidats, regroupés par sous-catégorie.
   On écarte d'emblée ce qui ne PEUT pas devenir un accessoire :
   un contenant de caisse doit garder sa fiche, un membre de lot
   aussi, et un item sorti n'a rien à faire dans une conversion. */
function convertCandidats(){
  const conteneurs = new Set((db.packs||[]).map(p=>p.container_id).filter(Boolean));
  const enLot = new Set((db.linkMembers||[]).map(m=>m.item_id));
  const par = new Map();
  db.items.forEach(i=>{
    if(conteneurs.has(i.id) || enLot.has(i.id)) return;
    if(i.status === 'sorti') return;
    if(repairOf(i.id)) return;
    const modele = (groupKeyOf(i.name) || i.name || '').trim();
    const cle = i.cat + '|' + i.subcat + '|' + (i.brand||'').trim() + '|' + modele;
    if(!par.has(cle)) par.set(cle, {cle, cat:i.cat, subcat:i.subcat,
      brand:(i.brand||'').trim(), modele, items:[]});
    par.get(cle).items.push(i);
  });
  return [...par.values()]
    .map(g=>{
      const prix = g.items.map(i=>Number(i.price)).filter(x=>x>0);
      const poids = g.items.map(i=>i.weight_g).filter(Boolean);
      return {...g, n:g.items.length,
        prix: prix.length ? prix.sort((a,b)=>a-b)[Math.floor(prix.length/2)] : null,
        poids: poids.length ? Math.round(poids.reduce((a,b)=>a+b,0)/poids.length) : null,
        /* Ce qui part avec lui et qu'il ne faut pas perdre en route. */
        dansPacks: g.items.filter(i=>packsOfItem(i.id).length).length,
        besoins: g.items.filter(i=>needsOf(i.id).length).length};
    })
    .filter(g=>g.n >= 2)
    .sort((a,b)=>(a.cat+a.subcat).localeCompare(b.cat+b.subcat,'fr') || b.n - a.n);
}

function openConvert(){
  if(!can('edit')) return;
  const cands = convertCandidats();
  convertChoix = new Set(cands.filter(g=>g.n >= CONVERT_SEUIL).map(g=>g.cle));
  renderConvert();
  open_('ovConvert');
}
function convertToggle(cle){
  if(convertChoix.has(cle)) convertChoix.delete(cle); else convertChoix.add(cle);
  renderConvert();
}

function renderConvert(){
  /* ============================================================
     LA LISTE NE REMONTE PLUS À CHAQUE CLIC (v2.7.1)

     Soixante-trois modèles à arbitrer, et chaque case cochée
     reconstruisait le panneau entier : la liste repartait de son
     sommet, on perdait l'endroit qu'on examinait, et il fallait
     redescendre. Au trentième modèle, on renonce.

     Même défaut et même remède qu'au menu des filtres en v2.1.2.
     C'est le signe qu'un rendu intégral sur un geste ponctuel est un
     réflexe à surveiller partout où une liste est longue.
     ============================================================ */
  const liste0 = document.querySelector('#cvBody .cvlist');
  const top0 = liste0 ? liste0.scrollTop : 0;

  const cands = convertCandidats();
  const cochés = cands.filter(g=>convertChoix.has(g.cle));
  const nItems = cochés.reduce((t,g)=>t + g.n, 0);
  const nBesoins = cochés.reduce((t,g)=>t + g.besoins, 0);

  let html = '', sousCourante = null;
  cands.forEach(g=>{
    const sc = catLabel(g.cat) + ' › ' + subLabel(g.cat, g.subcat);
    if(sc !== sousCourante){ sousCourante = sc; html += `<div class="cvsub">${esc(sc)}</div>`; }
    const on = convertChoix.has(g.cle);
    html += `<label class="cvrow${on?'':' off'}">
      <input type="checkbox" ${on?'checked':''}
             onchange="convertToggle(${JSON.stringify(g.cle).replace(/"/g,'&quot;')})">
      <div class="t">
        <div>${g.brand?`<b>${esc(g.brand)}</b> `:''}${esc(g.modele)}
          <span class="muted">× ${g.n}</span></div>
        <div class="s">${g.prix!=null?esc(fprice(g.prix))+' each · ':''}${
          g.poids?esc(fweight(g.poids))+' each · ':''}${
          g.dansPacks?g.dansPacks+' in cases · ':''}${
          g.besoins?`<span class="warntxt">${g.besoins} declare needs</span> · `:''}${
          g.n >= CONVERT_SEUIL ? 'enough to count' : 'only ' + g.n + ' — probably a choice, not stock'}</div>
      </div>
    </label>`;
  });

  document.getElementById('cvBody').innerHTML = `
    <div class="submuted">Ticked by default from ${CONVERT_SEUIL} copies of the same model.
      Below that there is nothing to count — twenty mic stands across nine models are a choice,
      not a bin.</div>
    <div class="repstats" style="margin:12px 0 0">
      <div class="repstat"><div class="k">Models ticked</div><div class="n">${cochés.length}</div></div>
      <div class="repstat"><div class="k">Items leaving the list</div><div class="n">${nItems}</div></div>
      <div class="repstat"><div class="k">Inventory after</div>
        <div class="n">${db.items.length - nItems}</div></div>
    </div>
    ${nBesoins?`<div class="alert" style="margin-top:12px">⚠ ${nBesoins} of them declare power or
      cable needs. An accessory carries none — those declarations will be listed in the
      confirmation, not dropped in silence.</div>`:''}
    <div class="cvlist">${html || '<div class="empty">Nothing to convert.</div>'}</div>
    <div class="hintline" style="margin-top:10px">The items are <b>archived, not deleted</b>:
      their history stays readable and a bad conversion can be undone. The cases that held them
      receive the matching loadout.</div>`;

  const liste = document.querySelector('#cvBody .cvlist');
  if(liste && top0) liste.scrollTop = top0;
}

async function convertRun(){
  const cands = convertCandidats().filter(g=>convertChoix.has(g.cle));
  if(!cands.length){ toast('Nothing ticked.', 'warn'); return; }
  const nItems = cands.reduce((t,g)=>t + g.n, 0);
  const avecBesoins = cands.filter(g=>g.besoins);

  if(!confirm(`Convert ${cands.length} model(s) — ${nItems} item(s) — into counted accessories?\n\n`
    + `• The items are archived, not deleted.\n`
    + `• The cases that held them get the matching loadout.\n`
    + (avecBesoins.length
        ? `• ${avecBesoins.map(g=>g.modele).join(', ')} declare needs, which an accessory cannot carry. Those declarations stay on the archived items.\n`
        : '')
    + `\nThis can be undone by un-archiving the items.`)) return;

  try{
    for(const g of cands){
      /* 1. Une ligne comptée par modèle. */
      const s = await apiInsertSupply({
        kind:'accessory', name:g.modele, brand:g.brand,
        cat:g.cat, subcat:g.subcat,
        qty_total:g.n, qty_hs:0,
        weight_g:g.poids, price:g.prix,
        loc:(g.items.find(i=>i.home)||{}).home || null,
        notes:`Converted from ${g.n} tracked item(s) on ${fdateD(new Date().toISOString().slice(0,10))}.`
      });
      db.supplies.push(s);

      /* 2. Les caisses qui les contenaient reçoivent la dotation.
            Sans cette étape, les malles perdraient leur câblage en
            silence — exactement le genre de perte qu'on ne remarque
            qu'un soir de montage. */
      const parPack = new Map();
      g.items.forEach(i=>packsOfItem(i.id).forEach(p=>{
        parPack.set(p.id, (parPack.get(p.id)||0) + 1);
      }));
      for(const [packId, qty] of parPack){
        const l = await apiInsertSupplyLine({supply_id:s.id, pack_id:packId, qty,
                                              spare:false, pos:supplyLinesOf(packId).length});
        db.supplyLines.push({...l, spare:false});
        await apiRemovePackItems(packId, g.items.map(i=>i.id));
        db.packItems = db.packItems.filter(x=>!(x.pack_id === packId
                                              && g.items.some(i=>i.id === x.item_id)));
      }

      /* 3. Les items sortent du parc courant sans être supprimés. */
      const ids = g.items.map(i=>i.id);
      await apiArchiveItemsIn(ids, true);
      await histMany(ids.map(id=>({itemId:id, type:'edit',
        detail:`Archived — converted into the counted accessory "${g.modele}"`})));
      g.items.forEach(i=>{ i.archived = true; db.archived.push(i); });
      db.items = db.items.filter(i=>!ids.includes(i.id));
    }
    close_('ovConvert');
    await refresh();
    render();
    toast(`${nItems} item(s) are now ${cands.length} counted line(s).`, 'ok', null, null, 9000);
  }catch(err){ toast(String(err.message||err), 'error', null, null, 9000); }
}
