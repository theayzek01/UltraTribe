/**
 * UltraTribe OLED True Dark 3D Cortical Brain Engine (Three.js)
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
    this.autoRotate = false;

    this.regionCoordinates = {
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

    this.initScene();
    this.createCorticalSurface();
    this.animate();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  initScene() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 2.0, 5.0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    if (window.THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.maxDistance = 12;
      this.controls.minDistance = 2.2;
    }

    // High-End Studio Lighting (Gold & Bronze Warmth)
    const ambientLight = new THREE.AmbientLight(0x1a1a1a, 2.2);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xd4af37, 2.0);
    dirLight1.position.set(6, 12, 8);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xc5a880, 1.2);
    dirLight2.position.set(-6, -6, -6);
    this.scene.add(dirLight2);
  }

  createCorticalSurface() {
    this.brainGroup = new THREE.Group();

    const createHemisphere = (isLeft) => {
      const geo = new THREE.SphereGeometry(1.55, 96, 96);
      const pos = geo.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        z *= 1.38;
        y *= 1.05;
        x *= 0.86;

        if (isLeft) {
          x = -Math.abs(x) - 0.04;
        } else {
          x = Math.abs(x) + 0.04;
        }

        const f1 = 6.5, f2 = 13.0;
        const gyrus = Math.sin(x * f1) * Math.cos(y * f1) * Math.sin(z * f1) * 0.09;
        const microSulcus = Math.sin(x * f2) * Math.sin(y * f2) * Math.cos(z * f2) * 0.025;
        
        const temporal = Math.exp(-((y + 0.5) ** 2 + (z - 0.2) ** 2) * 2.2) * 0.22;
        const occipital = Math.exp(-((z + 1.3) ** 2) * 1.5) * -0.15;

        pos.setXYZ(i, x + gyrus + microSulcus, y + gyrus + microSulcus + temporal, z + gyrus + microSulcus + occipital);
      }

      geo.computeVertexNormals();

      // Clean OLED Deep Grey Base
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = 0.12;     // R
        colors[i + 1] = 0.12; // G
        colors[i + 2] = 0.12; // B
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.35,
        metalness: 0.15,
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

  updateActivations(activations) {
    if (!this.brainMeshLH || !this.brainMeshRH) return;

    // Elegant Gold & Coral Thermal Color Gradient:
    // Deep Grey (0-25%) -> Bronze (30-55%) -> Muted Gold (60-80%) -> Warm Coral Red (85%+)
    const getThermalColor = (val) => {
      const v = Math.min(Math.max(val / 100.0, 0.0), 1.0);
      let r = 0.12, g = 0.12, b = 0.12;
      if (v > 0.25 && v <= 0.60) {
        const t = (v - 0.25) / 0.35;
        r = 0.12 + t * 0.65;
        g = 0.12 + t * 0.54;
        b = 0.12 + t * 0.38; // Bronze (#C5A880)
      } else if (v > 0.60 && v <= 0.82) {
        const t = (v - 0.60) / 0.22;
        r = 0.77 + t * 0.06;
        g = 0.66 + t * 0.03;
        b = 0.50 + t * -0.28; // Gold (#D4AF37)
      } else if (v > 0.82) {
        const t = (v - 0.82) / 0.18;
        r = 0.83 + t * 0.05;
        g = 0.69 + t * -0.35;
        b = 0.22 + t * 0.08; // Warm Coral Red (#E0564C)
      }
      return [r, g, b];
    };

    const updateMesh = (mesh) => {
      const pos = mesh.geometry.attributes.position;
      const col = mesh.geometry.attributes.color;

      for (let i = 0; i < pos.count; i++) {
        const vPos = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
        let maxAct = 10.0;

        Object.entries(this.regionCoordinates).forEach(([regKey, pList]) => {
          const act = activations[regKey] || 10.0;
          pList.forEach((rPos) => {
            const dist = vPos.distanceTo(rPos);
            if (dist < 1.0) {
              const weight = Math.exp(-dist * 3.0);
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
  }

  setCameraView(viewName) {
    if (!this.controls) return;
    if (viewName === "reset") {
      this.camera.position.set(0, 2.0, 5.0);
    } else if (viewName === "left") {
      this.camera.position.set(-5.5, 0, 0);
    } else if (viewName === "right") {
      this.camera.position.set(5.5, 0, 0);
    } else if (viewName === "top") {
      this.camera.position.set(0, 6.5, 0);
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

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
