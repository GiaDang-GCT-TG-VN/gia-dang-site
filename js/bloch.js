/* Hero Bloch sphere (index.html only).
   Progressive enhancement over the circuit SVG in #hero-stage: Three.js is
   fetched only when the hero is in view, the screen is >= 480px and WebGL
   works. Otherwise the SVG stays as it is. */
(function () {
  'use strict';

  var stage = document.getElementById('hero-stage');
  if (!stage || !window.matchMedia || !('IntersectionObserver' in window)) return;

  var THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
  var THREE_SRI = 'sha512-vnmn/Qqn6aG0POAc9mIGzjq0IybrvxJXYDafNvp9JSnDGxeF3pbkSqLvf+YGd5ku63pT7sa/jxHn7/d0mU8+tA==';

  var wide = window.matchMedia('(min-width: 480px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var TILT_MAX = 10 * Math.PI / 180;   // parallax limit
  var THETA = 0.95;                    // polar angle of the state vector (rad)
  var PRECESSION = 0.35;               // rad per second
  var BASE_PITCH = 0.32, BASE_YAW = -0.62;

  var inView = false, loading = false, failed = false;
  var view = null;  // set once Three.js is up

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return false;
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  }

  function loadThree(done) {
    if (window.THREE) return done();
    var s = document.createElement('script');
    s.src = THREE_SRC;
    s.integrity = THREE_SRI;
    s.crossOrigin = 'anonymous';
    s.referrerPolicy = 'no-referrer';
    s.async = true;
    s.onload = done;
    s.onerror = function () { failed = true; };
    document.head.appendChild(s);
  }

  function maybeInit() {
    if (view || loading || failed || !inView || !wide.matches) return;
    if (!hasWebGL()) { failed = true; return; }
    loading = true;
    loadThree(function () {
      loading = false;
      try { view = build(); } catch (e) { failed = true; return; }
      sync();
    });
  }

  /* Start/stop the loop and swap SVG <-> canvas to match current conditions. */
  function sync() {
    if (!view) return;
    stage.classList.toggle('is-3d', wide.matches);
    var shouldRun = inView && wide.matches && !document.hidden && !reduce.matches;
    if (shouldRun) view.start();
    else {
      view.stop();
      if (wide.matches) view.renderOnce();
    }
  }

  function build() {
    var THREE = window.THREE;
    var css = getComputedStyle(document.documentElement);
    function token(name, fallback) { return css.getPropertyValue(name).trim() || fallback; }
    var INK = new THREE.Color(token('--ink', '#1A1D2A'));
    var IRIS = new THREE.Color(token('--iris', '#4A3FD0'));
    var HAIR = new THREE.Color(token('--hairline', '#E5E2DA'));
    var HAIR_STRONG = HAIR.clone().lerp(new THREE.Color(token('--muted', '#6A6F80')), 0.38);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    var host = document.createElement('div');
    host.className = 'bloch';
    host.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    function label(text) {
      var el = document.createElement('span');
      el.className = 'bloch-label';
      el.textContent = text;
      host.appendChild(el);
      return el;
    }
    var labels = [
      { el: label('|0⟩'), at: new THREE.Vector3(0, 1.2, 0) },
      { el: label('|1⟩'), at: new THREE.Vector3(0, -1.2, 0) }
    ];
    stage.appendChild(host);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0, 6.2);

    // pitch (x) wraps yaw (y) so drag behaves like an orbit around the Z axis
    var pitchRig = new THREE.Group();
    var yawRig = new THREE.Group();
    pitchRig.add(yawRig);
    scene.add(pitchRig);

    function lineMat(color, opacity) {
      return new THREE.LineBasicMaterial({ color: color, transparent: opacity < 1, opacity: opacity });
    }
    var faint = lineMat(HAIR, 1);
    var strong = lineMat(HAIR_STRONG, 1);

    // Bloch z is "up" (three y); circles are drawn in local coordinates
    function ring(radius, y, mat, rotY, vertical) {
      var pts = [];
      for (var i = 0; i <= 128; i++) {
        var a = i / 128 * Math.PI * 2;
        pts.push(vertical
          ? new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0)
          : new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
      }
      var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
      if (rotY) line.rotation.y = rotY;
      yawRig.add(line);
      return line;
    }
    [30, 60, 120, 150].forEach(function (deg) {
      var t = deg * Math.PI / 180;
      ring(Math.sin(t), Math.cos(t), faint);
    });
    ring(1, 0, strong);                                   // equator
    for (var m = 1; m < 6; m++) ring(1, 0, faint, m * Math.PI / 6, true);
    ring(1, 0, strong, 0, true);                          // one meridian

    var axisMat = lineMat(INK, 0.45);
    [[1.3, 0, 0], [0, 1.3, 0], [0, 0, 1.3]].forEach(function (v) {
      var g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-v[0], -v[1], -v[2]), new THREE.Vector3(v[0], v[1], v[2])
      ]);
      yawRig.add(new THREE.Line(g, axisMat));
    });

    // precession path of the state vector
    var path = ring(Math.sin(THETA), Math.cos(THETA), lineMat(IRIS, 0.28));
    path.renderOrder = 1;

    var dir = new THREE.Vector3();
    var arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, IRIS, 0.13, 0.065);
    yawRig.add(arrow);

    var origin = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), new THREE.MeshBasicMaterial({ color: INK }));
    yawRig.add(origin);

    // ---- interaction -------------------------------------------------------
    var phi = 0.6, last = 0, raf = 0, running = false;
    var tilt = { x: 0, y: 0 }, tiltTarget = { x: 0, y: 0 };
    var user = { pitch: 0, yaw: 0 }, drag = null;

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || reduce.matches) return;
      tiltTarget.y = (e.clientX / window.innerWidth * 2 - 1) * TILT_MAX;
      tiltTarget.x = (e.clientY / window.innerHeight * 2 - 1) * TILT_MAX;
    }, { passive: true });

    var canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      canvas.setPointerCapture(e.pointerId);
      host.classList.add('is-dragging');
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      user.yaw += (e.clientX - drag.x) * 0.008;
      if (e.pointerType === 'mouse') {
        user.pitch = Math.max(-0.9, Math.min(0.9, user.pitch + (e.clientY - drag.y) * 0.006));
      }
      drag.x = e.clientX; drag.y = e.clientY;
      if (!running) renderOnce();
    });
    function endDrag() { drag = null; host.classList.remove('is-dragging'); }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // ---- render ------------------------------------------------------------
    var proj = new THREE.Vector3();
    function draw() {
      pitchRig.rotation.x = BASE_PITCH + user.pitch + tilt.x;
      yawRig.rotation.y = BASE_YAW + user.yaw + tilt.y;

      dir.set(Math.sin(THETA) * Math.cos(phi), Math.cos(THETA), Math.sin(THETA) * Math.sin(phi));
      arrow.setDirection(dir);

      renderer.render(scene, camera);

      var w = canvas.clientWidth, h = canvas.clientHeight;
      scene.updateMatrixWorld();
      for (var i = 0; i < labels.length; i++) {
        proj.copy(labels[i].at).applyMatrix4(yawRig.matrixWorld).project(camera);
        labels[i].el.style.transform = 'translate(' + ((proj.x + 1) / 2 * w).toFixed(1) + 'px,' +
          ((1 - proj.y) / 2 * h).toFixed(1) + 'px) translate(-50%,-50%)';
      }
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      phi += PRECESSION * dt;
      var k = 1 - Math.pow(0.002, dt);   // frame-rate independent easing
      tilt.x += (tiltTarget.x - tilt.x) * k;
      tilt.y += (tiltTarget.y - tilt.y) * k;
      draw();
    }

    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!running) draw();
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);
    resize();

    function renderOnce() { tilt.x = tilt.y = 0; draw(); }

    return {
      start: function () {
        if (running) return;
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      renderOnce: renderOnce
    };
  }

  new IntersectionObserver(function (entries) {
    inView = entries[0].isIntersecting;
    if (view) sync(); else maybeInit();
  }).observe(stage);

  document.addEventListener('visibilitychange', sync);
  function onMedia(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn); else mq.addListener(fn);
  }
  onMedia(wide, function () { if (view) sync(); else maybeInit(); });
  onMedia(reduce, sync);
})();
