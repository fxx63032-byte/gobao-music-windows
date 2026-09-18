(() => {
  const canvas=document.getElementById('gl');
  const fxCanvas=document.getElementById('spacefx');
  if(!canvas) return;
  const gl=canvas.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'high-performance'});
  const fx=fxCanvas?.getContext('2d',{alpha:true});
  if(!gl) return;

  const audio=document.getElementById('audio');
  const meters=['m1','m2','m3','m4'].map(id=>document.getElementById(id));
  const vals=['bassVal','midVal','treVal','engVal'].map(id=>document.getElementById(id));
  let bass=.18,mid=.20,tre=.16,eng=.20;
  const start=performance.now();

  const vs=`#version 300 es
  in vec2 a_pos;
  void main(){ gl_Position=vec4(a_pos,0.0,1.0); }`;

  const fs=`#version 300 es
  precision highp float;
  out vec4 outColor;
  uniform vec2 u_res;
  uniform float u_time;
  uniform float u_bass,u_mid,u_treble,u_energy;
  uniform float u_lens,u_disk,u_dust;

  float hash21(vec2 p){
    p=fract(p*vec2(123.34,345.45));
    p+=dot(p,p+34.345);
    return fract(p.x*p.y);
  }
  mat2 rot(float a){
    float c=cos(a),s=sin(a);
    return mat2(c,-s,s,c);
  }
  vec3 palette(float t){
    vec3 a=vec3(.12,.04,.20);
    vec3 b=vec3(.55,.22,.85);
    vec3 c=vec3(1.0,.55,.35);
    return mix(a,b,smoothstep(.0,.65,t))+c*pow(max(t-.72,0.0),2.0)*2.0;
  }
  float stars(vec2 uv,float density,float seed){
    vec2 gv=fract(uv*density)-.5;
    vec2 id=floor(uv*density);
    float n=hash21(id+seed);
    vec2 p=gv-vec2(hash21(id+3.1)-.5,hash21(id+8.7)-.5)*.65;
    float d=length(p);
    float tw=.35+.65*sin(u_time*(1.0+n*3.0)+n*12.0)*.5+.35;
    return smoothstep(.055,.0,d)*step(.77,n)*tw;
  }
  void main(){
    vec2 frag=gl_FragCoord.xy;
    vec2 uv=(frag-.5*u_res)/u_res.y;
    float t=u_time;
    float beat=u_bass;
    float r=length(uv);

    uv*=rot(.018*sin(t*.18)+u_mid*.02);

    float core=.105+.018*beat;
    float bend=(.028+.06*u_lens)/(r*r+.055);
    vec2 luv=uv*(1.0+bend*exp(-r*2.2));
    float lr=length(luv);
    float la=atan(luv.y,luv.x);

    vec3 col=vec3(.006,.004,.014);

    float neb=.5+.5*sin(luv.x*3.2-luv.y*2.0+t*.07);
    neb*=.5+.5*sin(luv.y*4.5+t*.05+sin(luv.x*2.0));
    col+=vec3(.07,.015,.11)*neb*(1.0-smoothstep(.2,1.2,lr));

    float s=0.0;
    s+=stars(luv+vec2(t*.002,0.0),15.0+12.0*u_dust,1.0);
    s+=stars(luv*rot(.15)+vec2(0.0,-t*.001),27.0+18.0*u_dust,9.0)*.65;
    s+=stars(luv*1.8,44.0+24.0*u_dust,17.0)*.35;
    col+=vec3(.55,.42,.85)*s*(.65+u_treble*.9);

    vec2 dUv=luv;
    dUv.y*=2.65;
    dUv*=rot(.10*sin(t*.13));
    float dr=length(dUv);
    float da=atan(dUv.y,dUv.x);

    float inner=.22+.015*sin(t*.4);
    float outer=.49+.02*u_energy;
    float ring=smoothstep(inner-.018,inner+.02,dr)*(1.0-smoothstep(outer-.03,outer+.03,dr));
    float bands=.35+.65*(.5+.5*sin(dr*88.0-da*7.0-t*(2.3+beat*2.0)));
    bands*=.55+.45*(.5+.5*sin(dr*38.0+da*3.0+t*.7));
    float hot=pow(max(0.0,1.0-abs(dr-.30)/.22),2.3);
    float asym=.42+.58*pow(.5+.5*cos(da-.45),2.0);

    vec3 diskCol=palette(clamp(hot+.18*bands,0.0,1.0));
    diskCol*=ring*(.65+.95*bands)*(.55+.9*asym)*(1.0+u_disk*1.55);
    diskCol*=1.0+beat*1.5;
    col+=diskCol;

    float arc=exp(-pow(abs(lr-.19)/.016,2.0));
    float arcMask=smoothstep(.92,.1,abs(sin(la)));
    col+=vec3(.48,.18,.82)*arc*arcMask*(.5+u_disk);

    float ph=exp(-pow((lr-(core+.035))/(.006+.003*u_energy),2.0));
    col+=vec3(1.0,.72,.95)*ph*(1.25+u_treble*1.4);

    float horizon=1.0-smoothstep(core-.006,core+.009,lr);
    col*=1.0-horizon*.98;

    float corona=exp(-pow((lr-core)/(.035+.01*beat),2.0));
    col+=vec3(.46,.10,.75)*corona*(.20+.52*u_energy);

    float pulse=exp(-pow((lr-(.55+fract(t*.28)*.65))/(.015+.015*u_energy),2.0));
    col+=vec3(.25,.06,.48)*pulse*u_energy*.28;

    float vig=smoothstep(1.18,.22,length((frag-.5*u_res)/u_res.y));
    col*=.45+.55*vig;
    col=1.0-exp(-col*1.45);
    col=pow(col,vec3(.88));
    outColor=vec4(col,1.0);
  }`;

  function makeShader(type,src){
    const s=gl.createShader(type);
    gl.shaderSource(s,src);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  let program;
  try{
    program=gl.createProgram();
    gl.attachShader(program,makeShader(gl.VERTEX_SHADER,vs));
    gl.attachShader(program,makeShader(gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  }catch(err){
    console.error('GoBao WebGL shader error',err);
    return;
  }

  gl.useProgram(program);
  const vao=gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const aPos=gl.getAttribLocation(program,'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);

  const U={};
  ['u_res','u_time','u_bass','u_mid','u_treble','u_energy','u_lens','u_disk','u_dust']
    .forEach(n=>U[n]=gl.getUniformLocation(program,n));

  function avg(arr,a,b){
    let s=0,n=0;
    for(let i=a;i<Math.min(b,arr.length);i++){s+=arr[i];n++;}
    return n?s/(n*255):0;
  }

  function audioParams(t){
    const ctl=window.GoBaoControls||{};
    const react=Number(ctl.react?.value||88)/100;
    const A=window.GoBaoAudio;
    if(A&&A.analyser&&!audio.paused&&audio.readyState>=2){
      A.analyser.getByteFrequencyData(A.freq);
      const ny=A.ctx.sampleRate/2, hz=ny/A.freq.length;
      const b1=Math.max(2,Math.floor(180/hz));
      const m2=Math.max(b1+2,Math.floor(2200/hz));
      const t2=Math.max(m2+2,Math.floor(11000/hz));
      const nb=avg(A.freq,0,b1), nm=avg(A.freq,b1,m2), nt=avg(A.freq,m2,t2);
      bass=bass*.70+nb*.30;
      mid=mid*.78+nm*.22;
      tre=tre*.82+nt*.18;
      eng=eng*.76+(nb*.45+nm*.35+nt*.20)*.24;
    }else{
      const kick=Math.pow(Math.max(0,Math.sin(t*3.1)),7);
      bass=.17+.57*kick;
      mid=.20+.17*(.5+.5*Math.sin(t*1.25));
      tre=.15+.16*(.5+.5*Math.sin(t*4.4+1.1));
      eng=.20+.34*kick+.10*(.5+.5*Math.sin(t*.75));
    }
    return [
      Math.min(1,bass*react),
      Math.min(1,mid*react),
      Math.min(1,tre*react),
      Math.min(1,eng*react)
    ];
  }

  function resize(){
    const rect=canvas.getBoundingClientRect();
    const dpr=Math.min(devicePixelRatio||1,1.75);
    const w=Math.max(2,Math.floor(rect.width*dpr));
    const h=Math.max(2,Math.floor(rect.height*dpr));
    if(canvas.width!==w||canvas.height!==h){
      canvas.width=w;canvas.height=h;
      if(fxCanvas){fxCanvas.width=w;fxCanvas.height=h;}
      gl.viewport(0,0,w,h);
    }
    if(fx) fx.clearRect(0,0,w,h);
  }
  addEventListener('resize',resize);

  function frame(now){
    resize();
    const t=(now-start)/1000;
    const p=audioParams(t);
    const ctl=window.GoBaoControls||{};

    gl.useProgram(program);
    gl.uniform2f(U.u_res,canvas.width,canvas.height);
    gl.uniform1f(U.u_time,t);
    gl.uniform1f(U.u_bass,p[0]);
    gl.uniform1f(U.u_mid,p[1]);
    gl.uniform1f(U.u_treble,p[2]);
    gl.uniform1f(U.u_energy,p[3]);
    gl.uniform1f(U.u_lens,Number(ctl.lens?.value||72)/100);
    gl.uniform1f(U.u_disk,Number(ctl.disk?.value||78)/100);
    gl.uniform1f(U.u_dust,Number(ctl.dust?.value||82)/100);
    gl.drawArrays(gl.TRIANGLES,0,3);

    p.forEach((v,i)=>{
      if(meters[i]) meters[i].style.height=(12+v*88)+'%';
      if(vals[i]) vals[i].textContent=v.toFixed(2);
    });

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();