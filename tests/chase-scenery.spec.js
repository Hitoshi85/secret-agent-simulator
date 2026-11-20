// Scenery and cars for the opening car chase (src/chase/land.js, src/chase/cars.js): each of the three
// stages builds a road of about two kilometres with cypress avenues, crests for air time, Pienza by the
// start and Florence ahead at the end; the cars are merged to a few meshes each; and a view down the road
// with both cars stays within the phone rendering budget. Saves a screenshot to phone-screenshots/.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

test('three stages and the cars build, and a chase view stays within the phone budget', async ({ page }) => {
  test.setTimeout(180000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  const r = await page.evaluate(async () => {
    window.__agent.paused = true;
    const THREE = await import('three');
    const { buildStage, sampleRoad } = await import('/src/chase/land.js');
    const { makeCar, makeSUV, makeTraffic } = await import('/src/chase/cars.js');
    const cars = { fiat: makeCar(), suv: makeSUV(), van: makeTraffic('van'), ape: makeTraffic('ape'), hatch: makeTraffic('hatch') };
    const meshes = Object.fromEntries(Object.entries(cars).map(([k, c]) => [k, c.children.filter((o) => o.isMesh).length]));
    const stages = [];
    let view = null;
    for (const k of [0, 1, 2]) {
      const { group, road } = buildStage(k);
      let cyp = 0, off = 0; for (let i = 0; i < road.n; i++) cyp += road.cyp[i];
      // Ground height beside the road matches the road all the way along (trees stand on the ground).
      for (let i = 0; i < road.n; i += 7) { const x = road.x[i] - Math.cos(road.dir[i]) * 3, z = road.z[i] + Math.sin(road.dir[i]) * 3; off = Math.max(off, Math.abs(road.H(x, z) - road.y[i])); }
      stages.push({ end: road.end, len: road.len, crests: road.crests.length, cypressMetres: cyp * 2, city: !!road.city, off });
      if (k === 0) view = { group, road };
    }
    // A view down the first stage: the red car behind the off-roader, rendered like the game does.
    const canvas = document.createElement('canvas'); canvas.width = 390; canvas.height = 844; canvas.style.cssText = 'position:fixed;inset:0;width:390px;height:844px;z-index:99';
    document.body.appendChild(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setSize(390, 844, false);
    renderer.shadowMap.enabled = true; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#9cc4e6'); scene.fog = new THREE.Fog('#e3dccb', 350, 2600);
    scene.add(new THREE.HemisphereLight('#fff2dc', '#7d6a4c', 1.25));
    const sun = new THREE.DirectionalLight('#ffe2b8', 2.9); sun.castShadow = true; scene.add(sun, sun.target);
    scene.add(view.group, cars.fiat, cars.suv);
    const p = {}, put = (o, s) => { sampleRoad(view.road, s, p); o.position.set(p.x - Math.cos(p.dir) * 1.1, p.y, p.z + Math.sin(p.dir) * 1.1); o.rotation.y = p.dir - Math.PI / 2; };
    put(cars.fiat, 120); put(cars.suv, 156);
    const cam = new THREE.PerspectiveCamera(64, 390 / 844, 0.5, 4000);
    sampleRoad(view.road, 110, p); cam.position.set(p.x - Math.cos(p.dir) * 1.1, p.y + 3.6, p.z + Math.sin(p.dir) * 1.1);
    const f = sampleRoad(view.road, 150, {}); cam.lookAt(f.x, f.y + 1, f.z);
    sun.position.set(cars.fiat.position.x - 210, cars.fiat.position.y + 150, cars.fiat.position.z + 105); sun.target.position.copy(cars.fiat.position);
    renderer.render(scene, cam);
    return { meshes, stages, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  });
  fs.mkdirSync(path.join(__dirname, '..', 'phone-screenshots'), { recursive: true });
  await page.screenshot({ path: path.join(__dirname, '..', 'phone-screenshots', 'chase-scenery.png') });
  console.log(JSON.stringify(r));
  for (const [k, n] of Object.entries(r.meshes)) expect(n, `${k}: one mesh per material`).toBeLessThanOrEqual(18);
  for (const s of r.stages) {
    expect(s.end).toBe(2100);
    expect(s.len, 'the road runs on past the finish').toBeGreaterThan(s.end + 100);
    expect(s.crests, 'crests for air time').toBeGreaterThanOrEqual(2);
    expect(s.cypressMetres, 'cypress avenues').toBeGreaterThan(400);
    expect(s.off, 'ground beside the road follows the road').toBeLessThan(0.5);
  }
  expect(r.stages.map((s) => s.city)).toEqual([false, false, true]);
  expect(r.calls).toBeLessThanOrEqual(250);
  expect(r.triangles).toBeLessThanOrEqual(400000);
  expect(errors).toEqual([]);
});
