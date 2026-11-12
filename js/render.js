// 캔버스 그리기: 정적 레이어(renderStatic)와 매 프레임(draw)
const sim=createSim();let game=createGame(sim);
const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d');
const css=getComputedStyle(document.documentElement),C={};
for(const k of['lcd','raise','gold','gold-dim','silver','crimson','orange','violet','indigo','magenta','amber','fg','muted','good'])C[k]=css.getPropertyValue('--'+k).trim();
const FB='"IBM Plex Sans KR","Apple SD Gothic Neo",system-ui,sans-serif',FD=`"Black Han Sans",${FB}`;
const Q=0.36;                                  // 원반을 비스듬히 내려다본 각도(세로 압축, 그리기 전용)
const INNER=[{x:GATE.x-GK.mx,y:GK.my,s:-1,ang:0,r:8},{x:GATE.x+GK.mx,y:GK.my,s:1,ang:0,r:8}];
const wing={vis:0};
const DPR=Math.min(2,window.devicePixelRatio||1);
cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);

const sprite=document.createElement('canvas');
(()=>{const n=24;sprite.width=sprite.height=n;const g=sprite.getContext('2d'),gr=g.createRadialGradient(n*.36,n*.32,1,n/2,n/2,n/2);
  gr.addColorStop(0,'#ffffff');gr.addColorStop(.35,C.silver);gr.addColorStop(1,'#5d6278');g.fillStyle=gr;g.beginPath();g.arc(n/2,n/2,n/2,0,7);g.fill();})();

let BK=1;function ball(x,y){const q=BR*BK;ctx.drawImage(sprite,x-q,y-q,q*2,q*2);}   // BK: 작은 화면에서 구슬을 키워 그리는 배율
function capsule(g,R){g.beginPath();g.arc(B.cx,B.top,R,Math.PI,2*Math.PI);g.lineTo(B.cx+R,B.bot);g.arc(B.cx,B.bot,R,0,Math.PI);g.closePath();}

