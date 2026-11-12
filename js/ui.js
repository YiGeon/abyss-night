// 1인칭 UI: 독백·소리·핸들·버튼·HUD·잭팟 연출·메인 루프
// ── 1인칭 UI
const LINES={
  start:['의자가 낮다. 기계가 나를 내려다본다.','핸들이 차갑다. 손바닥에 땀이 밴다.'],
  forest:'들어갔다. 봉을 바꿔 둔 보람이 있다.',
  gkout:'날개가 닫혀 있었다. 저 문지기부터 어떻게든 해야 한다.',
  broke:'날개 축이 휘었다. 이제 열린 채다.',
  rebroke:'다시 휘게 만들었다. 직원 눈치를 봐야 한다.',
  floor:'위층에서 무게가 실린다. 바닥이 미세하게 기운다.',
  clog:'꽝 구멍 아래가 막혔다. 이제 원반에 구슬이 쌓인다.',
  stage3:'3단… 당첨 구멍이 하필 뒤쪽이다.',
  lose3:'앞으로 굴러 떨어진다. 기계 전체가 앞으로 숙여져 있다.',
  warn_block:'카운터 쪽 남자가 무언가를 눌렀다.',
  house_block:'문지기 위에 빨간 불이 들어왔다. 센서다.',
  repairStart:'직원이 공구함을 들고 온다. 문지기를 고칠 생각이다.',
  house_repair:'문지기가 고쳐졌다. 다시 1/3이다.',
  warn_lock:'뒤쪽이 술렁인다. 뭔가 더 걸어 올 셈이다.',
  house_lock:'풍차가 묶였다. 바람 소리도 거세졌다.',
  warn_wind:'쉭— 3단 쪽에서 낯선 소리가 난다.',
  house_wind:'구멍에서 바람이 나온다. 구슬이 떠밀린다.',
  crowd20:'구슬이 쌓인다. 무게로 밀어 넣는 수밖에 없다.',
  crowd30:'원반이 구슬로 꽉 찼다. 다들 이쪽을 본다.',
  jolt:'쾅. 손바닥이 얼얼하다.',
  sus60:'등 뒤에서 시선이 느껴진다.',
  call:'직원이 다가온다. 손을 멈춰야 한다.',
  callOff:'…그냥 지나갔다.',
  money:'군자금이 바닥을 보이기 시작한다.',
  time:'영업 종료까지 2분.',
  jack:'들어갔다—!',
};
const END={win:['잭팟','구슬이 쏟아지는 소리가 홀을 덮는다. 오늘 밤은 내가 이겼다.'],
  kicked:['퇴장','어깨에 손이 얹혔다. 끝이다. 기계는 아무 일 없었다는 듯 빛난다.'],
  closing:['영업 종료','조명이 하나씩 꺼진다. 원반 위에 남은 구슬이 그대로 멈춰 있다.'],
  broke:['빈털터리','주머니가 비었다. 마지막 구슬이 못 사이로 사라진다.']};
const WARN_TXT={block:'블록 센서 가동 3초 전',lock:'풍차 고정 · 바람 강화 3초 전',wind:'바람 커튼 3초 전'};

// 독백: 한 줄씩 타자 치듯
const said=new Set(),monoQ=[];let monoFull='',monoShown=0,monoT=0;
const instant=matchMedia('(prefers-reduced-motion: reduce)').matches;
function say(key,repeat){if(!repeat&&said.has(key))return;said.add(key);const v=LINES[key];if(!v)return;
  monoQ.push(Array.isArray(v)?v[Math.random()*v.length|0]:v);if(monoQ.length>3)monoQ.shift();}
function monoTick(dt){
  const el=$('mono');
  if(monoFull&&monoShown<monoFull.length){monoShown=instant?monoFull.length:Math.min(monoFull.length,monoShown+dt*30);el.textContent=monoFull.slice(0,Math.ceil(monoShown));return;}
  if((monoT-=dt)>0)return;
  if(monoQ.length){monoFull=monoQ.shift();monoShown=0;monoT=3.2;el.textContent='';}
  else if(monoFull){monoFull='';el.textContent='';}
}
let alertT=0;
function alertMsg(txt,red){const a=$('alert');a.textContent=txt;a.className='alert'+(red?' red':'');a.hidden=false;alertT=3;}

