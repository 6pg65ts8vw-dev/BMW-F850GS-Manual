let pages=[];
const synonyms={
  retenes:['reten','retén','retenes','anillo obturador','anillos obturadores','obturador','radial'],
  horquilla:['horquilla','telescopica','telescópica','barra','barras','botella','botellas'],
  purgar:['purgar','purga','purgado','sangrar','sangrado','aire','purga de aire'],
  freno:['freno','frenos','pinza','líquido de frenos','liquido de frenos','disco'],
  aceite:['aceite','lubricante','motor oil','filtro de aceite'],
  valvulas:['válvula','válvulas','culata','juego de válvulas','reglaje'],
  pares:['par','pares de apriete','nm','torque','apretar'],
  rueda:['rueda','cojinete','rodamiento','llanta','neumático','eje'],
  suspension:['suspensión','amortiguador','amortiguadores','muelle','conjunto telescópico'],
  motor:['motor','cigüeñal','cilindro','culata','pistón','biela'],
  electricidad:['eléctrico','electricidad','batería','alternador','relé','conector','cableado'],
  combustible:['combustible','depósito','bomba','inyector','gasolina'],
  refrigeracion:['refrigeración','refrigerante','radiador','bomba de agua','termostato']
};
const intent={
  'cambiar retenes de horquilla':['retenes','horquilla','desmontar','montar'],
  'purgar freno':['purgar','freno','purga','líquido'],
  'cambiar aceite motor':['aceite','motor','filtro','llenado'],
  'par pinza freno':['pinza','freno','nm'],
  'reglaje valvulas':['válvulas','culata','juego'],
  'cojinete rueda':['cojinete','rueda','rodamiento']
};
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s.]/g,' ').replace(/\s+/g,' ').trim()}
const rev={}; for(const [k,a] of Object.entries(synonyms)){rev[norm(k)]=k; a.forEach(x=>rev[norm(x)]=k)}
function terms(q){const n=norm(q), out=new Set(n.split(' ').filter(x=>x.length>1)); for(const t of [...out]) if(rev[t]) {out.add(rev[t]); synonyms[rev[t]].forEach(x=>out.add(norm(x)))} for(const [k,v] of Object.entries(intent)) if(norm(q).includes(norm(k))) v.forEach(x=>out.add(norm(x))); return [...out]}
function score(text,q){const n=norm(text), nq=norm(q); if(!nq)return 0; let s=0; if(n.includes(nq))s+=40; const ts=terms(q); for(const t of ts){ if(n.includes(t)) s += t.length>=5?4:2; } const words=norm(q).split(' ').filter(x=>x.length>2); const hits=words.filter(w=>n.includes(w)).length; if(words.length&&hits===words.length)s+=25; return s}
function category(text){const n=norm(text); let best='general', bs=0; for(const [c,a] of Object.entries(synonyms)){const z=a.reduce((v,x)=>v+(n.includes(norm(x))?1:0),0); if(z>bs){bs=z;best=c}} return best}
function esc(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function snippet(text,q){const qs=terms(q).filter(x=>x.length>2); const n=norm(text); let pos=Infinity; for(const t of qs){const p=n.indexOf(t); if(p>=0)pos=Math.min(pos,p)} if(!isFinite(pos))pos=0; let a=Math.max(0,pos-180),b=Math.min(text.length,a+620); let raw=text.slice(a,b), safe=esc(raw); for(const t of qs.slice(0,12)){const re=new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'); safe=safe.replace(re,'<mark>$1</mark>')} return (a?'…':'')+safe+(b<text.length?'…':'')}
function extractTorque(text){const out=[]; const re=/([^.!?\n]{0,100}\b(?:\d{1,3}(?:[.,]\d+)?\s*Nm)\b[^.!?\n]{0,100})/gi; let m; while((m=re.exec(text))&&out.length<8) out.push(m[1].trim()); return [...new Set(out)]}
function makeWorkCard(p,q){const text=p.text; const torques=extractTorque(text); const tools=[...new Set((text.match(/(?:N.º|No\.?|Nº)\s*[0-9 ]+/gi)||[]).map(x=>x.trim()))].slice(0,8); const hasWarn=/ATENCIÓN|PELIGRO|ADVERTENCIA|PRECAUCIÓN/i.test(text); return `<div class="work"><div class="workHead"><span>FICHA DE TRABAJO</span><b>Página ${p.page}</b></div><h2>${esc(q)}</h2><div class="grid"><div><h3>🔧 Procedimiento</h3><p>${snippet(text,q)}</p></div><div><h3>🔩 Pares de apriete</h3>${torques.length?'<ul>'+torques.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':'<p>No detectados en este fragmento.</p>'}</div><div><h3>🧰 Herramientas</h3>${tools.length?'<ul>'+tools.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':'<p>Consulta la página original para las herramientas especiales.</p>'}</div><div><h3>⚠️ Advertencias</h3><p>${hasWarn?'El procedimiento contiene advertencias/atención. Revisa el texto original antes de trabajar.':'No se ha detectado una advertencia en este fragmento.'}</p></div></div><button class="primary" onclick="openPage(${p.page})">🖼️ Abrir página original y esquemas</button></div>`}
function render(q){q=q.trim(); const cat=document.getElementById('cat').value; if(!q){document.getElementById('status').textContent='Escribe una búsqueda o elige una tarea.';document.getElementById('results').innerHTML='';return} const res=pages.map(p=>({p,s:score(p.text,q)})).filter(x=>x.s>0&&(!cat||category(x.p.text)===cat)).sort((a,b)=>b.s-a.s).slice(0,50); document.getElementById('status').textContent=`${res.length} resultados para “${q}”`; document.getElementById('results').innerHTML=res.map(x=>`<article class="card" onclick="showWork(${x.p.page},'${esc(q).replace(/'/g,'&#39;')}')"><div class="title">Página ${x.p.page} · ${esc(category(x.p.text))}</div><div class="meta">Relevancia ${x.s} · ${esc(x.p.chunk)}</div><div class="snippet">${snippet(x.p.text,q)}</div><div class="open">Abrir ficha de trabajo →</div></article>`).join('')||'<div class="card">No he encontrado coincidencias. Prueba “retenes horquilla”, “purgar freno”, “aceite motor”, “válvulas” o “par pinza”.</div>'}
function showWork(page,q){const p=pages[page-1]; document.getElementById('viewer').innerHTML=makeWorkCard(p,q)+`<div class="viewer"><iframe title="Manual BMW F 850 GS página ${page}" src="manual/${p.chunk}#page=${p.localPage}"></iframe></div>`; document.getElementById('viewer').scrollIntoView({behavior:'smooth',block:'start'})}
function openPage(page){const p=pages[page-1]; document.getElementById('viewer').innerHTML=`<div class="viewer"><iframe title="Manual BMW F 850 GS página ${page}" src="manual/${p.chunk}#page=${p.localPage}"></iframe></div>`; document.getElementById('viewer').scrollIntoView({behavior:'smooth',block:'start'})}
async function init(){try{const r=await fetch('data/index.json'); pages=await r.json(); document.getElementById('status').textContent=`Manual cargado · ${pages.length} páginas indexadas.`}catch(e){document.getElementById('status').textContent='No se ha podido cargar el índice. Comprueba que data/index.json está en GitHub.';return} const qEl=document.getElementById('q'); document.getElementById('go').onclick=()=>render(qEl.value); qEl.addEventListener('keydown',e=>{if(e.key==='Enter')render(qEl.value)}); document.getElementById('cat').onchange=()=>render(qEl.value); document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{qEl.value=b.dataset.q;render(qEl.value)}); document.getElementById('about').onclick=()=>document.getElementById('dlg').showModal()}
init();
