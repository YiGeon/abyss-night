// 3D 렌더: Three.js r160(UMD). sim.js의 2D 좌표를 3D 월드로 옮겨 그린다. 월드 1단위 = 판의 1px, 카메라는 +Z에서 −Z를 본다
const sim=createSim();let game=createGame(sim);
const $=id=>document.getElementById(id);
const cv=$('cv');
const css=getComputedStyle(document.documentElement),C={};
for(const k of['hall','lcd','raise','gold','gold-dim','silver','crimson','orange','violet','indigo','magenta','amber','fg','muted','good'])C[k]=css.getPropertyValue('--'+k).trim();
const FB='"IBM Plex Sans KR","Apple SD Gothic Neo",system-ui,sans-serif',FD=`"Black Han Sans",${FB}`;
const INNER=[{x:GATE.x-GK.mx,y:GK.my,s:-1,ang:0,r:8},{x:GATE.x+GK.mx,y:GK.my,s:1,ang:0,r:8}];   // 문지기 양옆 작은 풍차
const wing={vis:0};
const DPR=Math.min(2,window.devicePixelRatio||1);
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;

// 원반은 플레이어 쪽으로 내려오는 계단: 한 단마다 40 아래, 100 앞
const STEP=[{X:0,Y:150,Z:70},{X:0,Y:110,Z:170},{X:0,Y:70,Z:270}];
const SLOPE=.16,RIM_H=10,LIP=DR+4;
const bowlH=r=>SLOPE*Math.max(0,Math.min(r,DR)-BUMP);       // 원뿔 그릇(실제 경사 약 2°를 눈에 보이게 9°로 과장)
function surfH(k,x,y){let h=bowlH(Math.hypot(x,y));
  for(const q of DISH[k].holes){if(q.fill>=CLOG_CAP)continue;const d=Math.hypot(q.x-x,q.y-y);if(d<HOLE+4)h-=1.5*(1-d/(HOLE+4))**2;}return h;}

