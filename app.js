'use strict';
const KEY='residanat-pharmacie-v1';
const MODS=MODS_RAW.map((m,i)=>({id:'m'+String(i+1).padStart(2,'0'),cat:m[0],name:m[1],seed:m[2].split(';')}));
const STAT=['Non commencé','En cours','À réviser','Maîtrisé'];
const $=s=>document.querySelector(s);
let S,ui={v:'home',id:null,f:'all',rd:'all',az:false,open:false,sq:'',sid:null};

/* ---------- données ---------- */
function seed(s){MODS.forEach(m=>m.seed.forEach((t,j)=>{
  const id=m.id+'-'+String(j+1).padStart(3,'0');
  if(!s.courses[id]&&!s.removed.includes(id))s.courses[id]={id,m:m.id,t,d:'Ce cours couvre : '+t.toLowerCase()+' (module '+m.name+').',r:0,p:0,o:j};
}));}
function norm(s){
  if(!s||typeof s!=='object'||!s.courses||typeof s.courses!=='object')s={courses:{},removed:[]};
  s.removed=Array.isArray(s.removed)?s.removed:[];
  for(const id of Object.keys(s.courses)){
    const c=s.courses[id];
    if(!c||!MODS.some(m=>m.id===c.m)){delete s.courses[id];continue}
    c.id=id;c.t=String(c.t||'Sans titre');c.d=String(c.d||'');
    c.r=Math.max(0,parseInt(c.r)||0);c.p=Math.min(100,Math.max(0,Math.round(+c.p)||0));c.o=+c.o||0;
  }
  seed(s);return s;
}
function load(){let s=null;try{s=JSON.parse(localStorage.getItem(KEY))}catch(e){}return norm(s)}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Sauvegarde impossible')}}
function toast(t){const e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2500)}

/* ---------- calculs ---------- */
const all=()=>Object.values(S.courses);
const cs=mid=>all().filter(c=>c.m===mid);
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const mp=mid=>avg(cs(mid).map(c=>c.p));
const catp=cid=>avg(MODS.filter(m=>m.cat===cid).map(m=>mp(m.id)));
const overall=()=>avg(MODS.map(m=>mp(m.id)));
const stat=c=>c.p>=100?3:c.p>=50?2:(c.p>=1||c.r>0)?1:0;
const pc=x=>Math.round(x)+'%';
const lect=r=>r===0?'0 lecture':r===1?'1ère lecture':r+'ème lecture';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const bar=v=>`<div class="bar"><i style="width:${Math.round(v)}%"></i></div>`;
const badge=c=>`<span class="badge s${stat(c)}">${STAT[stat(c)]}</span>`;
const note=c=>c.r>0&&c.p===0?'<span class="note">Lu · maîtrise à évaluer</span>':'';

/* ---------- installation ---------- */
let dip=null;
const standalone=()=>(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();dip=e;if(ui.v==='home'||ui.v==='data')render()});
addEventListener('appinstalled',()=>{dip=null;toast('Application installée');render()});
function installCard(always){
  if(standalone())return always?'<div class="card"><b>✅ Application installée</b></div>':'';
  if(dip)return '<div class="card install"><div><b>Installer l\'application</b><small>Accès direct depuis l\'écran d\'accueil, plein écran, hors-ligne.</small></div><button class="btn" data-a="install">⬇ Installer</button></div>';
  return always?'<div class="card"><b>Installer l\'application</b><p><small>Le bouton d\'installation n\'est pas disponible dans ce navigateur pour le moment. Ouvrez le menu du navigateur (⋮) puis choisissez « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ». Sur iPhone : Partager → Sur l\'écran d\'accueil.</small></p></div>':'';
}

