(function(){
const T=THREE,rnd=(a,b)=>Math.random()*(b-a)+a,V=(x,y,z)=>new T.Vector3(x,y,z),UP=V(0,1,0);
const scene=new T.Scene();
const cam=new T.PerspectiveCamera(34,innerWidth/innerHeight,.1,500);cam.position.set(25,11,27);
const ren=new T.WebGLRenderer({antialias:true,alpha:true});
ren.setPixelRatio(Math.min(devicePixelRatio,2));ren.setSize(innerWidth,innerHeight);
ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;
ren.domElement.setAttribute('aria-label','Modelo 3D del satélite NISAR');
document.body.appendChild(ren.domElement);
const ctl=new T.OrbitControls(cam,ren.domElement);
ctl.target.set(0,4,0);ctl.enableDamping=true;ctl.minDistance=10;ctl.maxDistance=70;
ctl.autoRotate=!matchMedia('(prefers-reduced-motion: reduce)').matches;ctl.autoRotateSpeed=.9;

scene.add(new T.HemisphereLight(0xbfd0ff,0x1a1c24,.65));
const key=new T.DirectionalLight(0xfff3dc,1.9);key.position.set(25,30,18);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:100});key.shadow.bias=-.0006;scene.add(key);
const rim=new T.DirectionalLight(0x7f9cff,.8);rim.position.set(-22,8,-20);scene.add(rim);
const fill=new T.DirectionalLight(0xffffff,.35);fill.position.set(-10,-12,15);scene.add(fill);

function tex(w,h,fn,rep){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);
const t=new T.CanvasTexture(c);t.anisotropy=8;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}return t;}
const grid=(x,w,h,s,col)=>{x.strokeStyle=col;x.lineWidth=1;for(let i=0;i<=w;i+=s){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();}for(let j=0;j<=h;j+=s){x.beginPath();x.moveTo(0,j);x.lineTo(w,j);x.stroke();}};
const foilT=tex(256,256,(x,w,h)=>{x.fillStyle='#c9962b';x.fillRect(0,0,w,h);
for(let i=0;i<1100;i++){const a=rnd(0,w),b=rnd(0,h);x.strokeStyle=Math.random()<.5?`rgba(255,235,170,${rnd(.04,.16)})`:`rgba(70,40,0,${rnd(.05,.2)})`;x.lineWidth=rnd(1,4);x.beginPath();x.moveTo(a,b);x.lineTo(a+rnd(-40,40),b+rnd(-40,40));x.stroke();}},[2,2]);
const meshT=tex(512,512,(x,w,h)=>{x.fillStyle='#ecc43c';x.fillRect(0,0,w,h);grid(x,w,h,8,'rgba(120,85,0,.55)');
x.strokeStyle='rgba(255,245,190,.25)';for(let i=-h;i<=w;i+=16){x.beginPath();x.moveTo(i,0);x.lineTo(i+h,h);x.stroke();}},[10,5]);
const feedT=tex(256,128,(x,w,h)=>{x.fillStyle='#14171d';x.fillRect(0,0,w,h);grid(x,w,h,16,'rgba(190,200,220,.45)');
x.fillStyle='rgba(220,230,255,.5)';for(let i=8;i<w;i+=16)for(let j=8;j<h;j+=16)x.fillRect(i-2,j-2,4,4);});
const cellT=tex(256,256,(x,w,h)=>{x.fillStyle='#0b1632';x.fillRect(0,0,w,h);
for(let i=0;i<8;i++)for(let j=0;j<8;j++){const g=rnd(0,18)|0;x.fillStyle=`rgb(${20+g},${38+g*1.5},${92+g*2})`;x.fillRect(i*32+2,j*32+2,28,28);
x.strokeStyle='rgba(200,210,230,.35)';x.beginPath();x.moveTo(i*32+10,j*32+2);x.lineTo(i*32+10,j*32+30);x.moveTo(i*32+22,j*32+2);x.lineTo(i*32+22,j*32+30);x.stroke();}});
const M=o=>new T.MeshStandardMaterial(o);
const foil=M({map:foilT,bumpMap:foilT,bumpScale:2,metalness:.3,roughness:.5});
const grey=M({color:0xaeb4bf,metalness:.4,roughness:.5});
const graph=M({color:0x2b2f36,metalness:.3,roughness:.55});
const white=M({color:0xeeeeee,metalness:.1,roughness:.6});
const black=M({color:0x111317,metalness:.3,roughness:.5});
const solar=M({map:cellT,metalness:.55,roughness:.25});
const sat=new T.Group();scene.add(sat);

function beam(a,b,r,m,seg){const d=b.clone().sub(a),L=d.length(),o=new T.Mesh(new T.CylinderGeometry(r,r,L,seg||6),m);
o.position.copy(a).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(UP,d.normalize());return o;}
function box(w,h,d,m,x,y,z,p){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);(p||sat).add(o);return o;}

