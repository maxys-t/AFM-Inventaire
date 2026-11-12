/* ============================================================
   VUE — IT (v2.8)

   Sept ordinateurs parmi quatre cent soixante-neuf items, avec une
   douzaine de colonnes que rien d'autre ne porte : les chercher dans
   l'inventaire général n'a pas de sens.

   MAIS CE N'EST PAS UN MODULE. C'est une LECTURE FILTRÉE de
   l'inventaire : la ligne apparaît à l'instant où un ordinateur est
   ajouté, et disparaît quand il part à la corbeille. Rien à créer,
   rien à synchroniser, rien qui puisse diverger — le contraire d'un
   tableur tenu à côté.

   Les machines restent des items : même base, même sauvegarde, même
   étiquette QR, même historique de sorties. Le mac mini « Live »
   part en tournée comme le reste. C'est la VUE qui est séparée, pas
   la donnée.
   ============================================================ */

function itItems(){
  return db.items
    .filter(i=>IT_SUBS.includes(i.subcat))
    .sort((a,b)=>itemTitleText(a).localeCompare(itemTitleText(b), 'fr'));
}

/* Les colonnes affichées : celles du jeu de champs, moins celles que
   personne n'a remplies. Une colonne vide sur sept lignes ne fait
   que rétrécir les autres. */
function itColonnes(items){
  const fs = ITEM_FIELDSETS[IT_SUBS[0]];
  if(!fs) return [];
  return fs.champs.filter(c=>c.k !== 'os_frozen_why'
    && items.some(i=>extraOf(i, c.k) !== ''));
}

function renderIT(){
  const el = document.getElementById('v-it');
  if(!el) return;
  const items = itItems();

  const àRemplir = items.filter(i=>!Object.keys(i.extra||{}).length).length;
  const gelées   = items.filter(i=>extraOf(i,'os_frozen')).length;
  const garantie = items.filter(i=>warrantySoon(i) || warrantyExpired(i)).length;

  if(!items.length){
    el.innerHTML = `<div class="panel"><h2>IT</h2><div class="muted">
      No computer in the inventory yet. Add one from Inventory — with its sub-category set to
      <b>Computer</b> — and its line appears here on its own.</div></div>`;
    return;
  }

  const cols = itColonnes(items);
  const cell = (i, c) => {
    const v = extraOf(i, c.k);
    if(c.k === 'os_frozen')
      return v ? `<span class="tag attente" title="${esc(extraOf(i,'os_frozen_why')||'')}">frozen</span>`
               : '<span class="muted">—</span>';
    return v === '' ? '<span class="muted">—</span>' : esc(extraLabel(c, v));
  };

  el.innerHTML = `
    <div class="repbar">
      <div>
        <h2 style="margin:0">IT</h2>
        <div class="viewintro" style="margin:2px 0 0">The studio machines — a filtered read of the
          inventory, not a list of its own.</div>
      </div>
    </div>

    <div class="repstats">
      <div class="repstat"><div class="k">Machines</div><div class="n">${items.length}</div></div>
      <div class="repstat"><div class="k">Updates frozen</div><div class="n">${gelées}</div></div>
      <div class="repstat"><div class="k">Warranty ending</div>
        <div class="n ${garantie?'warnv':''}">${garantie}</div></div>
      ${àRemplir ? `<div class="repstat"><div class="k">Nothing filled in</div>
        <div class="n">${àRemplir}</div></div>` : ''}
    </div>

    <div class="panel"><div class="invwrap"><table class="invtable suptable">
      <thead><tr>
        <th>Machine</th>
        ${cols.map(c=>`<th>${esc(c.label)}</th>`).join('')}
        <th>Warranty</th>
      </tr></thead>
      <tbody>${items.map(i=>`<tr class="rowlink" onclick="openDetail('${i.id}')">
        <td data-l="Machine">${itemTitle(i)}
          <div class="s muted mono">${esc(i.id)} · ${esc(itemWhere(i))}</div></td>
        ${cols.map(c=>`<td data-l="${esc(c.label)}">${cell(i, c)}</td>`).join('')}
        <td data-l="Warranty">${itWarrantyCell(i)}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>

    <div class="hintline" style="margin-top:10px">Fields are declared in
      <span class="mono">js/config.js</span> (<span class="mono">ITEM_FIELDSETS</span>).
      Only what is decided or characteristic belongs there — a figure that drifts on its own
      would never be kept up to date.</div>`;
}

function itWarrantyCell(i){
  const n = warrantyDaysLeft(i);
  if(n === null) return '<span class="muted">—</span>';
  if(n < 0)  return `<span class="pkwarn">expired ${fdateD(i.warranty_until)}</span>`;
  if(n <= WARRANTY_ALERT_DAYS)
    return `<span class="tag attente">${n} d left</span>`;
  return `<span class="muted">${esc(fdateD(i.warranty_until))}</span>`;
}