/* ---------- vues ---------- */
function home(){
  const a=all(),reads=a.reduce((x,c)=>x+c.r,0);
  const st=[[MODS.length,'Modules'],[a.length,'Cours'],[a.filter(c=>c.r>0).length,'Cours lus au moins 1×'],[reads,'Lectures au total'],[a.filter(c=>c.r===0&&c.p===0).length,'Cours non commencés']];
  return installCard(false)+`<section class="card hero"><div class="big">${pc(overall())}</div><div class="lbl">Progression globale</div>${bar(overall())}
  <div class="stats">${st.map(s=>`<div><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div></section>
  <h2>Catégories</h2>${CATS.map(c=>`<button class="card item" data-a="go" data-x="cat:${c.id}"><div class="row"><span class="ic">${c.i}</span><b>${c.n}</b><span class="pct">${pc(catp(c.id))}</span></div>${bar(catp(c.id))}<small>${MODS.filter(m=>m.cat===c.id).length} modules</small></button>`).join('')}
  <h2>Modules</h2>${MODS.map(modItem).join('')}`;
}
const modItem=m=>`<button class="card item" data-a="go" data-x="mod:${m.id}"><div class="row"><b>${m.name}</b><span class="pct">${pc(mp(m.id))}</span></div>${bar(mp(m.id))}<small>${CATS.find(c=>c.id===m.cat).n} · ${cs(m.id).length} cours</small></button>`;
function catView(){const c=CATS.find(x=>x.id===ui.id);
  return `<section class="card hero"><div class="lbl">${c.i} ${c.n}</div><div class="big">${pc(catp(c.id))}</div>${bar(catp(c.id))}</section><h2>Modules</h2>${MODS.filter(m=>m.cat===c.id).map(modItem).join('')}`}
function filtered(mid){
  let l=cs(mid);
  if(ui.f!=='all')l=l.filter(c=>stat(c)===+ui.f);
  if(ui.rd!=='all')l=l.filter(c=>ui.rd==='3'?c.r>=3:c.r===+ui.rd);
  return l.sort(ui.az?(a,b)=>a.t.localeCompare(b.t,'fr'):(a,b)=>a.o-b.o);
}
function courseCard(c){return `<article class="card course" data-a="open" data-x="${c.id}"><div class="row"><h3>${esc(c.t)}</h3><span class="pct">${c.p}%</span></div>${bar(c.p)}<div class="meta">${badge(c)}<span>${lect(c.r)}</span>${note(c)}</div>${ui.open?`<p class="desc">${esc(c.d)}</p>`:''}</article>`}
function modView(){
  const m=MODS.find(x=>x.id===ui.id),l=cs(m.id),fl=filtered(m.id);
  const ns=l.filter(c=>c.r===0&&c.p===0).length,studied=l.filter(c=>c.r>0).length,reads=l.reduce((x,c)=>x+c.r,0);
  const chips=[['all','Tous'],...STAT.map((s,i)=>[String(i),s])];
  return `<section class="card hero"><div class="lbl">${CATS.find(c=>c.id===m.cat).n}</div><h1>${m.name}</h1><div class="big">${pc(mp(m.id))}</div>${bar(mp(m.id))}
  <div class="stats"><div><b>${l.length}</b><span>Cours</span></div><div><b>${ns}</b><span>Non commencés</span></div><div><b>${studied}</b><span>Cours lus</span></div><div><b>${reads}</b><span>Lectures</span></div></div></section>
  <div class="chips">${chips.map(c=>`<button class="chip ${ui.f===c[0]?'on':''}" data-a="f" data-x="${c[0]}">${c[1]}</button>`).join('')}</div>
  <div class="tools"><select data-a="rd" aria-label="Lectures"><option value="all">Toutes les lectures</option>${['0','1','2','3'].map(v=>`<option value="${v}" ${ui.rd===v?'selected':''}>${v==='3'?'3 lectures ou plus':v==='0'?'Jamais lu':v==='1'?'Lu 1 fois':'Lu 2 fois'}</option>`).join('')}</select>
  <button class="btn" data-a="az">${ui.az?'Ordre du programme':'Tri A→Z'}</button><button class="btn" data-a="open">${ui.open?'Replier':'Déplier'}</button></div>
  ${fl.map(courseCard).join('')||'<p class="empty">Aucun cours ne correspond aux filtres.</p>'}
  <button class="btn wide" data-a="add">＋ Ajouter un cours</button>`;
}
function results(){
  const q=fold(ui.sq.trim());if(!q)return '<p class="empty">Saisissez un mot pour chercher un module ou un cours.</p>';
  const ms=MODS.filter(m=>fold(m.name).includes(q));
  const c=all().filter(c=>fold(c.t).includes(q)||fold(c.d).includes(q)).slice(0,60);
  return (ms.length?'<h2>Modules</h2>'+ms.map(modItem).join(''):'')+(c.length?'<h2>Cours</h2>'+c.map(c=>`<article class="card course" data-a="open" data-x="${c.id}"><div class="row"><h3>${esc(c.t)}</h3><span class="pct">${c.p}%</span></div><small>${MODS.find(m=>m.id===c.m).name}</small>${bar(c.p)}<div class="meta">${badge(c)}<span>${lect(c.r)}</span></div></article>`).join(''):'')||'<p class="empty">Aucun résultat.</p>';
}
function dataView(){return `<h2>Application</h2>${installCard(true)}<h2>Données</h2><div class="card"><p>Vos progrès sont enregistrés automatiquement sur cet appareil. Exportez régulièrement une sauvegarde.</p>
  <button class="btn wide" data-a="export">⬇ Exporter la sauvegarde (JSON)</button><button class="btn wide" data-a="import">⬆ Importer une sauvegarde</button><button class="btn wide danger" data-a="reset">Réinitialiser toute la progression</button></div>
  <p class="empty">Les images des fiches de révision restent sur cet appareil : elles ne sont pas incluses dans l'export JSON.</p>
  <p class="empty">Les listes de cours sont une structure d'étude initiale modifiable, pas le programme officiel définitif.</p>`}

function render(){
  const v=ui.v;let h,t='Résidanat Pharmacie',back=false;
  if(v==='home')h=home();
  else if(v==='cat'){h=catView();back=true;t=CATS.find(x=>x.id===ui.id).n}
  else if(v==='mod'){h=modView();back=true;t=MODS.find(x=>x.id===ui.id).name}
  else if(v==='search'){h=`<h2>Recherche</h2><input id="q" type="search" placeholder="Rechercher un cours ou un module" value="${esc(ui.sq)}" autocomplete="off"><div id="res">${results()}</div>`;t='Recherche'}
  else{h=dataView();t='Données'}
  $('#top').innerHTML=(back?'<button class="back" data-a="back" aria-label="Retour">‹</button>':'')+`<span>${esc(t)}</span>`;
  $('#app').innerHTML=h;
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.x===(v==='search'||v==='data'?v:'home')));
}
function go(v,id){ui.v=v;ui.id=id||null;ui.f='all';ui.rd='all';history.pushState({v,id:id||null},'');render();scrollTo(0,0)}