let layer=null;
function renderStatic(){
  layer=document.createElement('canvas');layer.width=W*DPR;layer.height=H*DPR;
  const g=layer.getContext('2d');g.scale(DPR,DPR);
  let gr=g.createLinearGradient(0,0,W,H);gr.addColorStop(0,C.orange);gr.addColorStop(.45,C.crimson);gr.addColorStop(1,C.violet);
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  gr=g.createLinearGradient(0,0,W,0);
  [[0,'#8a8fa6'],[.2,C.silver],[.5,'#767b92'],[.8,C.silver],[1,'#8a8fa6']].forEach(([o,c])=>gr.addColorStop(o,c));
  capsule(g,B.R+7);g.fillStyle=gr;g.fill();
  capsule(g,B.R);gr=g.createLinearGradient(0,B.top-B.R,0,B.bot+B.R);
  gr.addColorStop(0,C.indigo);gr.addColorStop(.5,C.violet);gr.addColorStop(1,C.crimson);g.fillStyle=gr;g.fill();
  g.save();capsule(g,B.R);g.clip();
  const N=36,cy=GATE.y;                        // 입구로 빨려 드는 빛살
  for(let i=0;i<N;i+=2){const a=-Math.PI/2+i*2*Math.PI/N,w=Math.PI/N;
    g.beginPath();g.moveTo(B.cx,cy);g.arc(B.cx,cy,900,a-w,a+w);g.closePath();
    g.fillStyle=i%4?'rgba(255,79,163,.10)':'rgba(255,255,255,.06)';g.fill();}
  for(const sx of[-1,1])for(const ph of[0,Math.PI]){   // 늪의 소용돌이
    g.beginPath();for(let t=0;t<=4.6*Math.PI;t+=.05){const rr=10*Math.exp(.2*t),x=B.cx+sx*rr*Math.cos(t+ph),y=cy-rr*Math.sin(t+ph)*.85;t?g.lineTo(x,y):g.moveTo(x,y);}
    g.lineWidth=ph?2:4;g.strokeStyle=ph?'rgba(255,255,255,.18)':'rgba(255,79,163,.35)';g.stroke();}
  for(let k=0;k<11;k++){const rx=70+k*34;g.beginPath();g.ellipse(B.cx,560,rx,rx*.42,0,0,7);
    g.lineWidth=2;g.strokeStyle=`rgba(255,255,255,${(.16-k*.012).toFixed(3)})`;g.stroke();}
  gr=g.createRadialGradient(B.cx,330,140,B.cx,330,430);gr.addColorStop(0,'rgba(8,5,15,0)');gr.addColorStop(1,'rgba(8,5,15,.55)');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.globalAlpha=.55;g.strokeStyle=C.amber;g.lineWidth=2;g.beginPath();g.moveTo(B.cx-B.R+1,B.bot-10);g.lineTo(B.cx-B.R+1,B.top);
  g.arc(B.cx,B.top,B.R-1,Math.PI,Math.PI*1.28);g.stroke();g.globalAlpha=1;
  g.textAlign='center';
  for(const x of[100,320]){g.fillStyle=C.lcd;g.beginPath();g.ellipse(x,594,15,6,0,0,7);g.fill();
    g.fillStyle=C.fg;g.globalAlpha=.6;g.font=`700 9px ${FB}`;g.fillText('OUT',x,582);g.globalAlpha=1;}
  // 케이지
  g.beginPath();g.moveTo(118,H);g.lineTo(118,432);g.lineTo(210,420);g.lineTo(302,432);g.lineTo(302,H);g.closePath();
  gr=g.createLinearGradient(0,420,0,650);gr.addColorStop(0,C.raise);gr.addColorStop(1,C.lcd);g.fillStyle=gr;g.fill();
  g.lineWidth=5;g.strokeStyle=C.gold;g.stroke();g.lineWidth=1.5;g.strokeStyle=C.magenta;g.stroke();
  for(const[x,y]of[[118,432],[302,432],[118,540],[302,540],[118,618],[302,618]]){
    g.beginPath();g.arc(x,y,5,0,7);g.fillStyle=C.gold;g.fill();g.beginPath();g.arc(x-1.2,y-1.2,1.6,0,7);g.fillStyle='rgba(255,255,255,.7)';g.fill();}
  for(const m of INNER){g.fillStyle=C.lcd;g.beginPath();g.ellipse(m.x+m.s*14,GK.my+6,6,3,0,0,7);g.fill();}  // 문지기 옆 배출구
  g.restore();
  const o=sim.gapMM()/MM/2+NR;
  g.fillStyle=C.lcd;g.fillRect(GATE.x-o,GATE.y-1,o*2,16);
  g.fillStyle=C.gold;g.beginPath();g.roundRect(GATE.x-17,436,34,15,3);g.fill();
  g.fillStyle=C.crimson;g.font=`400 13px ${FD}`;g.fillText('IN',GATE.x,448);
  for(const n of sim.nails){g.beginPath();g.arc(n.x,n.y,NR,0,7);g.fillStyle=n.life?C.amber:C.gold;g.fill();
    g.beginPath();g.arc(n.x-.7,n.y-.7,.8,0,7);g.fillStyle='rgba(255,255,255,.55)';g.fill();}
  DISH.forEach((d,k)=>{
    g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.ellipse(d.x,d.y+6,DR+2,DR*Q+3,0,0,7);g.fill();
    g.save();g.translate(d.x,d.y);g.scale(1,Q);
    gr=g.createRadialGradient(0,0,4,0,0,DR);gr.addColorStop(0,'#141020');gr.addColorStop(.45,'#565a70');gr.addColorStop(.85,C.silver);gr.addColorStop(1,'#7c8199');
    g.beginPath();g.arc(0,0,DR,0,7);g.fillStyle=gr;g.fill();
    for(const h of d.holes){g.beginPath();g.arc(h.x,h.y,HOLE,0,7);g.fillStyle=C.lcd;g.fill();}
    gr=g.createRadialGradient(-2,-3,1,0,0,BUMP);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#6d7288');
    g.beginPath();g.arc(0,0,BUMP,0,7);g.fillStyle=gr;g.fill();
    g.restore();
    const win=d.holes[0];g.lineWidth=2;g.strokeStyle=C.crimson;g.beginPath();g.ellipse(d.x+win.x,d.y+win.y*Q,HOLE,HOLE*Q,0,0,7);g.stroke();
    g.lineWidth=2;g.strokeStyle=C.gold;g.beginPath();g.ellipse(d.x,d.y,DR,DR*Q,0,0,7);g.stroke();
    g.font=`400 13px ${FD}`;g.fillStyle=C.fg;g.textAlign='left';g.fillText(`${k+1}단`,126,d.y+5);
    g.font=`600 11px ${FB}`;g.fillStyle=C.amber;g.textAlign='right';g.fillText(`1/${d.n}`,294,d.y+5);
  });
  g.textAlign='center';
}