const R=(()=>{
  const noop=()=>{};
  const api={ok:false,snap:noop,setLean:noop,shake:noop,patrol:noop,plug:noop,burst:noop,jackpot:noop,jolt:noop,gateFlash:noop,focus:noop,reset:noop,draw:noop,rebuild:noop};
  const fail=msg=>{const a=document.createElement('div');a.className='alert red';a.style.top='40%';a.textContent=msg;$('view').append(a);};
  if(!window.THREE){fail('3D 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.');return api;}
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});}
  catch(e){fail('이 브라우저에서는 3D(WebGL)를 쓸 수 없습니다.');return api;}
  api.ok=true;
  const T=THREE,V=(x,y,z)=>new T.Vector3(x,y,z),tmp=V(0,0,0);
  renderer.setPixelRatio(DPR);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.LinearToneMapping;renderer.toneMappingExposure=1;
  const scene=new T.Scene();const bg=new T.Color(C.hall||'#07050c');scene.background=bg;scene.fog=new T.Fog(bg,1400,3200);
  const cam=new T.PerspectiveCamera(46,1,10,5000);scene.add(cam);
  const machine=new T.Group();scene.add(machine);
  const bw=(x,y,z=0)=>V(x-210,668-y,z);                    // 판 2D 좌표 → 월드

  // ── 텍스처 도우미
  const canvasTex=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),c);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;};
  const redraw=(t,draw)=>{const c=t.image;draw(c.getContext('2d'),c);t.needsUpdate=true;};
  const matcap=canvasTex(128,128,g=>{                        // 조명 없이 크롬처럼 보이게: 시점을 따라오는 하이라이트
    let gr=g.createRadialGradient(44,38,4,64,64,64);gr.addColorStop(0,'#ffffff');gr.addColorStop(.22,'#eef0f6');gr.addColorStop(.55,'#9196aa');gr.addColorStop(.85,'#3b3e4e');gr.addColorStop(1,'#1c1d26');
    g.fillStyle=gr;g.fillRect(0,0,128,128);
    gr=g.createRadialGradient(92,98,2,92,98,30);gr.addColorStop(0,'rgba(255,190,150,.45)');gr.addColorStop(1,'rgba(255,190,150,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});
  const mc=(color,extra={})=>new T.MeshMatcapMaterial({matcap,color:new T.Color(color),...extra});
  const basic=(color,extra={})=>new T.MeshBasicMaterial({color:new T.Color(color),...extra});
  const glowTex=canvasTex(64,64,g=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.4,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);});

  // ── 판(캐비닛 앞면 그림)
  function capsulePath(g,Rr){g.beginPath();g.arc(B.cx,B.top,Rr,Math.PI,2*Math.PI);g.lineTo(B.cx+Rr,B.bot);g.arc(B.cx,B.bot,Rr,0,Math.PI);g.closePath();}
  function boardArt(g){
    g.setTransform(2,0,0,2,0,0);
    let gr=g.createLinearGradient(0,0,W,H);gr.addColorStop(0,C.orange);gr.addColorStop(.45,C.crimson);gr.addColorStop(1,C.violet);g.fillStyle=gr;g.fillRect(0,0,W,H);
    capsulePath(g,B.R);gr=g.createLinearGradient(0,B.top-B.R,0,B.bot+B.R);gr.addColorStop(0,C.indigo);gr.addColorStop(.5,C.violet);gr.addColorStop(1,C.crimson);g.fillStyle=gr;g.fill();
    g.save();capsulePath(g,B.R);g.clip();
    const N=36,cy=GATE.y;
    for(let i=0;i<N;i+=2){const a=-Math.PI/2+i*2*Math.PI/N,w=Math.PI/N;g.beginPath();g.moveTo(B.cx,cy);g.arc(B.cx,cy,900,a-w,a+w);g.closePath();
      g.fillStyle=i%4?'rgba(255,79,163,.10)':'rgba(255,255,255,.06)';g.fill();}
    for(const sx of[-1,1])for(const ph of[0,Math.PI]){g.beginPath();for(let t=0;t<=4.6*Math.PI;t+=.05){const rr=10*Math.exp(.2*t),x=B.cx+sx*rr*Math.cos(t+ph),y=cy-rr*Math.sin(t+ph)*.85;t?g.lineTo(x,y):g.moveTo(x,y);}
      g.lineWidth=ph?2:4;g.strokeStyle=ph?'rgba(255,255,255,.18)':'rgba(255,79,163,.35)';g.stroke();}
    gr=g.createRadialGradient(B.cx,330,140,B.cx,330,430);gr.addColorStop(0,'rgba(8,5,15,0)');gr.addColorStop(1,'rgba(8,5,15,.55)');g.fillStyle=gr;g.fillRect(0,0,W,H);
    g.globalAlpha=.55;g.strokeStyle=C.amber;g.lineWidth=2;g.beginPath();g.moveTo(B.cx-B.R+1,B.bot-10);g.lineTo(B.cx-B.R+1,B.top);g.arc(B.cx,B.top,B.R-1,Math.PI,Math.PI*1.28);g.stroke();g.globalAlpha=1;
    g.textAlign='center';
    for(const x of[100,320]){g.fillStyle=C.lcd;g.beginPath();g.ellipse(x,594,15,6,0,0,7);g.fill();g.fillStyle=C.fg;g.globalAlpha=.6;g.font=`700 9px ${FB}`;g.fillText('OUT',x,582);g.globalAlpha=1;}
    g.beginPath();g.moveTo(118,H);g.lineTo(118,432);g.lineTo(210,420);g.lineTo(302,432);g.lineTo(302,H);g.closePath();   // 케이지 뒤판
    gr=g.createLinearGradient(0,420,0,650);gr.addColorStop(0,C.raise);gr.addColorStop(1,C.lcd);g.fillStyle=gr;g.fill();
    for(const m of INNER){g.fillStyle=C.lcd;g.beginPath();g.ellipse(m.x+m.s*14,GK.my+6,6,3,0,0,7);g.fill();}
    g.restore();
    const o=sim.gapMM()/MM/2+NR;g.fillStyle=C.lcd;g.fillRect(GATE.x-o,GATE.y-1,o*2,16);
    g.fillStyle=C.gold;g.beginPath();g.roundRect(GATE.x-17,436,34,15,3);g.fill();g.fillStyle=C.crimson;g.font=`400 13px ${FD}`;g.fillText('IN',GATE.x,448);
  }
  const boardTex=canvasTex(W*2,H*2,boardArt);
  const boardMesh=new T.Mesh(new T.PlaneGeometry(W,H),basic('#ffffff',{map:boardTex}));boardMesh.position.set(0,H/2,0);machine.add(boardMesh);
  // 크롬 레일(판 둘레)과 케이지 금색 레일
  const capsulePts=Rr=>{const p=[];for(let i=0;i<=40;i++){const a=Math.PI+Math.PI*i/40;p.push(bw(B.cx+Rr*Math.cos(a),B.top+Rr*Math.sin(a),3));}
    for(let i=0;i<=40;i++){const a=Math.PI*i/40;p.push(bw(B.cx+Rr*Math.cos(a),B.bot+Rr*Math.sin(a),3));}return p;};
  machine.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(capsulePts(B.R+3),true),240,3.5,8,true),mc('#e8eaf0')));
  const cagePath=new T.CurvePath();[[118,668],[118,432],[210,420],[302,432],[302,668]].reduce((a,b)=>{cagePath.add(new T.LineCurve3(bw(a[0],a[1],4),bw(b[0],b[1],4)));return b;});
  machine.add(new T.Mesh(new T.TubeGeometry(cagePath,80,2.6,8,false),mc(C.gold)));

  // ── 못: 인스턴스 하나
  const nailGeo=new T.CylinderGeometry(NR,NR*1.15,9,6);nailGeo.rotateX(Math.PI/2);nailGeo.translate(0,0,4.5);
  let nailMesh=null,nailsRef=null;
  function buildNails(){
    if(nailMesh){machine.remove(nailMesh);nailMesh.dispose();}
    const ns=sim.nails;nailMesh=new T.InstancedMesh(nailGeo,mc('#ffffff'),ns.length);
    const m=new T.Matrix4(),gold=new T.Color(C.gold),amber=new T.Color(C.amber);
    ns.forEach((n,i)=>{m.makeTranslation(n.x-210,668-n.y,0);nailMesh.setMatrixAt(i,m);nailMesh.setColorAt(i,n.life?amber:gold);});
    machine.add(nailMesh);nailsRef=ns;
  }

  // ── 풍차
  const starGeo=r=>{const s=new T.Shape();for(let i=0;i<12;i++){const a=i*Math.PI/6,rr=i%2?2.4:r;i?s.lineTo(rr*Math.cos(a),rr*Math.sin(a)):s.moveTo(rr,0);}
    const g=new T.ExtrudeGeometry(s,{depth:2,bevelEnabled:false});g.translate(0,0,3);return g;};
  const mills=[...MILLS.map(w=>({w,r:WR,inner:false})),...INNER.map(w=>({w,r:w.r,inner:true}))].map(o=>{
    const grp=new T.Group();grp.position.copy(bw(o.w.x,o.w.y,0));
    const base=new T.Mesh(new T.CylinderGeometry(o.r+2,o.r+2,2.5,24).rotateX(Math.PI/2).translate(0,0,1.3),mc('#e8eaf0'));
    const blade=new T.Mesh(starGeo(o.r),mc(C.magenta));const hub=new T.Mesh(new T.SphereGeometry(2.6,10,8).translate(0,0,5.5),mc(C.gold));
    const lock=new T.Group();for(const s of[1,-1]){const b=new T.Mesh(new T.BoxGeometry((o.r+3)*2.8,2,2),basic(C.crimson));b.rotation.z=s*Math.PI/4;b.position.z=7;lock.add(b);}lock.visible=false;
    grp.add(base,blade,hub,lock);machine.add(grp);return{...o,blade,lock};});

  // ── 문지기 날개·센서
  const wingGeo=new T.BoxGeometry(14,3.2,4);wingGeo.translate(7,0,4);
  const wings=[-1,1].map(sx=>{const m=new T.Mesh(wingGeo,mc(C.gold));m.position.copy(bw(GATE.x+sx*16,GK.y,0));machine.add(m);return{m,sx};});
  const sensor=new T.Mesh(new T.SphereGeometry(3.2,12,8),basic(C.crimson));sensor.position.copy(bw(GATE.x,GK.y-12,5));machine.add(sensor);

  // ── 원반 3단: 원뿔 그릇(평면 투영 UV) + 위에서 본 그림 텍스처
  const TEX=512,SC=TEX/(2*LIP);
  function dishArt(k){return(g)=>{const d=DISH[k];g.setTransform(SC,0,0,SC,TEX/2,TEX/2);g.clearRect(-LIP,-LIP,LIP*2,LIP*2);
    let gr=g.createRadialGradient(0,0,4,0,0,DR);gr.addColorStop(0,'#2a2738');gr.addColorStop(.4,'#6b6f86');gr.addColorStop(.85,'#d9dce6');gr.addColorStop(1,'#8b90a6');
    g.fillStyle=gr;g.beginPath();g.arc(0,0,LIP,0,7);g.fill();
    g.lineWidth=2.5;g.strokeStyle=C.gold;g.beginPath();g.arc(0,0,DR,0,7);g.stroke();
    for(const h of d.holes){gr=g.createRadialGradient(h.x,h.y-1.5,1,h.x,h.y,HOLE);gr.addColorStop(0,'#000');gr.addColorStop(.75,'#05030a');gr.addColorStop(1,'#3a3550');
      g.fillStyle=gr;g.beginPath();g.arc(h.x,h.y,HOLE,0,7);g.fill();
      if(!h.win&&h.fill>0&&h.fill<CLOG_CAP){g.strokeStyle=C.amber;g.lineWidth=1.8;g.beginPath();g.arc(h.x,h.y,HOLE-1.6,-Math.PI/2,-Math.PI/2+h.fill/CLOG_CAP*Math.PI*2);g.stroke();}}
  };}
  const dishes=DISH.map((d,k)=>{
    const grp=new T.Group();grp.position.set(STEP[k].X,STEP[k].Y,STEP[k].Z);
    const prof=[V(.01,0,0),V(BUMP,0,0)];for(let r=BUMP+4;r<=DR;r+=4)prof.push(V(r,bowlH(r),0));const top=bowlH(DR);
    prof.push(V(DR,top+RIM_H,0),V(LIP,top+RIM_H,0),V(LIP,top-8,0),V(DR-6,top-10,0));
    const geo=new T.LatheGeometry(prof.map(p=>new T.Vector2(p.x,p.y)),72);
    const pos=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<pos.count;i++){uv.setXY(i,pos.getX(i)/(2*LIP)+.5,1-(pos.getZ(i)/(2*LIP)+.5));}
    const tex=canvasTex(TEX,TEX,dishArt(k));
    const bowl=new T.Mesh(geo,mc('#ffffff',{map:tex,side:T.DoubleSide}));
    const bump=new T.Mesh(new T.SphereGeometry(BUMP,20,10,0,Math.PI*2,0,Math.PI/2),mc('#f0f2f8'));
    const lip=new T.Mesh(new T.TorusGeometry(LIP,1.6,6,72).rotateX(Math.PI/2).translate(0,top+RIM_H,0),mc(C.gold));
    const win=d.holes[0],torus=new T.Mesh(new T.TorusGeometry(HOLE+.3,.9,6,28).rotateX(Math.PI/2),basic(C.crimson));
    torus.position.set(win.x,surfH(k,win.x,win.y)+.4,win.y);
    const glow=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:new T.Color(C.crimson),blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:.55}));
    glow.scale.set(26,26,1);glow.position.copy(torus.position).y+=1.5;
    const ped=new T.Mesh(new T.BoxGeometry(2*LIP+6,STEP[k].Y-6,2*LIP+4),basic('#1d1533'));ped.position.set(0,-(STEP[k].Y-6)/2-6,0);
    const trim=new T.Mesh(new T.BoxGeometry(2*LIP+6,2,2),mc(C.gold));trim.position.set(0,-6,LIP+4);
    grp.add(bowl,bump,lip,torus,glow,ped,trim);
    const lab=textSprite(`${k+1}단`,`1/${d.n}`);lab.position.set(-(LIP+30),top+6,0);grp.add(lab);
    machine.add(grp);return{grp,tex,sig:'',k};});
  function textSprite(a,b){const t=canvasTex(256,128,g=>{g.textAlign='center';g.font=`400 56px ${FD}`;g.fillStyle=C.fg;g.fillText(a,128,58);g.font=`700 40px ${FB}`;g.fillStyle=C.amber;g.fillText(b,128,112);});
    const s=new T.Sprite(new T.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(44,22,1);s.userData.tex=t;s.userData.txt=[a,b];return s;}
  const dishWorld=(k,x,y,lift=0)=>V(STEP[k].X+x,STEP[k].Y+surfH(k,x,y)+lift,STEP[k].Z+y);

  // ── 유리, 홀 조명
  const glass=new T.Mesh(new T.PlaneGeometry(400,450),new T.MeshBasicMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    map:canvasTex(256,256,g=>{const gr=g.createLinearGradient(0,0,256,256);[[.28,0],[.36,.10],[.44,0],[.62,0],[.68,.06],[.74,0]].forEach(([o,a])=>gr.addColorStop(o,`rgba(255,255,255,${a})`));g.fillStyle=gr;g.fillRect(0,0,256,256);})}));
  glass.position.set(0,668-243,40);machine.add(glass);
  for(const[x,y,z,c,s]of[[-700,900,-600,C.amber,500],[650,1000,-700,C.magenta,420],[0,1300,-900,C.orange,700]]){
    const l=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:new T.Color(c),blending:T.AdditiveBlending,depthWrite:false,transparent:true,opacity:.25,fog:false}));l.position.set(x,y,z);l.scale.set(s,s,1);scene.add(l);}

  // ── 구슬: 인스턴스 하나에 판·문지기·원반·박힌 구슬·떨어지는 유령·분수를 모두 담는다
  const CAP=1024,ballMesh=new T.InstancedMesh(new T.SphereGeometry(BR,12,8),mc('#ffffff'),CAP);
  ballMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);ballMesh.frustumCulled=false;
  for(let i=0;i<CAP;i++)ballMesh.setColorAt(i,new T.Color('#ffffff'));ballMesh.instanceColor.setUsage(T.DynamicDrawUsage);
  machine.add(ballMesh);
  const shadowMesh=new T.InstancedMesh(new T.CircleGeometry(BR*.95,14).rotateX(-Math.PI/2),basic('#000000',{transparent:true,opacity:.38,depthWrite:false}),200);
  shadowMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);shadowMesh.frustumCulled=false;machine.add(shadowMesh);
  const goldC=new T.Color(C.gold),whiteC=new T.Color('#ffffff');
  let n=0,ns=0;
  const put=(x,y,z,s,gold)=>{if(n>=CAP)return;const a=ballMesh.instanceMatrix.array,o=n*16;a.fill(0,o,o+16);a[o]=a[o+5]=a[o+10]=s;a[o+12]=x;a[o+13]=y;a[o+14]=z;a[o+15]=1;
    const c=gold?goldC:whiteC,ca=ballMesh.instanceColor.array;ca[n*3]=c.r;ca[n*3+1]=c.g;ca[n*3+2]=c.b;n++;};
  const shadow=(x,y,z,s)=>{if(ns>=200)return;const a=shadowMesh.instanceMatrix.array,o=ns*16;a.fill(0,o,o+16);a[o]=a[o+5]=a[o+10]=s;a[o+12]=x;a[o+13]=y;a[o+14]=z;a[o+15]=1;ns++;};

  // ── 효과: 고리 풀, 입자, 유령, 바람 고리, 순찰 실루엣
  const ringGeo=new T.RingGeometry(.86,1,48);
  const rings=Array.from({length:18},()=>{const m=new T.Mesh(ringGeo,new T.MeshBasicMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));m.visible=false;machine.add(m);return{m,t:0,dur:0};});
  function ring(pos,flat,color,r0,r1,dur){const r=rings.find(r=>!r.m.visible)||rings[0];r.m.visible=true;r.m.position.copy(pos);r.m.rotation.set(flat?-Math.PI/2:0,0,0);
    r.m.material.color.set(color);Object.assign(r,{t:0,dur,r0,r1});}
  const windRings=[0,1,2].map(()=>{const m=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:new T.Color(C.silver),transparent:true,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.visible=false;machine.add(m);return m;});
  const parts=[],ghosts=[];
  const silTex=canvasTex(128,256,g=>{let gr=g.createRadialGradient(64,58,4,64,58,34);gr.addColorStop(0,'rgba(4,2,8,.95)');gr.addColorStop(1,'rgba(4,2,8,0)');g.fillStyle=gr;g.fillRect(0,0,128,256);
    gr=g.createRadialGradient(64,175,10,64,175,74);gr.addColorStop(0,'rgba(4,2,8,.92)');gr.addColorStop(1,'rgba(4,2,8,0)');g.fillStyle=gr;g.fillRect(0,0,128,256);});
  const sil=new T.Mesh(new T.PlaneGeometry(70,140),new T.MeshBasicMaterial({map:silTex,transparent:true,depthWrite:false,depthTest:false,fog:false}));sil.renderOrder=10;sil.visible=false;cam.add(sil);

  // ── 카메라 리그
  const camS={eye:V(0,250,900),look:V(0,340,60),fov:46,shake:0,lean:false,focusT:0,jackT:0,joltZ:0,patrolT:0,patrolLen:0,expo:1};
  const tan23=Math.tan(23*Math.PI/180);
  function frame(){
    const asp=cam.aspect,phone=asp<.8;
    if(camS.jackT>0){const w=dishWorld(2,DISH[2].holes[0].x,DISH[2].holes[0].y,20);return{eye:w.clone().add(V(0,46,phone?150:190)),look:w,fov:40};}
    if(camS.lean){const look=phone?V(0,92,232):V(0,110,175),L=phone?Math.max(80/(tan23*asp),118/tan23):Math.max(150/(tan23*asp),160/tan23),el=40*Math.PI/180;
      return{eye:look.clone().add(V(0,Math.sin(el)*L,Math.cos(el)*L)),look,fov:46};}
    const d=Math.max(345/tan23,235/(tan23*asp));return{eye:V(0,240,100+d),look:V(0,320,100),fov:46};   // 판 전체: 앉아서 올려다본다
  }
  const lookNow=V(0,0,0);
  function updateCam(dt,t){
    const f=frame(),a=REDUCED?1:1-Math.exp(-4*dt);
    camS.eye.lerp(f.eye,a);camS.look.lerp(f.look,a);
    camS.fov+=((camS.focusT>0?f.fov-5:f.fov)-camS.fov)*a;camS.focusT=Math.max(0,camS.focusT-dt);
    cam.position.copy(camS.eye);
    if(!REDUCED){cam.position.y+=Math.sin(t*Math.PI*.5)*1.5;
      if(camS.shake>0){const s=camS.shake*14;cam.position.x+=(Math.random()-.5)*s;cam.position.y+=(Math.random()-.5)*s;camS.shake=Math.max(0,camS.shake-dt*1.6);}}
    lookNow.copy(camS.look);cam.lookAt(lookNow);
    if(!REDUCED&&camS.shake>0)cam.rotation.z+=(Math.random()-.5)*camS.shake*.06;
    if(Math.abs(cam.fov-camS.fov)>.01){cam.fov=camS.fov;cam.updateProjectionMatrix();}
  }

  // ── 크기·DPR
  let fpsT=0,fpsN=0,lowered=false;
  const view=$('view');
  function resize(){const w=cv.clientWidth||1,h=cv.clientHeight||1;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(cv);resize();
  cv.addEventListener('webglcontextlost',e=>e.preventDefault());
  cv.addEventListener('webglcontextrestored',()=>api.rebuild());

  // ── 공개 함수
  const seen=new WeakMap();
  api.setLean=on=>{camS.lean=on;};
  api.shake=(sec=.25,amp=1)=>{camS.shake=Math.max(camS.shake,sec*amp);};
  api.patrol=len=>{camS.patrolT=0;camS.patrolLen=len;sil.visible=true;};
  api.plug=(k,x,y)=>{const p=dishWorld(k,x,y,.5);ring(p,true,C.amber,HOLE,HOLE+16,.8);for(let i=0;i<10;i++)parts.push({p:p.clone(),v:V((Math.random()-.5)*60,60+Math.random()*90,(Math.random()-.5)*60),life:.9,gold:false});};
  api.burst=(n,big)=>{const h=DISH[2].holes[0],p=dishWorld(2,h.x,h.y,2);for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*120;
    parts.push({p:p.clone(),v:V(Math.cos(a)*s,180+Math.random()*260,Math.sin(a)*s*.6+40),life:1.4+Math.random(),gold:true});}};
  api.jackpot=big=>{api.burst(big?90:30);camS.jackT=big?3.6:1.6;camS.expo=1.6;};
  api.jolt=()=>{camS.joltZ=-6;api.shake(.25,.8);for(let k=0;k<3;k++)ring(V(STEP[k].X,STEP[k].Y+bowlH(DR)+RIM_H+1,STEP[k].Z),true,C.good,LIP,LIP+14,.5);};
  api.gateFlash=()=>ring(bw(GATE.x,GK.y+3,8),false,C.good,24,34,1.2);
  api.focus=sec=>{camS.focusT=sec;};
  api.snap=()=>{const f=frame();camS.eye.copy(f.eye);camS.look.copy(f.look);camS.fov=f.fov;};   // 카메라를 목표 시점으로 바로 옮긴다
  api.reset=()=>{parts.length=0;ghosts.length=0;camS.jackT=0;camS.patrolT=camS.patrolLen=0;sil.visible=false;camS.expo=1;for(const r of rings)r.m.visible=false;};
  api.rebuild=()=>{redraw(boardTex,boardArt);buildNails();for(const d of dishes){d.sig='';}
    dishes.forEach((d,k)=>{const lab=d.grp.children.find(c=>c.userData&&c.userData.tex);if(lab){const[a,b]=lab.userData.txt;redraw(lab.userData.tex,g=>{g.clearRect(0,0,256,128);g.textAlign='center';g.font=`400 56px ${FD}`;g.fillStyle=C.fg;g.fillText(a,128,58);g.font=`700 40px ${FB}`;g.fillStyle=C.amber;g.fillText(b,128,112);});}});};

  const chip=$('n3'),proj=V(0,0,0);
  api.draw=(dt,rdt)=>{
    const t=performance.now()/1000;
    // 풍차·문지기·구멍 깜빡임 상태 갱신(2D 시절과 같은 값)
    for(const w of MILLS){w.ang+=(.5+w.spin)*w.s*dt;w.spin*=Math.max(0,1-dt*1.2);}
    for(const m of INNER)if(!sim.millLock)m.ang+=2.5*m.s*dt;
    for(const o of mills){o.blade.rotation.z=-o.w.ang;o.lock.visible=o.inner&&sim.millLock;o.blade.material.color.set(o.inner&&sim.millLock?C.muted:C.magenta);}
    const g0=sim.gate,target=sim.broken?1.45:g0.open?1.2:0;wing.vis+=(target-wing.vis)*Math.min(1,dt*25);
    for(const w of wings){w.m.rotation.z=-(w.sx<0?wing.vis:Math.PI-wing.vis);w.m.material.color.set(sim.broken?C.muted:C.gold);}
    sensor.visible=sim.block;sensor.scale.setScalar(1+g0.sensed*.8);
    if(nailsRef!==sim.nails)buildNails();
    for(const d of dishes){const sig=DISH[d.k].holes.map(h=>h.fill).join(',');if(sig!==d.sig){d.sig=sig;redraw(d.tex,dishArt(d.k));}}
    for(const [k,dd] of DISH.entries())for(const h of dd.holes)if(h.flash>0){
      if(h.flash===1){ghosts.push({k,x:h.x,y:h.y,t:0});ring(dishWorld(k,h.x,h.y,.4),true,h.win?C.amber:C.crimson,HOLE+2,HOLE+9,.45);}
      h.flash=Math.max(0,h.flash-dt*2.5);}
    // 화면에서 구슬이 너무 작으면 키운다(판 최대 1.5배, 원반 1.15배)
    const pxPer=dist=>(cv.clientHeight/2)/(Math.tan(cam.fov*Math.PI/360)*dist);
    const sB=Math.min(1.5,Math.max(1,9/(2*BR*pxPer(Math.max(1,cam.position.distanceTo(V(0,340,0)))))));
    const sD=Math.min(1.15,Math.max(1,8/(2*BR*pxPer(Math.max(1,cam.position.distanceTo(V(0,STEP[2].Y,STEP[2].Z)))))));
    n=0;ns=0;
    for(const b of sim.balls)put(b.x-210,668-b.y,BR*sB,sB);
    for(const b of sim.gk)put(b.x-210,668-b.y,BR*sB,sB);
    for(const b of sim.dish){
      const p=dishWorld(b.k,b.x,b.y,BR*sD);let s=seen.get(b);
      if(!s){const prev=b.k?dishWorld(b.k-1,DISH[b.k-1].holes[0].x,DISH[b.k-1].holes[0].y,BR):bw(GATE.x,GK.dropY,BR);s={t:0,from:prev};seen.set(b,s);}
      if(s.t<.15){s.t+=rdt;const u=Math.min(1,s.t/.15);tmp.copy(s.from).lerp(p,u);tmp.y+=Math.sin(u*Math.PI)*12;put(tmp.x,tmp.y,tmp.z,sD);}
      else put(p.x,p.y,p.z,sD);
      shadow(p.x+1,p.y-BR*sD+.25,p.z,sD);}
    for(const[k,dd]of DISH.entries())for(const h of dd.holes)if(h.fill>=CLOG_CAP){const p=dishWorld(k,h.x,h.y,BR*.45);put(p.x,p.y,p.z,1);}
    for(let i=ghosts.length-1;i>=0;i--){const q=ghosts[i];q.t+=rdt;if(q.t>.14){ghosts.splice(i,1);continue;}const p=dishWorld(q.k,q.x,q.y,BR*(1-q.t/.14*1.8));put(p.x,p.y,p.z,1);}
    for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.v.y-=520*rdt;q.p.addScaledVector(q.v,rdt);q.life-=rdt;if(q.life<=0||q.p.y<-40){parts.splice(i,1);continue;}
      put(q.p.x,q.p.y,q.p.z,Math.min(1.3,q.life*1.4)*(q.gold?1.25:1),q.gold);}
    ballMesh.count=n;ballMesh.instanceMatrix.needsUpdate=true;ballMesh.instanceColor.needsUpdate=true;
    shadowMesh.count=ns;shadowMesh.instanceMatrix.needsUpdate=true;
    // 고리·바람·순찰
    for(const r of rings)if(r.m.visible){r.t+=rdt;const u=r.t/r.dur;if(u>=1){r.m.visible=false;continue;}const s=r.r0+(r.r1-r.r0)*u;r.m.scale.set(s,s,s);r.m.material.opacity=1-u;}
    const wh=DISH[2].holes[0];windRings.forEach((m,i)=>{m.visible=sim.wind&&game.state==='play';if(!m.visible)return;const p=(t*2+i/3)%1,w=dishWorld(2,wh.x,wh.y,2+p*14);
      m.position.copy(w);const s=HOLE+p*8;m.scale.set(s,s,s);m.material.opacity=(1-p)*.8*sim.windPow/1.5;});
    if(sil.visible){camS.patrolT+=rdt;const u=camS.patrolT/Math.max(.1,camS.patrolLen);if(u>=1){sil.visible=false;}
      else{const vh=2*120*Math.tan(cam.fov*Math.PI/360),vw=vh*cam.aspect;sil.position.set(-vw/2-40+u*(vw+80),-10,-120);sil.scale.setScalar(vh/120);
        sil.material.opacity=Math.min(1,u*8,(1-u)*8)*.85;}}
    const expoT=camS.jackT>0?1.25:(game.patrol==='on'?.7:1);camS.expo+=(expoT-camS.expo)*Math.min(1,rdt*3);renderer.toneMappingExposure=camS.expo;
    camS.jackT=Math.max(0,camS.jackT-rdt);
    // 두드리기: 기계가 밀렸다 돌아온다
    camS.joltZ+=(0-camS.joltZ)*Math.min(1,rdt*10);machine.position.z=camS.joltZ;
    updateCam(rdt,t);
    renderer.render(scene,cam);
    // 3단 무더기 칩: 3단 앞 가장자리에 붙인다
    const n3=sim.count[2];
    if(n3>0&&game.state==='play'){proj.set(STEP[2].X-(LIP+30),STEP[2].Y+bowlH(DR)-10,STEP[2].Z).add(machine.position).project(cam);   // 3단 라벨 바로 아래
      chip.hidden=false;chip.textContent=`3단 ${n3}/20`;chip.classList.toggle('hot',n3>=18);
      chip.style.transform=`translate(${((proj.x+1)/2*cv.clientWidth).toFixed(0)}px,${((1-proj.y)/2*cv.clientHeight+cv.offsetTop).toFixed(0)}px) translate(-50%,4px)`;}
    else chip.hidden=true;
    // 느리면 해상도를 한 번 낮춘다
    if(!lowered){fpsT+=rdt;fpsN++;if(fpsT>=2){if(fpsT/fpsN>.02&&DPR>1.5){renderer.setPixelRatio(1.5);resize();lowered=true;}fpsT=0;fpsN=0;}}
  };
  buildNails();
  return api;
})();

function renderStatic(){R.rebuild();}
function draw(dt,rdt){R.draw(dt,rdt===undefined?dt:rdt);}
