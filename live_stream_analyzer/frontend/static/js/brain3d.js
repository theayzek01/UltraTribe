/**
 * Clinical Neuroimaging & fMRI BOLD Cortical Surface Visualizer (FreeSurfer / SPM Standard)
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
    this.roiMarkers = {};
    this.autoRotate = false;
    this.renderMode = "solid"; // solid, transparent, wireframe

    // Standard MNI-152 Approximate Coordinates
    this.anatomicalRegions = {
      V1_V2: { name: "Occipital V1/V2", mni: [0, -92, -2], color: 0x0ea5e9 },
      FFA: { name: "Ventral FFA", mni: [-40, -55, -10], color: 0xf43f5e },
      PPA: { name: "Parahippocampal PPA", mni: [-28, -39, -6], color: 0xf59e0b },
      A1_STG: { name: "Primary Auditory A1", mni: [-54, -20, 8], color: 0x14b8a6 },
      Wernicke: { name: "Wernicke BA22", mni: [-56, -42, 12], color: 0x8b5cf6 },
      Broca: { name: "Broca BA44/45", mni: [-52, 16, 14], color: 0x6366f1 },
      TPJ_Social: { name: "TPJ Social Cognition", mni: [-54, -54, 24], color: 0xec4899 },
      Amygdala: { name: "Limbic Amygdala", mni: [-24, -4, -18], color: 0xf43f5e },
      DLPFC: { name: "Prefrontal DLPFC BA9/46", mni: [-44, 36, 28], color: 0x0ea5e9 },
    };

    this.initClinicalScene();
    this.buildCorticalSurface();
    this.buildSubcorticalStructures();
    this.buildAnatomicalGrid();
    this.animate();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  initClinicalScene() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04070d);

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 2.2, 5.0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.container.appendChild(this.renderer.domElement);

    if (window.THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.maxDistance = 12;
      this.controls.minDistance = 2.0;
    }

    // Surgical Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.2);
    this.scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, 0.8);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);
  }

  buildCorticalSurface() {
    this.brainGroup = new THREE.Group();

    const createHemisphere = (isLeft) => {
      const geo = new THREE.SphereGeometry(1.55, 96, 96);
      const pos = geo.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        // Anatomical scaling
        z *= 1.40;
        y *= 1.05;
        x *= 0.86;

        if (isLeft) {
          x = -Math.abs(x) - 0.04;
        } else {
          x = Math.abs(x) + 0.04;
        }

        // Anatomical Sulcal Creases
        const f1 = 6.5, f2 = 13.0;
        const gyrus = Math.sin(x * f1) * Math.cos(y * f1) * Math.sin(z * f1) * 0.09;
        const sulcus = Math.sin(x * f2) * Math.sin(y * f2) * Math.cos(z * f2) * 0.025;
        
        const temporal = Math.exp(-((y + 0.5) ** 2 + (z - 0.2) ** 2) * 2.2) * 0.22;
        const occipital = Math.exp(-((z + 1.3) ** 2) * 1.5) * -0.15;

        pos.setXYZ(i, x + gyrus + sulcus, y + gyrus + sulcus + temporal, z + gyrus + sulcus + occipital);
      }

      geo.computeVertexNormals();

      // Clinical baseline grey vertex colors
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = 0.22;     // R
        colors[i + 1] = 0.25; // G
        colors[i + 2] = 0.30; // B (Standard MRI Anatomical Grey)
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.45,
        metalness: 0.05,
        wireframe: false,
      });

      return new THREE.Mesh(geo, mat);
    };

    this.brainMeshLH = createHemisphere(true);
    this.brainMeshRH = createHemisphere(false);

    this.brainGroup.add(this.brainMeshLH);
    this.brainGroup.add(this.brainMeshRH);
    this.scene.add(this.brainGroup);
  }

  buildSubcorticalStructures() {
    this.subcorticalGroup = new THREE.Group();

    // Thalamus (Left / Right)
    const thalGeo = new THREE.SphereGeometry(0.3, 24, 24);
    const thalMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3, transparent: true, opacity: 0.8 });
    const thalLH = new THREE.Mesh(thalGeo, thalMat);
    thalLH.position.set(-0.35, 0.0, 0.0);
    const thalRH = new THREE.Mesh(thalGeo, thalMat.clone());
    thalRH.position.set(0.35, 0.0, 0.0);
    this.subcorticalGroup.add(thalLH);
    this.subcorticalGroup.add(thalRH);

    // Amygdala
    const amyGeo = new THREE.SphereGeometry(0.2, 20, 20);
    const amyMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3, transparent: true, opacity: 0.85 });
    const amyLH = new THREE.Mesh(amyGeo, amyMat);
    amyLH.position.set(-0.65, -0.45, 0.1);
    const amyRH = new THREE.Mesh(amyGeo, amyMat.clone());
    amyRH.position.set(0.65, -0.45, 0.1);
    this.subcorticalGroup.add(amyLH);
    this.subcorticalGroup.add(amyRH);

    this.brainGroup.add(this.subcorticalGroup);
  }

  buildAnatomicalGrid() {
    // Medical bounding box wireframe
    const boxGeo = new THREE.BoxGeometry(3.6, 3.2, 4.4);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    this.scene.add(boxMesh);
  }

  updateActivations(activations) {
    if (!this.brainMeshLH || !this.brainMeshRH) return;

    // Standard Clinical fMRI Thermal Look-Up Table (AFNI/SPM Style)
    // Baseline Grey -> Cyan (30%) -> Teal (50%) -> Amber (70%) -> Crimson Red (90%+)
    const getClinicalLUT = (val) => {
      const v = Math.min(Math.max(val / 100.0, 0.0), 1.0);
      let r = 0.22, g = 0.25, b = 0.30;
      if (v > 0.25 && v <= 0.50) {
        const t = (v - 0.25) / 0.25;
        r = 0.22 + t * -0.16;
        g = 0.25 + t * 0.40;
        b = 0.30 + t * 0.60; // Cyan
      } else if (v > 0.50 && v <= 0.75) {
        const t = (v - 0.50) / 0.25;
        r = 0.06 + t * 0.90;
        g = 0.65 + t * -0.03;
        b = 0.90 + t * -0.85; // Amber / Gold
      } else if (v > 0.75) {
        const t = (v - 0.75) / 0.25;
        r = 0.96 + t * 0.04;
        g = 0.62 + t * -0.37;
        b = 0.05 + t * 0.32; // Crimson Red
      }
      return [r, g, b];
    };

    const updateMesh = (mesh) => {
      const pos = mesh.geometry.attributes.position;
      const col = mesh.geometry.attributes.color;

      for (let i = 0; i < pos.count; i++) {
        const vPos = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
        let maxAct = 10.0;

        // Approximate regional coordinates
        const regionPositions = {
          V1_V2: [new THREE.Vector3(0, -0.4, -2.0)],
          FFA: [new THREE.Vector3(-1.5, -0.9, -0.5), new THREE.Vector3(1.5, -0.9, -0.5)],
          PPA: [new THREE.Vector3(-0.9, -0.7, -1.0), new THREE.Vector3(0.9, -0.7, -1.0)],
          A1_STG: [new THREE.Vector3(-1.8, 0.0, 0.1), new THREE.Vector3(1.8, 0.0, 0.1)],
          Wernicke: [new THREE.Vector3(-1.6, 0.4, -0.7)],
          Broca: [new THREE.Vector3(-1.5, 0.8, 0.5)],
          TPJ_Social: [new THREE.Vector3(-1.7, 0.5, -0.3), new THREE.Vector3(1.7, 0.5, -0.3)],
          Amygdala: [new THREE.Vector3(-0.65, -0.45, 0.1), new THREE.Vector3(0.65, -0.45, 0.1)],
          DLPFC: [new THREE.Vector3(-1.2, 1.3, 1.0), new THREE.Vector3(1.2, 1.3, 1.0)],
        };

        Object.entries(regionPositions).forEach(([regKey, pList]) => {
          const act = activations[regKey] || 10.0;
          pList.forEach((rPos) => {
            const dist = vPos.distanceTo(rPos);
            if (dist < 1.0) {
              const weight = Math.exp(-dist * 3.0);
              maxAct = Math.max(maxAct, act * weight);
            }
          });
        });

        const [r, g, b] = getClinicalLUT(maxAct);
        col.setXYZ(i, r, g, b);
      }
      col.needsUpdate = true;
    };

    updateMesh(this.brainMeshLH);
    updateMesh(this.brainMeshRH);
  }

  setPlaneView(plane) {
    if (!this.controls) return;
    if (plane === "axial") {
      this.camera.position.set(0, 6.0, 0); // Axial (Top)
    } else if (plane === "sagittal_l") {
      this.camera.position.set(-6.0, 0, 0); // Sagittal Left
    } else if (plane === "sagittal_r") {
      this.camera.position.set(6.0, 0, 0); // Sagittal Right
    } else if (plane === "coronal") {
      this.camera.position.set(0, 0, 6.0); // Coronal (Anterior)
    } else if (plane === "3d") {
      this.camera.position.set(0, 2.2, 5.0); // 3D Isometric
    }
    this.controls.update();
  }

  setRenderMode(mode) {
    this.renderMode = mode;
    const isTrans = mode === "transparent";
    const isWire = mode === "wireframe";

    const updateMat = (mesh) => {
      mesh.material.wireframe = isWire;
      mesh.material.transparent = isTrans;
      mesh.material.opacity = isTrans ? 0.35 : 1.0;
    };

    updateMat(this.brainMeshLH);
    updateMat(this.brainMeshRH);
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
