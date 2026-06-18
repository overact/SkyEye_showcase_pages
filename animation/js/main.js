/* ============================================================
   SkyEye explainer prototype — main.js
   Master timeline engine + procedural builders (paddock quilt,
   neural network, dashboard plots, floating digits).
   ============================================================ */

/* ---------------- procedural builders ---------------- */

/* Scene 3: paddock quilt cells */
(function buildQuilt(){
  const quilt = document.getElementById('quilt');
  const classes = ['','q1','q2','q3','q4','q1','qa','q2','q3','qb'];
  for(let i=0;i<60;i++){
    const d=document.createElement('div');
    const c=classes[(i*7+3)%10];
    if(c) d.classList.add(c);
    quilt.appendChild(d);
  }
})();

/* Scene 6: dashboard plot grid */
(function buildPlots(){
  const grid=document.getElementById('plotgrid');
  const shades=['','g1','g2','g3','g4','g1','g3','g2'];
  for(let i=0;i<40;i++){
    const d=document.createElement('div');
    d.className='plot '+shades[(i*7+3)%8];
    grid.insertBefore(d,grid.firstChild);
  }
})();

/* Scene 4: neural network — nodes, edges, staggered pulse delays */
(function buildNet(){
  const svg=document.getElementById('netsvg');
  const NS='http://www.w3.org/2000/svg';
  const layers=[4,6,6,3];
  const xs=[40,210,380,530];
  const pos=layers.map((n,li)=>{
    const ys=[];
    const span=360, top=(440-span)/2 + (li%2?14:0);
    for(let i=0;i<n;i++) ys.push(top + span*(n===1?.5:i/(n-1)));
    return ys.map(y=>({x:xs[li],y}));
  });
  // edges first (under nodes)
  for(let li=0;li<layers.length-1;li++){
    pos[li].forEach((a,ai)=>{
      pos[li+1].forEach((b,bi)=>{
        const e=document.createElementNS(NS,'line');
        e.setAttribute('x1',a.x);e.setAttribute('y1',a.y);
        e.setAttribute('x2',b.x);e.setAttribute('y2',b.y);
        e.setAttribute('pathLength','1');
        const hot=((ai*3+bi*5+li*7)%4===0);
        e.setAttribute('class', hot?'edge hot':'edge');
        if(hot) e.style.setProperty('--d',(1.4+li*.5+((ai+bi)%3)*.18)+'s');
        svg.appendChild(e);
      });
    });
  }
  pos.forEach((layer,li)=>{
    layer.forEach((p,i)=>{
      const c=document.createElementNS(NS,'circle');
      c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r',9);
      c.setAttribute('class','node');
      c.style.setProperty('--d',(1.3+li*.5+i*.07)+'s');
      svg.appendChild(c);
    });
  });
})();

/* Scene 2: floating raw numbers */
(function buildDigits(){
  const host=document.getElementById('digits');
  const vals=['0.61','23%','34°C','6.4','412','18 km/h','62%','0 mm','3.1 t/ha','40%','9%','0.92'];
  vals.forEach((v,i)=>{
    const s=document.createElement('span');
    s.textContent=v;
    s.style.left=((i*131+90)%1460)+'px';
    s.style.top=(430+(i*67)%330)+'px';
    s.style.animationDelay=(i*.33)+'s';
    host.appendChild(s);
  });
})();

/* ---------------- timeline engine ---------------- */

/* Scene 5 (LLM agronomist, id 's5') is temporarily disabled.
   To restore it: remove the `hidden` attribute from <section id="s5"> in
   index.html, then re-insert {id:'s5',t:…,label:'LLM agronomist'} below and
   re-time the entries that follow. */
/* Scene starts, captions, TOTAL and ENDCARD_AT below are DERIVED FROM THE AUDIO
   by tools/gen-voiceover.py (it prints a paste-ready block). The narration is a
   continuous per-scene read; captions are a verbatim transcript so what you hear
   matches what you read. Re-run the generator and paste its output after any
   script change — don't hand-edit these to drift from voiceover.mp3.
   (s0 starts at t:0 so the orbit is on screen from frame 0; the voice itself
   has a 0.4s lead-in, which is why the first caption is at 0.4.) */