function drawMill(w,r,locked){
  ctx.save();ctx.translate(w.x,w.y);
  ctx.beginPath();ctx.arc(0,0,r+2,0,7);ctx.fillStyle=C.silver;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=C.gold;ctx.stroke();
  ctx.rotate(w.ang);ctx.fillStyle=C.magenta;
  for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r,-2.6);ctx.lineTo(r-1,2.6);ctx.closePath();ctx.fill();ctx.rotate(Math.PI/3);}
  ctx.beginPath();ctx.arc(0,0,2.6,0,7);ctx.fillStyle=C.gold;ctx.fill();
  ctx.restore();
  if(locked){ctx.strokeStyle=C.crimson;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(w.x-r-3,w.y-r-3);ctx.lineTo(w.x+r+3,w.y+r+3);ctx.moveTo(w.x+r+3,w.y-r-3);ctx.lineTo(w.x-r-3,w.y+r+3);ctx.stroke();}
}

function drawGate(dt){
  const g=sim.gate,target=sim.broken?1.45:g.open?1.2:0;
  wing.vis+=(target-wing.vis)*Math.min(1,dt*25);
  if(sim.block){ctx.beginPath();ctx.arc(GATE.x,GK.y-12,3.2,0,7);ctx.fillStyle=C.crimson;ctx.fill();
    if(g.sensed>0){ctx.globalAlpha=g.sensed;ctx.beginPath();ctx.arc(GATE.x,GK.y-12,8,0,7);ctx.strokeStyle=C.crimson;ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;}}
  ctx.lineCap='round';ctx.lineWidth=4;ctx.strokeStyle=sim.broken?C.muted:C.gold;
  for(const sx of[-1,1]){const px=GATE.x+sx*16,a=sx<0?wing.vis:Math.PI-wing.vis;
    ctx.beginPath();ctx.moveTo(px,GK.y);ctx.lineTo(px+Math.cos(a)*14,GK.y+Math.sin(a)*14);ctx.stroke();
    ctx.beginPath();ctx.arc(px,GK.y,2.5,0,7);ctx.fillStyle=C.silver;ctx.fill();}
  ctx.lineCap='butt';
}

let clock=0;
function draw(dt){
  clock+=dt;
  ctx.drawImage(layer,0,0,W,H);
  for(const w of MILLS){w.ang+=(.5+w.spin)*w.s*dt;w.spin*=Math.max(0,1-dt*1.2);drawMill(w,WR,false);}
  for(const m of INNER){if(!sim.millLock)m.ang+=2.5*m.s*dt;drawMill(m,m.r,sim.millLock);}
  drawGate(dt);
  for(const b of sim.balls)ball(b.x,b.y);
  for(const b of sim.gk)ball(b.x,b.y);
  for(const d of DISH)for(const h of d.holes)if(h.fill>=CLOG_CAP)ball(d.x+h.x,d.y+h.y*Q);
  ctx.fillStyle='rgba(0,0,0,.35)';for(const b of sim.dish){const d=DISH[b.k];ctx.beginPath();ctx.ellipse(d.x+b.x+1,d.y+b.y*Q+BR*.9,BR*BK*.9,BR*BK*.35,0,0,7);ctx.fill();}   // 원반 위 구슬 그림자
  for(const b of sim.dish){const d=DISH[b.k];ball(d.x+b.x,d.y+b.y*Q);}
  if(sim.wind){const d=DISH[2],w=d.holes[0],x=d.x+w.x,y=d.y+w.y*Q;ctx.strokeStyle=C.silver;ctx.lineWidth=1.5;
    for(let i=0;i<3;i++){const p=(clock*2+i/3)%1;ctx.globalAlpha=1-p;ctx.beginPath();ctx.ellipse(x,y-2-p*10,HOLE+p*8,(HOLE+p*8)*Q,0,Math.PI,2*Math.PI);ctx.stroke();}
    ctx.globalAlpha=1;}
  ctx.lineWidth=2.5;
  for(const d of DISH)for(const h of d.holes)if(h.flash>0){
    ctx.globalAlpha=h.flash;ctx.strokeStyle=h.win?C.amber:C.crimson;ctx.beginPath();ctx.ellipse(d.x+h.x,d.y+h.y*Q,HOLE+4,(HOLE+4)*Q+2,0,0,7);ctx.stroke();
    h.flash=Math.max(0,h.flash-dt*2.5);}
  ctx.globalAlpha=1;
}

