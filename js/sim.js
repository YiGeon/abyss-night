// 물리 시뮬레이션(createSim)과 게임 규칙(createGame). DOM을 쓰지 않아 node에서도 돈다(tools/bot.js).
// SIM-START
const W=420,H=668;
const B={cx:210,top:215,bot:455,R:195};        // 판: 위아래가 둥근 캡슐 (선분 top~bot, 반지름 R)
const BR=4,NR=2.4,G=900,DT=1/240,E_NAIL=0.45,E_LIFE=1.0,E_WALL=0.15;
const MM=1.375;                                // 1px = 1.375mm, 구슬 지름 11mm = 8px
const GREAL=9800/MM,UNIT=0.03;                 // 실제 중력(px/s²), 경사 1눈금 = 0.03°
const POW0=720,POWK=2.6;                       // 발사 속도 = POW0 + 세기*POWK
const GATE={x:210,y:405};                      // 못의 숲 출구(입구 못)
const NAIL_SET={A:[11.95,11],B:[11.2,11.5],C:[11.1,12.5],SWAP:[13,11]}; // [입구 못 간격 mm, 깔때기 못 벌림] → 통과율 약 1/30, 1/60, 1/100, 바꿔치기 1/20 (세기 60 기준)
const GK={y:462,mx:45,my:470,dropY:494};       // 문지기 날개 높이, 양옆 풍차, 원반으로 떨어지는 높이
const GK_OPEN=[.15,.4],GK_SHUT=[.5,.8],MILL_P=.08; // 날개가 열려 있는 시간 비율 28% + 풍차 되튐 → 약 1/3
const DISH=[{x:210,y:512,n:3,win:90},{x:210,y:562,n:4,win:90},{x:210,y:612,n:5,win:270}]; // 당첨 구멍: 1·2단 앞, 3단 뒤
const CAGE=[[118,668,118,432],[118,432,210,420],[210,420,302,432],[302,432,302,668]];
const MILLS=[{x:88,y:290,s:1},{x:332,y:290,s:-1},{x:66,y:478,s:1},{x:354,y:478,s:-1}],WR=9;
for(const m of MILLS){m.spin=0;m.ang=0;}
const DR=58,BUMP=8,HR=14,HOLE=6.5,A_CENTER=260,K_HOLE=90,V_DROP=20,DAMP=1.2;   // 구멍은 가운데 둔덕을 감싸는 링 위
const RIDGE=[[0,-30,-15,-19],[0,-30,15,-19]];  // 3단 당첨 구멍 뒤 보이지 않는 턱(바깥으로 뾰족한 ㅅ자라 뒤에서 온 구슬은 옆으로 흘러감)
const WIND=1800,   // 3단 바람 커튼 세기(2200 → 1800: 무더기로 밀면 거의 뚫리게)
      WIND_R=HOLE+9;                 // 바람 커튼
const CLOG_AT=7,CLOG_CAP=12,DISH_MAX=40,JOLT=350;   // 꽝 구멍 배출로는 12개 차면 역류, 판 두드리기 충격(px/s)
const PRICE=4000,MIN_PAY=300000000,START_BALLS=137500,FIRE_GAP=.6,MASS_GAP=.05,FLOOR=600;
const CELL=16,COLS=Math.ceil(W/CELL),ROWS=Math.ceil(H/CELL);
for(const d of DISH){d.holes=[];for(let i=0;i<d.n;i++){const t=d.win*Math.PI/180+2*Math.PI*i/d.n;d.holes.push({x:HR*Math.cos(t),y:HR*Math.sin(t),win:i===0,flash:0,fill:0});}}

function lcg(s){return()=>(s=(s*1664525+1013904223)>>>0)/4294967296}
const wallDist=(x,y)=>Math.hypot(x-B.cx,y-Math.min(B.bot,Math.max(B.top,y)));

