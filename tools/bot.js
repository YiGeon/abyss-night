// 밸런스 측정용 봇. 최적에 가까운 정책으로 여러 판을 headless로 돌려 승률·소요 시간을 본다.
// 사용: node tools/bot.js [real|practice] [판 수] [smart|greedy]
const fs=require('fs'),path=require('path');
const [mode='real',n='8',policy='smart']=process.argv.slice(2);
const code=fs.readFileSync(path.join(__dirname,'..','js','sim.js'),'utf8');
const M=new Function(code+';return {createSim,createGame,DT,CLOG_AT}')();
const mulberry=seed=>{let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
function play(seed){
  const rand=mulberry(seed*2654435761),sim=M.createSim(rand),g=M.createGame(sim,mode);
  g.start();sim.power=60-sim.powOff;                      // 봇은 오늘 밤 최적 세기를 안다고 가정
  let acc=0;
  while(g.state==='play'){
    sim.step();g.tick(M.DT);g.events.length=0;
    if((acc+=M.DT)<.25)continue;acc=0;
    if(policy==='greedy'){g.fill=sim.tiltFloor<M.CLOG_AT;g.mass=sim.tiltFloor>=M.CLOG_AT;if(sim.tiltFloor>=M.CLOG_AT&&!sim.broken)g.breakGate();if(sim.count[2]>=1)g.jolt();continue;}
    const quiet=g.patrol!=='none',need=sim.count[2]<20;   // 발소리가 나면 손을 뗀다
    g.fill=!quiet&&sim.tiltFloor<M.CLOG_AT&&g.sus<60;
    if(!quiet&&!sim.broken&&need&&sim.tiltFloor>=M.CLOG_AT-1&&g.sus<55)g.breakGate();
    g.mass=!quiet&&sim.broken&&need&&sim.tiltFloor>=M.CLOG_AT&&g.sus<62&&g.callT===0;
    if(!quiet&&sim.count[2]>=15&&g.sus<75)g.jolt();
  }
  return {seed,state:g.state,why:g.why,t:Math.round(g.t),spentM:Math.round(sim.st.fired*4000/1e6),susMax:Math.round(g.susMax),jolts:g.jolts,caught:g.caught};
}
const res=[];for(let s=1;s<=+n;s++){const r=play(s);res.push(r);console.log(JSON.stringify(r));}
const w=res.filter(r=>r.state==='win');
console.log(`\n${mode}/${policy}: ${w.length}/${res.length} 승리 · 승리 시점 ${w.map(r=>r.t+'s').join(', ')||'-'} · 패배 ${res.filter(r=>r.state!=='win').map(r=>r.why+'@'+r.t+'s').join(', ')||'-'}`);
