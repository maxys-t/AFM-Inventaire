/* ============================================================
   RECADRAGE CARRÉ — toutes les photos d'items au même format
   Déplacement à la souris ou au doigt, zoom au curseur.
   Sortie : JPEG carré de CROP_OUT pixels.
   ============================================================ */

const CROP_BOX = 300;   // taille d'affichage du cadre (px)
const CROP_OUT = 600;   // taille de l'image enregistrée (px)

let cropState = null;

/* openCropper(sourceDataUrl, callback) → callback(dataUrlCarré) */
function openCropper(src, cb){
  const img = new Image();
  img.onload = ()=>{
    const min = Math.max(CROP_BOX/img.width, CROP_BOX/img.height);  // l'image couvre toujours le cadre
    cropState = {
      img, cb, min, scale:min,
      x:(CROP_BOX - img.width*min)/2,
      y:(CROP_BOX - img.height*min)/2
    };
    const sl = document.getElementById('crop-zoom');
    sl.min = "1"; sl.max = "4"; sl.step = "0.01"; sl.value = "1";
    drawCrop();
    open_('ovCrop');
  };
  img.onerror = ()=> toast("Image illisible.", 'error');
  img.src = src;
}

function drawCrop(){
  const s = cropState; if(!s) return;
  const c = document.getElementById('crop-canvas');
  c.width = CROP_BOX; c.height = CROP_BOX;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,CROP_BOX,CROP_BOX);
  ctx.drawImage(s.img, s.x, s.y, s.img.width*s.scale, s.img.height*s.scale);
}

/* L'image ne doit jamais laisser de vide dans le cadre */
function clampCrop(){
  const s = cropState;
  const w = s.img.width*s.scale, h = s.img.height*s.scale;
  s.x = Math.min(0, Math.max(CROP_BOX - w, s.x));
  s.y = Math.min(0, Math.max(CROP_BOX - h, s.y));
}

function cropZoom(v){
  const s = cropState; if(!s) return;
  const old = s.scale;
  s.scale = s.min * parseFloat(v);
  const c = CROP_BOX/2;                       // zoom centré sur le cadre
  s.x = c - (c - s.x) * (s.scale/old);
  s.y = c - (c - s.y) * (s.scale/old);
  clampCrop(); drawCrop();
}

/* Déplacement (souris et tactile) */
function cropDragStart(e){
  const s = cropState; if(!s) return;
  const p = cropPoint(e);
  s.drag = {x:p.x - s.x, y:p.y - s.y};
  e.preventDefault();
}
function cropDragMove(e){
  const s = cropState; if(!s || !s.drag) return;
  const p = cropPoint(e);
  s.x = p.x - s.drag.x; s.y = p.y - s.drag.y;
  clampCrop(); drawCrop();
  e.preventDefault();
}
function cropDragEnd(){ if(cropState) cropState.drag = null; }
function cropPoint(e){
  const c = document.getElementById('crop-canvas');
  const r = c.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return {x:(t.clientX - r.left) * (CROP_BOX/r.width), y:(t.clientY - r.top) * (CROP_BOX/r.height)};
}

function cancelCrop(){ cropState = null; close_('ovCrop'); }

function applyCrop(){
  const s = cropState; if(!s) return;
  const c = document.createElement('canvas');
  c.width = CROP_OUT; c.height = CROP_OUT;
  const ctx = c.getContext('2d');
  const k = CROP_OUT / CROP_BOX;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,CROP_OUT,CROP_OUT);
  ctx.drawImage(s.img, s.x*k, s.y*k, s.img.width*s.scale*k, s.img.height*s.scale*k);
  const data = c.toDataURL('image/jpeg', 0.82);
  const cb = s.cb;
  cropState = null;
  close_('ovCrop');
  if(cb) cb(data);
}