function makeNails(gap,arm){
  const r=lcg(7),out=[],o=gap/2+NR;
  for(let a=200;a<=340;a+=5.5){const t=a*Math.PI/180;out.push({x:B.cx+(B.R-42)*Math.cos(t),y:B.top+(B.R-42)*Math.sin(t)});} // 천정 못 아치
  for(const s of[-1,1]){
    for(let k=1;k<=3;k++)out.push({x:GATE.x+s*(o+k*arm),y:GATE.y-k*8});            // 깔때기 못
    out.push({x:GATE.x+s*o,y:GATE.y,life:true},{x:GATE.x+s*o,y:GATE.y+8,life:true}); // 입구 못
  }
  const special=out.slice();
  for(let y=B.top-150,row=0;y<FLOOR-10;y+=20,row++){
    for(let x=row%2?16:4;x<W;x+=24){
      const px=x+(r()-.5)*3,py=y+(r()-.5)*2;
      if(wallDist(px,py)>B.R-26)continue;                                          // 발사 레일 길은 비워 둔다
      if(py<B.top&&Math.hypot(px-B.cx,py-B.top)>B.R-56)continue;                   // 아치 바깥
      if(Math.abs(px-GATE.x)<46&&py>GATE.y-46&&py<GATE.y+18)continue;              // 입구 주변
      if(px>104&&px<316&&py>408)continue;                                           // 케이지
      if(MILLS.some(m=>Math.hypot(px-m.x,py-m.y)<23))continue;                      // 풍차
      if(special.some(n=>Math.hypot(px-n.x,py-n.y)<15))continue;                    // 구슬(8px)이 끼지 않을 간격
      out.push({x:px,y:py});
    }
  }
  return out;
}

function hitSeg(b,[x1,y1,x2,y2]){
  const sx=x2-x1,sy=y2-y1;let t=((b.x-x1)*sx+(b.y-y1)*sy)/(sx*sx+sy*sy);t=t<0?0:t>1?1:t;
  const qx=x1+sx*t,qy=y1+sy*t,dx=b.x-qx,dy=b.y-qy,d2=dx*dx+dy*dy;
  if(d2>=BR*BR||d2<1e-9)return;
  const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,vn=b.vx*nx+b.vy*ny;b.x=qx+nx*BR;b.y=qy+ny*BR;
  if(vn<0){b.vx-=1.3*vn*nx;b.vy-=1.3*vn*ny;}
}
function nearestHole(D,b){let h=null,hd=1e9;for(const q of D.holes){if(q.fill>=CLOG_CAP)continue;const t=Math.hypot(q.x-b.x,q.y-b.y);if(t<hd){hd=t;h=q;}}return[h,hd];}