// 소리: 첫 클릭 뒤에만 켠다
let AC=null,master=null,windG=null,muted=false;
function audioInit(){
  if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  master=AC.createGain();master.gain.value=muted?0:.6;master.connect(AC.destination);
  const noise=(sec,brown)=>{const b=AC.createBuffer(1,AC.sampleRate*sec,AC.sampleRate),d=b.getChannelData(0);let l=0;
    for(let i=0;i<d.length;i++){const w=Math.random()*2-1;d[i]=brown?(l=(l+.02*w)/1.02)*3.5:w;}const s=AC.createBufferSource();s.buffer=b;s.loop=true;s.start();return s;};
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=380;const amb=AC.createGain();amb.gain.value=.3;
  noise(2,true).connect(lp).connect(amb).connect(master);                                   // 홀의 웅성거림
  const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1300;bp.Q.value=.8;windG=AC.createGain();windG.gain.value=0;
  noise(1,false).connect(bp).connect(windG).connect(master);                                // 바람 커튼
}
function blip(f,dur,type,vol,slide){if(!AC||muted)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g).connect(master);o.start(t);o.stop(t+dur);}
const SFX={tick:()=>blip(2600+Math.random()*700,.025,'square',.025),thump:()=>blip(95,.35,'sine',.7,38),drop:()=>blip(320,.14,'sine',.06,140),
  crack:()=>blip(1800,.08,'sawtooth',.08,300),creak:()=>blip(70,.6,'sawtooth',.06,55),pulse:()=>blip(52,.22,'sine',.45),
  warn:()=>{blip(880,.12,'square',.07);setTimeout(()=>blip(880,.12,'square',.07),170);},
  jack:()=>[523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>blip(f,.5,'triangle',.18),i*110)),
  jackBig:()=>{[523,659,784,1047,784,1047,1319,1568].forEach((f,i)=>setTimeout(()=>blip(f,.45,'triangle',.18),i*110));
    setTimeout(()=>[523,659,784,1047].forEach(f=>blip(f,1.8,'sine',.1)),950);
    for(let i=0;i<45;i++)setTimeout(()=>blip(2200+Math.random()*1600,.04,'square',.03),300+i*55);}};   // 본게임: 팡파르 + 구슬 쏟아지는 소리

// 핸들
function setPower(p){
  sim.power=Math.max(0,Math.min(100,Math.round(p)));const a=-135+sim.power*2.7,r=50,pt=d=>{const q=(d-90)*Math.PI/180;return`${(60+r*Math.cos(q)).toFixed(1)} ${(60+r*Math.sin(q)).toFixed(1)}`;};
  $('knob').setAttribute('transform',`rotate(${a} 60 60)`);$('dialTxt').textContent=sim.power;$('dial').setAttribute('aria-valuenow',sim.power);
  $('arc').setAttribute('d',`M${pt(-135)} A${r} ${r} 0 ${a+135>180?1:0} 1 ${pt(a)}`);
}
const dial=$('dial');
const dialAt=e=>{const b=dial.getBoundingClientRect(),dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2;
  setPower((Math.max(-135,Math.min(135,Math.atan2(dx,-dy)*180/Math.PI))+135)/2.7);};
dial.addEventListener('pointerdown',e=>{dial.setPointerCapture(e.pointerId);dialAt(e);});
dial.addEventListener('pointermove',e=>{if(dial.hasPointerCapture(e.pointerId))dialAt(e);});
dial.addEventListener('keydown',e=>{const d={ArrowLeft:-2,ArrowDown:-2,ArrowRight:2,ArrowUp:2}[e.key];if(d){e.preventDefault();setPower(sim.power+d);}});

