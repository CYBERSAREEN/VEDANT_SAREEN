/* ══════════════════════════════════════════════════════════════
   VEDANT SAREEN — Portfolio JS (Fixed)
   GSAP + ScrollTrigger + Custom Cursor
   ══════════════════════════════════════════════════════════════ */

/* ── REGISTER GSAP PLUGINS ── */
gsap.registerPlugin(ScrollTrigger);

/* ── PRELOADER ── */
(function(){
  const fill=document.getElementById('lbf'),pct=document.getElementById('lpct'),msg=document.getElementById('lmsg'),nm=document.getElementById('ln'),rl=document.getElementById('lrole');
  const msgs=['ESTABLISHING SECURE CHANNEL...','LOADING THREAT MATRIX...','DECRYPTING PAYLOAD...','BYPASSING FIREWALL...','ACCESS GRANTED ✓'];
  let p=0,mi=0;
  setTimeout(()=>{nm.style.transition='opacity .5s,transform .5s';nm.style.opacity='1';nm.style.transform='translateY(0)'},200);
  setTimeout(()=>{rl.style.transition='opacity .4s';rl.style.opacity='1'},500);
  const iv=setInterval(()=>{
    p+=Math.random()*8+3;if(p>100)p=100;
    fill.style.width=p+'%';pct.textContent=Math.floor(p)+'%';
    if(p>18&&mi===0){mi=1;msg.textContent=msgs[1]}
    if(p>42&&mi===1){mi=2;msg.textContent=msgs[2]}
    if(p>68&&mi===2){mi=3;msg.textContent=msgs[3]}
    if(p>=100){
      clearInterval(iv);msg.textContent=msgs[4];
      setTimeout(()=>{
        const ldr=document.getElementById('ldr');
        gsap.to(ldr,{opacity:0,duration:.6,onComplete:()=>{ldr.style.display='none';initAll()}});
      },350);
    }
  },45);
})();

