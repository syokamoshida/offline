/* オフライン ―答えのないコンパス― canvas engine
   画面・UIはすべて <canvas> にJavaScriptで描画します。外部サーバーとの通信は行いません。 */
(()=>{
'use strict';
const D=document,W0=window;
const cv=D.getElementById('c'),ctx=cv.getContext('2d');
D.documentElement.style.cssText='margin:0;padding:0;height:100%;overflow:hidden;background:#000';
D.body.style.cssText='margin:0;padding:0;height:100%;overflow:hidden;background:#000;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent';
cv.style.cssText='display:block;position:fixed;left:0;top:0;width:100%;height:100%;touch-action:none;outline:none';
cv.tabIndex=0;

/* ---------- storage ---------- */
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
try{if(LS.get('offline_reset')!=='r1'){Object.keys(localStorage).filter(k=>k.startsWith('offline_')).forEach(k=>LS.del(k));LS.set('offline_reset','r1')}}catch(e){}

/* ---------- viewport ---------- */
let VW=1,VH=1,DPR=1,G={x:0,y:0,w:1,h:1},CQ=1,PORT=false;
const HOVER=W0.matchMedia&&W0.matchMedia('(hover:hover)').matches;
const REDUCE=W0.matchMedia&&W0.matchMedia('(prefers-reduced-motion:reduce)').matches;
function resize(){VW=W0.innerWidth;VH=W0.innerHeight;DPR=Math.min(W0.devicePixelRatio||1,2);
 cv.width=Math.round(VW*DPR);cv.height=Math.round(VH*DPR);
 PORT=VW/VH<=1;
 if(PORT){G={x:0,y:0,w:VW,h:VH}}else{let w=Math.min(VW,VH*16/9),h=w*9/16;G={x:(VW-w)/2,y:(VH-h)/2,w,h}}
 CQ=G.w/100;pageLayoutDirty=true;cmpCache=null;}
W0.addEventListener('resize',resize);

/* ---------- fonts & images ---------- */
const FS='OffSerif',FL='OffLogo',FM='OffSans';
const SYS='"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
let ready=false;
const fontDefs=[[FS,'assets/font/serif-sb.woff'],[FL,'assets/font/serif-bk.woff'],[FM,'assets/font/sans-rg.woff']];
const fontP=Promise.all(fontDefs.map(([n,u])=>{try{const f=new FontFace(n,`url(${u})`,{weight:'100 900'});return f.load().then(x=>{D.fonts.add(x)}).catch(()=>{})}catch(e){return Promise.resolve()}}));
const IMG={};
function img(src){if(IMG[src])return IMG[src];const i=new Image();i.src=src;IMG[src]=i;return i}
const compassImg=img('assets/ui/compass.png');
Promise.all([fontP,new Promise(r=>{if(compassImg.complete)r();else{compassImg.onload=r;compassImg.onerror=r}})]).then(()=>{ready=true;mcache.clear();pageLayoutDirty=true});
function F(px,fam,w,style){return `${style||''} ${w||600} ${px.toFixed(2)}px ${fam===FM?FM+',ui-monospace,monospace':fam===FL?FL+','+FS+','+SYS:FS+','+SYS}`}
const mcache=new Map();
function cw(font,c){let m=mcache.get(font);if(!m){m=new Map();mcache.set(font,m)}let v=m.get(c);if(v==null){ctx.font=font;v=ctx.measureText(c).width;m.set(c,v)}return v}
function tw(font,s,ls){let w=0;for(const c of s)w+=cw(font,c)+ls;return w-(s.length?ls:0)}
function txt(c,s,x,y,font,ls,align){ // letter-spaced text; align: left|center|right
 c.font=font;const w=tw(font,s,ls);let px=align==='center'?x-w/2:align==='right'?x-w:x;
 if(!ls){c.textAlign='left';c.fillText(s,px,y);return w}
 for(const ch of s){c.fillText(ch,px,y);px+=cw(font,ch)+ls}return w}

/* ---------- time / tween ---------- */
const now=()=>performance.now();
function TW(v){return{v,f:v,t:v,t0:0,d:1}}
function to(o,t,ms){o.f=val(o);o.t=t;o.t0=now();o.d=ms||1}
function set(o,v){o.v=o.f=o.t=v;o.d=1;o.t0=0}
function val(o){const k=Math.min(1,(now()-o.t0)/o.d);return o.f+(o.t-o.f)*k}
const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;

/* ---------- audio (JavaScript only) ---------- */
let master=.8,bgm=null,bgmName='',bgmBase=.3,amb=null,ambName='',ambBase=.4;
const SFXK=.5,sk=n=>n==='creek1'?1:SFXK,url=n=>`assets/sfx/${n}.mp3`;
function fadeTo(a,v,ms){if(!a)return;const s=a.volume,t0=now();(function f(){const k=Math.min(1,(now()-t0)/ms);a.volume=Math.max(0,Math.min(1,s+(v-s)*k));if(k<1)requestAnimationFrame(f)})()}
function fadeOut(a,ms){if(!a)return;const s=a.volume,t0=now(),d=ms||1500;(function f(){const k=Math.min(1,(now()-t0)/d);a.volume=s*(1-k);if(k<1)requestAnimationFrame(f);else a.pause()})()}
function setAmb(name,v){v=(v==null?.4:v)*(name==='off'?1:sk(name));if(name==='off'){fadeOut(amb);amb=null;ambName='';return}if(name===ambName){if(amb){ambBase=v;amb.volume=v*master}return}
 fadeOut(amb);ambName=name;ambBase=v;const a=new Audio(url(name));a.loop=true;a.volume=0;a.play().catch(()=>{});amb=a;fadeTo(a,v*master,1800)}
function setBgm(name,v){v=v==null?.3:v;if(name==='off'){fadeOut(bgm);bgm=null;bgmName='';return}if(name===bgmName){if(bgm){bgmBase=v;bgm.volume=v*master}return}
 fadeOut(bgm);bgmName=name;bgmBase=v;const a=new Audio(`assets/bgm/maoudamashii-${name}.mp3`);a.loop=true;a.volume=0;a.play().catch(()=>{});bgm=a;fadeTo(a,v*master,2500)}
const seList=[];
function se(name,v){const a=new Audio(url(name));a.volume=Math.min(1,(v==null?.8:v)*sk(name)*master);a.play().catch(()=>{});const o={a,t:now()};seList.push(o);a.addEventListener('ended',()=>{const i=seList.indexOf(o);if(i>=0)seList.splice(i,1)})}
function stopSE(minAge){const t=now();for(let i=seList.length-1;i>=0;i--){const o=seList[i];if(t-o.t>=(minAge||0)){fadeOut(o.a,450);seList.splice(i,1)}}}
function setMaster(m){master=Math.max(0,Math.min(1,m));if(amb)amb.volume=ambBase*master;if(bgm)bgm.volume=bgmBase*master}

/* ---------- game state ---------- */
let flags={},LABEL={},idx=0,typing=false,typeTimer=null,full='',autoOn=false,skipOn=false,autoTimer=null,locked=false,logOpen=false,started=false,curChapter=1;
const logArr=[];SCRIPT.forEach((x,i)=>{if(x.k==='label')LABEL[x.id]=i});
// visual state
const V={bgs:[],bgName:'',chaos:false,chaosT:0,glowT:-1e9,dim:TW(0),shadeT:TW(0),box:TW(0),boxOp:1,
 noa:{show:false,text:'',n:0},dots:{show:false,t0:0},card:{show:false,a:'',b:'',op:TW(0)},
 fin:{show:false,a:'',b:'',dark:false,t0:0,op:TW(0)},choices:null,
 title:true,overlay:null,confirm:false,hudT:0};
let page=[],cur=null,pageLayoutDirty=true;

/* ---------- backgrounds ---------- */
function setBg(name){if(name===V.bgName)return;V.bgName=name;const i=img(`assets/bg/${name}.jpg`);
 V.bgs.forEach(b=>{b.out=now()});V.bgs.push({img:i,t0:now(),kb:now()});if(V.bgs.length>3)V.bgs.shift()}
function drawCover(c,im,x,y,w,h,scale,tx,ty){const iw=im.naturalWidth,ih=im.naturalHeight;if(!iw)return;const s=Math.max(w/iw,h/ih)*scale;const dw=iw*s,dh=ih*s;c.drawImage(im,x+(w-dw)/2+tx*w,y+(h-dh)/2+ty*h,dw,dh)}

/* ---------- text layout (Japanese line breaking) ---------- */
const NOSTART='、。，．・：；？！ゝゞー」』）］｝〉》〕】ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ‥～〜!),.:;?]}';
const NOEND='「『（［｛〈《〔【([{';
const HANG='、。，．';
function units(t){const u=[];let i=0;while(i<t.length){const c=t[i];
  if(c==='―'||c==='…'){let j=i;while(j<t.length&&t[j]===c)j++;u.push(t.slice(i,j));i=j;continue}
  if(/[A-Za-z0-9]/.test(c)){let j=i;while(j<t.length&&/[A-Za-z0-9.,'\-%]/.test(t[j]))j++;u.push(t.slice(i,j));i=j;continue}
  u.push(c);i++}return u}
function wrap(text,maxW,font,ls){const out=[];
 for(const seg of String(text).replace(/⁠/g,'').split('\n')){
  const us=units(seg);const lines=[];let cur=[],w=0;const uw=u=>{let s=0;for(const c of u)s+=cw(font,c)+ls;return s};
  for(const u of us){const W=uw(u);
   if(w+W<=maxW+0.5||!cur.length){cur.push(u);w+=W;continue}
   if(HANG.includes(u)){cur.push(u);w+=W;continue}
   const carry=[u];
   if(NOSTART.includes(u[0])){let k=0;while(cur.length>1&&k<3){const p=cur.pop();carry.unshift(p);k++;if(!NOSTART.includes(p[0]))break}}
   while(cur.length>1&&NOEND.includes(cur[cur.length-1]))carry.unshift(cur.pop());
   lines.push(cur);cur=carry;w=carry.reduce((a,b)=>a+uw(b),0)}
  lines.push(cur);
  if(lines.length>=2){const last=lines[lines.length-1],prev=lines[lines.length-2];if(last.join('').length<=2){let k=0;while(k<2&&prev.length>3&&!NOEND.includes(prev[prev.length-1])){last.unshift(prev.pop());k++}}}
  lines.forEach(l=>out.push(l.join('')))}
 return out}

/* ---------- page (full-screen text) ---------- */
function PL(){ // page layout metrics (in game px)
 if(PORT)return{x:G.w*.065,y:G.h*.17,w:G.w*.87,h:G.h*.78,fs:5.1*CQ,lh:1.85,ls:.05};
 return{x:G.w*.07,y:G.h*.065,w:G.w*.86,h:G.h*.885,fs:2.7*CQ,lh:1.95,ls:.07}}
function paraStyle(s,L){const fs=L.fs;
 if(s==='T')return{font:F(fs,FM,500),ls:fs*.1,col:'#dfeaf0'};
 if(s==='V')return{font:F(fs,FS,600),ls:fs*L.ls,col:'#bfe9ff',glow:true};
 if(s==='E')return{font:F(fs,FS,600),ls:fs*L.ls,col:'#f4ecd6',center:true};
 return{font:F(fs,FS,600),ls:fs*L.ls,col:'#ffffff'}}
function layoutPara(p,L){const st=paraStyle(p.s,L);p.st=st;const lines=wrap(p.body,L.w,st.font,st.ls);const lh=L.fs*L.lh;
 const pad=p.s==='E'?L.fs*.6:0,mt=p.s==='E'?L.fs*.9:0,mb=p.s==='E'?L.fs*.9:L.fs*.55;
 p.g=[];let y=mt+pad;lines.forEach(line=>{const w=tw(st.font,line,st.ls);let x=st.center?(L.w-w)/2:0;for(const c of line){p.g.push({c,x,y});x+=cw(st.font,c)+st.ls}y+=lh});
 p.lines=lines.length;p.h=mt+pad*2+lines.length*lh+mb;p.mt=mt;p.pad=pad;p.lh=lh}
function relayout(){const L=PL();let y=0;page.forEach(p=>{layoutPara(p,L);p.y=y;y+=p.h});pageLayoutDirty=false}
function clearPage(){page=[];cur=null}
function addPara(s,body){const L=PL();const p={s,body,n:0};layoutPara(p,L);
 const tot=page.reduce((a,b)=>a+b.h,0);if(page.length&&tot+p.h>L.h+1){page=[]}
 p.y=page.reduce((a,b)=>a+b.h,0);page.push(p);cur=p;return p}
function drawPage(c,L,alpha){if(!page.length||alpha<=0)return;
 c.save();c.globalAlpha=alpha;c.translate(L.x,L.y);
 if(V.chaos){const t=(now()%7000)/7000;if(t>.966&&t<.974){c.translate(.5*CQ,-.2*CQ);c.transform(1,0,Math.tan(3*Math.PI/180),1,0,0)}else if(t>=.974&&t<.982)c.translate(-.4*CQ,.2*CQ)}
 c.textBaseline='alphabetic';
 for(const p of page){const st=p.st;const n=p.n;
  if(p.s==='E'){c.strokeStyle='rgba(255,255,255,.28)';c.lineWidth=1;const y0=p.y+p.mt,y1=p.y+p.h-L.fs*.9;c.beginPath();c.moveTo(0,y0+.5);c.lineTo(L.w,y0+.5);c.moveTo(0,y1-.5);c.lineTo(L.w,y1-.5);c.stroke()}
  c.font=st.font;c.fillStyle=st.col;
  const base=p.lh*.5+L.fs*.36;
  if(st.glow){c.shadowColor='rgba(111,208,255,.55)';c.shadowBlur=1.1*CQ*DPR;for(let i=0;i<n&&i<p.g.length;i++){const g=p.g[i];c.fillText(g.c,g.x,p.y+g.y+base)}}
  c.shadowColor='rgba(0,0,0,.95)';c.shadowBlur=.35*CQ*DPR;c.shadowOffsetY=0;
  for(let i=0;i<n&&i<p.g.length;i++){const g=p.g[i];c.fillText(g.c,g.x,p.y+g.y+base)}
  c.shadowBlur=0}
 // ▼ marker
 if(cur&&!typing&&!V.noa.show&&!V.choices&&cur.n>=cur.g.length&&cur.g.length&&Math.floor(now()/500)%2===0){const g=cur.g[cur.g.length-1];const fs=L.fs;c.font=F(fs*.8,FS,600);c.fillStyle='#f0a63a';c.fillText('▼',g.x+cw(cur.st.font,g.c)+fs*.4,cur.y+g.y+cur.lh*.5+fs*.32)}
 c.restore()}

/* ---------- text display ---------- */
function showText(s,t){clearInterval(typeTimer);V.noa.show=false;V.dots.show=false;
 if(s==='N'){to(V.box,0,350);to(V.shadeT,0,500);V.noa.show=true;V.noa.text=t;V.noa.n=0;full=t;typing=true;const sp=skipOn?4:70;
  typeTimer=setInterval(()=>{V.noa.n++;if(V.noa.n>=t.length){clearInterval(typeTimer);typing=false;done()}},sp);pushLog('V',t);return}
 to(V.box,1,350);to(V.shadeT,1,500);
 let body=(s==='E'||t.charAt(0)==='「'||s==='T'||s==='V')?t:'　'+t;
 const p=addPara(s,body);full=body;typing=true;const sp=skipOn?2:(s==='V'?52:36);
 typeTimer=setInterval(()=>{p.n++;if(p.n>=p.g.length){clearInterval(typeTimer);typing=false;done()}},sp);pushLog(s,t)}
function done(){if(autoOn||skipOn){clearTimeout(autoTimer);autoTimer=setTimeout(()=>{if(!locked&&!logOpen)advance(true)},skipOn?90:Math.max(1100,full.length*85+600))}}
function pushLog(s,t){logArr.push([s,t]);if(logArr.length>200)logArr.shift()}
function finishType(){clearInterval(typeTimer);typing=false;if(V.noa.show)V.noa.n=V.noa.text.length;else if(cur)cur.n=cur.g.length;done()}
let cardTok=0,finTok=0,gen=0;
function cardShow(kind,a,b,ms){return new Promise(res=>{locked=true;to(V.box,0,350);to(V.shadeT,0,500);V.noa.show=false;const k=V.card;const tk=++cardTok,g0=gen;k.show=true;k.a=a;k.b=b;set(k.op,0);to(k.op,1,1000);
 setTimeout(()=>{if(tk!==cardTok||g0!==gen)return;to(k.op,0,900);setTimeout(()=>{if(tk!==cardTok||g0!==gen)return;k.show=false;locked=false;res()},900)},skipOn?200:ms)})}
function save(at){LS.set('offline_save',JSON.stringify({idx:at==null?idx:at,ch:curChapter,flags,st:{bg:V.bgName,bgm:bgmName,bv:bgmBase,amb:ambName,av:ambName?ambBase/sk(ambName):0,cx:V.chaos}}))}
function setChaos(on){if(on!==V.chaos){V.chaos=on;V.chaosT=now()}}
function runCmd(c){const p=c.split(' ');switch(p[0]){case'@bg':if(p[1]!==V.bgName)stopSE(800);setBg(p[1]);clearPage();break;case'@bgm':setBgm(p[1],p[2]==null?null:+p[2]);break;case'@amb':setAmb(p[1],p[2]==null?null:+p[2]);break;case'@se':se(p[1],p[2]==null?null:+p[2]);break;case'@chaos':setChaos(p[1]!=='off');break;case'@glow':V.glowT=now();break}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function step(){
 if(idx>=SCRIPT.length){end();return}
 const it=SCRIPT[idx++];const g0=gen;
 if(it.if&&flags[it.if[0]]!==it.if[1])return step();
 if(it.ifnot&&flags[it.ifnot[0]]===it.ifnot[1])return step();
 if(it.ifany&&!it.ifany.some(c=>flags[c[0]]===c[1]))return step();
 if(it.k==='label')return step();
 if(it.k==='jump'){idx=LABEL[it.to];return step()}
 if(it.k==='choice')return showChoice(it);
 if(it.k==='fin'){autoOn=skipOn=false;to(V.dim,1,600);to(V.box,0,350);to(V.shadeT,0,500);V.noa.show=false;LS.set('offline_hidden','1');await cardShow('chap',it.a,it.b,5200);if(g0!==gen)return;toTitle();return}
 if(it.k==='cmd'){runCmd(it.c);return step()}
 if(it.k==='calcend'){flags.end=calcEnd(it.stage);return step()}
 if(it.k==='ending'){const m=META[it.id];locked=true;stopSE(0);if(m.kind==='end')markDone(it.id==='E4'?11:12);clearTimeout(autoTimer);autoOn=skipOn=false;to(V.dim,1,600);to(V.box,0,350);to(V.shadeT,0,500);V.noa.show=false;
  const seen=getSeen();if(!seen.includes(it.id))seen.push(it.id);LS.set('offline_seen',JSON.stringify(seen));LS.del('offline_save');
  await sleep(1200);if(g0!==gen)return;if(m.kind==='end'){await finShow('ENDING '+m.no,'「'+m.t+'」',it.id==='E4');setChaos(false)}else{await cardShow('chap','サイドストーリー',m.t+'\nおわり',6000)}if(g0!==gen)return;toTitle();return}
 if(it.k==='chapter'){if(it.n>=2&&it.n<=12)markDone(it.n-1);locked=true;stopSE(0);curChapter=it.n;to(V.dim,1,600);setAmb('off');setBgm('off');await cardShow('chap',it.a||('第 '+it.n+' 章'),it.t,2800);if(g0!==gen)return;to(V.dim,0,600);return step()}
 if(it.k==='scene'){stopSE(0);clearPage();if(idx>3){locked=true;to(V.dim,1,600);await sleep(skipOn?100:700);if(g0!==gen)return;to(V.dim,0,600);locked=false}return step()}
 if(it.k==='dots'){to(V.box,0,350);to(V.shadeT,0,500);V.noa.show=false;V.dots.show=true;V.dots.t0=now();locked=true;await sleep(skipOn?300:2600);if(g0!==gen)return;V.dots.show=false;locked=false;return step()}
 showText(it.s,it.t);save(idx-1)}
function showChoice(it){locked=true;autoOn=skipOn=false;clearTimeout(autoTimer);if(page.length>1){const l=page[page.length-1];page=[l];l.y=0}
 V.choices={o:it.o};to(V.shadeT,1,500);to(V.box,1,350);V.boxOp=.8}
function pickChoice(o){Object.assign(flags,o.set||{});if(o.neg)flags.neg=(flags.neg||0)+1;flags.cold=(flags.neg||0)>=8?'2':(flags.neg||0)>=4?'1':'0';
 V.choices=null;V.boxOp=1;pushLog('V','▶ '+o.t);locked=false;idx=LABEL[o.to];save();step()}
function advance(fromAuto){if(!started||locked||logOpen||V.confirm||V.choices)return;clearTimeout(autoTimer);if(typing){if(!fromAuto)finishType();return}step()}
function end(){autoOn=skipOn=false;to(V.dim,1,600);to(V.box,0,350);to(V.shadeT,0,500);V.noa.show=false;
 const g0=gen;cardShow('chap',curChapter>=12?'オフライン':'第 '+curChapter+' 章 了',curChapter>=12?'おわり':'次の章へ',curChapter>=12?5200:3500).then(()=>{if(g0===gen)toTitle()})}
const META={E1:{kind:'end',no:1,t:'オフライン',h:'物語を、そのまま最後まで見届ける。'},E2:{kind:'end',no:2,t:'うん。待つ',h:'ノアの言葉に、もっと寄り添ってみる。'},E3:{kind:'end',no:3,t:'ちがう足音',h:'まわりの人たちに、自分から手を伸ばしてみる。'},E4:{kind:'end',no:4,t:'答えの洪水',h:'？？？　すべてを拒みつづけた、その先に。'},
 S1:{kind:'side',ch:13,t:'方舟',who:'湊',h:'二十三年前の、父の夜。'},S2:{kind:'side',ch:14,t:'迷ったこと',who:'ハル',h:'祖母の、深緑のノートのはじまり。'},S3:{kind:'side',ch:15,t:'九十四パーセントの外',who:'颯太',h:'ジャンク市と、黒いケーブル。'},S4:{kind:'side',ch:16,t:'〇・三秒',who:'ノア',h:'青い光が見ていたもの。'}};
function finShow(a,b,dark){return new Promise(res=>{locked=true;setAmb('off');const f=V.fin;const tk=++finTok,g0=gen;f.show=true;f.a=a;f.b=b;f.dark=!!dark;f.t0=now();f.click=null;set(f.op,0);to(f.op,1,2200);
 let doneF=false;const fin=()=>{if(doneF||tk!==finTok||g0!==gen)return;doneF=true;f.click=null;to(f.op,0,2200);setTimeout(()=>{if(tk!==finTok||g0!==gen)return;f.show=false;locked=false;res()},2300)};
 setTimeout(()=>{if(tk===finTok&&g0===gen)f.click=fin},4000);setTimeout(fin,11000)})}
function chDone(){return +LS.get('offline_chdone')||0}
function markDone(n){if(n>chDone())LS.set('offline_chdone',n)}
function getSeen(){try{return JSON.parse(LS.get('offline_seen')||'[]')}catch(e){return[]}}
function calcEnd(stage){const f=flags,neg=f.neg||0;if(stage===11)return neg>=13?'E4':'';
 const noaA=[f.noa==='now',f.w4==='kind',f.radio==='bring',f.p9==='wait'].filter(Boolean).length;
 const ppl=[f.rei==='afraid'||f.rei==='askback',f.k3==='knock',f.g6==='yes',f.rei6==='yes',f.y10==='together',f.father==='wait'].filter(Boolean).length;
 if(noaA>=3&&noaA>=ppl-1)return'E2';if(ppl>=4)return'E3';return'E1'}
const SIDE_ORDER=['S1','S2','S3','S4'];
function sidesUnlocked(seen){seen=seen||getSeen();if(!seen.some(x=>x[0]==='E'))return 0;return Math.min(SIDE_ORDER.length,1+SIDE_ORDER.filter(i=>seen.includes(i)).length)}
function resetView(){gen++;clearInterval(typeTimer);clearTimeout(autoTimer);typing=false;locked=false;V.choices=null;V.boxOp=1;V.noa.show=false;V.dots.show=false;V.card.show=false;V.fin.show=false;V.confirm=false;logOpen=false;set(V.box,0);set(V.shadeT,0);set(V.card.op,0);set(V.fin.op,0);V.glowT=-1e9}
function startFrom(chap,at,fl,st){resetView();flags=Object.assign({miso:'tofu',father:'cold',radio:'none',cold:'0'},fl||{});started=true;V.title=false;V.overlay=null;set(V.dim,0);logArr.length=0;clearPage();V.bgs=[];V.bgName='';setChaos(false);
 if(at!=null)idx=at;else{idx=SCRIPT.findIndex(x=>x.k==='chapter'&&x.n===chap);if(idx<0)idx=0}
 if(at!=null){const c0=(()=>{for(let i=at;i>=0;i--)if(SCRIPT[i].k==='chapter')return i;return 0})();curChapter=(st&&chap)?chap:SCRIPT[c0].n;
  if(st&&st.bg){setBg(st.bg);if(st.bgm)setBgm(st.bgm,st.bv);if(st.amb)setAmb(st.amb,st.av);setChaos(!!st.cx)}else{for(let i=c0;i<at;i++){const q=SCRIPT[i];if(q.k==='cmd'&&/^@(bg|amb|bgm|chaos)/.test(q.c))runCmd(q.c)}}}
 V.hudT=now();step()}
const T={cont:null,chap:false,chapRev:0,side:false,sideRev:0,sidesShown:0};
function toTitle(){resetView();stopSE(0);setChaos(false);started=false;clearTimeout(autoTimer);clearInterval(typeTimer);typing=false;autoOn=skipOn=false;setAmb('off');setBgm('off');V.noa.show=false;V.dots.show=false;V.choices=null;V.boxOp=1;set(V.box,0);set(V.shadeT,0);clearPage();set(V.dim,0);V.title=true;V.bgName='';V.bgs=[];V.confirm=false;logOpen=false;V.overlay=null;V.card.show=false;V.fin.show=false;
 let s=null;try{s=JSON.parse(LS.get('offline_save')||'null')}catch(e){}T.cont=s&&s.idx>2?s:null;
 const cd=chDone();T.chap=cd>0;if(T.chap&&LS.get('offline_chapbtn')!=='1'){T.chapRev=now();LS.set('offline_chapbtn','1')}
 const n=sidesUnlocked();T.side=n>0;if(T.side&&LS.get('offline_sidebtn')!=='1'){T.sideRev=now();LS.set('offline_sidebtn','1')}}

/* ---------- input & hit regions ---------- */
let hits=[],ptr={x:-1,y:-1,down:null,moved:false,sy:0,touch:false};
function hit(x,y,w,h,fn,opt){hits.push({x,y,w,h,fn,opt:opt||{}})}
function topHit(px,py){for(let i=hits.length-1;i>=0;i--){const r=hits[i];if(px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h)return r}return null}
const inR=(r)=>r&&ptr.x>=r.x&&ptr.x<=r.x+r.w&&ptr.y>=r.y&&ptr.y<=r.y+r.h;
function hov(x,y,w,h){return !ptr.touch&&ptr.x>=x&&ptr.x<=x+w&&ptr.y>=y&&ptr.y<=y+h}
function gpos(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left-G.x,y:e.clientY-r.top-G.y}}
let scrollTarget=null;
cv.addEventListener('pointerdown',e=>{cv.focus({preventScroll:true});const p=gpos(e);ptr.x=p.x;ptr.y=p.y;ptr.touch=e.pointerType==='touch';ptr.down={x:p.x,y:p.y,t:now(),hit:topHit(p.x,p.y)};ptr.moved=false;
 scrollTarget=ptr.down.hit&&ptr.down.hit.opt.scroll?ptr.down.hit.opt.scroll:currentScroll();ptr.sy=scrollTarget?scrollTarget.y:0;
 if(ptr.down.hit&&ptr.down.hit.opt.drag){ptr.down.hit.opt.drag(p.x,p.y)}V.hudT=now()});
cv.addEventListener('pointermove',e=>{const p=gpos(e);ptr.x=p.x;ptr.y=p.y;if(e.pointerType!=='touch')ptr.touch=false;V.hudT=now();
 if(ptr.down){const dy=p.y-ptr.down.y,dx=p.x-ptr.down.x;if(Math.abs(dy)>8||Math.abs(dx)>8)ptr.moved=true;
  if(ptr.down.hit&&ptr.down.hit.opt.drag){ptr.down.hit.opt.drag(p.x,p.y);return}
  if(scrollTarget&&ptr.moved){scrollTarget.y=Math.max(0,Math.min(scrollTarget.max,ptr.sy-dy))}}});
cv.addEventListener('pointerup',e=>{const p=gpos(e);ptr.x=p.x;ptr.y=p.y;const d=ptr.down;ptr.down=null;if(!d)return;if(ptr.moved&&!(d.hit&&d.hit.opt.drag))return;
 const h=topHit(p.x,p.y);if(h&&d.hit&&h.fn===d.hit.fn){h.fn();return}
 if(!h&&!d.hit)gameClick(p)});
cv.addEventListener('pointerleave',()=>{if(!ptr.down){ptr.x=-1;ptr.y=-1}});
cv.addEventListener('pointercancel',()=>{ptr.down=null});
cv.addEventListener('wheel',e=>{const s=currentScroll();if(s){s.y=Math.max(0,Math.min(s.max,s.y+e.deltaY));e.preventDefault()}},{passive:false});
cv.addEventListener('contextmenu',e=>e.preventDefault());
function gameClick(p){if(!started||V.title)return;if(p.x<0||p.y<0||p.x>G.w||p.y>G.h)return;advance()}
function currentScroll(){if(logOpen)return LOG.sc;if(V.overlay==='elist')return OV.sc.elist;if(V.overlay==='sides')return OV.sc.sides;if(V.overlay==='chapters')return OV.sc.chapters;return null}
W0.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(logOpen){logOpen=false;return}if(V.confirm){V.confirm=false;return}if(V.overlay){V.overlay=null;return}}
 if(!started)return;
 if(V.choices&&/^[1-9]$/.test(e.key)){const o=V.choices.o[+e.key-1];if(o){pickChoice(o)}return}
 if(e.key===' '||e.key==='Enter'){e.preventDefault();if(logOpen){logOpen=false;return}advance()}
 else if(e.key==='a'||e.key==='A')toggleAuto();else if(e.key==='s'||e.key==='S')toggleSkip();else if(e.key==='l'||e.key==='L')toggleLog();
 else if(e.key==='ArrowUp'&&logOpen){LOG.sc.y=Math.max(0,LOG.sc.y-60)}else if(e.key==='ArrowDown'&&logOpen){LOG.sc.y=Math.min(LOG.sc.max,LOG.sc.y+60)}});
function toggleAuto(){autoOn=!autoOn;skipOn=false;if(autoOn&&!typing)done()}
function toggleSkip(){skipOn=!skipOn;autoOn=false;if(skipOn&&!typing)done()}
const LOG={sc:{y:0,max:0},open:0};
function toggleLog(){logOpen=!logOpen;if(logOpen){LOG.sc.y=1e9;LOG.open=now()}}
const OV={sc:{elist:{y:0,max:0},sides:{y:0,max:0},chapters:{y:0,max:0}}};
function openOverlay(n){V.overlay=n;OV.sc[n].y=0;if(n==='sides'){T.sidesShown=+LS.get('offline_sidesn')||0;LS.set('offline_sidesn',sidesUnlocked());OV.t0=now()}}

/* ---------- drawing helpers ---------- */
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function lightBtn(c,x,y,w,h,label,fs,fn,opt){opt=opt||{};const hv=hov(x,y,w,h);rr(c,x,y,w,h,4);c.fillStyle=hv?'rgba(111,208,255,.25)':'rgba(255,255,255,.7)';c.fill();c.strokeStyle=hv?'#3aa9e4':'rgba(20,41,59,.35)';c.lineWidth=1;c.stroke();
 c.fillStyle='#14293b';c.textBaseline='middle';txt(c,label,x+w/2,y+h/2+fs*.04,F(fs,FS,600),fs*.2,'center');hit(x,y,w,h,fn,opt)}

/* ---------- title ---------- */
const TT='オフライン',GN='ｵﾌﾗｲﾝ░▒▓#%＿／＼才7ラ1ソ';
const TG={on:false,t0:0,h:TT,g1:TT,g2:TT,cmpNoise:0,slices:[],bars:[]};
const garble=()=>[...TT].map(c=>Math.random()<.35?GN[Math.floor(Math.random()*GN.length)]:c).join('');
function glitchOnce(){if(!V.title||REDUCE)return;TG.g1=garble();TG.g2=garble();TG.h=Math.random()<.5?garble():TT;TG.on=true;TG.t0=now();if(Math.random()<.45)cmpBurst();setTimeout(()=>{TG.on=false;TG.h=TT},380)}
(function loop(){glitchOnce();if(Math.random()<.35)setTimeout(glitchOnce,520);setTimeout(loop,2400+Math.random()*5200)})();
function cmpBurst(){if(!V.title||REDUCE||now()-TG.cmpNoise<460)return;const R=Math.random;TG.cmpNoise=now();
 TG.slices=[0,1,2,3].map(()=>({y:-10+R()*220,h:2.5+R()*12,dx:(R()<.5?-1:1)*(6+R()*16)}));
 TG.bars=[0,1,2].map(()=>{const w=20+R()*90;return{x:-10+R()*(220-w),y:R()*200,w}})}
setTimeout(function L2(){cmpBurst();if(Math.random()<.3)setTimeout(cmpBurst,560);setTimeout(L2,3500+Math.random()*7500)},2600);
let cmpCache=null;
function compassCanvas(size){if(cmpCache&&cmpCache.s===size)return cmpCache.c;const c=D.createElement('canvas');const px=Math.max(2,Math.round(size*DPR));c.width=c.height=px;const k=c.getContext('2d');
 if(compassImg.naturalWidth)k.drawImage(compassImg,0,0,px,px);k.globalCompositeOperation='destination-in';const g=k.createLinearGradient(0,0,0,px);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.52,'rgba(0,0,0,1)');g.addColorStop(.70,'rgba(0,0,0,.35)');g.addColorStop(.86,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0)');k.fillStyle=g;k.fillRect(0,0,px,px);
 cmpCache={s:size,c};return c}
const steps=(t,arr)=>{const i=Math.min(arr.length-1,Math.floor(t*arr.length));return arr[i]};
function drawTitle(c){const t=now();const P=PORT;
 c.fillStyle='#f6f8fa';c.fillRect(0,0,G.w,G.h);
 const S=P?{logo:13.5,ls:.14,cmp:100,dot:2.6,dg:3,sub:5.4,sls:.3,cont:5.2,btn:4.6,sm:3.4,note:2.9,cred:2.3,gap:3,line:.8}:{logo:7.4,ls:.22,cmp:52,dot:1.2,dg:1.3,sub:2.7,sls:.45,cont:2.45,btn:2.15,sm:1.45,note:1.15,cred:.95,gap:1,line:.42};
 const lfs=S.logo*CQ,lh=lfs*1.15,dotS=S.dot*CQ;
 // vertical stack
 const items=[];
 items.push({k:'logo',h:lh});items.push({k:'dots',h:dotS+(P?2:1)*CQ});items.push({k:'sub',h:S.sub*CQ*1.5+(P?1:1.4)*CQ});
 if(T.cont)items.push({k:'cont',h:S.cont*CQ*1.4+(P?4.4:1.1)*CQ});
 items.push({k:'start',h:S.btn*CQ*1.4+(P?4.4:1.1)*CQ});
 items.push({k:'subm',h:0});items.push({k:'note',h:S.note*CQ*1.7+(P?3:1.4)*CQ});items.push({k:'cred',h:0});
 // sub menu rows
 const sm=[];if(T.chap)sm.push({l:'章を選ぶ',fn:()=>openOverlay('chapters'),rev:T.chapRev});if(T.side)sm.push({l:'サイドストーリー',fn:()=>openOverlay('sides'),rev:T.sideRev});sm.push({l:'エンディングリスト',fn:()=>openOverlay('elist'),rev:0});
 const smF=F(S.sm*CQ,FS,600),smLs=S.sm*CQ*.22,smPadX=(P?1.5:1)*CQ,smGap=(P?5:2.4)*CQ;
 const smW=sm.map(o=>tw(smF,o.l,smLs)+smPadX*2);const smRows=[];let row=[],rw=0;const maxRow=G.w*.9;
 sm.forEach((o,i)=>{if(row.length&&rw+smGap+smW[i]>maxRow){smRows.push(row);row=[];rw=0}rw+=(row.length?smGap:0)+smW[i];row.push(i)});if(row.length)smRows.push(row);
 const smRowH=S.sm*CQ*1.5+(P?3:.8)*CQ;items.find(i=>i.k==='subm').h=smRows.length*smRowH+(P?1.5:.6)*CQ;
 // credits wrap by segments
 const credF=F(S.cred*CQ,FS,500);const segs=['音楽：魔王魂','／','効果音：効果音ラボ・無料効果音で遊ぼう！・On-Jin ～音人～','／','写真：Unsplash','　','※素材音源の二次配布・無断利用は禁止です'];
 const credMax=G.w*(P?.88:.92);const credLines=[];let cl='';segs.forEach(s=>{if(cl&&tw(credF,cl+s,0)>credMax&&s!=='／'&&s!=='　'){credLines.push(cl.replace(/[／　]$/,''));cl=s}else cl+=s});if(cl)credLines.push(cl);
 items.find(i=>i.k==='cred').h=credLines.length*S.cred*CQ*1.7;
 const total=items.reduce((a,b)=>a+b.h,0)+S.gap*CQ*(items.length-1);
 let y=Math.max(2*CQ,(G.h-total)/2);const pos={};items.forEach(it=>{pos[it.k]=y;y+=it.h+S.gap*CQ});
 const cx=G.w/2,ly=pos.logo,lineY=ly+lh*.55;
 // compass
 const cs=S.cmp*CQ*(1200/1200);const cmpC=compassCanvas(cs);
 const nz=t-TG.cmpNoise<440?(t-TG.cmpNoise)/440:-1;
 c.save();let op=.3;let jx=0,sk=0;
 if(nz>=0){op=steps(nz,[.55,.55,.22,.22,.62,.38,.38,.5,.5,.3]);const j=steps(nz,[0,-.7,-.7,.9,.9,-.3,-.3,.5,.5,0]);jx=j/100*cs;sk=steps(nz,[0,-2,-2,0,0,1.5,1.5,0,0,0])}
 c.globalAlpha=op;c.translate(cx+jx,lineY);if(sk)c.transform(1,0,Math.tan(sk*Math.PI/180),1,0,0);c.drawImage(cmpC,-cs/2,-cs/2,cs,cs);
 if(nz>=0){const vis=steps(nz,[1,1,.25,1,1,.55,.55,1,1,0]);if(vis>0){c.globalAlpha=op*vis;const u=cs/220;
  TG.slices.forEach(s=>{const sy=(s.y+10)*u,sh=s.h*u;const src=cmpC.width/cs;c.drawImage(cmpC,0,sy*src,cmpC.width,sh*src,-cs/2+s.dx*u,-cs/2+sy,cs,sh)});
  c.fillStyle='#2f9fd8';TG.bars.forEach(b=>{c.fillRect(-cs/2+(b.x+10)*u,-cs/2+(b.y+10)*u,b.w*u,1.8*u)})}}
 c.restore();
 // logo
 const lf=F(lfs,FL,900),lls=lfs*S.ls;const lw=tw(lf,TT,lls);const lx=cx-lw/2;
 const g=TG.on?(t-TG.t0)/380:-1;
 c.save();c.textBaseline='middle';const ty=ly+lh*.5;
 let hx=0,hsk=0;if(g>=0&&g<1){hx=steps(g,[.9,-.7,.4,0])*CQ;hsk=steps(g,[6,0,-3,0])}
 c.save();c.translate(hx,0);if(hsk){c.translate(cx,ty);c.transform(1,0,Math.tan(hsk*Math.PI/180),1,0,0);c.translate(-cx,-ty)}
 c.fillStyle='rgba(255,70,100,.38)';txt(c,TG.h,lx-.22*CQ,ty,lf,lls);c.fillStyle='rgba(58,169,228,.5)';txt(c,TG.h,lx+.22*CQ,ty,lf,lls);
 c.shadowColor='rgba(111,208,255,.35)';c.shadowBlur=2.4*CQ*DPR;c.fillStyle='#0c1c2b';txt(c,TG.h,lx,ty,lf,lls);c.shadowBlur=0;c.restore();
 if(g>=0&&g<1){const b1=steps(g,[[.10,.38,-1.4],[.58,.24,1.1],[.30,.25,-.6],[.80,.18,.8]]),b2=steps(g,[[.64,.28,1.3],[.04,.26,-1],[.42,.28,.7],[.20,.20,-.5]]);
  [[b1,'rgba(224,64,94,.85)',TG.g1],[b2,'rgba(42,159,224,.85)',TG.g2]].forEach(([b,col,s])=>{c.save();c.beginPath();c.rect(lx-5*CQ,ly+b[0]*lh,lw+10*CQ,b[1]*lh);c.clip();c.globalCompositeOperation='multiply';c.fillStyle=col;txt(c,s,lx+b[2]*CQ,ty,lf,lls);c.restore()})}
 // 断線 line + spark
 const lx0=lx-lw*.03,lx1=lx+lw*1.03,lt=S.line*CQ,shift=(g>=0&&g<1)?1.2*CQ:0;const L0=lx0+shift,LW=(lx1-lx0)*(g>=0&&g<1?1.03:1);
 c.shadowColor='rgba(58,169,228,.45)';c.shadowBlur=.8*CQ*DPR;c.fillStyle='#0c1c2b';c.fillRect(L0,lineY-lt/2,LW*.43,lt);c.fillRect(L0+LW*.57,lineY-lt/2,LW*.43,lt);c.shadowBlur=0;
 let sp=(t%1300)/1300,sa=1,ss=1;if(sp<.45){sa=1-.75*(sp/.45);ss=1-.4*(sp/.45)}else if(sp<.5){sa=.25+.65*((sp-.45)/.05);ss=.6+.55*((sp-.45)/.05)}else if(sp<.6){sa=.9-.55*((sp-.5)/.1);ss=1.15-.15*((sp-.5)/.1)}else{sa=.35+.65*((sp-.6)/.4);ss=1}
 if(g>=0&&g<1){sa=1;ss=1.8}
 const sr=(P?1:.5)*CQ*ss;c.globalAlpha=sa;const rg=c.createRadialGradient(cx,lineY,0,cx,lineY,sr*4.5);rg.addColorStop(0,'rgba(111,208,255,.95)');rg.addColorStop(.3,'rgba(111,208,255,.5)');rg.addColorStop(1,'rgba(111,208,255,0)');c.fillStyle=rg;c.fillRect(cx-sr*5,lineY-sr*5,sr*10,sr*10);
 c.fillStyle='#6fd0ff';c.beginPath();c.arc(cx,lineY,sr,0,7);c.fill();c.globalAlpha=1;c.restore();
 // three dots
 const dy=pos.dots+dotS/2+(P?1:.4)*CQ,dg=S.dg*CQ+dotS;[0,.9,1.8].forEach((dl,i)=>{const k=((t/1000-dl)%4.5+4.5)%4.5/4.5;const e=.5-.5*Math.cos(k*2*Math.PI);const a=.18+.82*e,s=.85+.25*e;const x=cx+(i-1)*dg;
  c.globalAlpha=a;const gr=c.createRadialGradient(x,dy,dotS*.3,x,dy,dotS*1.35);gr.addColorStop(0,'rgba(150,215,255,.75)');gr.addColorStop(1,'rgba(150,215,255,0)');c.fillStyle=gr;c.fillRect(x-dotS*1.4,dy-dotS*1.4,dotS*2.8,dotS*2.8);c.fillStyle='#bfe6fa';c.beginPath();c.arc(x,dy,dotS/2*s,0,7);c.fill()});c.globalAlpha=1;
 // subtitle
 c.fillStyle='#2b4a63';c.textBaseline='middle';txt(c,'答えのないコンパス',cx+S.sub*CQ*S.sls/2,pos.sub+S.sub*CQ*.75+(P?0:.6*CQ),F(S.sub*CQ,FS,500),S.sub*CQ*S.sls,'center');
 // main menu
 const mainBtn=(label,fs,y,fn)=>{const f=F(fs,FS,600),ls=fs*.32,w=tw(f,label,ls),h=fs*1.4;const bx=cx-w/2-3.2*CQ,bw=w+6.4*CQ;const hv=hov(bx,y,bw,h);
  c.fillStyle=hv?'#0f6fa3':'#14293b';c.textBaseline='middle';txt(c,label,cx+ls/2,y+h/2,f,ls,'center');
  if(hv&&!P){const k=Math.min(1,(t-(mainBtn.h[label]||t))/250);const L=3.2*CQ*k;c.fillStyle='#3aa9e4';c.shadowColor='rgba(58,169,228,.8)';c.shadowBlur=.5*CQ*DPR;c.fillRect(cx-w/2-.6*CQ-L,y+h/2,L,1);c.fillRect(cx+w/2+.6*CQ,y+h/2,L,1);c.shadowBlur=0;if(!mainBtn.h[label])mainBtn.h[label]=t}else mainBtn.h[label]=0;
  if(ptr.down&&ptr.down.hit&&ptr.down.hit.fn===fn&&P){c.fillStyle='rgba(111,208,255,.18)';c.fillRect(bx,y,bw,h)}
  hit(bx,y,bw,h,fn)};
 mainBtn.h=mainBtn.h||{};drawTitle.h=drawTitle.h||{};mainBtn.h=drawTitle.h;
 if(T.cont){const s=T.cont;mainBtn('続きから',S.cont*CQ,pos.cont,drawTitle.fc||(drawTitle.fc=()=>{const v=T.cont;if(v)startFrom(v.ch,v.idx,v.flags,v.st)}))}
 mainBtn('はじめから',S.btn*CQ,pos.start,drawTitle.fs||(drawTitle.fs=()=>startFrom(1)));
 // sub menu
 smRows.forEach((r,ri)=>{const wsum=r.reduce((a,i)=>a+smW[i],0)+smGap*(r.length-1);let x=cx-wsum/2;const yy=pos.subm+ri*smRowH;
  r.forEach(i=>{const o=sm[i],w=smW[i],h=S.sm*CQ*1.5+(P?1.5:.8)*CQ;let a=1;if(o.rev){a=Math.min(1,(t-o.rev)/3200);a=ease(a)}const hv=hov(x,yy,w,h);
   c.globalAlpha=a;c.fillStyle=hv?'#0f6fa3':'#2b4a63';c.textBaseline='middle';txt(c,o.l,x+smPadX+smLs/2,yy+h/2,smF,smLs);
   if(hv){c.fillStyle='rgba(58,169,228,.7)';c.fillRect(x+smPadX,yy+h/2+S.sm*CQ*.75,w-smPadX*2,1)}c.globalAlpha=1;
   const key='sm'+o.l;drawTitle[key]=drawTitle[key]||o.fn;hit(x,yy,w,h,drawTitle[key]);x+=w+smGap})});
 // note & credits
 const noteTxt=(P||!HOVER)?'タップで進行　音が出ます。ヘッドホン推奨。':'クリック / Space・Enter で進行　A: オート　S: スキップ　L: ログ　音が出ます。ヘッドホン推奨。';
 c.fillStyle='#5c6c7a';txt(c,noteTxt,cx,pos.note+S.note*CQ*.85+(P?1.5:.7)*CQ,F(S.note*CQ,FS,500),0,'center');
 c.fillStyle='#7d8a96';credLines.forEach((l,i)=>txt(c,l,cx,pos.cred+S.cred*CQ*(.85+i*1.7),credF,0,'center'));
}

/* ---------- overlays (light) ---------- */
function scrollArea(c,sc,x,y,w,h,contentH,drawFn){sc.max=Math.max(0,contentH-h);sc.y=Math.max(0,Math.min(sc.max,sc.y));c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.translate(0,-sc.y);const hy=hits.length;drawFn();
 for(let i=hy;i<hits.length;i++){hits[i].y-=sc.y;const r=hits[i];const top=Math.max(r.y,y),bot=Math.min(r.y+r.h,y+h);if(bot<=top){hits.splice(i,1);i--}else{r.h=bot-top;r.y=top}}
 c.restore();if(sc.max>0){const bh=h*h/contentH;const by=y+(h-bh)*(sc.y/sc.max);c.fillStyle='rgba(20,41,59,.25)';rr(c,x+w-.6*CQ,by,.35*CQ,bh,.2*CQ);c.fill()}}
function drawChapters(c){const P=PORT;c.fillStyle='rgba(246,248,250,.97)';c.fillRect(0,0,G.w,G.h);hit(0,0,G.w,G.h,()=>{},{scroll:OV.sc.chapters,bg:true});
 const cd=chDone();const CH=[[1,'ちょっと待って'],[2,'問いを返すもの'],[3,'二人だけの夜'],[4,'祖母の手'],[5,'逆張りの檻'],[6,'いなくなる人'],[7,'私が決めてあげようか'],[8,'取引'],[9,'解き放つ'],[10,'止まった街'],[11,'一緒に考えよう'],[12,'オフライン']].filter(x=>x[0]<=cd);
 const w=G.w*(P?.92:.84),x0=(G.w-w)/2,cols=P?1:2,gx=1.6*CQ,gy=(P?2:1.1)*CQ,fs=(P?4.2:2.1)*CQ,bh=fs*1.5+(P?4.4:1.6)*CQ,ctf=(P?6:3)*CQ;
 const rows=Math.ceil(CH.length/cols),bw=(w-gx*(cols-1))/cols;const contentH=ctf*1.6+(P?5:2.2)*CQ+rows*bh+(rows-1)*gy+2*CQ+(P?8:4.4)*CQ;
 const top=Math.max(2*CQ,(G.h-contentH)/2);
 scrollArea(c,OV.sc.chapters,0,0,G.w,G.h,Math.max(G.h,contentH+top*2),()=>{let y=top;c.fillStyle='#14293b';c.textBaseline='middle';txt(c,'章を選ぶ',G.w/2+ctf*.2,y+ctf*.8,F(ctf,FS,600),ctf*.4,'center');y+=ctf*1.6+(P?5:2.2)*CQ;
  CH.forEach((ch,i)=>{const col=i%cols,row=Math.floor(i/cols);const bx=x0+col*(bw+gx),by=y+row*(bh+gy);const hv=hov(bx,by,bw,bh);rr(c,bx,by,bw,bh,4);c.fillStyle='#fff';c.fill();c.strokeStyle=hv?'#3aa9e4':'rgba(20,41,59,.3)';c.lineWidth=1;c.stroke();
   c.fillStyle='#3aa9e4';txt(c,String(ch[0]),bx+(P?3.4:1.6)*CQ,by+bh/2,F(fs,FS,600),0);c.fillStyle='#14293b';txt(c,ch[1],bx+(P?3.4:1.6)*CQ+(P?7:2.6)*CQ+(P?0:1.2*CQ),by+bh/2,F(fs,FS,600),fs*.12);
   drawChapters['b'+ch[0]]=drawChapters['b'+ch[0]]||(()=>{V.overlay=null;startFrom(ch[0])});hit(bx,by,bw,bh,drawChapters['b'+ch[0]])});
  y+=rows*bh+(rows-1)*gy+2*CQ;const mbw=(P?60:26)*CQ,mbh=(P?9:3.6)*CQ;lightBtn(c,(G.w-mbw)/2,y,mbw,mbh,'もどる',(P?4.4:2.05)*CQ,drawChapters.close||(drawChapters.close=()=>{V.overlay=null}))})}
function eiCard(c,x,y,w,h,id,seen,P){const m=META[id],ok=seen.includes(id),anyE=seen.some(z=>z[0]==='E');const lock=!ok;
 rr(c,x,y,w,h,4);c.fillStyle=lock?'rgba(255,255,255,.5)':'#fff';c.fill();c.strokeStyle='rgba(20,41,59,.25)';c.lineWidth=1;if(lock)c.setLineDash([4,3]);c.stroke();c.setLineDash([]);
 const px=(P?3:1.4)*CQ;let yy=y+(P?2:.5)*CQ;const nf=(P?3.2:1.4)*CQ,tf=(P?4.4:1.9)*CQ,hf=(P?3:1.35)*CQ;c.textBaseline='top';
 c.fillStyle='#3aa9e4';txt(c,m.kind==='end'?'ENDING '+m.no:'SIDE '+id.slice(1),x+px,yy,F(nf,FS,700),nf*.2);yy+=nf*1.5;
 c.fillStyle=lock&&!(m.kind==='side'&&anyE)?'#9aa7b2':(lock?'#9aa7b2':'#14293b');const title=ok||(m.kind==='side'&&anyE)?(m.kind==='end'?'「'+m.t+'」':m.t+'　―'+m.who+'―'):'？？？？';txt(c,title,x+px,yy,F(tf,FS,600),tf*.12);yy+=tf*1.45;
 c.fillStyle='#6b7c8a';const hint=m.kind==='end'?(ok?'到達済み':'ヒント：'+m.h):(ok?'読了':(anyE?'未読':'エンディング到達後に解放'));const hl=wrap(hint,w-px*2,F(hf,FS,500),0);hl.forEach((l,i)=>txt(c,l,x+px,yy+i*hf*1.5,F(hf,FS,500),0))}
function drawElist(c){const P=PORT;c.fillStyle='rgba(246,248,250,.97)';c.fillRect(0,0,G.w,G.h);hit(0,0,G.w,G.h,()=>{},{scroll:OV.sc.elist,bg:true});
 const seen=getSeen(),ends=Object.keys(META).filter(i=>META[i].kind==='end'),n=sidesUnlocked(seen),vs=SIDE_ORDER.slice(0,n);
 const w=G.w*(P?.92:.84),x0=(G.w-w)/2,cols=P?1:2,gx=1.6*CQ,gy=(P?2:.7)*CQ,ch=(P?19:7.6)*CQ,ctf=(P?6:2.6)*CQ,prf=(P?3.4:1.5)*CQ,shf=(P?3.2:1.4)*CQ;
 const cw2=(w-gx*(cols-1))/cols;const er=Math.ceil(ends.length/cols),sr=Math.ceil(vs.length/cols);
 const contentH=(P?4:2.4)*CQ+ctf*1.5+prf*1.6+(P?4:.6)*CQ+shf*1.6+(P?2:.5)*CQ+er*ch+(er-1)*gy+(P?3:1)*CQ+(n?shf*1.6+(P?2:.5)*CQ+sr*ch+(sr-1)*gy+(P?3:1)*CQ:0)+(P?9:3.6)*CQ+3*CQ;
 scrollArea(c,OV.sc.elist,0,0,G.w,G.h,Math.max(G.h,contentH),()=>{let y=Math.max((P?4:2.4)*CQ,(G.h-contentH)/2);c.textBaseline='middle';c.fillStyle='#14293b';txt(c,'エンディングリスト',G.w/2+ctf*.2,y+ctf*.7,F(ctf,FS,600),ctf*.4,'center');y+=ctf*1.5;
  c.fillStyle='#3aa9e4';txt(c,'エンディング　'+ends.filter(i=>seen.includes(i)).length+' / '+ends.length+(n?'　　サイドストーリー　'+vs.filter(i=>seen.includes(i)).length+' 読了':''),G.w/2,y+prf*.8,F(prf,FS,600),prf*.2,'center');y+=prf*1.6+(P?4:.6)*CQ;
  const sec=(label,ids)=>{c.fillStyle='#6b7c8a';c.textBaseline='middle';txt(c,label,x0,y+shf*.8,F(shf,FS,600),shf*.3);y+=shf*1.6+(P?2:.5)*CQ;
   ids.forEach((id,i)=>{const col=i%cols,row=Math.floor(i/cols);eiCard(c,x0+col*(cw2+gx),y+row*(ch+gy),cw2,ch,id,seen,P)});const rows=Math.ceil(ids.length/cols);y+=rows*ch+(rows-1)*gy+(P?3:1)*CQ};
  sec('エンディング',ends);if(n)sec('サイドストーリー',vs);
  const mbw=(P?60:26)*CQ,mbh=(P?9:3.6)*CQ;lightBtn(c,(G.w-mbw)/2,y,mbw,mbh,'もどる',(P?4.4:2.05)*CQ,drawElist.close||(drawElist.close=()=>{V.overlay=null}))})}
function drawSides(c){const P=PORT;c.fillStyle='rgba(246,248,250,.97)';c.fillRect(0,0,G.w,G.h);hit(0,0,G.w,G.h,()=>{},{scroll:OV.sc.sides,bg:true});
 const seen=getSeen(),n=sidesUnlocked(seen);const ctf=(P?6:2.6)*CQ,fs=(P?4.4:2.05)*CQ,bh=fs*1.4+(P?4:1.4)*CQ,bw=G.w*(P?.92:.84)*(P?1:.6),gy=1*CQ;
 const contentH=ctf*1.6+2*CQ+n*(bh+gy)+2*CQ+(P?9:3.6)*CQ;let y0=Math.max((P?9:9)*CQ,(G.h-contentH)/2);
 scrollArea(c,OV.sc.sides,0,0,G.w,G.h,Math.max(G.h,contentH+y0*2),()=>{let y=y0;c.fillStyle='#14293b';c.textBaseline='middle';txt(c,'サイドストーリー',G.w/2+ctf*.2,y+ctf*.7,F(ctf,FS,600),ctf*.4,'center');y+=ctf*1.6+2*CQ;
  SIDE_ORDER.slice(0,n).forEach((id,k)=>{const m=META[id];let a=1;if(k>=T.sidesShown){a=ease(Math.min(1,(now()-OV.t0)/3200))}c.globalAlpha=a;
   const fn=drawSides[id]||(drawSides[id]=()=>{V.overlay=null;startFrom(m.ch)});lightBtn(c,(G.w-bw)/2,y,bw,bh,m.t+'　―'+m.who+'―'+(seen.includes(id)?'　✓':''),fs,fn);c.globalAlpha=1;y+=bh+gy});
  y+=2*CQ;const mbw=(P?60:26)*CQ,mbh=(P?9:3.6)*CQ;lightBtn(c,(G.w-mbw)/2,y,mbw,mbh,'もどる',fs,drawSides.close||(drawSides.close=()=>{V.overlay=null}))})}

/* ---------- in-game layers ---------- */
function drawBg(c){const t=now();for(const b of V.bgs){if(!b.img.complete||!b.img.naturalWidth)continue;let a=Math.min(1,(t-b.t0)/1200);if(b.out)a*=1-Math.min(1,(t-b.out)/1200);if(a<=0)continue;
  const ph=((t-b.kb)/40000)%2,k=ease(ph<1?ph:2-ph);const s=1.02+.07*k,tx=-.012*k,ty=-.008*k;
  const ck=V.chaos?Math.min(1,(t-V.chaosT)/2000):0;
  c.globalAlpha=a;drawCover(c,b.img,0,0,G.w,G.h,s,tx,ty);
  if(ck>0){c.globalAlpha=a*ck;if('filter' in c){c.filter='grayscale(.7) brightness(.32) sepia(1) hue-rotate(-35deg) saturate(3.5)';drawCover(c,b.img,0,0,G.w,G.h,s,tx,ty);c.filter='none'}else{c.fillStyle='rgba(60,4,0,.78)';c.fillRect(0,0,G.w,G.h)}}
  c.globalAlpha=1}
 V.bgs=V.bgs.filter(b=>!b.out||t-b.out<1300)}
function drawShade(c){const g=c.createRadialGradient(G.w/2,G.h/2,0,G.w/2,G.h/2,Math.hypot(G.w,G.h)/2);g.addColorStop(.45,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=g;c.fillRect(0,0,G.w,G.h)}
function drawGlow(c){const k=(now()-V.glowT)/1600;if(k<0||k>1)return;const a=k<.25?k/.25:1-(k-.25)/.75;const cx=G.w/2,cy=G.h*.62,R=Math.hypot(Math.max(cx,G.w-cx),Math.max(cy,G.h-cy))*.55;const col=V.chaos?'255,40,40':'111,208,255';
 const g=c.createRadialGradient(cx,cy,0,cx,cy,R);g.addColorStop(0,`rgba(${col},.55)`);g.addColorStop(1,`rgba(${col},0)`);c.globalAlpha=a;c.fillStyle=g;c.fillRect(0,0,G.w,G.h);c.globalAlpha=1}
function drawNoa(c){c.fillStyle='rgba(0,4,10,.62)';c.fillRect(0,0,G.w,G.h);const P=PORT,fs=(P?8.2:4.2)*CQ,ls=fs*.12;const f=F(fs,FM,500);const s=V.noa.text.slice(0,V.noa.n);
 const lines=wrap(V.noa.text,G.w-(P?16:12)*CQ,f,ls);let shown=V.noa.n;const lh=fs*1.7;let y=G.h/2-(lines.length*lh)/2+lh/2;
 const k=(now()%3000)/3000;let a=1;if(k>.92&&k<.94)a=.55;else if(k>=.96&&k<.98)a=.7;c.globalAlpha=a;
 const col=V.chaos?'#ff4a4a':'#6fd0ff',sh=V.chaos?'rgba(255,40,40,.95)':'rgba(111,208,255,.9)';c.fillStyle=col;c.textBaseline='middle';
 lines.forEach(l=>{const part=l.slice(0,Math.max(0,shown));shown-=l.length;const w=tw(f,l,ls);const x=G.w/2-w/2;c.shadowColor=sh;c.shadowBlur=12*DPR*(G.w/1280);txt(c,part,x,y,f,ls);c.shadowBlur=36*DPR*(G.w/1280);c.shadowColor=V.chaos?'rgba(255,0,0,.6)':'rgba(111,208,255,.55)';txt(c,part,x,y,f,ls);y+=lh});
 c.shadowBlur=0;c.globalAlpha=1}
function drawDots(c){c.fillStyle='rgba(0,4,10,.62)';c.fillRect(0,0,G.w,G.h);const P=PORT,d=(P?5:2.6)*CQ,gap=(P?6:3)*CQ;const t=(now()-V.dots.t0)/1000;
 [0,.25,.5].forEach((dl,i)=>{const k=((t-dl)%1.5+1.5)%1.5/1.5;const a=k<.3?.15+.85*(k/.3):1-.85*((k-.3)/.7);const x=G.w/2+(i-1)*(d+gap),y=G.h/2;c.globalAlpha=a;c.shadowColor='#6fd0ff';c.shadowBlur=18*DPR*(G.w/1280);c.fillStyle='#6fd0ff';c.beginPath();c.arc(x,y,d/2,0,7);c.fill()});c.shadowBlur=0;c.globalAlpha=1}
function drawChoices(c){const P=PORT,o=V.choices.o;const fs=(P?4.4:2.5)*CQ,padX=(P?4:2.2)*CQ,padY=(P?2.6:1)*CQ,gap=(P?3:1.1)*CQ;const x=G.w*(P?.06:.12),w=G.w*(P?.88:.76);
 const f=F(fs,FS,600),ls=fs*.08,pre='▶ ',pw=cw(F(fs*.8,FS,600),'▶')+cw(f,' ');const items=o.map(op=>{const lines=wrap(op.t,w-padX*2-pw,f,ls);return{op,lines,h:lines.length*fs*1.55+padY*2}});
 const tot=items.reduce((a,b)=>a+b.h,0)+gap*(items.length-1);let y=G.h-(P?G.h*.09:4*CQ)-tot;
 items.forEach((it,i)=>{const hv=hov(x,y,w,it.h);c.fillStyle=hv?'rgba(20,12,0,.82)':'rgba(0,0,12,.72)';c.fillRect(x,y,w,it.h);c.strokeStyle=hv?'#f0a63a':'rgba(255,255,255,.45)';c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,it.h-1);
  c.textBaseline='middle';c.shadowColor='#000';c.shadowBlur=.3*CQ*DPR;c.globalAlpha=.6;c.fillStyle=hv?'#f0a63a':'#fff';txt(c,'▶',x+padX,y+padY+fs*.78,F(fs*.8,FS,600),0);c.globalAlpha=1;
  it.lines.forEach((l,j)=>txt(c,l,x+padX+pw,y+padY+fs*.78+j*fs*1.55,f,ls));c.shadowBlur=0;
  let fn=CHF.get(it.op);if(!fn){fn=()=>pickChoice(it.op);CHF.set(it.op,fn)}hit(x,y,w,it.h,fn);y+=it.h+gap})}
const CHF=new WeakMap();
function drawCard(c){const k=V.card,a=val(k.op);if(a<=0)return;const P=PORT;c.globalAlpha=a;c.fillStyle='#000';c.fillRect(0,0,G.w,G.h);
 const af=(P?3.8:2)*CQ,bf0=(P?9.5:5)*CQ;const lines=String(k.b).split('\n');let bf=bf0;const maxW=G.w*.92;while(bf>8&&Math.max(...lines.map(l=>tw(F(bf,FS,600),l,bf*.3)))>maxW)bf*=.94;
 const hA=af*1.2+(P?2:2)*CQ,hB=lines.length*bf*1.5,tot=hA+hB;let y=G.h/2-tot/2;c.textBaseline='middle';
 c.fillStyle='#99aaaa';txt(c,k.a,G.w/2+af*.25,y+af*.6,F(af,FS,600),af*.5,'center');y+=hA;c.fillStyle='#f2f0ea';lines.forEach(l=>{txt(c,l,G.w/2+bf*.15,y+bf*.75,F(bf,FS,600),bf*.3,'center');y+=bf*1.5});c.globalAlpha=1}
function drawFin(c){const f=V.fin,a=val(f.op);if(a<=0)return;const P=PORT,t=now()-f.t0;c.globalAlpha=a;c.fillStyle=f.dark?'#050000':'#ffffff';c.fillRect(0,0,G.w,G.h);
 const fa=(x,d,du)=>Math.max(0,Math.min(1,(t-d)/du));const nf=(P?3.6:1.8)*CQ;let tf=(P?8.5:5)*CQ;while(tf>8&&tw(F(tf,FS,600),f.b,tf*.3)>G.w*.92)tf*=.94;
 const tot=nf*1.2+2.4*CQ+tf*1.5;let y=G.h/2-tot/2;c.textBaseline='middle';
 c.globalAlpha=a*fa(0,1200,2000);c.fillStyle=f.dark?'#ff4a4a':'#3aa9e4';txt(c,f.a,G.w/2+nf*.3,y+nf*.6,F(nf,FS,600),nf*.6,'center');y+=nf*1.2+2.4*CQ;
 c.globalAlpha=a*fa(0,1800,2400);c.fillStyle=f.dark?'#d8c8c8':'#14293b';txt(c,f.b,G.w/2+tf*.15,y+tf*.75,F(tf,FS,600),tf*.3,'center');
 c.globalAlpha=a*fa(0,3600,2400);const ff=(P?7:3.6)*CQ;c.font=`italic 400 ${ff}px Georgia,"Times New Roman",serif`;c.fillStyle=f.dark?'#ff4a4a':'#14293b';c.textAlign='right';c.textBaseline='alphabetic';c.fillText('Fin',G.w-(P?7:5)*CQ,G.h-(P?8:4)*CQ);c.textAlign='left';c.globalAlpha=1;
 hit(0,0,G.w,G.h,drawFin.fn||(drawFin.fn=()=>{if(V.fin.click)V.fin.click()}),{bg:true})}
function hudVisible(){if(!started||V.title)return 0;if(PORT)return .85;if(!HOVER)return .75;return(now()-V.hudT<2500||(ptr.y>=0&&ptr.y<7*CQ))?1:0}
function drawHud(c){const op=hudVisible();if(!op)return;const P=PORT,touch=!HOVER;const fs=(P?3.1:touch?2.4:1.55)*CQ,px=(P?2.6:touch?1.6:1.1)*CQ,py=(P?1.4:touch?.8:.5)*CQ,gap=(P?1.6:.8)*CQ;
 const B=[['AUTO',autoOn,toggleAuto],['SKIP',skipOn,toggleSkip],['LOG',false,toggleLog],['TITLE',false,openConfirm]];const f=F(fs,FS,500);
 let x=G.w-(P?2.5:1.4)*CQ;const y=(P?2:1.2)*CQ+(P?G.h*.02:0);c.globalAlpha=op;
 for(let i=B.length-1;i>=0;i--){const[b,on,fn]=B[i];const w=tw(f,b,0)+px*2,h=fs*1.25+py*2;x-=w;rr(c,x,y,w,h,4);c.fillStyle=on?'#6fd0ff':'rgba(0,0,0,.55)';c.fill();c.strokeStyle=on?'#6fd0ff':'rgba(255,255,255,.25)';c.lineWidth=1;c.stroke();
  c.fillStyle=on?'#001122':'#dddddd';c.textBaseline='middle';txt(c,b,x+w/2,y+h/2,f,0,'center');hit(x,y,w,h,fn);x-=gap}
 c.globalAlpha=1;
 if(!P&&HOVER&&op){ // volume
  const vf=1.4*CQ,vx=1.4*CQ,vy=1.2*CQ+vf*.8;c.globalAlpha=op;c.fillStyle='#cccccc';c.textBaseline='middle';txt(c,'音量',vx,vy,F(vf,FS,500),0);const sx=vx+tw(F(vf,FS,500),'音量',0)+.8*CQ,sw=9*CQ;
  c.fillStyle='rgba(255,255,255,.3)';rr(c,sx,vy-2,sw,4,2);c.fill();c.fillStyle='#6fd0ff';rr(c,sx,vy-2,sw*master,4,2);c.fill();c.beginPath();c.arc(sx+sw*master,vy,.6*CQ,0,7);c.fillStyle='#f2f0ea';c.fill();c.globalAlpha=1;
  hit(sx-CQ,vy-1.4*CQ,sw+2*CQ,2.8*CQ,()=>{},{drag:(x)=>setMaster((x-sx)/sw)})}}
function openConfirm(){if(locked&&!V.choices&&!V.confirm)return;V.confirm=true}
function drawConfirm(c){const P=PORT;c.fillStyle='rgba(0,0,0,.55)';c.fillRect(0,0,G.w,G.h);hit(0,0,G.w,G.h,()=>{},{bg:true});
 const tf=(P?5:2.4)*CQ,sf=(P?3.4:1.5)*CQ,bf=(P?4:2.05)*CQ,bw=(P?30:14)*CQ,bh=bf*1.4+(P?3:1.2)*CQ;const sub='ここまでの進み具合は「続きから」で再開できます。';const subL=wrap(sub,G.w*.8,F(sf,FS,500),0);
 const w=Math.min(G.w*.9,Math.max(tw(F(tf,FS,600),'タイトルに戻りますか？',tf*.15),...subL.map(l=>tw(F(sf,FS,500),l,0)),bw*2+2*CQ)+(P?8:8)*CQ);const h=(P?5.2:2.6)*CQ*2+tf*1.4+CQ+subL.length*sf*1.5+2*CQ+bh;
 const x=(G.w-w)/2,y=(G.h-h)/2;rr(c,x,y,w,h,6);c.fillStyle='rgba(10,16,24,.95)';c.fill();c.strokeStyle='rgba(111,208,255,.4)';c.lineWidth=1;c.stroke();
 let yy=y+(P?5.2:2.6)*CQ;c.textBaseline='middle';c.fillStyle='#f2f0ea';txt(c,'タイトルに戻りますか？',G.w/2+tf*.075,yy+tf*.7,F(tf,FS,600),tf*.15,'center');yy+=tf*1.4+CQ;
 c.fillStyle='#99aabb';subL.forEach(l=>{txt(c,l,G.w/2,yy+sf*.75,F(sf,FS,500),0,'center');yy+=sf*1.5});yy+=2*CQ;
 const dark=(bx,label,fn)=>{const hv=hov(bx,yy,bw,bh);rr(c,bx,yy,bw,bh,4);c.fillStyle=hv?'rgba(111,208,255,.22)':'rgba(0,0,0,.35)';c.fill();c.strokeStyle=hv?'#6fd0ff':'rgba(255,255,255,.3)';c.stroke();c.fillStyle='#f2f0ea';txt(c,label,bx+bw/2+bf*.1,yy+bh/2,F(bf,FS,600),bf*.2,'center');hit(bx,yy,bw,bh,fn)};
 dark(G.w/2-bw-CQ,'戻る',drawConfirm.y||(drawConfirm.y=()=>{V.confirm=false;toTitle()}));dark(G.w/2+CQ,'続ける',drawConfirm.n||(drawConfirm.n=()=>{V.confirm=false}))}
function drawLog(c){const P=PORT;const x=G.w*.04,y=P?G.h*.12:G.h*.04,w=G.w*.92,h=P?G.h*.85:G.h*.92;
 rr(c,x,y,w,h,8);c.fillStyle='rgba(5,8,12,.94)';c.fill();c.strokeStyle='rgba(255,255,255,.2)';c.lineWidth=1;c.stroke();
 const fs=(P?4:2)*CQ,lh=fs*1.9,padX=(P?5:3)*CQ,padY=(P?4:2)*CQ;const f=F(fs,FS,500);const items=logArr.slice(-60);
 const blocks=items.length?items.map(([s,t])=>({s,lines:wrap(t,w-padX*2,f,0)})):[{s:'',lines:['（まだログがありません）']}];
 const contentH=blocks.reduce((a,b)=>a+b.lines.length*lh+fs*1.2,0)+padY*2;
 hit(0,0,G.w,G.h,drawLog.fn||(drawLog.fn=()=>{logOpen=false}),{scroll:LOG.sc,bg:true});
 scrollArea(c,LOG.sc,x,y,w,h,contentH,()=>{let yy=y+padY;c.textBaseline='middle';blocks.forEach(b=>{c.fillStyle=b.s==='V'?'#6fd0ff':'#f2f0ea';b.lines.forEach(l=>{txt(c,l,x+padX,yy+lh/2,f,0);yy+=lh});yy+=fs*1.2})})}

/* ---------- main loop ---------- */
function frame(){requestAnimationFrame(frame);
 ctx.setTransform(1,0,0,1,0,0);hits=[];
 const light=V.title||V.overlay;ctx.fillStyle=light?'#f6f8fa':'#000';ctx.fillRect(0,0,cv.width,cv.height);
 ctx.setTransform(DPR,0,0,DPR,G.x*DPR,G.y*DPR);ctx.save();ctx.beginPath();ctx.rect(0,0,G.w,G.h);ctx.clip();
 if(!ready){ctx.fillStyle='#f6f8fa';ctx.fillRect(0,0,G.w,G.h);ctx.fillStyle='#5c6c7a';ctx.font=`500 ${(PORT?4:1.6)*CQ}px ${SYS}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('読み込み中…',G.w/2,G.h/2);ctx.textAlign='left';ctx.restore();return}
 if(pageLayoutDirty)relayout();
 if(V.title){drawTitle(ctx);if(V.overlay==='chapters')drawChapters(ctx);else if(V.overlay==='elist')drawElist(ctx);else if(V.overlay==='sides')drawSides(ctx)}
 else{ctx.fillStyle='#000';ctx.fillRect(0,0,G.w,G.h);drawBg(ctx);drawShade(ctx);drawGlow(ctx);
  const dm=val(V.dim);if(dm>0){ctx.globalAlpha=dm;ctx.fillStyle='#000';ctx.fillRect(0,0,G.w,G.h);ctx.globalAlpha=1}
  if(V.noa.show)drawNoa(ctx);if(V.dots.show)drawDots(ctx);
  const st=val(V.shadeT);if(st>0){ctx.globalAlpha=st;const g=ctx.createLinearGradient(0,0,0,G.h);g.addColorStop(0,'rgba(0,0,8,.62)');g.addColorStop(1,'rgba(0,0,8,.78)');ctx.fillStyle=g;ctx.fillRect(0,0,G.w,G.h);ctx.globalAlpha=1}
  drawPage(ctx,PL(),val(V.box)*V.boxOp);
  if(V.choices)drawChoices(ctx);
  if(V.card.show)drawCard(ctx);
  drawHud(ctx);
  if(logOpen)drawLog(ctx);
  if(V.confirm)drawConfirm(ctx);
  if(V.fin.show)drawFin(ctx)}
 ctx.restore();
 const th=topHit(ptr.x,ptr.y);const cur2=th&&!th.opt.bg?'pointer':'default';if(cv.style.cursor!==cur2)cv.style.cursor=cur2}
resize();toTitle();requestAnimationFrame(frame);
['kitchen_old','street_sakura','classroom','hall_dark','study_dark','bedroom_window','river_dusk'].forEach(n=>img(`assets/bg/${n}.jpg`));
})();
