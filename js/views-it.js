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
      No machine in the inventory yet. Add one from Inventory — with its sub-category set to
      one of ${IT_SUBS.map(s2=>'<b>'+esc(subLabelAnywhere(s2))+'</b>').join(', ')} —
      and its line appears here on its own.</div></div>`;
    return;
  }

  /* ============================================================
     UN TABLEAU, PAS DES FICHES EN LIGNE (v2.8.4)

     La première version empilait le nom, l'identifiant et
     l'emplacement dans une seule cellule, sous forme de deux lignes
     superposées. Avec une douzaine de colonnes à côté, ça se
     chevauchait dès que la fenêtre se resserrait.

     On reprend donc exactement la mécanique de l'inventaire : une
     donnée par colonne, rien qui revient à la ligne, un cadre qui
     défile avec son en-tête collant. On compare des colonnes du
     regard ; on ne lit pas des paragraphes.
     ============================================================ */
  const cols = itColonnes(items);

  const cell = (i, c) => {
    const v = extraOf(i, c.k);
    if(c.k === 'os_frozen')
      return v ? `<span class="tag attente" title="${esc(extraOf(i,'os_frozen_why')||'')}">frozen</span>`
               : '<span class="muted">—</span>';
    if(v === '') return '<span class="muted">—</span>';
    return esc(extraLabel(c, v));
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

    <div class="panel" style="padding:10px">
      <div class="invwrap"><table class="invtable ittable">
        <thead><tr>
          <th class="itname">Name</th>
          <th class="itmodel">Model</th>
          <th class="itid">ID</th>
          ${cols.map(c=>`<th${extraNumerique(c)?' class="num"':''}>${esc(c.label)}</th>`).join('')}
          <th>Where</th>
          <th>Warranty</th>
        </tr></thead>
        <tbody>${items.map(i=>`<tr class="rowlink" onclick="openDetail('${i.id}')">
          <td class="itname" data-l="Name">${esc(itemAlias(i) || itemModelText(i))}</td>
          <td class="itmodel" data-l="Model">${itemAlias(i)
            ? `<span class="muted">${esc(itemModelText(i))}</span>`
            : '<span class="muted">—</span>'}</td>
          <td class="itid" data-l="ID"><span class="mono">${esc(i.id)}</span></td>
          ${cols.map(c=>`<td data-l="${esc(c.label)}"${
            extraNumerique(c)?' class="num"':''}>${cell(i, c)}</td>`).join('')}
          <td data-l="Where">${esc(itemWhere(i))}</td>
          <td data-l="Warranty">${itWarrantyCell(i)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>

    <div class="hintline" style="margin-top:10px">Columns come from
      <span class="mono">ITEM_FIELDSETS</span> in <span class="mono">js/config.js</span>, and only
      appear once something is filled in. What the tab gathers is set by
      <span class="mono">IT_SUBS</span>.</div>`;
}

/* Le libellé d'une sous-catégorie sans connaître sa famille : on la
   cherche dans CATS. Sert au message d'écran vide, qui doit nommer
   ce qu'il attend. */
function subLabelAnywhere(sub){
  for(const c of Object.keys(CATS)){
    const s2 = (CATS[c].subs || {})[sub];
    if(s2) return s2.label;
  }
  return sub;
}

function itWarrantyCell(i){
  const n = warrantyDaysLeft(i);
  if(n === null) return '<span class="muted">—</span>';
  if(n < 0)  return `<span class="pkwarn">expired ${fdateD(i.warranty_until)}</span>`;
  if(n <= WARRANTY_ALERT_DAYS)
    return `<span class="tag attente">${n} d left</span>`;
  return `<span class="muted">${esc(fdateD(i.warranty_until))}</span>`;
}