// ---- Reflector de antena de 12 m ----
const dish=new T.Group();dish.position.set(.8,8,0);sat.add(dish);
const R=6,h=1.1,N=36,dep=.65;
const P=(i,y)=>{const a=i/N*Math.PI*2;return V(R*Math.cos(a),y,R*Math.sin(a));};
[h/2,-h/2].forEach(y=>{const t=new T.Mesh(new T.TorusGeometry(R,.07,8,128),grey);t.rotation.x=Math.PI/2;t.position.y=y;dish.add(t);});
for(let i=0;i<N;i++){dish.add(beam(P(i,-h/2),P(i,h/2),.045,graph));dish.add(beam(P(i,-h/2),P(i+1,h/2),.03,graph,4));dish.add(beam(P(i,h/2),P(i+1,-h/2),.03,graph,4));}
const prof=[];for(let k=0;k<=30;k++){const r=R*k/30;prof.push(new T.Vector2(r,dep*(1-(r/R)**2)));}
const surf=new T.Mesh(new T.LatheGeometry(prof,128),M({map:meshT,emissive:0x3a2a00,metalness:.25,roughness:.55,side:T.DoubleSide}));
surf.position.y=-h/2;dish.add(surf);
{const pts=[],yy=r=>-h/2+dep*(1-(r/R)**2)+.012;
for(let s=0;s<24;s++){const a=s/24*Math.PI*2;for(let j=0;j<20;j++){const r1=R*j/20,r2=R*(j+1)/20;pts.push(V(r1*Math.cos(a),yy(r1),r1*Math.sin(a)),V(r2*Math.cos(a),yy(r2),r2*Math.sin(a)));}}
[.33,.66,.95].forEach(f=>{const r=R*f;for(let s=0;s<96;s++){const a=s/96*6.2832,b=(s+1)/96*6.2832;pts.push(V(r*Math.cos(a),yy(r),r*Math.sin(a)),V(r*Math.cos(b),yy(r),r*Math.sin(b)));}});
dish.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0x7a5a00})));}
[0,12,24].forEach(i=>dish.add(beam(P(i,-h/2),V(0,-h/2-1.5,0),.06,graph)));
{const hub=new T.Mesh(new T.CylinderGeometry(.3,.4,.5,20),grey);hub.position.y=-h/2-1.5;dish.add(hub);}

// ---- Pluma de antena (celosía) ----
function truss(a,b,w,n){const d=b.clone().sub(a).normalize(),u=new T.Vector3().crossVectors(d,V(0,0,1)).normalize(),v=new T.Vector3().crossVectors(d,u).normalize();
const c=[[1,1],[-1,1],[-1,-1],[1,-1]];
const pt=(i,k)=>a.clone().lerp(b,i/n).addScaledVector(u,c[k%4][0]*w).addScaledVector(v,c[k%4][1]*w);
for(let i=0;i<=n;i++)for(let k=0;k<4;k++){if(i<n){sat.add(beam(pt(i,k),pt(i+1,k),.035,graph,5));sat.add(beam(pt(i,k),pt(i+1,k+1),.02,grey,4));}sat.add(beam(pt(i,k),pt(i,k+1),.025,graph,4));}}
truss(V(0,1.3,0),V(.8,5.95,0),.16,14);
[V(0,1.3,0),V(.8,5.95,0)].forEach(p=>{const c=new T.Mesh(new T.CylinderGeometry(.26,.3,.3,16),grey);c.position.copy(p);sat.add(c);});

// ---- Bus I3K ----
box(2.6,1.8,2.2,foil,0,.2,0);box(2.3,.14,1.9,grey,0,1.17,0);
[1.31,-1.31].forEach(x=>{box(.05,1.3,1.6,white,x,.2,0);for(let i=-3;i<=3;i++)box(.06,1.3,.02,grey,x+Math.sign(x)*.01,.2,i*.22);});
[-.6,.6].forEach(z=>{const s=new T.Mesh(new T.CylinderGeometry(.22,.12,.5,16),black);s.position.set(.5,1.5,z);sat.add(s);
const f=new T.Mesh(new T.CylinderGeometry(.26,.26,.05,16),grey);f.position.set(.5,1.78,z);sat.add(f);});
{const a=new T.Mesh(new T.SphereGeometry(.3,20,10,0,6.283,0,1.2),M({color:0xf2f2f2,metalness:.3,roughness:.4,side:T.DoubleSide}));a.position.set(-.7,1.45,0);a.rotation.z=.3;sat.add(a);
sat.add(beam(V(-.7,1.24,0),V(-.7,1.5,0),.04,grey));}
[[.9,.8],[.9,-.8],[-.9,.8],[-.9,-.8]].forEach(([x,z])=>{const n=new T.Mesh(new T.ConeGeometry(.13,.32,12,1,true),M({color:0x3a3d44,metalness:.6,roughness:.4,side:T.DoubleSide}));n.rotation.x=Math.PI;n.position.set(x,-.84,z);sat.add(n);});