const SCENES=[
  {id:'s0',  t:0,    label:'Australian context'},
  {id:'s1',  t:6.65, label:'Scale problem'},
  {id:'s2',  t:19.7, label:'Data limits'},
  {id:'ssol',t:26.08,label:'SkyEye approach'},
  {id:'s3',  t:37.89,label:'Drone capture'},
  {id:'s4',  t:43.77,label:'Deep learning'},
  {id:'s6',  t:51.06,label:'Action dashboard'},
  {id:'s7',  t:64.14,label:'Farm outcome'},
];
const TOTAL=80.6;
const ENDCARD_AT=73.13;
const SCENE_FADE_MS=550;
const CAPTIONS=[
  [0.4,  "Australian agriculture creates over AUD 50 billion a year."],
  [6.65, "But many farmers face the same problem: farms are too vast to inspect by hand."],
  [12.5, "One farmer may manage thousands of hectares, and checking everything takes time, labour and fuel."],
  [19.7, "Data helps, but it can be delayed, scattered, or too coarse for daily decisions."],
  [26.08,"That is where SkyEye comes in: drone inspection from above, analysed by AI."],
  [32.08,"The pipeline moves from capture, to vision, to a clear farm overview."],
  [37.89,"Drones capture high-resolution and multispectral views across each paddock."],
  [43.77,"AI vision flags crop stress, weeds, pests, irrigation issues and asset risks."],
  [51.06,"SkyEye combines detections with farm records."],
  [55.06,"The result is a practical action map: fix this zone, repair this fence, check this livestock group, or spray only where needed."],
  [64.14,"Farmers focus on the few areas that need attention first."],
  [68.5, "They can act earlier, spend less, and grow more."],
  [73.28,"SkyEye — turning aerial inspection into clear farm actions."],
];

const stage=document.getElementById('stage');
const wrap=document.getElementById('stageWrap');
const cap=document.getElementById('caption');
const prog=document.getElementById('prog');
const clock=document.getElementById('clock');
const replay=document.getElementById('replay');
const icPlay=document.getElementById('icPlay');
const icPause=document.getElementById('icPause');
const voiceover=document.getElementById('voiceover');
const urlParams=new URLSearchParams(location.search);
const recordingMode=urlParams.has('rec');

let playing=false, base=0, startStamp=0, raf=null, curScene=-1, curCap=-2, ended=false;
let lastAudioReconcile=0;
let pendingVoiceoverSeek=null;
const leaveTimers=new Map();
let captionTimer=null;

const now=()=>performance.now()/1000;
const elapsed=()=>playing? base+(now()-startStamp) : base;
const hasVoiceover=()=>Boolean(voiceover && (
  voiceover.currentSrc ||
  voiceover.getAttribute('src') ||
  voiceover.querySelector('source')
));
const shouldUseVoiceover=()=>hasVoiceover() && !recordingMode;
const clampTime=t=>Math.max(0,Math.min(t,TOTAL));

function sceneIndexAt(t){
  let i=SCENES.length-1;
  while(i>0 && t<SCENES[i].t) i--;
  return i;
}
function activateScene(i){
  if(i===curScene) return;
  curScene=i;
  SCENES.forEach((s,k)=>{
    const el=document.getElementById(s.id);
    const timer=leaveTimers.get(el);
    if(k===i){
      if(timer){ clearTimeout(timer); leaveTimers.delete(el); }
      el.classList.remove('leaving');
      el.classList.remove('on');
      void el.offsetWidth;
      el.classList.add('on');
    }else if(el.classList.contains('on')){
      if(timer) clearTimeout(timer);
      el.classList.add('leaving');
      leaveTimers.set(el,setTimeout(()=>{
        el.classList.remove('on','leaving');
        leaveTimers.delete(el);
      },SCENE_FADE_MS));
    }else if(!el.classList.contains('leaving')){
      el.classList.remove('on');
    }
  });
}
function updateCaption(t){
  let i=-1;
  for(let k=0;k<CAPTIONS.length;k++){
    if(t>=CAPTIONS[k][0]) i=k;
    else break;
  }
  if(i!==curCap){
    curCap=i;
    if(captionTimer){ clearTimeout(captionTimer); captionTimer=null; }
    cap.classList.remove('show');
    if(i<0){
      cap.textContent='';
      return;
    }
    cap.textContent=CAPTIONS[i][1];
    captionTimer=setTimeout(()=>{cap.classList.add('show')},40);
  }
}
function voiceoverCanSeekTo(t){
  if(voiceover.readyState<1 || !voiceover.seekable || !voiceover.seekable.length) return false;
  for(let i=0;i<voiceover.seekable.length;i++){
    if(t>=voiceover.seekable.start(i) && t<=voiceover.seekable.end(i)) return true;
  }
  return false;
}
function clearPendingVoiceoverSeek(){
  if(!pendingVoiceoverSeek) return;
  voiceover.removeEventListener(pendingVoiceoverSeek.event,pendingVoiceoverSeek.handler);
  pendingVoiceoverSeek=null;
}
function startVoiceover(){
  const attempt=voiceover.play();
  if(attempt && typeof attempt.catch==='function'){
    attempt.catch(e=>console.warn('Voice-over playback failed:', e.message));
  }
}
function deferVoiceoverSeek(t, playWhenReady){
  clearPendingVoiceoverSeek();
  const event=voiceover.readyState<1?'loadedmetadata':'canplay';
  const handler=()=>{
    clearPendingVoiceoverSeek();
    try{
      voiceover.currentTime=t;
    }catch(e){
      console.warn('Voice-over deferred seek failed:', e.message);
    }
    if(playWhenReady) startVoiceover();
  };
  pendingVoiceoverSeek={event,handler};
  voiceover.addEventListener(event,handler,{once:true});
  if(voiceover.readyState<1) voiceover.load();
}
function syncVoiceover(t, playWhenReady=false){
  if(!shouldUseVoiceover()) return;
  const target=clampTime(t);
  if(!voiceoverCanSeekTo(target)) deferVoiceoverSeek(target, playWhenReady);
  else clearPendingVoiceoverSeek();
  try{
    voiceover.currentTime=target;
  }catch(e){
    console.warn('Voice-over seek failed:', e.message);
  }
}
function playVoiceover(t=elapsed()){
  if(!shouldUseVoiceover()) return;
  syncVoiceover(t, true);
  startVoiceover();
}
function pauseVoiceover(){
  if(shouldUseVoiceover()) voiceover.pause();
}
function reconcileVoiceover(t){
  if(!shouldUseVoiceover() || voiceover.paused || t-lastAudioReconcile<5) return;
  lastAudioReconcile=t;
  if(Math.abs(voiceover.currentTime-t)>.2) syncVoiceover(t);
}
function renderAt(t){
  activateScene(sceneIndexAt(t));
  const outcome=document.getElementById('s7');
  if(outcome) outcome.classList.toggle('endphase', t>=ENDCARD_AT);
  updateCaption(t);
  prog.style.width=(t/TOTAL*100)+'%';
  clock.textContent=t.toFixed(1).padStart(4,'0')+' / '+TOTAL.toFixed(1);
}

