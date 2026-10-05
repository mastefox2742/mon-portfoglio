/* Miche Fresneil — scène 3D, animations & interactions
   Three.js, GSAP et ScrollTrigger viennent d'un CDN : s'ils manquent, la page reste entièrement lisible. */
(() => {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const small = window.matchMedia('(max-width: 899px)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const animate = hasGsap && !reduce;

  /* ════════ Scène 3D : un orbe liquide (shader), une coque filaire, des formes et des particules ════════ */
  const NOISE = `
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;
  const VERT = `
    uniform float uTime; uniform float uDistort; uniform float uFreq;
    varying vec3 vPos; varying float vNoise;
    ${NOISE}
    void main(){
      vec3 dir = normalize(position);
      float n = snoise(dir * uFreq + uTime * 0.22) + snoise(dir * uFreq * 2.4 - uTime * 0.16) * 0.35;
      vNoise = n;
      vec4 mv = modelViewMatrix * vec4(position + dir * n * uDistort, 1.0);
      vPos = mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`;
  const FRAG = `
    uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
    varying vec3 vPos; varying float vNoise;
    void main(){
      vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
      vec3 v = normalize(-vPos);
      vec3 light = normalize(vec3(0.5, 0.8, 0.9));
      float diff = max(dot(n, light), 0.0);
      float fres = pow(1.0 - max(dot(n, v), 0.0), 2.4);
      vec3 col = mix(uA, uB, smoothstep(-0.55, 0.75, vNoise)) * (0.22 + 0.78 * diff);
      col = mix(col, uC, fres * 0.85);
      col += pow(max(dot(reflect(-light, n), v), 0.0), 48.0) * 0.55;
      gl_FragColor = vec4(col, 1.0);
    }`;

  const SCENES = {
    hero:      { x: 1.9,  y: .1,   s: 1.45, distort: .30, freq: 1.3, a: '#2a1cff', b: '#ff2e88', c: '#7df9ff' },
    profil:    { x: -3.1, y: 1.2,  s: .8,   distort: .22, freq: 1.6, a: '#2a1cff', b: '#ff2e88', c: '#7df9ff' },
    expertise: { x: 3.0,  y: 1.2,  s: .5,   distort: .25, freq: 1.6, a: '#0a2bff', b: '#c8ff2e', c: '#ffffff' },
    motion:    { x: 2.9,  y: -.9,  s: 1.0,  distort: .42, freq: 2.0, a: '#0a2bff', b: '#c8ff2e', c: '#ffffff' },
    work:      { x: -3.0, y: 1.3,  s: .6,   distort: .35, freq: 1.5, a: '#ff2e88', b: '#ff9a2e', c: '#ffe9a8' },
    apps:      { x: -2.9, y: .9,   s: .8,   distort: .30, freq: 1.6, a: '#0a8f4f', b: '#c8ff2e', c: '#ffffff' },
    parcours:  { x: 2.8,  y: -.6,  s: .95,  distort: .30, freq: 1.4, a: '#2a1cff', b: '#19e3ff', c: '#c8ff2e' },
    contact:   { x: 1.7,  y: -.1,  s: 1.6,  distort: .50, freq: 1.7, a: '#2a1cff', b: '#ff2e88', c: '#7df9ff' }
  };

  const createScene = canvas => {
    if (typeof window.THREE === 'undefined') return null;
    const T = window.THREE;
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(40, 1, .1, 60);
    camera.position.z = 6;

    const first = SCENES.hero;
    const state = { x: first.x, y: first.y, s: first.s, distort: first.distort, freq: first.freq, i: animate ? 0 : 1, kick: 0, scroll: 0 };
    const uniforms = {
      uTime: { value: 0 }, uDistort: { value: first.distort }, uFreq: { value: first.freq },
      uA: { value: new T.Color(first.a) }, uB: { value: new T.Color(first.b) }, uC: { value: new T.Color(first.c) }
    };

    const orbGroup = new T.Group();
    const orb = new T.Mesh(
      new T.IcosahedronGeometry(1, small ? 26 : 48),
      new T.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, extensions: { derivatives: true } })
    );
    const shell = new T.Mesh(new T.IcosahedronGeometry(1.62, 1), new T.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: .1 }));
    orbGroup.add(orb, shell);
    scene.add(orbGroup);

    // Monde défilant : particules et formes filaires réparties sur toute la hauteur de la page
    const world = new T.Group();
    scene.add(world);
    const DEPTH = 16;
    const count = small ? 650 : 1700;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - .5) * 20;
      positions[i * 3 + 1] = 4 - Math.random() * (DEPTH + 8);
      positions[i * 3 + 2] = 2 - Math.random() * 12;
    }
    const pGeo = new T.BufferGeometry();
    pGeo.setAttribute('position', new T.BufferAttribute(positions, 3));
    world.add(new T.Points(pGeo, new T.PointsMaterial({ color: 0xffffff, size: .035, transparent: true, opacity: .75, depthWrite: false })));

    const geos = [new T.TorusGeometry(.5, .17, 10, 28), new T.OctahedronGeometry(.6), new T.TorusKnotGeometry(.4, .13, 64, 8), new T.TetrahedronGeometry(.62), new T.IcosahedronGeometry(.55, 0)];
    const colors = [0xc8ff2e, 0xff2e88, 0xffffff, 0x4a5cff];
    const shapes = [];
    const shapeCount = small ? 7 : 13;
    for (let i = 0; i < shapeCount; i++) {
      const mesh = new T.Mesh(geos[i % geos.length], new T.MeshBasicMaterial({ color: colors[i % colors.length], wireframe: true, transparent: true, opacity: .34 }));
      const side = i % 2 ? 1 : -1;
      mesh.position.set(side * (2.8 + Math.random() * 3.2), 1.5 - (i / shapeCount) * (DEPTH + 3), -2 - Math.random() * 5);
      mesh.userData = { rx: (Math.random() - .5) * .5, ry: (Math.random() - .5) * .6, bob: Math.random() * 6 };
      shapes.push(mesh);
      world.add(mesh);
    }

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    if (finePointer) window.addEventListener('pointermove', e => {
      mouse.tx = e.clientX / window.innerWidth - .5;
      mouse.ty = e.clientY / window.innerHeight - .5;
    }, { passive: true });

    let aspect = 1;
    const resize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      aspect = w / h;
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    };

    const render = time => {
      const t = time / 1000;
      mouse.x += (mouse.tx - mouse.x) * .06;
      mouse.y += (mouse.ty - mouse.y) * .06;
      state.kick *= .93;
      const k = Math.min(1, aspect / 1.5); // en format portrait, l'orbe se recentre et rétrécit
      uniforms.uTime.value = t;
      uniforms.uDistort.value = state.distort + state.kick;
      uniforms.uFreq.value = state.freq;
      orbGroup.position.set(state.x * k + mouse.x * .5, state.y - mouse.y * .35, 0);
      orbGroup.scale.setScalar(Math.max(.0001, state.s * (.55 + .45 * k) * state.i));
      orb.rotation.set(mouse.y * .5, t * .12 + mouse.x * .8 + state.scroll * 5, 0);
      shell.rotation.set(t * .07 - mouse.y * .3, -t * .1 + state.scroll * 3, 0);
      world.position.y = state.scroll * DEPTH;
      world.rotation.y = mouse.x * .12;
      shapes.forEach(m => {
        m.rotation.x = t * m.userData.rx + state.scroll * 4;
        m.rotation.y = t * m.userData.ry;
        m.position.x += Math.sin(t * .4 + m.userData.bob) * .0012;
      });
      renderer.render(scene, camera);
    };

    let raf = 0;
    const loop = time => { render(time); raf = requestAnimationFrame(loop); };
    const start = () => { if (!raf && !reduce) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    window.addEventListener('resize', () => { resize(); if (reduce) render(0); });
    resize();
    render(0);
    start();

    const go = name => {
      const target = SCENES[name];
      if (!target) return;
      const { a, b, c, ...numbers } = target;
      if (!animate) { Object.assign(state, numbers); uniforms.uA.value.set(a); uniforms.uB.value.set(b); uniforms.uC.value.set(c); render(0); return; }
      gsap.to(state, { ...numbers, duration: 1.6, ease: 'power3.inOut', overwrite: 'auto' });
      [[uniforms.uA, a], [uniforms.uB, b], [uniforms.uC, c]].forEach(([u, hex]) => {
        const col = new T.Color(hex);
        gsap.to(u.value, { r: col.r, g: col.g, b: col.b, duration: 1.6, ease: 'power2.inOut', overwrite: true });
      });
    };
    return { state, go, render };
  };

  const scene = createScene($('#scene'));
  if (!scene) root.classList.add('no-webgl');
  window.__scene = scene;

  /* ════════ Menu mobile ════════ */
  const burger = $('#burger'), menu = $('#menu');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', String(!open));
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ════════ Navigation, progression, lien actif ════════ */
  const nav = $('#nav'), progress = $('#progress');
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    const p = Math.min(1, Math.max(0, y / Math.max(1, root.scrollHeight - window.innerHeight)));
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > 400 && !document.body.classList.contains('menu-open'));
    progress.style.transform = `scaleX(${p})`;
    if (scene) { scene.state.scroll = p; if (reduce) scene.render(0); }
    lastY = y;
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  const navLinks = $$('.nav-links a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  /* Vidéo mise en avant : lecture (muette) quand elle est à l'écran, pause sinon */
  const reel = $('#reel');
  if (reel && !reduce) new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) reel.play().catch(() => {}); else reel.pause();
  }, { threshold: .5 }).observe(reel);

  /* Sans GSAP ou en mouvement réduit : tout est déjà visible, la scène reste statique */
  if (!animate) { root.classList.add('pre-done'); return; }

  /* ════════ Animations ════════ */
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out', duration: .9 });
  const rand = gsap.utils.random;

  /* Découpe en lettres, mot par mot (les mots restent insécables) */
  const splitChars = el => {
    const text = el.textContent.trim();
    if (!el.hasAttribute('aria-hidden')) el.setAttribute('aria-label', text);
    el.textContent = '';
    const chars = [];
    text.split(' ').forEach((word, i, all) => {
      const w = document.createElement('span');
      w.className = 'cw'; w.setAttribute('aria-hidden', 'true');
      [...word].forEach(c => {
        const s = document.createElement('span');
        s.className = 'ch'; s.textContent = c;
        w.appendChild(s); chars.push(s);
      });
      el.appendChild(w);
      if (i < all.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return chars;
  };

  /* ── Projets : défilement horizontal épinglé (grand écran). Créé en premier : il décale tout ce qui suit. ── */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    root.classList.add('h-pin');
    const track = $('#h-track'), index = $('#h-index'), bar = $('#h-bar');
    const cards = $$('.proj', track);
    const distance = () => track.scrollWidth - window.innerWidth;
    const slide = gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: '#work', pin: true, scrub: .8, refreshPriority: 1, invalidateOnRefresh: true,
        end: () => `+=${distance()}`,
        onUpdate: self => {
          index.textContent = String(gsap.utils.clamp(1, cards.length, Math.round(self.progress * (cards.length + 1)))).padStart(2, '0');
          bar.style.transform = `scaleX(${self.progress})`;
        }
      }
    });
    cards.forEach(card => {
      gsap.fromTo(card, { scale: .82, opacity: .3, rotationY: -14, transformPerspective: 1200 }, { scale: 1, opacity: 1, rotationY: 0, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: slide, start: 'left 100%', end: 'left 45%', scrub: true } });
    });
    return () => root.classList.remove('h-pin');
  });

  /* ── Hero : états de départ (posés sous le préchargeur) ── */
  const heroLines = $$('.hero-title [data-chars]').map(splitChars);
  const heroChars = heroLines.flat();
  const fades = $$('[data-hero-fade]');
  gsap.set(heroChars, { yPercent: 120, rotationX: -90, opacity: 0 });
  gsap.set(fades, { autoAlpha: 0, y: 24 });
  gsap.set(nav, { autoAlpha: 0 });

  const intro = gsap.timeline({
    paused: true,
    onComplete: () => {
      // Au scroll, les lettres du titre s'envolent
      gsap.fromTo(heroChars,
        { y: 0, x: 0, rotation: 0, opacity: 1 },
        { y: () => rand(-460, -90), x: () => rand(-190, 190), rotation: () => rand(-80, 80), opacity: 0, ease: 'power1.in', immediateRender: false,
          scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom 12%', scrub: .6 } });
      gsap.to('.hero-foot, .status', { autoAlpha: 0, y: -40, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '#hero', start: 'top top', end: '45% top', scrub: .4 } });
    }
  });
  heroLines.forEach((line, i) => intro.to(line, { yPercent: 0, rotationX: 0, opacity: 1, duration: 1.1, stagger: .035, ease: 'power4.out' }, i * .14));
  intro.to(fades, { autoAlpha: 1, y: 0, duration: .9, stagger: .09 }, .7)
       .to(nav, { autoAlpha: 1, duration: .8 }, .7);
  if (scene) intro.to(scene.state, { i: 1, duration: 2.2, ease: 'elastic.out(1, .55)' }, 0);

  /* ── Préchargeur : compteur, puis rideau ── */
  const counter = { v: 0 }, count = $('#pre-count');
  gsap.timeline({ onComplete: () => root.classList.add('pre-done') })
    .to(counter, { v: 100, duration: 1.3, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(counter.v)).padStart(3, '0'); } })
    .to('#pre-bar', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, 0)
    .to('.pre-inner', { yPercent: -30, autoAlpha: 0, duration: .45, ease: 'power2.in' })
    .to('.pre-panel', { scaleY: 1, duration: .5, ease: 'power3.inOut' }, '-=.3')
    .set('#preloader', { backgroundColor: 'transparent' })
    .set('.pre-panel', { transformOrigin: 'top' })
    .add(() => intro.play())
    .to('.pre-panel', { scaleY: 0, duration: .7, ease: 'power3.inOut' });

  /* Filet de sécurité : si le rendu est gelé (onglet en arrière-plan, aperçu), rien ne reste masqué */
  setTimeout(() => {
    if (intro.progress() < 1) intro.progress(1);
    if (document.visibilityState === 'visible' && gsap.ticker.frame < 20) {
      ScrollTrigger.getAll().forEach(st => { if (st.animation && !st.pin) st.animation.progress(1); });
      gsap.set('[data-reveal]', { autoAlpha: 1, y: 0 });
    }
  }, 5000);

  /* ── Scène 3D : un état par section, et un sursaut selon la vitesse de scroll ── */
  if (scene) {
    $$('[data-scene]').forEach(section => ScrollTrigger.create({
      trigger: section, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => self.isActive && scene.go(section.dataset.scene)
    }));
  }
  const skew = gsap.quickTo('.bigtype', 'skewX', { duration: .5, ease: 'power3.out' });
  ScrollTrigger.create({
    onUpdate: self => {
      const v = self.getVelocity();
      skew(gsap.utils.clamp(-10, 10, v / -220));
      if (scene) scene.state.kick = Math.min(.45, scene.state.kick + Math.abs(v) / 26000);
    }
  });

  /* ── Texte géant : deux lignes qui se croisent ── */
  $$('.bigtype-row').forEach(row => {
    const dir = Number(row.dataset.dir);
    gsap.fromTo(row, { xPercent: dir < 0 ? 4 : -4 }, { xPercent: dir < 0 ? -32 : 26, ease: 'none', scrollTrigger: { trigger: '.bigtype', start: 'top bottom', end: 'bottom top', scrub: .6 } });
  });

  /* ── Profil : manifeste mot à mot, portrait dévoilé en cercle ── */
  const statement = $('#statement');
  statement.innerHTML = statement.textContent.trim().split(/[ \n\t]+/).map(w => `<span class="sw">${w}</span>`).join(' '); // les espaces insécables restent attachés
  gsap.fromTo('.sw', { opacity: .14 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: statement, start: 'top 82%', end: 'bottom 50%', scrub: .5 } });
  gsap.fromTo('#portrait', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(80% at 50% 50%)', duration: 1.5, ease: 'power3.inOut', scrollTrigger: { trigger: '.portrait-wrap', start: 'top 80%', once: true } });
  gsap.fromTo('#portrait img', { yPercent: -10.7 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.portrait-wrap', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.chip', { autoAlpha: 0, scale: .5, duration: .7, stagger: .15, ease: 'back.out(2.2)', scrollTrigger: { trigger: '.portrait-wrap', start: 'top 60%', once: true } });

  /* ── Expertise : le panneau couleur s'ouvre en plein écran, puis se referme ── */
  const closed = 'inset(0% 8% 0% 8% round 64px)', open = 'inset(0% 0% 0% 0% round 0px)';
  gsap.timeline({ scrollTrigger: { trigger: '#expertise', start: 'top bottom', end: 'bottom top', scrub: .4 } })
    .fromTo('#expertise', { clipPath: closed }, { clipPath: open, ease: 'none', duration: .22 })
    .to('#expertise', { clipPath: closed, ease: 'none', duration: .22 }, .78);

  /* ── Titres de section : lettres révélées par masque ── */
  $$('[data-chars]').filter(el => !el.closest('.hero-title')).forEach(title => {
    gsap.from(splitChars(title), { yPercent: 118, rotation: 6, duration: 1, stagger: .022, ease: 'power4.out', scrollTrigger: { trigger: title, start: 'top 88%' } });
  });
  $$('.label').forEach(label => gsap.from(label, { autoAlpha: 0, x: -24, duration: .7, scrollTrigger: { trigger: label, start: 'top 90%' } }));

  /* ── Révélations génériques, par lots ── */
  gsap.set('[data-reveal]', { autoAlpha: 0, y: 44 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: batch => gsap.to(batch, { autoAlpha: 1, y: 0, duration: .9, stagger: .09, overwrite: true })
  });

  /* ── Compteurs ── */
  $$('[data-count]').forEach(el => {
    const end = Number(el.dataset.count), state = { v: Number(el.dataset.from || 0) };
    gsap.to(state, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(state.v); }, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  /* ── Applications : dans chaque carte, les deux téléphones montent l'un après l'autre ── */
  $$('.app-card').forEach(card => {
    gsap.from($$('.phone', card), { y: 90, autoAlpha: 0, duration: 1, stagger: .12, ease: 'power4.out', scrollTrigger: { trigger: card, start: 'top 85%', once: true } });
  });

  /* ── Parcours : la ligne se trace, les étapes arrivent ── */
  gsap.from('#steps-fill', { scaleY: 0, ease: 'none', scrollTrigger: { trigger: '#steps', start: 'top 70%', end: 'bottom 60%', scrub: .5 } });
  $$('.step').forEach(step => gsap.from(step, { autoAlpha: 0, x: 40, scrollTrigger: { trigger: step, start: 'top 82%', once: true } }));
  gsap.from('.cl', { autoAlpha: 0, x: -14, duration: .5, stagger: .055, scrollTrigger: { trigger: '#code-lines', start: 'top 82%', once: true } });

  /* ── Contact : le titre géant se relève lettre par lettre, au rythme du scroll ── */
  gsap.from(splitChars($('#contact-title')), { yPercent: 110, rotationX: -85, opacity: 0, stagger: .05, ease: 'power2.out', scrollTrigger: { trigger: '#contact', start: 'top 85%', end: 'top 15%', scrub: .5 } });

  /* ── Pointeur fin : boutons magnétiques, curseur d'étiquette, inclinaison du portrait ── */
  if (finePointer) {
    $$('[data-magnetic]').forEach(el => {
      const x = gsap.quickTo(el, 'x', { duration: .5, ease: 'power3.out' });
      const y = gsap.quickTo(el, 'y', { duration: .5, ease: 'power3.out' });
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * .3);
        y((e.clientY - r.top - r.height / 2) * .4);
      });
      el.addEventListener('mouseleave', () => { x(0); y(0); });
    });

    const cursor = $('#cursor'), cursorLabel = $('#cursor-label');
    const cx = gsap.quickTo(cursor, 'x', { duration: .35, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: .35, ease: 'power3.out' });
    window.addEventListener('mousemove', e => { cx(e.clientX); cy(e.clientY); }, { passive: true });
    $$('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => { cursorLabel.textContent = el.dataset.cursor; gsap.to(cursor, { scale: 1, autoAlpha: 1, duration: .45, ease: 'back.out(1.8)' }); });
      el.addEventListener('mouseleave', () => gsap.to(cursor, { scale: 0, autoAlpha: 0, duration: .3, ease: 'power2.in' }));
    });

    const wrap = $('.portrait-wrap'), portrait = $('#portrait');
    const rx = gsap.quickTo(portrait, 'rotationX', { duration: .8 });
    const ry = gsap.quickTo(portrait, 'rotationY', { duration: .8 });
    wrap.addEventListener('mousemove', e => {
      const r = wrap.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - .5) * 18);
      rx(((e.clientY - r.top) / r.height - .5) * -14);
    });
    wrap.addEventListener('mouseleave', () => { rx(0); ry(0); });
  }

  /* Les positions changent une fois polices et images chargées */
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
})();
