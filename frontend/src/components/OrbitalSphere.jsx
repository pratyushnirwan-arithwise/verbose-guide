import { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * OrbitalSphere — Three.js 3D scene:
 *  - Central glass/wireframe sphere
 *  - 3 orbital rings (tilted planes) with a small sphere each
 *  - Soft ambient + point lights for depth
 */
export default function OrbitalSphere({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth;
    const H = el.clientHeight;

    // ── Scene / Camera / Renderer ─────────────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 1.5, 11);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // ── Lights ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const pLight1 = new THREE.PointLight(0xa78bfa, 3, 20);
    pLight1.position.set(3, 3, 3);
    scene.add(pLight1);

    const pLight2 = new THREE.PointLight(0x4dd9e0, 2.5, 20);
    pLight2.position.set(-3, -2, 2);
    scene.add(pLight2);

    const pLight3 = new THREE.PointLight(0xff9ffc, 2, 18);
    pLight3.position.set(0, -4, -2);
    scene.add(pLight3);

    // ── Central sphere ────────────────────────────────────────────────────
    const coreGeo = new THREE.SphereGeometry(1, 32, 32);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x1a0a3a,
      emissive: 0x1a0040,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.55,
      shininess: 120,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Wireframe overlay on central sphere
    const wireGeo = new THREE.SphereGeometry(1.01, 16, 16);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.07,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wireMesh);

    // ── Orbit definitions (Horizontal concentric rings, gently tilted for 3D depth) ──
    const unifiedTiltAxis = new THREE.Vector3(1, 0, 0);
    const unifiedTiltAngle = Math.PI / 8; // gentle 22.5° tilt facing camera

    const orbits = [
      { r: 1.8, speed:  0.55, color: 0xffffff, size: 0.14 },
      { r: 2.5, speed: -0.35, color: 0x4dd9e0, size: 0.16 },
      { r: 3.2, speed:  0.22, color: 0xa78bfa, size: 0.18 },
    ];

    // Build orbit ring (torus) + small sphere for each
    const orbitGroups = orbits.map(({ r, speed, color, size }) => {
      const group = new THREE.Group();

      // Ring line — rotated to XZ plane so dot orbit matches
      const ringGeo = new THREE.TorusGeometry(r, 0.008, 8, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2; // torus default is XY plane; flip to XZ
      group.add(ring);

      // Orbiting dot (small sphere)
      const dotGeo = new THREE.SphereGeometry(size, 16, 16);
      const dotMat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.65,
        shininess: 200,
        transparent: true,
        opacity: 0.95,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(r, 0, 0); // start on +x of the ring plane
      group.add(dot);

      // Tilt the whole group onto the horizontal planetary plane
      group.setRotationFromAxisAngle(unifiedTiltAxis, unifiedTiltAngle);
      scene.add(group);

      return { group, dot, r, speed, angle: Math.random() * Math.PI * 2 };
    });

    // Slow overall scene rotation for dramatic 3D movement of the entire planetary system
    const sceneRotY = { v: 0 };

    // ── Resize handler ────────────────────────────────────────────────────
    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize, { passive: true });

    // ── Animation loop ────────────────────────────────────────────────────
    let raf;
    const clock = new THREE.Clock();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      // Rotate entire scene (planet + concentric rings) smoothly together around Y
      sceneRotY.v += dt * 0.08;
      scene.rotation.y = sceneRotY.v;

      // Also rotate central planet and wireframe at different rates
      coreMesh.rotation.y += dt * 0.12;
      wireMesh.rotation.y += dt * 0.08;

      // Advance each dot along its ring
      orbitGroups.forEach((o) => {
        o.angle += o.speed * dt;
        o.dot.position.set(
          Math.cos(o.angle) * o.r,
          0,
          Math.sin(o.angle) * o.r,
        );
      });

      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    />
  );
}