function updateCaptionForExport(t){
  let i=-1;
  for(let k=0;k<CAPTIONS.length;k++){
    if(t>=CAPTIONS[k][0]) i=k;
    else break;
  }
  if(captionTimer){ clearTimeout(captionTimer); captionTimer=null; }
  curCap=i;
  if(i<0){
    cap.textContent='';
    cap.classList.remove('show');
  }else{
    cap.textContent=CAPTIONS[i][1];
    cap.classList.add('show');
  }
}

function renderFrameForExport(t){
  const target=clampTime(t);
  const activeIdx=sceneIndexAt(target);
  const active=SCENES[activeIdx];
  const activeEl=document.getElementById(active.id);
  const fadeSeconds=SCENE_FADE_MS/1000;
  const fadeElapsed=activeIdx===0 ? fadeSeconds : target-active.t;
  const fadeProgress=Math.max(0,Math.min(1,fadeElapsed/fadeSeconds));
  const prevIdx=activeIdx>0 && fadeElapsed<fadeSeconds ? activeIdx-1 : -1;
  const prevEl=prevIdx>=0 ? document.getElementById(SCENES[prevIdx].id) : null;

  cancelAnimationFrame(raf);
  clearPendingVoiceoverSeek();
  if(captionTimer){ clearTimeout(captionTimer); captionTimer=null; }
  playing=false; ended=false; base=target; curScene=activeIdx;
  document.body.classList.add('frame-export');
  stage.classList.add('paused');
  stage.classList.remove('prestart');
  replay.classList.remove('show');

  SCENES.forEach((s,k)=>{
    const el=document.getElementById(s.id);
    el.style.transition='none';
    if(k===activeIdx){
      el.classList.add('on');
      el.classList.remove('leaving');
      el.style.opacity=String(fadeProgress);
      el.style.transform=`scale(${1.014-(0.014*fadeProgress)})`;
    }else if(k===prevIdx){
      el.classList.add('on','leaving');
      el.style.opacity=String(1-fadeProgress);
      el.style.transform=`scale(${1-(0.008*fadeProgress)})`;
    }else{
      el.classList.remove('on','leaving');
      el.style.opacity='0';
      el.style.transform='scale(1.014)';
    }
  });

  const outcome=document.getElementById('s7');
  if(outcome) outcome.classList.toggle('endphase', target>=ENDCARD_AT);
  updateCaptionForExport(target);
  prog.style.width=(target/TOTAL*100)+'%';
  clock.textContent=target.toFixed(1).padStart(4,'0')+' / '+TOTAL.toFixed(1);

  void stage.offsetWidth;
  const activeLocalMs=Math.max(0,(target-active.t)*1000);
  const prevLocalMs=prevIdx>=0
    ? Math.max(0,(active.t-SCENES[prevIdx].t)*1000)
    : 0;
  document.getAnimations().forEach(animation=>{
    const animTarget=animation.effect && animation.effect.target;
    const scene=animTarget && animTarget.closest ? animTarget.closest('.scene') : null;
    let ms=target*1000;
    if(scene===activeEl){
      ms=activeLocalMs;
      if(active.id==='s7' && animTarget.closest('.endcard')){
        ms=Math.max(0,(target-ENDCARD_AT)*1000);
      }
    }else if(scene===prevEl){
      ms=prevLocalMs;
    }
    try{
      animation.pause();
      animation.currentTime=ms;
    }catch(e){
      // Some browser-created animations are not seekable; ignore them for export.
    }
  });

  if(typeof window.__skyeyeRenderGlobeFrame==='function'){
    if(active.id==='s0') window.__skyeyeRenderGlobeFrame(activeLocalMs/1000);
    else if(prevIdx>=0 && SCENES[prevIdx].id==='s0') window.__skyeyeRenderGlobeFrame(prevLocalMs/1000);
  }
}

