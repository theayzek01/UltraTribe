/**
 * Parcellated Transparent Anatomical 3D Brain Model (Clinical FreeSurfer / Lobar Parcellation)
 */
class Brain3DViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.brainGroup = null;
    this.lobarMeshes = {};
    this.subcorticalMeshes = {};
    this.autoRotate = false;
    this.isExploded = false; // Parcellated exploded view toggle

    this.lobarDefinitions = {
      frontal_lh: { name: "Sol Frontal Lob", color: 0x0ea5e9, center: new THREE.Vector3(-0.7, 0.5, 0.7), dir: new THREE.Vector3(-0.3, 0.2, 0.4) },
      frontal_rh: { name: "Sağ Frontal Lob", color: 0x0ea5e9, center: new THREE.Vector3(0.7, 0.5, 0.7), dir: new THREE.Vector3(0.3, 0.2, 0.4) },
      parietal_lh: { name: "Sol Paryetal Lob", color: 0x8b5cf6, center: new THREE.Vector3(-0.7, 0.8, -0.4), dir: new THREE.Vector3(-0.2, 0.4, -0.2) },
      parietal_rh: { name: "Sağ Paryetal Lob", color: 0x8b5cf6, center: new THREE.Vector3(0.7, 0.8, -0.4), dir: new THREE.Vector3(0.2, 0.4, -0.2) },
      temporal_lh: { name: "Sol Temporal Lob", color: 0x14b8a6, center: new THREE.Vector3(-1.1, -0.3, 0.0), dir: new THREE.Vector3(-0.5, -0.2, 0.0) },
      temporal_rh: { name: "Sağ Temporal Lob", color: 0x14b8a6, center: new THREE.Vector3(1.1, -0.3, 0.0), dir: new THREE.Vector3(0.5, -0.2, 0.0) },
      occipital_lh: { name: "Sol Oksipital Lob", color: 0xf59e0b, center: new THREE.Vector3(-0.5, -0.1, -1.3), dir: new THREE.Vector3(-0.2, 0.0, -0.5) },
      occipital_rh: { name: "Sağ Oksipital Lob", color: 0xf59e0b, center: new THREE.Vector3(0.5, -0.1, -1.3), dir: new THREE.Vector3(0.2, 0.0, -0.5) },
      cerebellum: { name: "Beyincik (Cerebellum)", color: 0x64748b, center: new THREE.Vector3(0.0, -0.9, -0.9), dir: new THREE.Vector3(0.0, -0.4, -0.3) },
    };

    this.initScene();
    this.buildParcellatedLobarBrain();
    this.buildInternalNuclei();
    this.animate();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  initScene() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04070d);

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 2.0, 5.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    if (window.THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.maxDistance = 12;
      this.controls.minDistance = 2.0;
    }

    // Surgical Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0f172a, 1.4);
    this.scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight1.position.set(6, 10, 8);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.0);
    dirLight2.position.set(-6, -6, -6);
    this.scene.add(dirLight2);

    // Anatomical orientation wireframe box
    const boxGeo = new THREE.BoxGeometry(3.6, 3.2, 4.4);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true });
    this.scene.add(new THREE.Mesh(boxGeo, boxMat));
  }

  buildParcellatedLobarBrain() {
    this.brainGroup = new THREE.Group();

    // Create each anatomical lobe as an individual parcellated transparent mesh
    Object.entries(this.lobarDefinitions).forEach(([lobeKey, def]) => {
      let geo;
      if (lobeKey === "cerebellum") {
        geo = new THREE.SphereGeometry(0.75, 48, 48);
        geo.scale(1.2, 0.7, 0.9);
      } else {
        geo = new THREE.SphereGeometry(0.85, 48, 48);
        geo.scale(0.9, 1.1, 1.2);
      }

      // Add anatomical gyral noise
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);
        const noise = Math.sin(x * 8.0) * Math.cos(y * 8.0) * Math.sin(z * 8.0) * 0.04;
        pos.setXYZ(i, x + noise, y + noise, z + noise);
      }
      geo.computeVertexNormals();

      // Transparent Medical Glass Material with glowing BOLD emission
      const mat = new THREE.MeshPhysicalMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 0.1,
        roughness: 0.2,
        metalness: 0.05,
        transmission: 0.65,
        transparent: true,
        opacity: 0.60,
        depthWrite: true,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(def.center);
      mesh.userData = { defaultPos: def.center.clone(), dir: def.dir.clone(), baseColor: def.color };

      this.lobarMeshes[lobeKey] = mesh;
      this.brainGroup.add(mesh);
    });

    this.scene.add(this.brainGroup);
  }

  buildInternalNuclei() {
    // 1. Thalamus
    const thalGeo = new THREE.SphereGeometry(0.28, 24, 24);
    const thalMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    });
    const thalLH = new THREE.Mesh(thalGeo, thalMat);
    thalLH.position.set(-0.35, 0.0, 0.0);
    const thalRH = new THREE.Mesh(thalGeo, thalMat.clone());
    thalRH.position.set(0.35, 0.0, 0.0);
    this.brainGroup.add(thalLH);
    this.brainGroup.add(thalRH);

    // 2. Amygdala
    const amyGeo = new THREE.SphereGeometry(0.20, 20, 20);
    const amyMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.95,
    });
    const amyLH = new THREE.Mesh(amyGeo, amyMat);
    amyLH.position.set(-0.65, -0.45, 0.15);
    const amyRH = new THREE.Mesh(amyGeo, amyMat.clone());
    amyRH.position.set(0.65, -0.45, 0.15);
    this.brainGroup.add(amyLH);
    this.brainGroup.add(amyRH);

    this.subcorticalMeshes["thalamus"] = [thalLH, thalRH];
    this.subcorticalMeshes["amygdala"] = [amyLH, amyRH];
  }

  updateActivations(activations) {
    // Map activations to specific parcellated lobes
    const v1 = activations["V1_V2"] || 20.0;
    const ffa = activations["FFA"] || 10.0;
    const a1 = activations["A1_STG"] || 15.0;
    const wernicke = activations["Wernicke"] || 15.0;
    const dlpfc = activations["DLPFC"] || 20.0;
    const tpj = activations["TPJ_Social"] || 15.0;
    const amy = activations["Amygdala"] || 10.0;

    const setLobeGlow = (lobeKey, score, peakColor = 0xf43f5e) => {
      const mesh = this.lobarMeshes[lobeKey];
      if (!mesh) return;
      const intensity = Math.max(0.1, (score / 100.0) * 1.6);
      mesh.material.emissiveIntensity = intensity;
      mesh.material.opacity = Math.min(0.85, 0.45 + (score / 100.0) * 0.4);
      if (score > 65) {
        mesh.material.emissive.setHex(peakColor);
      } else {
        mesh.material.emissive.setHex(mesh.userData.baseColor);
      }
    };

    // Frontal: DLPFC & Broca
    setLobeGlow("frontal_lh", (dlpfc + (activations["Broca"] || 10.0)) / 2.0);
    setLobeGlow("frontal_rh", dlpfc);

    // Parietal: TPJ Social
    setLobeGlow("parietal_lh", tpj);
    setLobeGlow("parietal_rh", tpj);

    // Temporal: A1 Auditory, FFA Face, Wernicke Language
    setLobeGlow("temporal_lh", (a1 + wernicke + ffa) / 3.0);
    setLobeGlow("temporal_rh", (a1 + ffa) / 2.0);

    // Occipital: V1/V2 Visual
    setLobeGlow("occipital_lh", v1, 0xf59e0b);
    setLobeGlow("occipital_rh", v1, 0xf59e0b);

    // Subcortical Amygdala
    if (this.subcorticalMeshes["amygdala"]) {
      const amyIntensity = 0.4 + (amy / 100.0) * 2.0;
      this.subcorticalMeshes["amygdala"].forEach((m) => {
        m.material.emissiveIntensity = amyIntensity;
        const scale = 1.0 + (amy / 100.0) * 0.5;
        m.scale.set(scale, scale, scale);
      });
    }
  }

  toggleExplodeView() {
    this.isExploded = !this.isExploded;
    const dist = this.isExploded ? 0.6 : 0.0;

    Object.values(this.lobarMeshes).forEach((mesh) => {
      const target = mesh.userData.defaultPos.clone().add(mesh.userData.dir.clone().multiplyScalar(dist));
      mesh.position.copy(target);
    });

    return this.isExploded;
  }

  setPlaneView(plane) {
    if (!this.controls) return;
    if (plane === "axial") {
      this.camera.position.set(0, 6.0, 0);
    } else if (plane === "sagittal_l") {
      this.camera.position.set(-6.0, 0, 0);
    } else if (plane === "sagittal_r") {
      this.camera.position.set(6.0, 0, 0);
    } else if (plane === "coronal") {
      this.camera.position.set(0, 0, 6.0);
    } else if (plane === "3d") {
      this.camera.position.set(0, 2.0, 5.2);
    }
    this.controls.update();
  }

  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.autoRotate && this.brainGroup) {
      this.brainGroup.rotation.y += 0.003;
    }

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
