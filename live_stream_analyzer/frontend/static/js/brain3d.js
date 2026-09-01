/**
 * UltraTribe Enterprise 3D Neural Cortex & Synaptic Shader Engine (Three.js)
 */
class Brain3DViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.brainGroup = null;
    this.brainMeshLH = null;
    this.brainMeshRH = null;
    this.subcorticalGroup = null;
    this.synapseParticles = null;
    this.hudLabels = {};
    this.autoRotate = true;
    this.viewMode = "surface"; // surface, xray, wireframe

    this.regionAnatomy = {
      V1_V2: {
        name: "V1/V2 Görsel",
        pos: [new THREE.Vector3(0.0, -0.3, -2.1)],
        color: 0x00d2d3,
      },
      FFA: {
        name: "FFA Yüz",
        pos: [new THREE.Vector3(-1.6, -1.0, -0.6), new THREE.Vector3(1.6, -1.0, -0.6)],
        color: 0xff5e57,
      },
      PPA: {
        name: "PPA Mekan",
        pos: [new THREE.Vector3(-1.0, -0.7, -1.1), new THREE.Vector3(1.0, -0.7, -1.1)],
        color: 0xd4af37,
      },
      A1_STG: {
        name: "A1 İşitsel",
        pos: [new THREE.Vector3(-1.9, 0.0, 0.1), new THREE.Vector3(1.9, 0.0, 0.1)],
        color: 0x00d2d3,
      },
      Wernicke: {
        name: "Wernicke Dil",
        pos: [new THREE.Vector3(-1.7, 0.4, -0.8)],
        color: 0xa29bfe,
      },
      Broca: {
        name: "Broca Motor",
        pos: [new THREE.Vector3(-1.6, 0.9, 0.6)],
        color: 0x6c5ce7,
      },
      TPJ_Social: {
        name: "TPJ Sosyal Chat",
        pos: [new THREE.Vector3(-1.8, 0.6, -0.4), new THREE.Vector3(1.8, 0.6, -0.4)],
        color: 0xff9f43,
      },
      Amygdala: {
        name: "Amigdala Limbik",
        pos: [new THREE.Vector3(-0.7, -0.5, 0.1), new THREE.Vector3(0.7, -0.5, 0.1)],
        color: 0xff5e57,
      },
      DLPFC: {
        name: "DLPFC Dikkat",
        pos: [new THREE.Vector3(-1.2, 1.4, 1.1), new THREE.Vector3(1.2, 1.4, 1.1)],
        color: 0x54a0ff,
      },
    };

    this.initScene();
    this.createBrainAnatomy();
    this.createSubcorticalNuclei();
    this.createSynapticNetwork();
    this.createHUDLabels();
    this.animate();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  initScene() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.06);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(0, 2.8, 5.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    if (window.THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 12;
      this.controls.minDistance = 2.5;
    }

    // High-End Studio Lighting (Gold & Cyan Highlights)
    const ambientLight = new THREE.AmbientLight(0x111c2e, 2.0);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xd4af37, 2.5);
    dirLight1.position.set(6, 12, 8);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00d2d3, 1.8);
    dirLight2.position.set(-6, -6, -6);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xff5e57, 1.5, 10);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);
  }

  createBrainAnatomy() {
    this.brainGroup = new THREE.Group();

    const createCorticalHemisphere = (isLeft) => {
      // High-resolution subdivided sphere for realistic gyral folding
      const geo = new THREE.SphereGeometry(1.6, 96, 96);
      const pos = geo.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        // Anatomic Morphing: Frontal, Temporal, Parietal, Occipital
        z *= 1.42; // Anterior-Posterior length
        y *= 1.08; // Dorsal-Ventral height
        x *= 0.88; // Medial-Lateral width

        // Medial fissure separation
        if (isLeft) {
          x = -Math.abs(x) - 0.06;
        } else {
          x = Math.abs(x) + 0.06;
        }

        // Multi-frequency organic sulci and gyri creases
        const f1 = 7.0, f2 = 14.0;
        const gyrus = Math.sin(x * f1) * Math.cos(y * f1) * Math.sin(z * f1) * 0.11;
        const microSulcus = Math.sin(x * f2) * Math.sin(y * f2) * Math.cos(z * f2) * 0.035;
        
        // Temporal lobe protrusion
        const temporal = Math.exp(-((y + 0.6) ** 2 + (z - 0.2) ** 2) * 2.2) * 0.28;
        // Cerebellar recess
        const occipital = Math.exp(-((z + 1.4) ** 2) * 1.6) * -0.18;
        // Frontal pole curve
        const frontal = Math.exp(-((z - 1.4) ** 2 + (y - 0.3) ** 2) * 2.0) * 0.12;

        pos.setXYZ(i, x + gyrus + microSulcus, y + gyrus + microSulcus + temporal + frontal, z + gyrus + microSulcus + occipital);
      }

      geo.computeVertexNormals();

      // Vertex color attribute for fMRI BOLD thermal mapping
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = 0.08;     // R
        colors[i + 1] = 0.12; // G
        colors[i + 2] = 0.22; // B
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.32,
        metalness: 0.18,
        wireframe: false,
      });

      return new THREE.Mesh(geo, mat);
    };

    this.brainMeshLH = createCorticalHemisphere(true);
    this.brainMeshRH = createCorticalHemisphere(false);

    this.brainGroup.add(this.brainMeshLH);
    this.brainGroup.add(this.brainMeshRH);
    this.scene.add(this.brainGroup);
  }

  createSubcorticalNuclei() {
    this.subcorticalGroup = new THREE.Group();

    // 1. Thalamus (Sensory Relay Hub)
    const thalGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const thalMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      emissive: 0xd4af37,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const thalLH = new THREE.Mesh(thalGeo, thalMat);
    thalLH.position.set(-0.35, 0.0, 0.0);
    const thalRH = new THREE.Mesh(thalGeo, thalMat.clone());
    thalRH.position.set(0.35, 0.0, 0.0);
    this.subcorticalGroup.add(thalLH);
    this.subcorticalGroup.add(thalRH);

    // 2. Amygdala (Emotional Nuclei)
    const amyGeo = new THREE.SphereGeometry(0.22, 24, 24);
    const amyMat = new THREE.MeshStandardMaterial({
      color: 0xff5e57,
      emissive: 0xff5e57,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.9,
    });
    const amyLH = new THREE.Mesh(amyGeo, amyMat);
    amyLH.position.set(-0.7, -0.5, 0.15);
    const amyRH = new THREE.Mesh(amyGeo, amyMat.clone());
    amyRH.position.set(0.7, -0.5, 0.15);
    this.subcorticalGroup.add(amyLH);
    this.subcorticalGroup.add(amyRH);

    this.brainGroup.add(this.subcorticalGroup);
  }

  createSynapticNetwork() {
    // 600 animated synaptic neural particles pulsing along axon pathways
    const particleCount = 600;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    this.particleVelocities = [];

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1.3 + Math.random() * 0.4;

      const x = r * Math.sin(phi) * Math.cos(theta) * 0.85;
      const y = r * Math.sin(phi) * Math.sin(theta) * 1.05;
      const z = r * Math.cos(phi) * 1.35;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 0.82;
      colors[i * 3 + 2] = 0.82; // Cyan particles

      this.particleVelocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.015,
        (Math.random() - 0.5) * 0.015,
        (Math.random() - 0.5) * 0.015
      ));
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    this.synapseParticles = new THREE.Points(geo, mat);
    this.brainGroup.add(this.synapseParticles);
  }

  createHUDLabels() {
    Object.entries(this.regionAnatomy).forEach(([regKey, item]) => {
      this.hudLabels[regKey] = [];
      const nodeGeo = new THREE.SphereGeometry(0.08, 16, 16);

      item.pos.forEach((vPos) => {
        const mat = new THREE.MeshStandardMaterial({
          color: item.color,
          emissive: item.color,
          emissiveIntensity: 0.7,
          roughness: 0.2,
        });
        const mesh = new THREE.Mesh(nodeGeo, mat);
        mesh.position.copy(vPos);

        // Ring aura around node
        const ringGeo = new THREE.RingGeometry(0.12, 0.16, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: item.color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.lookAt(this.camera.position);
        mesh.add(ring);

        this.brainGroup.add(mesh);
        this.hudLabels[regKey].push({ mesh: mesh, ring: ring, baseColor: item.color });
      });
    });
  }

  updateActivations(activations) {
    if (!this.brainMeshLH || !this.brainMeshRH) return;

    // Heatmap Color Scale: Blue/Resting -> Cyan -> Gold -> Coral Red -> White Peak
    const getThermalColor = (val) => {
      const v = Math.min(Math.max(val / 100.0, 0.0), 1.0);
      let r = 0.08, g = 0.12, b = 0.22;
      if (v < 0.3) {
        const t = v / 0.3;
        r = 0.08 + t * 0.0;
        g = 0.12 + t * 0.7;
        b = 0.22 + t * 0.6;
      } else if (v < 0.65) {
        const t = (v - 0.3) / 0.35;
        r = 0.08 + t * 0.75;
        g = 0.82 + t * -0.15;
        b = 0.82 + t * -0.65;
      } else {
        const t = (v - 0.65) / 0.35;
        r = 0.83 + t * 0.17;
        g = 0.67 + t * -0.45;
        b = 0.17 + t * -0.1;
      }
      return [r, g, b];
    };

    const updateMesh = (mesh) => {
      const pos = mesh.geometry.attributes.position;
      const col = mesh.geometry.attributes.color;

      for (let i = 0; i < pos.count; i++) {
        const vPos = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
        let maxAct = 10.0;

        Object.entries(this.regionAnatomy).forEach(([regKey, item]) => {
          const act = activations[regKey] || 10.0;
          item.pos.forEach((rPos) => {
            const dist = vPos.distanceTo(rPos);
            if (dist < 1.1) {
              const weight = Math.exp(-dist * 2.8);
              maxAct = Math.max(maxAct, act * weight);
            }
          });
        });

        const [r, g, b] = getThermalColor(maxAct);
        col.setXYZ(i, r, g, b);
      }
      col.needsUpdate = true;
    };

    updateMesh(this.brainMeshLH);
    updateMesh(this.brainMeshRH);

    // Update HUD region markers
    Object.entries(this.hudLabels).forEach(([regKey, items]) => {
      const act = activations[regKey] || 10.0;
      const [r, g, b] = getThermalColor(act);
      const scale = 1.0 + (act / 100.0) * 1.8;

      items.forEach(({ mesh, ring }) => {
        mesh.material.color.setRGB(r, g, b);
        mesh.material.emissive.setRGB(r, g, b);
        mesh.material.emissiveIntensity = 0.5 + (act / 100.0) * 1.5;
        mesh.scale.set(scale, scale, scale);
        ring.lookAt(this.camera.position);
      });
    });
  }

  setViewMode(mode) {
    this.viewMode = mode;
    const isXray = mode === "xray";
    const isWire = mode === "wireframe";

    const updateMat = (mesh) => {
      mesh.material.wireframe = isWire;
      mesh.material.transparent = isXray;
      mesh.material.opacity = isXray ? 0.35 : 1.0;
      mesh.material.roughness = isXray ? 0.1 : 0.32;
    };

    updateMat(this.brainMeshLH);
    updateMat(this.brainMeshRH);

    if (this.subcorticalGroup) {
      this.subcorticalGroup.visible = true;
    }
  }

  setCameraView(viewName) {
    if (!this.controls) return;
    if (viewName === "reset") {
      this.camera.position.set(0, 2.8, 5.2);
    } else if (viewName === "left") {
      this.camera.position.set(-6, 0, 0);
    } else if (viewName === "right") {
      this.camera.position.set(6, 0, 0);
    } else if (viewName === "front") {
      this.camera.position.set(0, 0, 6.5);
    } else if (viewName === "top") {
      this.camera.position.set(0, 7.5, 0);
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
      this.brainGroup.rotation.y += 0.0035;
    }

    // Animate synaptic particle network
    if (this.synapseParticles) {
      const pos = this.synapseParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        const v = this.particleVelocities[i];
        x += v.x;
        y += v.y;
        z += v.z;

        // Bounding bounce within cortex volume
        if (Math.abs(x) > 1.8) v.x *= -1;
        if (Math.abs(y) > 1.6) v.y *= -1;
        if (Math.abs(z) > 2.2) v.z *= -1;

        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