/* ---------- fiche cours ---------- */
function sheet(id){
  const c=S.courses[id];if(!c)return;ui.sid=id;
  $('#sheet').hidden=false;
  $('#sheet').innerHTML=`<div class="bd" data-a="close"></div><div class="panel"><button class="x" data-a="close" aria-label="Fermer">✕</button>
  <small>${MODS.find(m=>m.id===c.m).name}</small>
  <label>Titre<input data-e="t" value="${esc(c.t)}"></label>
  <label>Description<textarea data-e="d" rows="3">${esc(c.d)}</textarea></label>
  <div class="sec"><b>Lectures</b><div class="counter"><button class="rb" data-a="dec" aria-label="Moins une lecture">−</button><div id="rn"></div><button class="rb" data-a="inc" aria-label="Plus une lecture">+</button></div></div>
  <div class="sec"><div class="row"><b>Maîtrise</b><span class="pct" id="pv"></span></div><input type="range" min="0" max="100" step="1" data-e="p" value="${c.p}">
  <div class="presets">${[0,25,50,75,100].map(v=>`<button class="chip" data-a="setp" data-x="${v}">${v}%</button>`).join('')}</div>
  <small>0 % non étudié · 25 % mal compris · 50 % partiel · 75 % bon, à réviser · 100 % maîtrisé</small></div>
  <div id="sinfo"></div>
  <div class="sec"><div class="row"><b>Fiches de révision</b><small id="icount"></small></div><div id="thumbs" class="thumbs"></div><button class="btn wide" data-a="addimg">🖼 Ajouter une image</button></div>
  <button class="btn wide danger" data-a="del">Supprimer ce cours</button></div>`;
  sheetVals();refreshImgs();
}
function sheetVals(){const c=S.courses[ui.sid];if(!c)return;
  $('#rn').textContent=lect(c.r);$('#pv').textContent=c.p+'%';
  $('#sinfo').innerHTML=`${bar(c.p)}<div class="meta">${badge(c)}${note(c)}</div>`;
  const r=$('#sheet input[type=range]');if(r)r.value=c.p;}