/* ── PARTICLE CANVAS ── */
(function(){
  const c=document.getElementById('bg'),ctx=c.getContext('2d');
  let W,H,pts=[];
  const resize=()=>{W=c.width=innerWidth;H=c.height=innerHeight};
  resize();addEventListener('resize',resize);
  const N=innerWidth<768?50:120;
  const COLS=['rgba(0,229,255,','rgba(124,58,255,','rgba(0,255,163,'];
  function P(){
    this.reset=()=>{this.x=Math.random()*W;this.y=Math.random()*H;this.r=Math.random()*1.3+.2;this.vx=(Math.random()-.5)*.16;this.vy=(Math.random()-.5)*.16;this.a=Math.random()*.6;this.c=COLS[Math.floor(Math.random()*3)]};
    this.draw=()=>{ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,6.28);ctx.fillStyle=this.c+this.a+')';ctx.fill()};
    this.reset();
  }
  for(let i=0;i<N;i++)pts.push(new P());
  function frame(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W||p.y<0||p.y>H)p.reset();p.draw()});
    if(innerWidth>768){
      for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=dx*dx+dy*dy;
        if(d<6400){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle='rgba(0,229,255,'+(0.02*(1-d/6400))+')';ctx.lineWidth=.4;ctx.stroke()}
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ── CUSTOM CURSOR (GSAP-enhanced) ── */
const cur=document.getElementById('cur'),curR=document.getElementById('cur-r');
if(matchMedia('(hover:hover)').matches){
  let mx=innerWidth/2,my=innerHeight/2;
  addEventListener('mousemove',e=>{
    mx=e.clientX;my=e.clientY;
    gsap.set(cur,{left:mx,top:my});
    gsap.to(curR,{left:mx,top:my,duration:.15,ease:'power2.out'});
  });
  const hoverTargets='a,button,.magnetic,.pc,.sk-card,.ac,.rc,.cert,.music-card,.music-role,.music-stat,.resume-card';
  document.querySelectorAll(hoverTargets).forEach(el=>{
    el.addEventListener('mouseenter',()=>document.body.classList.add('hov'));
    el.addEventListener('mouseleave',()=>document.body.classList.remove('hov'));
  });
}else{document.body.classList.add('no-cursor')}

/* ── NAV SCROLL HIGHLIGHT ── */
addEventListener('scroll',()=>{
  document.getElementById('nav').classList.toggle('stuck',scrollY>50);
  ['about','skills','projects','research','achievements','resume','contact'].forEach(id=>{
    const s=document.getElementById(id);if(!s)return;
    const a=document.querySelector('.nav-links a[href="#'+id+'"]');
    if(a)a.classList.toggle('act',scrollY>=s.offsetTop-140&&scrollY<s.offsetTop+s.offsetHeight-140);
  });
},{passive:true});

/* ── MOBILE MENU ── */
document.getElementById('ham').addEventListener('click',()=>document.getElementById('mob').classList.add('open'));
document.getElementById('mobx').addEventListener('click',()=>document.getElementById('mob').classList.remove('open'));
function closeMob(){document.getElementById('mob').classList.remove('open')}

/* ══════════════════════════════════════════════════════════════
   MAIN INITIALIZATION (after preloader)
   ══════════════════════════════════════════════════════════════ */
function initAll(){
  heroAnimation();
  initScrollReveals();
  initSkillBars();
  initProjectTilt();
  initMagneticButtons();
  initGlitch();
  initMusicOverlay();
}

/* ── HERO ANIMATION (GSAP Timeline) ── */
function heroAnimation(){
  const tl=gsap.timeline({defaults:{ease:'power3.out'}});
  tl.to('.h-status',{opacity:1,duration:.5},0)
    .to('.h-name',{opacity:1,y:0,duration:.8},.1)
    .to('.h-role',{opacity:1,duration:.5},.3)
    .to('.h-desc',{opacity:1,duration:.5},.4)
    .to('.h-btns',{opacity:1,duration:.5},.5)
    .to('.h-stats',{opacity:1,duration:.5},.6)
    .to('.term',{opacity:1,x:0,duration:.7,ease:'power2.out'},.25)
    .to('#sc',{opacity:1,duration:.5},.8);

  setTimeout(typeInit,400);
  setTimeout(countUp,700);
}

/* ── TYPEWRITER ── */
const ROLES=['PENETRATION TESTER','AI SECURITY ENGINEER','PYTHON TOOL BUILDER','SECURITY RESEARCHER','ETHICAL HACKER','CEH PRACTITIONER','MUSICIAN & MENTOR'];
let ri=0,ci=0,del=false;
function typeInit(){tick()}
function tick(){
  const el=document.getElementById('typed'),w=ROLES[ri];
  if(!del){el.textContent=w.slice(0,++ci);if(ci===w.length){del=true;setTimeout(tick,1800);return}}
  else{el.textContent=w.slice(0,--ci);if(ci===0){del=false;ri=(ri+1)%ROLES.length}}
  setTimeout(tick,del?38:80);
}

/* ── COUNTERS (GSAP) ── */
function countUp(){
  document.querySelectorAll('[data-n]').forEach(el=>{
    const t=+el.dataset.n;
    const suffix=el.dataset.suffix||'';
    const obj={val:0};
    gsap.to(obj,{val:t,duration:1.5,ease:'power2.out',onUpdate:function(){
      el.textContent=Math.floor(obj.val)+suffix;
    }});
  });
}

/* ══════════════════════════════════════════════════════════════
   SCROLL REVEALS — Single unified system
   Uses gsap.set() to clear CSS initial states, then gsap.to()
   to animate in. This avoids the gsap.from() + CSS opacity:0
   race condition entirely.
   ══════════════════════════════════════════════════════════════ */
function initScrollReveals(){
  /*
   * STRATEGY: Each element with .rv / .rv-l / .rv-r / .rv-s
   * starts hidden via CSS (opacity:0, transform).
   * We use ScrollTrigger to animate TO the visible state.
   * For grouped elements (project cards, skill cards, etc.)
   * we skip individual .rv animation and use batch stagger instead.
   */

  // — Section headers, dividers, and standalone .rv elements —
  // (NOT inside grids that have their own batch animation)
  document.querySelectorAll('section').forEach(sec=>{
    const rvEls=sec.querySelectorAll('.rv,.rv-l,.rv-r,.rv-s');
    rvEls.forEach((el,i)=>{
      // Skip elements inside grids that have batch animation
      if(el.closest('.proj-grid')||el.closest('.sk-grid')||el.closest('.ach-cards')||el.closest('.res-grid')||el.closest('.resume-grid'))return;

      ScrollTrigger.create({
        trigger:el,
        start:'top 90%',
        once:true,
        onEnter:()=>{
          gsap.to(el,{
            opacity:1,
            x:0,y:0,
            scale:1,
            duration:.7,
            delay:i*0.04,
            ease:'power3.out',
            clearProps:'transform'
          });
        }
      });
    });
  });

  // — Section headings clip-in —
  gsap.utils.toArray('.sec-h').forEach(h=>{
    gsap.fromTo(h,
      {clipPath:'inset(0 100% 0 0)'},
      {clipPath:'inset(0 0% 0 0)',duration:1,ease:'power3.inOut',
       scrollTrigger:{trigger:h,start:'top 85%',once:true}}
    );
  });

  // — Section dividers scale-in —
  gsap.utils.toArray('.sec-div').forEach(d=>{
    gsap.fromTo(d,
      {scaleX:0},
      {scaleX:1,transformOrigin:'left center',duration:.8,ease:'power2.out',
       scrollTrigger:{trigger:d,start:'top 88%',once:true}}
    );
  });

  // — PROJECT CARDS: batch stagger —
  document.querySelectorAll('.proj-grid').forEach(grid=>{
    const cards=grid.querySelectorAll('.pc');
    // Set initial state explicitly
    gsap.set(cards,{opacity:0,y:50});
    ScrollTrigger.create({
      trigger:grid,
      start:'top 82%',
      once:true,
      onEnter:()=>{
        gsap.to(cards,{opacity:1,y:0,duration:.6,stagger:.1,ease:'power3.out',clearProps:'transform'});
      }
    });
  });

  // — SKILL CARDS: batch stagger —
  document.querySelectorAll('.sk-grid').forEach(grid=>{
    const cards=grid.querySelectorAll('.sk-card');
    gsap.set(cards,{opacity:0,y:30});
    ScrollTrigger.create({
      trigger:grid,
      start:'top 82%',
      once:true,
      onEnter:()=>{
        gsap.to(cards,{opacity:1,y:0,duration:.5,stagger:.07,ease:'power3.out',clearProps:'transform'});
      }
    });
  });

  // — ACHIEVEMENT CARDS: batch stagger —
  document.querySelectorAll('.ach-cards').forEach(grid=>{
    const cards=grid.querySelectorAll('.ac');
    gsap.set(cards,{opacity:0,scale:0.85});
    ScrollTrigger.create({
      trigger:grid,
      start:'top 82%',
      once:true,
      onEnter:()=>{
        gsap.to(cards,{opacity:1,scale:1,duration:.5,stagger:.08,ease:'back.out(1.4)',clearProps:'transform'});
      }
    });
  });

  // — RESEARCH CARDS: batch stagger —
  document.querySelectorAll('.res-grid').forEach(grid=>{
    const cards=grid.querySelectorAll('.rc');
    gsap.set(cards,{opacity:0,y:30});
    ScrollTrigger.create({
      trigger:grid,
      start:'top 82%',
      once:true,
      onEnter:()=>{
        gsap.to(cards,{opacity:1,y:0,duration:.6,stagger:.12,ease:'power3.out',clearProps:'transform'});
      }
    });
  });

  // — RESUME CARDS: batch stagger —
  document.querySelectorAll('.resume-grid').forEach(grid=>{
    const cards=grid.querySelectorAll('.resume-card');
    gsap.set(cards,{opacity:0,y:40});
    ScrollTrigger.create({
      trigger:grid,
      start:'top 82%',
      once:true,
      onEnter:()=>{
        gsap.to(cards,{opacity:1,y:0,duration:.7,stagger:.15,ease:'power3.out',clearProps:'transform'});
      }
    });
  });

  // — CONTACT section —
  const ctWrap=document.querySelector('.ct-wrap');
  if(ctWrap){
    // Set initial hidden state (CSS .rv class was removed to prevent double-animation)
    gsap.set('.ct-avail',{opacity:0,y:20});
    gsap.set('.ct-p',{opacity:0,y:20});
    gsap.set('.ct-links',{opacity:0,y:20});
    gsap.set('.ct-big',{opacity:0,scale:0.9});
    ScrollTrigger.create({
      trigger:ctWrap,
      start:'top 80%',
      once:true,
      onEnter:()=>{
        gsap.to('.ct-avail',{opacity:1,y:0,duration:.5,clearProps:'transform'});
        gsap.to('.ct-p',{opacity:1,y:0,duration:.5,delay:.1,clearProps:'transform'});
        gsap.to('.ct-links',{opacity:1,y:0,duration:.5,delay:.2,clearProps:'transform'});
        gsap.to('.ct-big',{opacity:1,scale:1,duration:.8,delay:.3,ease:'power3.out',clearProps:'transform'});
      }
    });
  }
}

/* ── SKILL PROFICIENCY BARS ── */
function initSkillBars(){
  const bars=document.getElementById('bars');
  if(!bars)return;
  ScrollTrigger.create({
    trigger:bars,
    start:'top 82%',
    once:true,
    onEnter:()=>{
      bars.querySelectorAll('.bar-f').forEach((b,i)=>{
        gsap.to(b,{width:b.dataset.w+'%',duration:1.2,delay:i*0.12,ease:'power2.out'});
      });
    }
  });
}

/* ── PROJECT CARD 3D TILT ── */
function initProjectTilt(){
  if(innerWidth<=768)return;
  document.querySelectorAll('.pc').forEach(c=>{
    c.addEventListener('mousemove',e=>{
      const r=c.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      gsap.to(c,{
        rotateY:x*10,rotateX:-y*10,
        transformPerspective:900,
        duration:.3,ease:'power2.out'
      });
      c.style.setProperty('--mx',(e.clientX-r.left)/r.width*100+'%');
      c.style.setProperty('--my',(e.clientY-r.top)/r.height*100+'%');
    });
    c.addEventListener('mouseleave',()=>{
      gsap.to(c,{rotateY:0,rotateX:0,y:0,duration:.5,ease:'power3.out'});
    });
  });

  // Skill card hover tracking
  document.querySelectorAll('.sk-card').forEach(c=>{
    c.addEventListener('mousemove',e=>{
      const r=c.getBoundingClientRect();
      c.style.setProperty('--mx',(e.clientX-r.left)/r.width*100+'%');
      c.style.setProperty('--my',(e.clientY-r.top)/r.height*100+'%');
    });
  });
}

/* ── MAGNETIC BUTTONS ── */
function initMagneticButtons(){
  document.querySelectorAll('.magnetic').forEach(el=>{
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      gsap.to(el,{
        x:(e.clientX-r.left-r.width/2)*.3,
        y:(e.clientY-r.top-r.height/2)*.3,
        duration:.3,ease:'power2.out'
      });
    });
    el.addEventListener('mouseleave',()=>{
      gsap.to(el,{x:0,y:0,duration:.5,ease:'elastic.out(1,0.3)'});
    });
  });
}