// 내 행동의 결과는 자막 줄에 녹색으로 잠깐 보여 준다
let actT=0,joltFx=0,gateFx=0,paused=false,celebT=0,bursts=0,burstT=0,jackT=0,jackDur=1,againMode='real';
// 잭팟 연출: 당첨 구멍에서 솟구치는 구슬 분수 + 금액 카운트업
const parts=[];
function burst(n){const d=DISH[2],h=d.holes[0],x=d.x+h.x,y=d.y+h.y*Q;
  for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()-.5)*2.4,v=160+Math.random()*280;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1.4+Math.random()});}}
function jackTick(dt){if($('jack').hidden||!game.payout)return;jackT+=dt;const p=Math.min(1,jackT/jackDur),e=1-Math.pow(1-p,3);
  $('jackAmt').textContent=yenTxt(game.payout*e);}
function act(txt){const a=$('act');a.textContent=txt;a.hidden=false;actT=1.4;}
function setGrip(on){game.grip=on;$('grip').setAttribute('aria-pressed',on);$('grip').textContent=on?'발사 중':'멈춤';}
function setMass(on){if(on&&!game.mass&&game.state==='play'){if(!game.grip)setGrip(true);act(game.money<PRICE?'군자금이 없다':'물량 · 초당 20발을 쏟아붓는다 · 누르는 동안 의심 +0.5/초');}game.mass=on;$('mass').classList.toggle('held',on);}
function toggleGrip(){setGrip(!game.grip);act(game.grip?'핸들을 잡았다 · 분당 100발 발사':'핸들을 놓았다 · 발사 멈춤 (군자금을 아낀다)');}
function doJolt(){if(game.jolt()){joltFx=.6;act(game.lastSpill?`쾅! 3단 앞쪽 구슬 ${game.lastSpill}개가 넘쳐 나가고 나머지는 뒤로 튄다 · 의심 +3`:'쾅! 원반 위 구슬이 뒤로 튄다 · 의심 +3');}else if(game.state==='play')act(`두드리기는 ${game.joltCD.toFixed(1)}초 뒤에 다시 된다`);}
function doFloor(){const n0=sim.tiltFloor;
  if(game.floorUp()){const n=sim.tiltFloor;act(n>=CLOG_AT?`건물 ${n}/7 · 꽝 배출로 역류 시작 — 꽝 구멍마다 노란 게이지가 차오른다 · 의심 +2`:`건물 ${n}/7 · ${CLOG_AT-n}칸 더 기울이면 꽝 배출로가 막힌다 · 의심 +2`);}
  else if(game.state==='play')act(n0>=CLOG_AT?'건물은 이미 7칸, 더 기울일 필요 없다':`건물은 ${Math.ceil(game.floorCD)}초 뒤에 더 기울일 수 있다`);}
function doBreak(){if(game.breakGate()){gateFx=1.2;act('문지기 날개를 열린 채 고정했다 · IN에 들어간 구슬이 전부 원반으로 · 의심 +10');}else if(game.state==='play')act('문지기는 이미 부서져 있다');}
$('grip').onclick=toggleGrip;
const massBtn=$('mass');
massBtn.addEventListener('pointerdown',e=>{massBtn.setPointerCapture(e.pointerId);setMass(true);});
for(const ev of['pointerup','pointercancel','lostpointercapture'])massBtn.addEventListener(ev,()=>setMass(false));
massBtn.addEventListener('contextmenu',e=>e.preventDefault());
$('jolt').onclick=doJolt;
$('floor').onclick=doFloor;
$('break').onclick=doBreak;
$('mute').onclick=()=>{muted=!muted;if(master)master.gain.value=muted?0:.6;$('mute').setAttribute('aria-pressed',muted);$('mute').textContent=muted?'소리 끔':'소리 켬';};
$('help').onclick=()=>{if(game.state==='play'){paused=true;setMass(false);$('sit').textContent='계속하기';$('sitPractice').hidden=true;}$('brief').hidden=false;$('sit').focus();};
addEventListener('blur',()=>setMass(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden)setMass(false);});
addEventListener('keydown',e=>{
  if(game.state!=='play'||paused||e.repeat)return;
  const k=e.key.toLowerCase();
  if(e.code==='Space'){e.preventDefault();toggleGrip();}
  else if(k==='m')setMass(true);else if(k==='j')doJolt();else if(k==='f')doFloor();else if(k==='b')doBreak();
});
addEventListener('keyup',e=>{if(e.key.toLowerCase()==='m')setMass(false);});

