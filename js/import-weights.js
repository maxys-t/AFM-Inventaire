/* ============================================================
   IMPORT DES POIDS (v1.19)

   L'appariement se fait sur MARQUE + MODÈLE, jamais sur
   l'identifiant. Deux raisons : les identifiants ont changé deux
   fois (v1.14, v1.15.1) alors que les noms n'ont pas bougé, et le
   tableau source raisonne par modèle — une ligne « XLR 3m » vaut
   pour les douze exemplaires.

   L'import est rejouable : on complète le tableau, on recharge,
   seules les lignes nouvelles ou changées sont écrites.
   ============================================================ */

/* Même normalisation que pour tout rapprochement de noms : sans
   accents, sans ponctuation, et sans le « #3 » d'exemplaire. */
function normModel(s){
  return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'')
    .toLowerCase().replace(/&/g,' and ')
    .replace(/#\s*\d+\s*$/,'')
    .replace(/[^a-z0-9]+/g,' ').trim();
}
function itemModelKey(i){ return normModel(i.brand) + '|' + normModel(i.name); }

let wiRows = null, wiPlan = null;

function openWeightImport(){
  wiRows = null; wiPlan = null;
  document.getElementById('wi-body').innerHTML =
    `<div class="hintline">Choose a CSV with three columns: brand, model, weight.
     A fourth column saying “estimated” is read if present.</div>
     <div class="modsec first">
       <label class="photobtn"><span class="pi">📄</span><span>Choose a CSV file</span>
         <input type="file" accept=".csv,text/csv" style="display:none" onchange="wiRead(this)">
       </label>
     </div>`;
  document.getElementById('wi-go').style.display = 'none';
  open_('ovWeightImp');
}

function wiRead(inp){
  const f = inp.files && inp.files[0];
  inp.value = '';
  if(!f) return;
  const r = new FileReader();
  r.onload = e => { try{ wiParse(e.target.result); } catch(err){ toast(String(err.message||err), 'error'); } };
  r.readAsText(f, 'utf-8');
}

/* Séparateur deviné sur l'en-tête : les exports français sortent en
   point-virgule, les anglais en virgule. Se tromper ici donne une
   seule colonne et un import vide sans message. */
function wiSplit(line, sep){
  const out = []; let cur = '', q = false, début = true;
  for(let n = 0; n < line.length; n++){
    const ch = line[n];
    /* Un guillemet n'ouvre un champ cité que s'il est le PREMIER
       caractère de ce champ. Sans cette règle, « Ambassador Coated
       14" » ouvre une citation qui ne se referme jamais et avale la
       fin de la ligne — et dans cet inventaire, les pouces sont
       partout. */
    if(ch === '"' && début){ q = true; début = false; }
    else if(ch === '"' && q){ if(line[n+1] === '"'){ cur += '"'; n++; } else q = false; }
    else if(ch === sep && !q){ out.push(cur); cur = ''; début = true; }
    else { cur += ch; début = false; }
  }
  out.push(cur);
  return out.map(x=>x.trim());
}

function wiParse(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length) throw new Error('The file is empty.');
  const sep = (lines[0].match(/;/g)||[]).length >= (lines[0].match(/,/g)||[]).length ? ';' : ',';
  const head = wiSplit(lines[0], sep).map(h=>normModel(h));
  const find = names => head.findIndex(h => names.some(n => h === n || h.includes(n)));
  const iB = find(['marque','manufacturer','brand']);
  const iM = find(['modele','model','item','designation']);
  const iW = find(['poids','weight']);
  const iE = find(['confiance','estime','estimated','confidence']);
  if(iM < 0 || iW < 0)
    throw new Error('Could not find a model column and a weight column in the header.');

  const rows = [];
  for(let n = 1; n < lines.length; n++){
    const c = wiSplit(lines[n], sep);
    const g = parseWeight(c[iW]);
    if(g === null) continue;
    const est = iE >= 0 && /estim|approx|env/i.test(c[iE] || '');
    rows.push({brand: iB>=0 ? c[iB] : '', model: c[iM], g, est});
  }
  if(!rows.length) throw new Error('No readable weight in this file.');
  wiRows = rows;
  wiBuildPlan();
}