function closeSheet(){$('#sheet').hidden=true;ui.sid=null;freeThumbs();render()}

/* ---------- fiches de révision (IndexedDB) ---------- */
let idb=null,imgs=[],turls=[],seq=0;
const IMG_OK=f=>/^image\/(jpeg|png|webp)$/.test(f.type)||/\.(jpe?g|png|webp)$/i.test(f.name||'');
function db(){return idb||(idb=new Promise((res,rej)=>{
  if(typeof indexedDB==='undefined')return rej(new Error('IndexedDB indisponible'));
  const r=indexedDB.open('residanat-images',1);
  r.onupgradeneeded=()=>{r.result.createObjectStore('images',{keyPath:'id'}).createIndex('cid','cid')};
  r.onsuccess=()=>res(r.result);r.onerror=()=>{idb=null;rej(r.error)};
}))}
const tx=(mode,fn)=>db().then(d=>new Promise((res,rej)=>{
  const t=d.transaction('images',mode),out=fn(t.objectStore('images'));
  t.oncomplete=()=>res(out&&'result'in out?out.result:undefined);t.onerror=t.onabort=()=>rej(t.error);
}));
const imgList=cid=>tx('readonly',s=>s.index('cid').getAll(cid));
const imgAdd=rec=>tx('readwrite',s=>s.put(rec));
const imgDel=id=>tx('readwrite',s=>s.delete(id));
const imgDelCourse=cid=>tx('readwrite',s=>{const r=s.index('cid').getAllKeys(cid);r.onsuccess=()=>r.result.forEach(k=>s.delete(k));return r});
async function prep(file){
  const rec={id:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:file.name||'image',type:file.type,blob:file,thumb:file,added:Date.now()*1000+(seq++%1000)};
  try{
    const bm=await createImageBitmap(file);
    const draw=(max,q)=>new Promise(r=>{const k=Math.min(1,max/Math.max(bm.width,bm.height)),c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(bm.width*k));c.height=Math.max(1,Math.round(bm.height*k));
      const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bm,0,0,c.width,c.height);c.toBlob(r,'image/jpeg',q)});
    const th=await draw(360,.8);if(th)rec.thumb=th;
    if(file.size>1.5e6){const b=await draw(2400,.88);if(b&&b.size<file.size){rec.blob=b;rec.type='image/jpeg'}}
    if(bm.close)bm.close();
  }catch(e){}
  return rec;
}
function freeThumbs(){turls.forEach(u=>URL.revokeObjectURL(u));turls=[];imgs=[]}
async function refreshImgs(){
  const cid=ui.sid;if(!cid)return;let l=[],fail=false;
  try{l=await imgList(cid)}catch(e){fail=true}
  if(ui.sid!==cid)return;
  l.sort((a,b)=>a.added-b.added);turls.forEach(u=>URL.revokeObjectURL(u));imgs=l;turls=l.map(r=>URL.createObjectURL(r.thumb||r.blob));
  const t=$('#thumbs');if(!t)return;
  t.innerHTML=l.map((r,i)=>`<button class="th" data-a="view" data-x="${i}" aria-label="Ouvrir l'image ${i+1}"><img src="${turls[i]}" alt="Fiche ${i+1}"></button>`).join('');
  $('#icount').textContent=fail?'Stockage indisponible':l.length?l.length+' image'+(l.length>1?'s':''):'Aucune image';
}
/* visionneuse avec zoom */
const V={i:0,z:1,x:0,y:0,p:new Map(),d0:0,z0:1,t:0,sx:0,open:false,url:null};
function ensureViewer(){
  if($('#viewer'))return;
  const d=document.createElement('div');d.id='viewer';d.hidden=true;
  d.innerHTML='<div class="vbar"><button data-a="vclose" aria-label="Fermer">✕</button><span id="vcount"></span><button data-a="vdel" aria-label="Supprimer l\'image">🗑</button></div><div id="vstage"><img id="vimg" alt="" draggable="false"></div><div class="vbar"><button data-a="vprev" aria-label="Précédente">‹</button><button data-a="vout" aria-label="Zoom arrière">−</button><button data-a="vreset" aria-label="Taille normale">⟲</button><button data-a="vin" aria-label="Zoom avant">+</button><button data-a="vnext" aria-label="Suivante">›</button></div>';
  document.body.appendChild(d);
  const st=$('#vstage'),vd=()=>{const a=[...V.p.values()];return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1};
  st.addEventListener('pointerdown',e=>{try{st.setPointerCapture(e.pointerId)}catch(x){}V.p.set(e.pointerId,{x:e.clientX,y:e.clientY});V.moved=false;V.sx=e.clientX;if(V.p.size===2){V.d0=vd();V.z0=V.z}});
  st.addEventListener('pointermove',e=>{const o=V.p.get(e.pointerId);if(!o)return;const n={x:e.clientX,y:e.clientY};V.p.set(e.pointerId,n);
    if(V.p.size===2){V.z=Math.min(6,Math.max(1,V.z0*vd()/V.d0));V.moved=true}
    else if(V.z>1){V.x+=n.x-o.x;V.y+=n.y-o.y;V.moved=true}
    if(Math.abs(n.x-V.sx)>10)V.moved=true;vApply()});
  const up=e=>{if(!V.p.has(e.pointerId))return;V.p.delete(e.pointerId);if(V.p.size)return;
    if(!V.moved){const t=Date.now();if(t-V.t<300){vZoom(V.z>1?1:2.5);V.t=0}else V.t=t}
    else if(V.z===1&&Math.abs(e.clientX-V.sx)>60)vGo(e.clientX<V.sx?1:-1)};
  st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
  st.addEventListener('wheel',e=>{e.preventDefault();vZoom(V.z*(e.deltaY<0?1.2:1/1.2))},{passive:false});
}
function vApply(){const im=$('#vimg'),st=$('#vstage');if(V.z<=1){V.x=V.y=0}
  else{const lx=Math.max(0,(im.clientWidth*V.z-st.clientWidth)/2),ly=Math.max(0,(im.clientHeight*V.z-st.clientHeight)/2);V.x=Math.max(-lx,Math.min(lx,V.x));V.y=Math.max(-ly,Math.min(ly,V.y))}
  im.style.transform=`translate(${V.x}px,${V.y}px) scale(${V.z})`}