// 시작·끝
const fmtT=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const yenTxt=n=>'¥'+Math.round(n).toLocaleString('ko-KR');
let endTimer=0;const hist=[];
function begin(mode){
  clearTimeout(endTimer);hist.length=0;
  audioInit();if(AC&&AC.state==='suspended')AC.resume();
  game=createGame(sim,mode||game.mode);said.clear();monoQ.length=0;monoFull='';$('mono').textContent='';
  $('brief').hidden=true;$('end').hidden=true;$('jack').hidden=true;$('alert').hidden=true;$('act').hidden=true;
  paused=false;$('sit').textContent='본게임으로 앉는다';$('sitPractice').hidden=false;joltFx=gateFx=0;
  celebT=bursts=0;parts.length=0;$('view').classList.remove('gold');$('lcdBox').classList.remove('flash');
  game.start();setGrip(true);setMass(false);renderStatic();
}
function showEnd(){
  const win=game.state==='win',practice=game.mode==='practice',[title,voice0]=END[win?'win':game.why]||END.closing,st=sim.st;
  const voice=win&&practice?'연습에서는 뚫었다. 진짜 밤은 12분이고, 의심은 더 천천히 식는다.':voice0;
  againMode=win&&practice?'real':game.mode;$('again').textContent=win&&practice?'본게임으로 앉는다':'다시 앉는다';
  $('t-end').textContent=title+(practice?' · 연습':'');$('endVoice').textContent=voice;$('endCard').classList.toggle('win',win);
  const rows=[['버틴 시간',fmtT(game.t)],['쏜 구슬',st.fired.toLocaleString('ko-KR')+'발'],['쓴 돈',yenTxt(st.fired*PRICE)],['받은 돈',win?yenTxt(game.payout):'없음'],
    ['최고 의심도',Math.round(game.susMax)],['두드린 횟수',game.jolts+'번'],['못의 숲 · 문지기 통과',`${st.forest} · ${st.gk}`],['원반 1 · 2 · 3단 통과',st.pass.join(' · ')]];
  $('endStats').innerHTML=rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('end').hidden=false;$('again').focus();
}
$('sit').onclick=()=>{if(game.state==='play'&&paused){paused=false;$('brief').hidden=true;$('sit').textContent='본게임으로 앉는다';$('sitPractice').hidden=false;}else begin('real');};
$('sitPractice').onclick=()=>begin('practice');
$('again').onclick=()=>begin(againMode);
$('modes').onclick=()=>{$('end').hidden=true;$('brief').hidden=false;$('sit').focus();};

// 지금 무엇을 해야 하는지: 진행도와 함께
function goalText(){
  const g=game,n3=sim.count[2];if(g.state!=='play')return '자리에 앉으면 시작한다';
  const pl=DISH.map(d=>d.holes.filter(h=>!h.win&&h.fill>=CLOG_CAP).length);let t;
  if(sim.tiltFloor<CLOG_AT)t=`건물을 7칸까지 기울여 꽝 배출로를 막는다 (${sim.tiltFloor}/7) · 그동안 다이얼로 IN 적중을 맞춘다`;
  else if(!sim.broken)t='문지기를 부숴 IN을 통과한 구슬이 전부 원반으로 가게 한다';
  else if(pl[2]<4)t=`물량으로 꽝 구멍을 메운다 · 3단 막힘 ${pl[2]}/4 (1단 ${pl[0]}/2 · 2단 ${pl[1]}/3) · 의심도를 보며 끊어서`;
  else if(n3<15)t=`3단에 구슬을 15개까지 모은다 (지금 ${n3}/20)`;
  else if(n3<18)t=`두드려서 무더기를 뒤쪽 빨간 구멍에 밀어 넣는다 (3단 ${n3}/20)`;
  else t=`3단 ${n3}/20 · 물량을 멈춘다. 20개부터는 의심이 계속 오르고, 두드리면 앞쪽 2개가 넘쳐 나간다`;
  if(g.repairing)t+=` · 문지기 수리까지 ${Math.ceil(g.repairT)}초`;
  return t;
}