function wiBuildPlan(){
  const byKey = new Map();
  wiRows.forEach(r => byKey.set(normModel(r.brand) + '|' + normModel(r.model), r));

  const maj = [], inchangés = [];
  db.items.forEach(i=>{
    const r = byKey.get(itemModelKey(i));
    if(!r) return;
    if(i.weight_g === r.g && !!i.weight_est === !!r.est) inchangés.push(i);
    else maj.push({i, g: r.g, est: r.est});
  });

  const vus = new Set(db.items.map(itemModelKey));
  const orphelines = wiRows.filter(r => !vus.has(normModel(r.brand)+'|'+normModel(r.model)));
  const restants = db.items.filter(i => !byKey.get(itemModelKey(i)) && !i.weight_g);

  wiPlan = {maj, inchangés, orphelines, restants};

  const apres = db.items.filter(i => i.weight_g).length
              + maj.filter(m => !m.i.weight_g).length;
  const ligne = (n, t, cls) =>
    `<div class="wirow ${cls||''}"><b>${n}</b><span>${t}</span></div>`;

  document.getElementById('wi-body').innerHTML = `
    <div class="wigrid">
      ${ligne(maj.length, 'items will get a weight, or have it changed', 'ok')}
      ${ligne(inchangés.length, 'already have exactly this weight — untouched')}
      ${ligne(orphelines.length, 'rows in the file match no item', orphelines.length?'warn':'')}
      ${ligne(restants.length, 'items will still have no weight', restants.length?'warn':'')}
    </div>
    <div class="modsec">
      <div class="fieldlbl">After the import</div>
      <div>${apres} of ${db.items.length} items weighed
        <span class="muted">(${Math.round(100*apres/db.items.length)} %)</span></div>
    </div>
    ${orphelines.length ? `<div class="modsec">
      <div class="fieldlbl">Rows that match nothing — check the spelling</div>
      <div class="wilist">${orphelines.slice(0,25).map(r=>
        `<div>${esc(r.brand||'—')} · ${esc(r.model)}</div>`).join('')}
        ${orphelines.length>25?`<div class="muted">…and ${orphelines.length-25} more</div>`:''}</div>
    </div>` : ''}
    ${restants.length ? `<div class="modsec">
      <div class="fieldlbl">Items still without a weight</div>
      <div class="wilist">${[...new Set(restants.map(i=>`${i.brand||'—'} · ${i.name.replace(/\s*#\s*\d+$/,'')}`))]
        .slice(0,25).map(t=>`<div>${esc(t)}</div>`).join('')}</div>
    </div>` : ''}`;

  const go = document.getElementById('wi-go');
  go.style.display = maj.length ? '' : 'none';
  go.textContent = `Apply to ${maj.length} item${maj.length>1?'s':''}`;
}

async function wiApply(){
  if(!wiPlan || !wiPlan.maj.length) return;
  const go = document.getElementById('wi-go');
  go.disabled = true; go.textContent = 'Writing…';
  try{
    /* Groupé par poids : un seul appel par valeur distincte plutôt
       que 600 appels. Sur une connexion de tournée, la différence
       est entre deux secondes et deux minutes. */
    const groupes = new Map();
    wiPlan.maj.forEach(m=>{
      const k = m.g + '|' + (m.est ? 1 : 0);
      if(!groupes.has(k)) groupes.set(k, {g:m.g, est:m.est, ids:[]});
      groupes.get(k).ids.push(m.i.id);
    });
    for(const grp of groupes.values()){
      await apiUpdateItemsIn(grp.ids, {weight_g: grp.g, weight_est: grp.est});
    }
    const n = wiPlan.maj.length;
    close_('ovWeightImp');
    await refresh();
    toast(`${n} item(s) updated.`, 'ok');
  }catch(e){
    toast('Import failed: ' + (e.message||e), 'error');
    go.disabled = false; go.textContent = 'Retry';
  }
}