function vZoom(z){V.z=Math.min(6,Math.max(1,z));vApply()}
function vShow(i){
  if(V.url)URL.revokeObjectURL(V.url);
  V.i=i;V.z=1;V.x=V.y=0;V.url=URL.createObjectURL(imgs[i].blob);
  $('#vimg').src=V.url;$('#vcount').textContent=(i+1)+' / '+imgs.length;vApply();
}
function vGo(d){if(imgs.length>1)vShow((V.i+d+imgs.length)%imgs.length)}
function openViewer(i){
  if(!imgs[i])return;ensureViewer();$('#viewer').hidden=false;V.open=true;vShow(i);
  history.pushState({v:ui.v,id:ui.id,viewer:1},'');
}
function hideViewer(){const d=$('#viewer');if(d)d.hidden=true;V.open=false;V.p.clear();if(V.url){URL.revokeObjectURL(V.url);V.url=null}}
async function viewerDelete(){
  const r=imgs[V.i];if(!r||!confirm('Supprimer cette image ?'))return;
  try{await imgDel(r.id)}catch(e){toast('Suppression impossible');return}
  await refreshImgs();
  if(!imgs.length)history.back();else vShow(Math.min(V.i,imgs.length-1));
  toast('Image supprimée');
}
async function addImages(files){
  const cid=ui.sid;if(!cid||!files.length)return;
  const ok=files.filter(IMG_OK);if(ok.length<files.length)toast('Seuls JPG, PNG et WebP sont acceptés');
  let n=0;
  try{
    if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
    for(const f of ok){const r=await prep(f);r.cid=cid;await imgAdd(r);n++;if(ui.sid===cid)await refreshImgs()}
    if(n)toast(n+(n>1?' images ajoutées':' image ajoutée'));
  }catch(err){toast(n?n+' ajoutée(s), puis échec (espace insuffisant ?)':'Échec de l\'ajout (espace insuffisant ?)')}
}