// 판 위 표시: 꽝 구멍 게이지, 두드리기 화살표, 문지기 강조
function arrowUp(x,y,len){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-len);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y-len-6);ctx.lineTo(x-5,y-len+1);ctx.lineTo(x+5,y-len+1);ctx.fill();}
function drawFx(dt){
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.vy+=520*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
    if(p.life<=0||p.y>H+10){parts.splice(i,1);continue;}ctx.globalAlpha=Math.min(1,p.life*1.5);ball(p.x,p.y);}
  ctx.globalAlpha=1;
  if(sim.clogged()){ctx.lineWidth=2.5;ctx.strokeStyle=C.amber;
    for(const d of DISH)for(const h of d.holes)if(!h.win&&h.fill>0&&h.fill<CLOG_CAP){
      ctx.beginPath();ctx.ellipse(d.x+h.x,d.y+h.y*Q,HOLE+2.5,(HOLE+2.5)*Q+1,0,-Math.PI/2,-Math.PI/2+h.fill/CLOG_CAP*Math.PI*2);ctx.stroke();}}
  if(joltFx>0){ctx.globalAlpha=Math.min(1,joltFx*2.5);ctx.strokeStyle=ctx.fillStyle=C.good;ctx.lineWidth=2.5;
    for(const d of DISH){arrowUp(d.x-44,d.y+10,14);arrowUp(d.x+44,d.y+10,14);}
    ctx.globalAlpha=1;joltFx-=dt;}
  const n3=sim.count[2];if(n3>0&&game.state==='play'){ctx.textAlign='left';ctx.font=`700 11px ${FB}`;ctx.fillStyle=n3>=18?C.crimson:C.amber;ctx.fillText(`${n3}/20`,126,DISH[2].y+20);ctx.textAlign='center';}
  if(gateFx>0){ctx.globalAlpha=Math.min(1,gateFx);ctx.strokeStyle=C.good;ctx.lineWidth=3;ctx.beginPath();ctx.arc(GATE.x,GK.y+3,24+(1.2-gateFx)*10,0,7);ctx.stroke();ctx.globalAlpha=1;gateFx-=dt;}
}

function handleEvents(){
  for(const e of game.events){
    switch(e.t){
      case'start':say('start');break;
      case'enter':if(e.k===2){if(!said.has('stage3'))slow=1.2;say('stage3');}break;
      case'lose':SFX.drop();if(e.k===2)say('lose3');break;
      case'gkout':say('gkout');break;
      case'broke':SFX.crack();if(said.has('broke'))say('rebroke',true);else say('broke');break;
      case'floor':SFX.creak();say('floor');break;
      case'clog':say('clog');alertMsg('꽝 배출로 역류 시작');break;
      case'warn':SFX.warn();alertMsg('⚠ '+WARN_TXT[e.what]);say('warn_'+e.what);break;
      case'house':say('house_'+e.what,e.what==='repair');if(e.what==='repair')alertMsg('문지기가 고쳐졌다',true);break;
      case'repairStart':say('repairStart',true);alertMsg('직원이 문지기를 고치러 온다 · 60초',true);break;
      case'call':say('call',true);break;
      case'callOff':say('callOff',true);break;
      case'jolt':SFX.thump();shakeT=.25;$('view').classList.add('shake');say('jolt');break;
      case'jack':{const big=game.mode!=='practice';
        (big?SFX.jackBig:SFX.jack)();celebT=big?3.6:1.6;jackT=0;jackDur=big?2:.8;bursts=big?4:0;burstT=.45;
        $('jackMode').textContent=big?'본게임':'연습';$('jackAmt').textContent='¥0';$('jack').hidden=false;burst(big?90:30);
        if(big){$('view').classList.add('gold');$('lcdBox').classList.add('flash');}
        try{navigator.vibrate&&navigator.vibrate(big?[90,60,90,60,250]:60);}catch(err){}
        say('jack');break;}
      case'end':clearTimeout(endTimer);endTimer=setTimeout(showEnd,game.state==='win'?(game.mode==='practice'?2000:4000):1300);break;
    }
  }
  game.events.length=0;
}