// ---- Estructura del instrumento radar y electrónica ----
const inst=new T.Group();inst.position.set(1.6,-2.1,0);inst.rotation.z=-.2;sat.add(inst);
box(6,1.1,1.7,foil,0,0,0,inst);
box(4.6,.08,1.4,M({map:feedT,metalness:.4,roughness:.35}),-.3,.6,0,inst);
[.88,-.88].forEach(z=>{box(5,.8,.05,white,0,0,z,inst);for(let i=-11;i<=11;i++)box(.025,.8,.03,grey,i*.2,0,z+Math.sign(z)*.03,inst);});
[-2.2,-.6,1.0,2.2].forEach((x,i)=>{box(.7,.4,1.1,i%2?grey:foil,x,-.75,0,inst);box(.5,.12,.9,black,x,-1,0,inst);});
[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([a,b])=>inst.add(beam(V(-3,a*.56,b*.86),V(3,a*.56,b*.86),.05,graph)));
[3.1,-3.1].forEach(x=>box(.2,1.25,1.85,black,x,0,0,inst));
[[-.9,.7],[-.9,-.7],[.9,.7],[.9,-.7]].forEach(([x,z])=>{const y1=-2.1-(x-1.6)*.2+.55;sat.add(beam(V(x,-.7,z),V(x,y1,z),.06,graph));});

// ---- Alas solares ----
const frame=M({color:0x9aa0ab,metalness:.5,roughness:.45}),back=M({color:0xd8dbe2,metalness:.2,roughness:.6});
[1,-1].forEach(s=>{
 sat.add(beam(V(0,.2,s*1.1),V(0,.2,s*2.0),.07,grey));sat.add(beam(V(.15,.2,s*1.1),V(.15,.2,s*2.0),.04,grey));
 for(let i=0;i<3;i++){const zc=s*(3.2+i*2.5);
  const p=new T.Mesh(new T.BoxGeometry(2.8,.07,2.3),[frame,frame,solar,back,frame,frame]);p.position.set(0,.2,zc);sat.add(p);
  box(2.9,.05,2.4,frame,0,.17,zc);
  if(i<2){const hg=new T.Mesh(new T.CylinderGeometry(.06,.06,2.6,10),grey);hg.rotation.z=Math.PI/2;hg.position.set(0,.2,s*(4.45+i*2.5));sat.add(hg);}}
 const hg0=new T.Mesh(new T.CylinderGeometry(.07,.07,1.2,10),grey);hg0.rotation.z=Math.PI/2;hg0.position.set(0,.2,s*2.0);sat.add(hg0);
});
sat.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});

addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();ren.setSize(innerWidth,innerHeight);});
const mk=(p,x,y,z)=>{const o=new T.Object3D();o.position.set(x,y,z);p.add(o);return o;};
const labs=[
 ['Reflector de antena radar','Malla metálica de 12 metros de diámetro que transmite y recibe señales radar hacia y desde la superficie terrestre.',mk(dish,R*Math.cos(2.3),h/2,R*Math.sin(2.3))],
 ['Pluma de antena radar','Brazo desplegable de aproximadamente 9 metros que sostiene el reflector y mantiene su posición respecto al satélite.',mk(sat,.4,3.6,0)],
 ['Bus I3K','Plataforma principal que integra los sistemas de energía, navegación, propulsión, control y comunicaciones del satélite.',mk(sat,-1.3,.2,0)],
 ['Paneles solares','Dos conjuntos fotovoltaicos desplegables que generan aproximadamente 5 kW de energía eléctrica para alimentar los sistemas del satélite.',mk(sat,0,.25,5.7)],
 ['Estructura del instrumento radar y electrónica','Estructura que integra y soporta los sistemas electrónicos de los radares SAR de banda L y banda S.',mk(inst,3.1,-.3,.8)]
].map(([title,description,o])=>{
 const d=document.createElement('div');d.className='lab';d.setAttribute('role','group');d.setAttribute('aria-label',`${title}. ${description}`);
 const heading=document.createElement('span');heading.className='lab-title';heading.textContent=title;
 const detail=document.createElement('span');detail.className='lab-description';detail.textContent=description;
 d.append(heading,detail);document.body.appendChild(d);return{d,o};
});
const hint=document.createElement('div');hint.className='model-hint';hint.textContent='Pasa el cursor sobre una etiqueta para ver su descripción';document.body.appendChild(hint);
const wp=V(0,0,0);
(function loop(){requestAnimationFrame(loop);ctl.update();ren.render(scene,cam);
labs.forEach(l=>{l.o.getWorldPosition(wp);wp.project(cam);l.d.style.visibility=wp.z>1?'hidden':'visible';l.d.style.transform=`translate(${(wp.x*.5+.5)*innerWidth+16}px,${(-wp.y*.5+.5)*innerHeight}px) translateY(-50%)`;});})();
})();
