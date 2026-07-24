/* ============================================================
   APP — navigation, modales, export/import, démarrage
   ============================================================ */

/* ---- navigation entre onglets ---- */
function show(v){
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.v===v));
  ['dash','inv','proj','out','rep','people','loc'].forEach(x=>document.getElementById('v-'+x).style.display = x===v?'':'none');
  render();
}
function curView(){ const b = document.querySelector('nav button.active'); return b?b.dataset.v:'dash'; }
function render(){
  const v = curView();
  if(v==='dash') renderDash();
  if(v==='inv'){ fillFilters(); renderInv(); }
  if(v==='proj') renderProj();
  if(v==='out') renderOut();
  if(v==='rep') renderRep();
  if(v==='people') renderPeople();
  if(v==='loc') renderLoc();
}

/* ---- modales (une seule ouverte à la fois) ---- */
function close_(id){ document.getElementById(id).classList.remove('open'); }
function open_(id){
  document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open'));
  document.getElementById(id).classList.add('open');
}
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{ if(e.target===o) o.classList.remove('open'); }));

/* ---- export / import JSON ---- */
function exportJSON(){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));
  a.download = 'afm-inventory-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
}
function importJSON(inp){
  const f = inp.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = async e=>{
    try{
      const d = JSON.parse(e.target.result);
      if(!d.items || !d.users) throw 0;
      if(!confirm(`Importer ${d.items.length} item(s), ${d.users.length} personne(s) et leur historique dans la base partagée ?`)){ inp.value=""; return; }
      const locs = (d.locations||[]).map(l=>typeof l==='string'?{name:l,parent:null}:{name:l.name,parent:l.parent||null});
      if(locs.length) await apiUpsertLocations(locs);
      if(d.users.length) await apiUpsertPeople(d.users);
      if(d.items.length) await apiUpsertItems(d.items.map(i=>({
        id:i.id,name:i.name,cat:i.cat,brand:i.brand||"",serial:i.serial||"",cond:normCond(i.cond),
        notes:i.notes||"",photo:i.photo||null,home:i.home,loc:i.loc,status:i.status||"dispo",out:i.out||null
      })));
      if(d.projects && d.projects.length) await apiUpsertProjects(d.projects);
      if(d.history && d.history.length) await apiInsertHistoryRows(d.history.map(h=>({
        item_id:h.itemId,type:h.type,date:h.date,detail:h.detail||"",user_id:h.userId||null,cond:h.cond?normCond(h.cond):null
      })));
      await loadAll(); render();
      alert("Import terminé ✔");
    }catch(err){ if(err!==0 && err && err.message) return; alert("Fichier invalide."); }
    inp.value = "";
  };
  r.readAsText(f);
}

/* ---- textes configurables + démarrage ---- */
function applyLabels(){
  document.title = LABELS.appTitle;
  document.querySelector('header h1').textContent = LABELS.appTitle;
  document.querySelectorAll('nav button').forEach(b=>{ if(LABELS.nav[b.dataset.v]) b.textContent = LABELS.nav[b.dataset.v]; });
}
applyLabels();
init();