/* ---------- actions ---------- */
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b||b.tagName==='SELECT')return;
  const a=b.dataset.a,x=b.dataset.x,c=S.courses[ui.sid];
  if(a==='go'){const[v,id]=x.split(':');go(v,id)}
  else if(a==='back')history.back();
  else if(a==='open'&&b.tagName==='ARTICLE')sheet(x);
  else if(a==='open'){ui.open=!ui.open;render()}
  else if(a==='close')closeSheet();
  else if(a==='f'){ui.f=x;render()}
  else if(a==='az'){ui.az=!ui.az;render()}
  else if(a==='inc'&&c){c.r++;save();sheetVals()}
  else if(a==='dec'&&c){c.r=Math.max(0,c.r-1);save();sheetVals()}
  else if(a==='setp'&&c){c.p=+x;save();sheetVals()}
  else if(a==='add'){const t=(prompt('Titre du nouveau cours')||'').trim();if(!t)return;
    const id='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    S.courses[id]={id,m:ui.id,t,d:'',r:0,p:0,o:Math.max(-1,...cs(ui.id).map(k=>k.o))+1};save();render();toast('Cours ajouté')}
  else if(a==='del'&&c){if(!confirm('Supprimer ce cours ? Sa progression et ses fiches de révision seront perdues.'))return;
    imgDelCourse(c.id).catch(()=>{});delete S.courses[c.id];if(/^m\d\d-\d{3}$/.test(c.id))S.removed.push(c.id);save();closeSheet()}
  else if(a==='export'){const blob=new Blob([JSON.stringify({app:'residanat-pharmacie',version:1,exported:new Date().toISOString(),data:S},null,1)],{type:'application/json'});
    const u=URL.createObjectURL(blob),l=document.createElement('a');l.href=u;l.download='residanat-sauvegarde-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);toast('Sauvegarde exportée')}
  else if(a==='install'&&dip){dip.prompt();dip.userChoice.then(()=>{dip=null;render()}).catch(()=>{})}
  else if(a==='addimg')$('#imgin').click();
  else if(a==='view')openViewer(+x);
  else if(a==='vclose')history.back();
  else if(a==='vprev')vGo(-1);
  else if(a==='vnext')vGo(1);
  else if(a==='vin')vZoom(V.z*1.4);
  else if(a==='vout')vZoom(V.z/1.4);
  else if(a==='vreset')vZoom(1);
  else if(a==='vdel')viewerDelete();
  else if(a==='import')$('#imp').click();
  else if(a==='reset'){if(!confirm('Remettre à zéro toutes les lectures et toutes les maîtrises ? Cette action est irréversible.'))return;
    all().forEach(k=>{k.r=0;k.p=0});save();render();toast('Progression réinitialisée')}
});
document.addEventListener('change',e=>{if(e.target.dataset.a==='rd'){ui.rd=e.target.value;render()}});
document.addEventListener('input',e=>{
  const t=e.target,k=t.dataset.e,c=S.courses[ui.sid];
  if(t.id==='q'){ui.sq=t.value;$('#res').innerHTML=results();return}
  if(!k||!c)return;
  if(k==='p'){c.p=+t.value;sheetVals()}else if(k==='t')c.t=t.value||'Sans titre';else c.d=t.value;
  save();
});
$('#imp').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const o=JSON.parse(r.result),d=o&&o.data?o.data:o;
    if(!d||!d.courses||typeof d.courses!=='object')throw 0;
    if(!confirm('Remplacer votre progression actuelle par cette sauvegarde ?'))return;
    S=norm(d);save();render();toast('Sauvegarde importée')}catch(x){toast('Fichier de sauvegarde invalide')}};
  r.readAsText(f);e.target.value='';
});
addEventListener('popstate',e=>{if(V.open){hideViewer();return}const s=e.state||{v:'home'};ui.v=s.v;ui.id=s.id||null;ui.f='all';ui.rd='all';if(!$('#sheet').hidden){$('#sheet').hidden=true;ui.sid=null;freeThumbs()}render()});

const fin=document.createElement('input');fin.type='file';fin.id='imgin';fin.multiple=true;fin.hidden=true;fin.accept='image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
fin.addEventListener('change',e=>{const f=[...e.target.files];e.target.value='';addImages(f)});document.body.appendChild(fin);
S=load();save();history.replaceState({v:'home',id:null},'');render();
if('serviceWorker'in navigator&&location.protocol!=='file:')addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