function createSim(rand=Math.random){
  const s={balls:[],gk:[],dish:[],count:[0,0,0],nails:[],grid:[],
    nail:'A',swap:false,block:false,millLock:false,wind:false,ridge:true,broken:false,mass:false,
    tiltDish:0,tiltMach:0,tiltFloor:0,tilt:0,tiltX:0,windPow:1,powOff:0,spillAt:1e9,power:60,auto:false,fireT:0,gate:{open:false,t:.5,sensed:0},
    pool:START_BALLS,st:null,events:[]};
  s.nailSet=()=>NAIL_SET[s.nail==='C'&&s.swap?'SWAP':s.nail];s.gapMM=()=>s.nailSet()[0];
  s.tiltUnits=()=>s.tiltDish+s.tiltMach;                // 앞뒤 경사(하우스). 바닥(건물)은 옆으로 기울어 꽝 배출로만 막는다
  s.clogged=()=>s.tiltFloor>=CLOG_AT;
  s.apply=()=>{
    s.nails=makeNails(s.gapMM()/MM,s.nailSet()[1]);s.grid=Array.from({length:COLS*ROWS},()=>[]);
    for(const n of s.nails)s.grid[((n.y/CELL)|0)*COLS+((n.x/CELL)|0)].push(n);
    s.tilt=GREAL*Math.sin(s.tiltUnits()*UNIT*Math.PI/180);s.tiltX=GREAL*Math.sin(s.tiltFloor*UNIT*Math.PI/180);
    if(!s.clogged())for(const d of DISH)for(const h of d.holes)h.fill=0;     // 배출로가 다시 내리막이면 막힌 구슬이 빠진다
  };
  s.fire=()=>{const v=(POW0+(s.power+s.powOff)*POWK)*(1+(rand()-.5)*0.01);
    s.balls.push({x:B.cx-B.R+BR+.5,y:B.bot-15,vx:0,vy:-v,age:0});s.st.fired++;s.pool++;};
  s.enterDish=k=>{
    if(s.count[k]>=DISH_MAX){s.events.push({t:'overflow',k});return;}       // 원반이 꽉 차면 넘쳐 나간다
    const a=rand()*Math.PI*2,r=DR-BR-1,v=110+rand()*50;s.count[k]++;s.events.push({t:'enter',k});
    s.dish.push({k,x:r*Math.cos(a),y:r*Math.sin(a),vx:-Math.sin(a)*v,vy:Math.cos(a)*v,age:0});};
  s.jolt=()=>{for(const b of s.dish){b.vy-=JOLT*(.7+rand()*.6);b.vx+=(rand()-.5)*JOLT*.4;b.age=0;}
    let n=0;if(s.count[2]>=s.spillAt)for(const b of s.dish.filter(b=>b.k===2).sort((a,c)=>c.y-a.y).slice(0,2)){s.dish.splice(s.dish.indexOf(b),1);s.count[2]--;n++;}
    return n;};   // 3단이 넘치게 쌓였으면 앞 가장자리 구슬 2개가 튀어 나간다   // 판을 두드리면 원반 구슬이 뒤로 튄다
  s.reset=()=>{s.events.length=0;s.balls.length=0;s.gk.length=0;s.dish.length=0;s.count=[0,0,0];s.pool=START_BALLS;
    s.st={fired:0,forest:0,gk:0,pass:[0,0,0],jack:0,won:0};for(const d of DISH)for(const h of d.holes)h.fill=0;};
  s.step=()=>{
    if(s.auto&&(s.fireT-=DT)<=0){s.fire();s.fireT+=s.mass?MASS_GAP:FIRE_GAP;}
    const gh=s.gapMM()/MM/2-1,m=BR+NR,m2=m*m,lim=B.R-BR,mw=BR+WR;
    // ── 제1난관: 못의 숲 (ponytail: 판 위 구슬끼리는 충돌하지 않음 — 분당 100발 밀도에선 거의 안 겹친다)
    for(let i=s.balls.length-1;i>=0;i--){
      const b=s.balls[i];b.age+=DT;
      b.vy+=G*DT;b.x+=b.vx*DT;b.y+=b.vy*DT;
      const py=Math.min(B.bot,Math.max(B.top,b.y)),dx=b.x-B.cx,dy=b.y-py,d=Math.hypot(dx,dy);
      if(d>lim){const nx=dx/d,ny=dy/d,vn=b.vx*nx+b.vy*ny;b.x=B.cx+nx*lim;b.y=py+ny*lim;
        if(vn>0){b.vx-=(1+E_WALL)*vn*nx;b.vy-=(1+E_WALL)*vn*ny;}}
      const gx=(b.x/CELL)|0,gy=(b.y/CELL)|0;
      for(let yy=gy-1;yy<=gy+1;yy++)for(let xx=gx-1;xx<=gx+1;xx++){
        if(xx<0||yy<0||xx>=COLS||yy>=ROWS)continue;
        for(const n of s.grid[yy*COLS+xx]){
          const ex=b.x-n.x,ey=b.y-n.y,d2=ex*ex+ey*ey;
          if(d2>=m2||d2<1e-9)continue;
          const dd=Math.sqrt(d2),nx=ex/dd,ny=ey/dd,vn=b.vx*nx+b.vy*ny;
          b.x=n.x+nx*m;b.y=n.y+ny*m;
          if(vn<0){const e=n.life?E_LIFE:E_NAIL;b.vx-=(1+e)*vn*nx;b.vy-=(1+e)*vn*ny;b.vx+=(rand()-.5)*8;}
        }
      }
      for(const w of MILLS){
        const ex=b.x-w.x,ey=b.y-w.y,d2=ex*ex+ey*ey;
        if(d2>=mw*mw||d2<1e-9)continue;
        const dd=Math.sqrt(d2),nx=ex/dd,ny=ey/dd,vn=b.vx*nx+b.vy*ny;
        b.x=w.x+nx*mw;b.y=w.y+ny*mw;
        if(vn<0){b.vx-=1.4*vn*nx;b.vy-=1.4*vn*ny;b.vx-=ny*w.s*60;b.vy+=nx*w.s*60;w.spin=Math.min(w.spin+4,16);}
      }
      if(b.y>GATE.y&&b.x>104&&b.x<316)for(const sg of CAGE)hitSeg(b,sg);
      if(Math.abs(b.x-GATE.x)<gh&&b.y>GATE.y+3&&b.y<GATE.y+14){s.balls.splice(i,1);s.st.forest++;s.gk.push({x:GATE.x,y:GATE.y+12,vx:0,vy:40,ph:0});continue;}
      if(b.y>FLOOR||b.age>25)s.balls.splice(i,1);
    }
    // ── 제2난관: 문지기 (날개가 제멋대로 열리고 닫힘)
    const g=s.gate;g.sensed=Math.max(0,g.sensed-DT*3);
    if((g.t-=DT)<=0){g.open=!g.open;g.t=g.open?GK_OPEN[0]+rand()*GK_OPEN[1]:GK_SHUT[0]+rand()*GK_SHUT[1];}
    for(let i=s.gk.length-1;i>=0;i--){
      const b=s.gk[i];b.vy+=G*DT;b.x+=b.vx*DT;b.y+=b.vy*DT;
      if(b.ph===0&&b.y>=GK.y-8){
        if(s.block&&!s.broken){g.open=false;g.t=Math.max(g.t,.4);g.sensed=1;}      // 센서가 감지하고 닫음
        if(s.broken||g.open)b.ph=1;
        else{b.ph=2;b.vx=(rand()<.5?-1:1)*(160+rand()*60);b.vy=-90;}
      }
      if(b.ph===1&&b.y>=GK.dropY){s.gk.splice(i,1);s.st.gk++;s.enterDish(0);}
      else if(b.ph===2&&Math.abs(b.x-GATE.x)>=GK.mx){s.gk.splice(i,1);
        if(!s.millLock&&rand()<MILL_P){s.st.gk++;s.enterDish(0);}else s.events.push({t:'gkout'});}
    }
    // ── 제3난관: 3단 원반
    for(const b of s.dish){
      const D=DISH[b.k];b.age+=DT;
      let r=Math.hypot(b.x,b.y)||1e-6,ax=-A_CENTER*b.x/r+s.tiltX,ay=-A_CENTER*b.y/r+s.tilt;
      const[h,hd]=nearestHole(D,b);
      if(h&&hd<HOLE+4&&hd>.5){ax+=K_HOLE*(h.x-b.x)/hd;ay+=K_HOLE*(h.y-b.y)/hd;}     // 구멍 주변은 살짝 패여 있다
      if(s.wind&&b.k===2){const w=D.holes[0],ex=b.x-w.x,ey=b.y-w.y,e=Math.hypot(ex,ey);
        if(e<WIND_R&&e>.1){const f=WIND*s.windPow*(1-e/WIND_R)/e;ax+=ex*f;ay+=ey*f;}}
      const f=1-DAMP*DT;b.vx=(b.vx+ax*DT)*f;b.vy=(b.vy+ay*DT)*f;b.x+=b.vx*DT;b.y+=b.vy*DT;
      r=Math.hypot(b.x,b.y)||1e-6;
      const nx=b.x/r,ny=b.y/r,vn=b.vx*nx+b.vy*ny;
      if(r>DR-BR){b.x=nx*(DR-BR);b.y=ny*(DR-BR);if(vn>0){b.vx-=1.5*vn*nx;b.vy-=1.5*vn*ny;}}
      else if(r<BUMP+BR){b.x=nx*(BUMP+BR);b.y=ny*(BUMP+BR);if(vn<0){b.vx-=1.5*vn*nx;b.vy-=1.5*vn*ny;}}
      if(b.k===2&&s.ridge)for(const sg of RIDGE)hitSeg(b,sg);
    }
    for(let i=0;i<s.dish.length;i++){const a=s.dish[i];                               // 원반 안 구슬끼리 밀어냄
      for(let j=i+1;j<s.dish.length;j++){const c=s.dish[j];if(a.k!==c.k)continue;
        const dx=c.x-a.x,dy=c.y-a.y,d2=dx*dx+dy*dy;if(d2>=4*BR*BR||d2<1e-9)continue;
        const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,o=(2*BR-d)/2;a.x-=nx*o;a.y-=ny*o;c.x+=nx*o;c.y+=ny*o;
        const vn=(c.vx-a.vx)*nx+(c.vy-a.vy)*ny;if(vn<0){const J=-.65*vn;a.vx-=J*nx;a.vy-=J*ny;c.vx+=J*nx;c.vy+=J*ny;}}}
    for(let i=s.dish.length-1;i>=0;i--){
      const b=s.dish[i],[h,hd]=nearestHole(DISH[b.k],b);if(!h)continue;
      const drop=(hd<HOLE-2.5&&Math.hypot(b.vx,b.vy)<V_DROP)||(b.age>30&&!h.win);
      if(!drop){if(b.age>45){b.vx+=(rand()-.5)*200;b.vy+=(rand()-.5)*200;b.age=30;}continue;}   // 오래 멈춘 구슬은 진동으로 흔들림
      s.dish.splice(i,1);s.count[b.k]--;h.flash=1;
      if(!h.win){if(s.clogged()&&++h.fill===CLOG_CAP)s.events.push({t:'plug',k:b.k,x:h.x,y:h.y});s.events.push({t:'lose',k:b.k});continue;}
      s.st.pass[b.k]++;
      if(b.k<2)s.enterDish(b.k+1);
      else{const pay=Math.max(s.pool*PRICE,MIN_PAY);s.st.jack++;s.st.won+=pay;s.events.push({t:'jack',amount:pay});s.pool=0;}
    }
  };
  s.reset();s.apply();
  return s;
}
// ── 게임 규칙: 하룻밤 승부 (하우스 AI + 군자금 + 의심도 + 직원 순찰). 수치는 tools/bot.js로 맞춘다
const GAME={START:35e6,PREP:20e6,NIGHT:720,
  S_MASS:.7,S_DECAY:.5,CALM:3,S_FILL:.4,FILL_RATE:.2,S_BREAK:10,S_JOLT:3,S_CROWD:1.5,CROWD_AT:20,
  T_BLOCK:40,T_LOCK:60,T_JITTER:4,T_CALL:80,CALL_T:20,CALL_SAFE:70,JOLT_CD:3,WARN:3,REPAIR:[45,75],   // 하우스 반응선은 밤마다 ±4 흔들린다
  WIND_AT:1,WIND_BOOST:1.5,WIND_TRIG:24,WIND_REACT:[.2,.33],WIND_ALERT:.08,WIND_HOLD:1.2,   // 바람 커튼: 당첨 구멍 근처에 구슬이 오면 0.2~0.33초 늦게 분다(풍차가 묶인 뒤엔 더 빠름)
  PATROL_FIRST:[25,45],PATROL_GAP:[30,65],PATROL_WARN:[1.5,3],PATROL_LEN:[4,9],PATROL_TENSE:.3,PATROL_LATE:180,S_CAUGHT:12,CAUGHT_CD:1.5,S_CLEAN:3};   // 직원 순찰: 의심이 높을수록, 마감이 가까울수록 자주 온다
