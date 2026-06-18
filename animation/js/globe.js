/* Scene 0 rotating globe — true orthographic sphere on a <canvas>.
 *
 * The continents/Australia come from window.GLOBE_DATA (built by
 * tools/gen-globe.mjs from public-domain Natural Earth data). d3-geo
 * (vendored in js/lib) handles the orthographic projection + hemisphere
 * clipping, so land foreshortens correctly at the limb as the globe spins.
 *
 * Motion: the Earth spins ~one full turn and decelerates (ease-out) so that
 * Australia settles facing the viewer right before Scene 0's CSS dive-zoom
 * heads into it. Australia is filled with a highlight each frame. The spin is
 * self-managed: it (re)starts whenever #s0 becomes the active scene.
 */
(function () {
  'use strict';
  if (!window.GLOBE_DATA || !window.d3 || !d3.geoOrthographic) return;

  const DATA = window.GLOBE_DATA;
  const [ausLon, ausLat] = DATA.ausCentroid;   // settle here (and dive into it)
  const CENTER_LAT = ausLat;                    // normal oblique southern view
  const VIEW = 560;                             // CSS px of the .globe box
  const SPIN_MS = 2600;                         // settle ~2.6s, before the dive's big zoom (~3.5s)
  const TURNS = 1;                              // full rotations before settling

  const host = document.querySelector('#s0 .globe');
  const svg = host && host.querySelector('.globe-svg');
  if (!host) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'globe-canvas';
  if (svg) svg.replaceWith(canvas); else host.prepend(canvas);

  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  canvas.width = VIEW * dpr;
  canvas.height = VIEW * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const R = VIEW * 0.475;          // matches the old r=95 of a 200 viewBox
  const C = VIEW / 2;
  const projection = d3.geoOrthographic()
    .scale(R).translate([C, C]).clipAngle(90).precision(0.4);
  const path = d3.geoPath(projection, ctx);
  const graticule = d3.geoGraticule().step([30, 30])();
  const SPHERE = { type: 'Sphere' };

  function draw(lambda) {
    projection.rotate([-lambda, -CENTER_LAT]);
    ctx.clearRect(0, 0, VIEW, VIEW);

    // ocean sphere, lit from the upper-left
    const og = ctx.createRadialGradient(C * 0.7, C * 0.62, R * 0.1, C, C, R);
    og.addColorStop(0, '#1b5168');
    og.addColorStop(0.55, '#0d3447');
    og.addColorStop(1, '#051019');
    ctx.beginPath(); path(SPHERE); ctx.fillStyle = og; ctx.fill();

    // graticule
    ctx.beginPath(); path(graticule);
    ctx.strokeStyle = 'rgba(94,242,224,.16)'; ctx.lineWidth = 0.6; ctx.stroke();

    // land
    ctx.beginPath(); path(DATA.land);
    ctx.fillStyle = 'rgba(70,150,120,.32)'; ctx.fill();
    ctx.strokeStyle = 'rgba(120,220,200,.45)'; ctx.lineWidth = 0.6; ctx.stroke();

    // Australia — highlighted hero (glow)
    ctx.save();
    ctx.beginPath(); path(DATA.aus);
    const ag = ctx.createLinearGradient(C - R * 0.3, C - R * 0.3, C + R * 0.3, C + R * 0.3);
    ag.addColorStop(0, '#b6f9df'); ag.addColorStop(0.58, '#5fe6c6'); ag.addColorStop(1, '#23b39a');
    ctx.fillStyle = ag;
    ctx.shadowColor = 'rgba(130,255,220,.9)'; ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#aef7e6'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.restore();

    // limb shading — darken the rim to deepen the sphere
    const sg = ctx.createRadialGradient(C, C, R * 0.62, C, C, R);
    sg.addColorStop(0, 'rgba(2,8,12,0)');
    sg.addColorStop(1, 'rgba(2,8,12,.72)');
    ctx.beginPath(); path(SPHERE); ctx.fillStyle = sg; ctx.fill();
  }

  const easeOut = t => 1 - Math.pow(1 - t, 3);
  let raf = null;
  const lambda0 = ausLon - 360 * TURNS;
  const lambdaAt = seconds => {
    const t = Math.min(Math.max(seconds * 1000 / SPIN_MS, 0), 1);
    return lambda0 + (ausLon - lambda0) * easeOut(t);
  };

  function spin() {
    if (raf) cancelAnimationFrame(raf);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / SPIN_MS, 1);
      draw(lambda0 + (ausLon - lambda0) * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(step);
      else raf = null;                 // settled on Australia; hold for the dive
    };
    raf = requestAnimationFrame(step);
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
  function poster() { stop(); draw(ausLon); }    // static frame, Australia front
  function renderForExport(seconds) {
    stop();
    draw(lambdaAt(seconds));
  }

  window.__skyeyeRenderGlobeFrame = renderForExport;

  // (re)spin whenever Scene 0 becomes active; show a static poster otherwise
  const stage = document.getElementById('stage');
  const s0 = document.getElementById('s0');
  const sync = () => {
    if (document.body.classList.contains('frame-export')) return;
    const active = s0.classList.contains('on') && !stage.classList.contains('prestart')
      && !stage.classList.contains('paused');
    if (active) spin(); else poster();
  };
  new MutationObserver(sync).observe(s0, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sync).observe(stage, { attributes: true, attributeFilter: ['class'] });

  poster();   // initial poster render
})();