function lamp(id,cls,txt){const e=$(id);e.className='lamp'+(cls?' '+cls:'');if(txt)e.textContent=txt;}
let pulseT=0;
function updateUI(dt){
  const g=game,P=g.P,left=Math.max(0,P.NIGHT-g.t),warned=w=>g.warn.some(x=>x.what===w),play=g.state==='play';
  $('money').textContent=yenTxt(Math.max(0,g.money));
  $('clock').textContent=fmtT(left);
  const rate=(sim.mass?P.S_MASS:-P.S_DECAY)+(sim.count[2]>=P.CROWD_AT?P.S_CROWD:0),still=rate<0&&g.sus<=0;
  $('susTxt').textContent=Math.round(g.sus)+(play&&!still?` ${rate>0?'▲':'▼'}${Math.abs(rate).toFixed(1)}/초`:'');$('susTxt').className=play&&rate>0?'up':'';$('susFill').style.width=Math.min(100,g.sus)+'%';
  $('pool').textContent=yenTxt(sim.pool*PRICE);
  lamp('L-block',sim.block?'on':warned('block')?'warn':'');
  lamp('L-lock',sim.millLock?'on':warned('lock')?'warn':'');
  lamp('L-wind',sim.wind?'on':warned('wind')?'warn':'',g.windArmed&&!sim.wind?'바람 커튼 대기':'바람 커튼');
  lamp('L-repair',g.repairing?'on':'',g.repairing?`문지기 수리 ${Math.ceil(g.repairT)}초`:'문지기 수리');
  lamp('L-gate',sim.broken?'mine':'',sim.broken?'문지기 고장 냄':'문지기 정상');
  lamp('L-floor',sim.tiltFloor>=CLOG_AT?'mine':'',`건물 ${sim.tiltFloor}/7`);
  $('jolt').disabled=!play||g.joltCD>0;$('joltCd').style.width=(g.joltCD/P.JOLT_CD*100)+'%';
  $('floor').disabled=!play||g.floorCD>0||sim.tiltFloor>=CLOG_AT;$('floorCd').style.width=(g.floorCD/P.FLOOR_CD*100)+'%';
  $('break').disabled=!play||sim.broken;
  $('mass').disabled=!play||g.money<PRICE;
  $('joltSub').textContent=g.joltCD>0?`${g.joltCD.toFixed(1)}초 뒤`:'뒤로 튕김 · +3';
  $('floorSub').textContent=sim.tiltFloor>=CLOG_AT?'역류 중':g.floorCD>0?`${Math.ceil(g.floorCD)}초 뒤 · ${sim.tiltFloor}/7`:`${sim.tiltFloor}/7 · +2`;
  $('breakSub').textContent=sim.broken?(g.repairing?`수리 ${Math.ceil(g.repairT)}초 전`:'부서짐'):'날개 고정 · +10';
  $('massSub').textContent=sim.mass?'쏟아붓는 중':g.money<PRICE?'군자금 없음':'초당 20발 · +0.5/초';
  $('goal').textContent=goalText();$('goalBox').classList.toggle('danger',play&&sim.count[2]>=18);
  if(play){hist.push([sim.st.fired,sim.st.forest]);while(hist.length>2&&hist[1][0]<=sim.st.fired-100)hist.shift();}
  const h0=hist[0]||[0,0],df=sim.st.fired-h0[0],dg=sim.st.forest-h0[1],aim=$('aim');
  aim.textContent=df?`IN ${dg}/${df}발`:'IN –';aim.className='aim'+(df>=60?(dg/df>=.045?' good':dg/df>=.03?' mid':' bad'):'');
  const v=$('view');v.classList.toggle('s60',g.sus>=60&&g.sus<80);v.classList.toggle('s80',g.sus>=80);
  if(play)v.classList.toggle('lean',zoomNear||sim.count[2]>0);
  BK=v.classList.contains('lean')?1.15:baseBK;
  if(play){
    if(sim.st.forest)say('forest');
    if(g.sus>=60)say('sus60');
    if(sim.count[2]>=20)say('crowd20');
    if(sim.count[2]>=30)say('crowd30');
    if(g.money<(P.START-P.PREP)*.3)say('money');
    if(left<=120)say('time');
  }
  $('call').hidden=!(g.callT>0&&play);
  if(g.callT>0&&play){$('callN').textContent=Math.ceil(g.callT);$('callSub').textContent=sim.count[2]>=P.CROWD_AT?'3단이 20개 이상이면 의심이 안 내려간다 · 두드려서 줄여라':'물량·두드리기를 멈추고 70 아래로';if(!paused&&(pulseT-=dt)<=0){SFX.pulse();pulseT=1;}}
}