/* ── GLITCH EFFECT ── */
function initGlitch(){
  const el=document.getElementById('gn');if(!el)return;
  function g(){
    el.classList.add('g');
    setTimeout(()=>el.classList.remove('g'),110);
    setTimeout(g,4000+Math.random()*4500);
  }
  g();
}

/* ══════════════════════════════════════════════════════════════
   MUSICAL PORTFOLIO OVERLAY
   ══════════════════════════════════════════════════════════════ */
function initMusicOverlay(){
  const overlay=document.getElementById('music-overlay');
  if(!overlay)return;

  // Generate floating particles
  const particleContainer=overlay.querySelector('.music-particles');
  if(particleContainer){
    for(let i=0;i<30;i++){
      const p=document.createElement('div');
      p.className='music-particle';
      p.style.left=Math.random()*100+'%';
      p.style.animationDelay=Math.random()*6+'s';
      p.style.animationDuration=(4+Math.random()*4)+'s';
      const colors=['#ff6b35','#ff3366','#7c3aff','#ffc233'];
      p.style.background=colors[Math.floor(Math.random()*colors.length)];
      p.style.width=(1+Math.random()*3)+'px';
      p.style.height=p.style.width;
      p.style.boxShadow='0 0 '+(4+Math.random()*8)+'px '+p.style.background;
      particleContainer.appendChild(p);
    }
  }

  // Open triggers — use gsap.fromTo() so re-opening works
  document.querySelectorAll('[data-music-open]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.preventDefault();
      overlay.classList.add('active');
      document.body.style.overflow='hidden';
      // Scroll to top of music content
      const mc=overlay.querySelector('.music-content');
      if(mc)mc.scrollTop=0;
      // Animate content in with fromTo (works on re-open)
      const tl=gsap.timeline();
      tl.fromTo('.music-header',{y:60,opacity:0},{y:0,opacity:1,duration:.7,ease:'power3.out'},0)
        .fromTo('.music-role',{scale:0.8,opacity:0},{scale:1,opacity:1,duration:.4,stagger:.06,ease:'back.out(1.4)'},.3)
        .fromTo('.music-card',{y:40,opacity:0},{y:0,opacity:1,duration:.5,stagger:.08,ease:'power3.out'},.5)
        .fromTo('.music-stat',{scale:0.8,opacity:0},{scale:1,opacity:1,duration:.4,stagger:.05,ease:'back.out(1.4)'},.7)
        .fromTo('.music-resume-wrap',{y:20,opacity:0},{y:0,opacity:1,duration:.5},.9);
    });
  });

  // Close
  const closeBtn=overlay.querySelector('.music-close');
  if(closeBtn){
    closeBtn.addEventListener('click',()=>{
      gsap.to(overlay,{opacity:0,duration:.4,onComplete:()=>{
        overlay.classList.remove('active');
        overlay.style.opacity='';
        document.body.style.overflow='';
      }});
    });
  }

  // ESC key to close
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&overlay.classList.contains('active')){
      closeBtn.click();
    }
  });
}
