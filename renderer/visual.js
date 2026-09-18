(() => {
  const glCanvas=document.getElementById('gl');
  const fxCanvas=document.getElementById('spacefx');
  const ctx=glCanvas.getContext('2d');
  const fx=fxCanvas.getContext('2d');
  if(!ctx||!fx) return;

  const audioA=document.getElementById('audio');
  const currentAudio=()=>window.GoBaoPlayer?.activeAudio?.()||audioA;
  const meters=['m1','m2','m3','m4'].map(id=>document.getElementById(id));
  const vals=['bassVal','midVal','treVal','engVal'].map(id=>document.getElementById(id));
  let W=0,H=0,dpr=1;
  let bass=.18,mid=.2,tre=.16,eng=.2;
  const start=performance.now();

  const colors=[[110,194,255],[255,190,118],[255,96,69],[160,236,255],[198,145,255]];
  const stars=Array.from({length:230},(_,i)=>({x:Math.random(),y:Math.random(),s:.3+Math.random()*1.4,p:Math.random()*Math.PI*2,h:[205,235,275,315,35][i%5]}));

  function resize(){
    const r=glCanvas.getBoundingClientRect();
    dpr=Math.min(devicePixelRatio||1,1.6);
    const w=Math.max(2,Math.floor(r.width*dpr));
    const h=Math.max(2,Math.floor(r.height*dpr));
    if(w!==W||h!==H){W=w;H=h;glCanvas.width=fxCanvas.width=w;glCanvas.height=fxCanvas.height=h;}
  }
  addEventListener('resize',resize);

  function avg(arr,a,b){let s=0,n=0;for(let i=a;i<Math.min(b,arr.length);i++){s+=arr[i];n++;}return n?s/(n*255):0;}
  function audioParams(t){
    const ctl=window.GoBaoControls||{};
    const react=Number(ctl.react?.value||88)/100;
    const A=window.GoBaoAudio;
    const playing=currentAudio();
    if(A&&A.analyser&&playing&&!playing.paused&&playing.readyState>=2){
      A.analyser.getByteFrequencyData(A.freq);
      const ny=A.ctx.sampleRate/2, hz=ny/A.freq.length;
      const b1=Math.max(2,Math.floor(180/hz));
      const m2=Math.max(b1+2,Math.floor(2200/hz));
      const t2=Math.max(m2+2,Math.floor(11000/hz));
      const nb=avg(A.freq,0,b1),nm=avg(A.freq,b1,m2),nt=avg(A.freq,m2,t2);
      bass=bass*.70+nb*.30; mid=mid*.78+nm*.22; tre=tre*.82+nt*.18; eng=eng*.76+(nb*.45+nm*.35+nt*.20)*.24;
    }else{
      const kick=Math.pow(Math.max(0,Math.sin(t*3.1)),7);
      bass=.17+.57*kick; mid=.2+.17*(.5+.5*Math.sin(t*1.25)); tre=.15+.16*(.5+.5*Math.sin(t*4.4+1.1)); eng=.2+.34*kick+.1*(.5+.5*Math.sin(t*.75));
    }
    return [Math.min(1,bass*react),Math.min(1,mid*react),Math.min(1,tre*react),Math.min(1,eng*react)];
  }

  function background(t,p){
    const g=ctx.createRadialGradient(W*.5,H*.48,0,W*.5,H*.5,Math.max(W,H)*.85);
    g.addColorStop(0,'rgb(25,10,45)');g.addColorStop(.5,'rgb(8,5,16)');g.addColorStop(1,'rgb(2,2,5)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalCompositeOperation='screen';
    for(const s of stars){const tw=.25+.75*Math.abs(Math.sin(t*.8+s.p));ctx.fillStyle=`hsla(${s.h},85%,82%,${.08+.28*tw})`;ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.s*dpr*(.8+p[2]*.5),0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }

  function blackHole(t,p){
    const cx=W*.5,cy=H*.47,scale=Math.min(W,H),core=scale*(.07+p[0]*.012),ring=scale*(.22+p[3]*.018);
    ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='screen';
    const aura=ctx.createRadialGradient(0,0,core*.5,0,0,ring*2.1);aura.addColorStop(0,'rgba(150,78,230,.18)');aura.addColorStop(.35,'rgba(115,45,190,.12)');aura.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=aura;ctx.beginPath();ctx.arc(0,0,ring*2.1,0,Math.PI*2);ctx.fill();
    for(let i=0;i<62;i++){
      const rr=ring*(.62+(i%9)*.035), a=(i/62)*Math.PI*2+t*(.22+p[0]*.6), len=.12+p[0]*.04;
      const hue=274+i*1.15;
      ctx.strokeStyle=`hsla(${hue},95%,${62+(i%5)*4}%,${.07+i/62*.16})`;
      ctx.lineWidth=(2+(i%4))*dpr;
      ctx.shadowColor=`hsla(${hue},95%,72%,.24)`;ctx.shadowBlur=(8+p[0]*18)*dpr;
      ctx.beginPath();ctx.ellipse(0,0,rr,rr*.31,0,a,a+len);ctx.stroke();
    }
    ctx.shadowBlur=0;
    ctx.strokeStyle=`rgba(255,220,250,${.62+p[2]*.2})`;ctx.lineWidth=(2.2+p[2]*2.2)*dpr;ctx.beginPath();ctx.ellipse(0,0,ring*.82,ring*.25,0,0,Math.PI*2);ctx.stroke();
    ctx.globalCompositeOperation='source-over';ctx.fillStyle='#010104';ctx.beginPath();ctx.arc(0,0,core*(1+p[0]*.08),0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(243,218,255,.85)';ctx.lineWidth=2*dpr;ctx.shadowColor='rgba(207,139,255,.9)';ctx.shadowBlur=16*dpr;ctx.beginPath();ctx.arc(0,0,core*1.2,0,Math.PI*2);ctx.stroke();ctx.restore();
  }

  function sphere(x,y,r,c,pulse,kind,t){
    fx.save();fx.globalCompositeOperation='screen';
    const g=fx.createRadialGradient(x-r*.35,y-r*.4,r*.05,x,y,r*1.05);g.addColorStop(0,`rgba(${c[0]},${c[1]},${c[2]},.98)`);g.addColorStop(.55,`rgba(${c[0]*.65|0},${c[1]*.65|0},${c[2]*.65|0},.9)`);g.addColorStop(1,'rgba(4,4,12,.98)');fx.fillStyle=g;fx.beginPath();fx.arc(x,y,r*(1+pulse*.045),0,Math.PI*2);fx.fill();
    const a=fx.createRadialGradient(x,y,r*.62,x,y,r*(1.55+pulse*.08));a.addColorStop(0,'rgba(0,0,0,0)');a.addColorStop(.78,`rgba(${c[0]},${c[1]},${c[2]},${.09+.14*pulse})`);a.addColorStop(1,'rgba(0,0,0,0)');fx.fillStyle=a;fx.beginPath();fx.arc(x,y,r*(1.55+pulse*.08),0,Math.PI*2);fx.fill();
    if(kind==='gas'){fx.save();fx.beginPath();fx.arc(x,y,r*.96,0,Math.PI*2);fx.clip();for(let i=-4;i<=4;i++){fx.fillStyle=`rgba(160,220,255,${.045+.07*pulse})`;fx.beginPath();fx.ellipse(x,y+i*r*.17+Math.sin(t+i)*r*.02,r*1.05,r*.04,0,0,Math.PI*2);fx.fill();}fx.restore();}
    if(kind==='lava'){fx.save();fx.beginPath();fx.arc(x,y,r*.96,0,Math.PI*2);fx.clip();for(let i=0;i<7;i++){fx.strokeStyle=`rgba(255,80,38,${.12+.13*pulse})`;fx.lineWidth=1.5*dpr;fx.beginPath();for(let j=0;j<12;j++){const px=x-r*.7+j*r*.13,py=y+(i-3)*r*.13+Math.sin(j*.9+i+t*.4)*r*.12;j?fx.lineTo(px,py):fx.moveTo(px,py);}fx.stroke();}fx.restore();}
    for(let i=0;i<3;i++){fx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},${.07+.06*i+.08*pulse})`;fx.lineWidth=(1.2+i*.55)*dpr;fx.beginPath();fx.ellipse(x,y,r*(1.35+i*.18),r*(.28+i*.05),-.18+i*.04,0,Math.PI*2);fx.stroke();}
    fx.restore();
  }

  function environment(t,p){
    fx.clearRect(0,0,W,H);const d=Number(window.GoBaoControls?.dust?.value||82)/100;
    const neb=[[.06,.24,.22,[38,130,255]],[.94,.25,.20,[175,55,255]],[.92,.72,.24,[255,55,130]],[.10,.72,.22,[30,175,255]]];
    fx.save();fx.globalCompositeOperation='screen';for(const n of neb){const x=n[0]*W,y=n[1]*H,r=Math.min(W,H)*n[2],g=fx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${n[3].join(',')},${.08*d*(1+p[3]*.3)})`);g.addColorStop(.55,`rgba(${n[3].join(',')},${.03*d})`);g.addColorStop(1,'rgba(0,0,0,0)');fx.fillStyle=g;fx.beginPath();fx.arc(x,y,r,0,Math.PI*2);fx.fill();}fx.restore();
    sphere(W*.86,H*.20,Math.min(W,H)*.060,colors[0],p[0],'gas',t);
    sphere(W*.14,H*.72,Math.min(W,H)*.052,colors[1],p[0],'ring',t);
    sphere(W*.89,H*.73,Math.min(W,H)*.043,colors[2],p[0],'lava',t);
    sphere(W*.18,H*.18,Math.min(W,H)*.031,colors[3],p[0],'ice',t);
    sphere(W*.76,H*.82,Math.min(W,H)*.027,colors[4],p[0],'purple',t);
  }

  function frame(now){resize();const t=(now-start)/1000,p=audioParams(t);window.GoBaoFFT={bass:p[0],mid:p[1],treble:p[2],energy:p[3],time:t};background(t,p);blackHole(t,p);environment(t,p);p.forEach((v,i)=>{meters[i].style.height=(12+v*88)+'%';vals[i].textContent=v.toFixed(2);});requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