const between=([a,b])=>a+Math.random()*(b-a);
function createGame(sim,mode='real'){
  const P=mode==='practice'?Object.assign({},GAME,{NIGHT:900,S_DECAY:GAME.S_DECAY*1.5,CALM:GAME.CALM/2}):GAME;   // 연습: 15분, 의심이 빨리 식는다
  const g={mode,P,lastSpill:0,state:'brief',money:P.START-P.PREP,sus:0,susMax:0,t:0,why:'',payout:0,grip:true,mass:false,fill:false,water:0,jolts:0,caught:0,
    calmT:0,nearT:0,windT:0,joltCD:0,repairT:0,repairing:false,callT:0,windArmed:false,
    patrol:'none',patrolT:between(P.PATROL_FIRST),warnLead:between(P.PATROL_WARN),patrolLeft:0,caughtCD:0,offended:false,react:.35,
    tBlock:P.T_BLOCK+Math.round((Math.random()*2-1)*P.T_JITTER),tLock:P.T_LOCK+Math.round((Math.random()*2-1)*P.T_JITTER),warn:[],fired0:0,flags:{},events:[]};
  const emit=(t,x)=>g.events.push({t,...x});
  const schedule=(what,fn)=>{g.warn.push({what,left:P.WARN,fn});emit('warn',{what});};   // 하우스는 3초 전에 티가 난다
  const end=(state,why)=>{g.state=state;g.why=why;sim.auto=sim.mass=false;g.fill=false;emit('end');};
  const caught=()=>{if(g.caughtCD>0)return;g.sus+=P.S_CAUGHT;g.caughtCD=P.CAUGHT_CD;g.offended=true;g.calmT=P.CALM;g.caught++;emit('caught');};   // 순찰 중에 수상한 짓
  g.start=()=>{
    Object.assign(sim,{nail:'C',swap:true,ridge:true,block:false,millLock:false,wind:false,broken:false,mass:false,tiltDish:10,tiltMach:10,tiltFloor:0,windPow:1});
    sim.reset();sim.powOff=Math.round(Math.random()*20-10);sim.spillAt=P.CROWD_AT;sim.apply();g.state='play';emit('start');};   // 최적 세기가 밤마다 50~70 사이로 바뀐다
  g.tick=dt=>{
    if(g.state!=='play')return;
    g.t+=dt;
    const f=sim.st.fired-g.fired0;if(f){g.money-=f*PRICE;g.fired0=sim.st.fired;}
    const canFire=g.money>=PRICE;sim.auto=g.grip&&canFire;sim.mass=sim.auto&&g.mass;
    const filling=g.fill&&sim.tiltFloor<CLOG_AT;
    if(sim.mass||filling)g.calmT=P.CALM;else g.calmT=Math.max(0,g.calmT-dt);   // 수상한 짓을 멈추고 CALM초가 지나야 식기 시작한다
    g.sus=Math.max(0,g.sus+((sim.mass?P.S_MASS:0)+(filling?P.S_FILL:0)+(g.calmT>0?0:-P.S_DECAY))*dt+(sim.count[2]>=P.CROWD_AT?P.S_CROWD*dt:0));
    if(filling){g.water=Math.min(CLOG_AT,g.water+P.FILL_RATE*dt);                 // 위층 수조에 물을 채워 건물을 옆으로 기울인다
      if(Math.floor(g.water+1e-9)>sim.tiltFloor){sim.tiltFloor=Math.floor(g.water+1e-9);sim.apply();emit('floor');if(sim.tiltFloor===CLOG_AT)emit('clog');}}
    g.joltCD=Math.max(0,g.joltCD-dt);g.caughtCD=Math.max(0,g.caughtCD-dt);
    // 직원 순찰: 발소리(예고) → 지나감 → 깨끗하면 의심이 조금 풀린다
    if(g.patrol==='none'&&(g.patrolT-=dt)<=g.warnLead){g.patrol='warn';emit('patrolWarn');}
    else if(g.patrol==='warn'&&(g.patrolT-=dt)<=0){g.patrol='on';g.patrolLeft=between(P.PATROL_LEN);g.offended=false;emit('patrol',{len:g.patrolLeft});}
    else if(g.patrol==='on'){
      if(sim.mass||filling)caught();
      if((g.patrolLeft-=dt)<=0){g.patrol='none';g.warnLead=between(P.PATROL_WARN);
        g.patrolT=between(P.PATROL_GAP)*(1-P.PATROL_TENSE*Math.min(g.sus,80)/80)*(P.NIGHT-g.t<P.PATROL_LATE?.75:1);
        if(g.offended)emit('patrolEnd');else{g.sus=Math.max(0,g.sus-P.S_CLEAN);emit('patrolClean');}}}
    g.susMax=Math.max(g.susMax,g.sus);
    for(const e of sim.events){
      g.events.push(e);
      if(e.t==='jack'){g.payout=e.amount;g.money+=e.amount;end('win','jack');}
    }
    sim.events.length=0;if(g.state!=='play')return;
    if(!g.flags.wind&&sim.count[2]>=P.WIND_AT){g.flags.wind=1;schedule('wind',()=>{g.windArmed=true;});}   // 3단에 구슬이 오면 바람 커튼을 꺼낸다
    if(g.windArmed){                                                               // 직원이 스위치를 쥐고 있다: 당첨 구멍에 구슬이 다가가면 반응해 분다
      const h=DISH[2].holes[0];let near=false;for(const b of sim.dish)if(b.k===2&&Math.hypot(b.x-h.x,b.y-h.y)<P.WIND_TRIG){near=true;break;}
      if(near){if(g.nearT===0)g.react=between(P.WIND_REACT)-(sim.millLock?P.WIND_ALERT:0);if((g.nearT+=dt)>=g.react)g.windT=P.WIND_HOLD;}else g.nearT=0;
      g.windT=Math.max(0,g.windT-dt);}
    sim.wind=g.windT>0;
    if(!g.flags.block&&g.sus>=g.tBlock){g.flags.block=1;schedule('block',()=>{sim.block=true;});}
    if(!g.flags.lock&&g.sus>=g.tLock){g.flags.lock=1;schedule('lock',()=>{sim.millLock=true;sim.windPow=P.WIND_BOOST;});}
    for(let i=g.warn.length-1;i>=0;i--){const w=g.warn[i];if((w.left-=dt)<=0){g.warn.splice(i,1);w.fn();emit('house',{what:w.what});}}
    if(sim.block&&sim.broken){                                                         // 블록 센서가 켜지면 직원이 고장 난 문지기를 고치러 온다
      if(!g.repairing){g.repairing=true;g.repairT=between(P.REPAIR);emit('repairStart');}
      else if((g.repairT-=dt)<=0){sim.broken=false;g.repairing=false;emit('house',{what:'repair'});}
    }else g.repairing=false;
    if(g.sus>=100)return end('lose','kicked');
    if(g.callT>0){if(g.sus<P.CALL_SAFE){g.callT=0;emit('callOff');}else if((g.callT-=dt)<=0)return end('lose','kicked');}
    else if(g.sus>=P.T_CALL){g.callT=P.CALL_T;emit('call');}
    if(g.t>=P.NIGHT)return end('lose','closing');
    if(!canFire&&!sim.balls.length&&!sim.gk.length&&!sim.dish.length)return end('lose','broke');
  };
  g.breakGate=()=>{if(g.state!=='play'||sim.broken)return false;sim.broken=true;g.sus+=P.S_BREAK;g.calmT=P.CALM;emit('broke');if(g.patrol==='on')caught();return true;};
  g.jolt=()=>{if(g.state!=='play'||g.joltCD>0)return false;g.lastSpill=sim.jolt();g.sus+=P.S_JOLT;g.calmT=P.CALM;g.joltCD=P.JOLT_CD;g.jolts++;emit('jolt');if(g.patrol==='on')caught();return true;};
  return g;
}
// SIM-END