window.__skyeyeRenderFrame=async t=>{
  renderFrameForExport(Number(t)||0);
  await new Promise(requestAnimationFrame);
};

function frame(){
  const t=elapsed();
  if(t>=TOTAL){ finish(); return; }
  renderAt(t);
  reconcileVoiceover(t);
  raf=requestAnimationFrame(frame);
}
function play(){
  if(ended) return restart();
  if(playing) return;
  playing=true; startStamp=now();
  stage.classList.remove('paused');
  stage.classList.remove('prestart');
  icPlay.style.display='none'; icPause.style.display='';
  playVoiceover();
  raf=requestAnimationFrame(frame);
}
function pause(){
  if(!playing) return;
  base=elapsed(); playing=false;
  pauseVoiceover();
  stage.classList.add('paused');
  icPlay.style.display=''; icPause.style.display='none';
  cancelAnimationFrame(raf);
}
function finish(){
  playing=false; ended=true; base=TOTAL;
  pauseVoiceover();
  prog.style.width='100%';
  clock.textContent=TOTAL.toFixed(1)+' / '+TOTAL.toFixed(1);
  stage.classList.add('paused');
  icPlay.style.display=''; icPause.style.display='none';
  replay.classList.add('show');
  cancelAnimationFrame(raf);
}
function seekScene(i){
  cancelAnimationFrame(raf);
  ended=false; replay.classList.remove('show');
  stage.classList.remove('paused');
  stage.classList.remove('prestart');
  curScene=-1; curCap=-2;
  base=SCENES[i].t; startStamp=now();
  playing=true;
  playVoiceover(base);
  icPlay.style.display='none'; icPause.style.display='';
  raf=requestAnimationFrame(frame);
}
const restart=()=>seekScene(0);

/* ---------------- controls ---------------- */
document.getElementById('btnPlay').onclick=()=> playing? pause():play();
document.getElementById('btnRestart').onclick=restart;
replay.onclick=restart;
document.getElementById('btnFull').onclick=()=>{
  if(document.fullscreenElement) document.exitFullscreen();
  else wrap.requestFullscreen();
};
const track=document.getElementById('track');
SCENES.forEach((s,i)=>{
  const m=document.createElement('div');
  m.className='mark'; m.style.left=(s.t/TOTAL*100)+'%';
  m.innerHTML='<div class="tip">'+(i+1)+' · '+s.label+'</div>';
  m.onclick=e=>{e.stopPropagation(); seekScene(i)};
  track.appendChild(m);
});
track.onclick=e=>{
  const r=track.getBoundingClientRect();
  const t=(e.clientX-r.left)/r.width*TOTAL;
  seekScene(sceneIndexAt(t));
};
document.addEventListener('keydown',e=>{
  if(e.code==='Space'){e.preventDefault(); playing? pause():play();}
  else if(e.key==='r'||e.key==='R') restart();
  else if(e.key==='f'||e.key==='F') document.getElementById('btnFull').click();
  else if(e.key>='1'&&e.key<=String(SCENES.length)) seekScene(+e.key-1);
});

/* responsive scale */
function rescale(){
  const r=wrap.getBoundingClientRect();
  stage.style.transform='scale('+(r.width/1600)+')';
}
new ResizeObserver(rescale).observe(wrap);
rescale();

/* recording mode (?rec): hide all chrome so the stage fills the viewport */
if(recordingMode){
  document.body.classList.add('rec');
  rescale();
}

/* autostart: wait for a user gesture when voice-over is configured. */
stage.classList.add('paused');
renderAt(0);
if(shouldUseVoiceover()){
  // wait for a click (audio autoplay policy): show a poster frame with the
  // globe + a Play button instead of a lone caption over an empty stage
  stage.classList.add('prestart');
  icPlay.style.display=''; icPause.style.display='none';
}else{
  setTimeout(play,400);
}
document.getElementById('startposter').onclick=play;