// 원반 확대: 폰에서는 기본으로 켠다. 끄면 3단에 구슬이 있을 때만 자동으로 다가간다
let zoomNear=matchMedia('(max-width:520px)').matches,baseBK=1;
function setZoom(on){zoomNear=on;$('zoom').setAttribute('aria-pressed',on);$('zoom').textContent=on?'판 전체 보기':'원반 확대';}
$('zoom').onclick=()=>{setZoom(!zoomNear);uiT=0;};
function fitBalls(){const w=Math.min(cv.clientWidth,cv.clientHeight*420/668)||420;baseBK=Math.max(1,Math.min(1.7,300/w));}
addEventListener('resize',fitBalls);setZoom(zoomNear);fitBalls();

// 시작 화면에서도 오늘 밤의 판(못 C + 바꾼 봉)을 보여 준다
Object.assign(sim,{nail:'C',swap:true});sim.apply();
setPower(60);renderStatic();
document.fonts?.ready.then(renderStatic);

let last=performance.now(),acc=0,slow=0,shakeT=0,firedSeen=0,uiT=0;
function frame(t){
  const real=Math.min(.05,(t-last)/1000);last=t;
  const k=slow>0?.35:1;slow=Math.max(0,slow-real);
  if(game.state==='play'&&!paused){acc+=real*k;let n=0;while(game.state==='play'&&acc>=DT&&n<400){sim.step();game.tick(DT);acc-=DT;n++;}if(n>=400)acc=0;}
  else if(celebT>0){celebT-=real;acc+=real*.35;let n=0;while(acc>=DT&&n<100){sim.step();acc-=DT;n++;}sim.events.length=0;   // 잭팟 뒤 슬로모션으로 판이 잠깐 더 움직인다
    if(bursts>0&&(burstT-=real)<=0){burst(50);bursts--;burstT=.45;}}
  handleEvents();
  if(sim.st.fired!==firedSeen){if(sim.st.fired>firedSeen)SFX.tick();firedSeen=sim.st.fired;}
  if(windG)windG.gain.setTargetAtTime(sim.wind&&game.state==='play'&&!paused?.18*sim.windPow:0,AC.currentTime,.08);
  draw(real*k);
  drawFx(real);
  monoTick(real);jackTick(real);
  if(actT>0&&(actT-=real)<=0)$('act').hidden=true;
  if(alertT>0&&(alertT-=real)<=0)$('alert').hidden=true;
  if(shakeT>0&&(shakeT-=real)<=0)$('view').classList.remove('shake');
  if((uiT-=real)<=0){updateUI(.1);uiT=.1;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
