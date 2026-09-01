/**
 * UltraTribe 3D Cortical Brain Surface & Heatmap Shader (Three.js)
 */
class Brain3DViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.brainMeshLH = null;
    this.brainMeshRH = null;
    this.hotspotNodes = {};
    this.autoRotate = true;

    this.regionPositions = {
      V1_V2: [new THREE.Vector3(0, -0.6, -1.8), new THREE.Vector3(0, 0.6, -1.8)],     // Occipital
      FFA: [new THREE.Vector3(-1.4, -1.1, -0.5), new THREE.Vector3(1.4, -1.1, -0.5)], // Ventral Temporal
      PPA: [new THREE.Vector3(-0.9, -0.8, -0.9), new THREE.Vector3(0.9, -0.8, -0.9)], // Parahippocampal
      A1_STG: [new THREE.Vector3(-1.7, -0.2, 0.1), new THREE.Vector3(1.7, -0.2, 0.1)],// Auditory STG
      Wernicke: [new THREE.Vector3(-1.6, 0.3, -0.7)],                                  // Left Wernicke
      Broca: [new THREE.Vector3(-1.5, 0.8, 0.5)],                                      // Left Broca
      Amygdala: [new THREE.Vector3(-0.7, -0.6, 0.1), new THREE.Vector3(0.7, -0.6, 0.1)],// Limbic
      DLPFC: [new THREE.Vector3(-1.1, 1.2, 0.9), new THREE.Vector3(1.1, 1.2, 0.9)],   // Prefrontal
    };

    this.initScene();
    this.createBrainMesh();
    this.createHotspotMarkers();
    this.animate();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  initScene() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.08);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 2.5, 4.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Orbit Controls
    if (window.THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxDistance = 10;
      this.controls.minDistance = 2;
    }

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0x223344, 1.5);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xd4af37, 2.0);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00d2d3, 1.2);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);
  }

  createBrainMesh() {
    const brainGroup = new THREE.Group();

    // Create Left & Right Hemispheres with organic cortical folding (gyri/sulci)
    const createHemisphere = (isLeft) => {
      const geo = new THREE.SphereGeometry(1.5, 64, 64);
      const pos = geo.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        // Hemispheric elongation (Front-Back z-axis, Dorsal-Ventral y-axis)
        z *= 1.35;
        y *= 1.05;
        x *= 0.85;

        // Separate and flatten medial wall
        if (isLeft) {
          x = -Math.abs(x) - 0.05;
        } else {
          x = Math.abs(x) + 0.05;
        }

        // Cortical sulcal deformation noise
        const freq = 6.0;
        const noise = Math.sin(x * freq) * Math.cos(y * freq) * Math.sin(z * freq) * 0.08;
        const temporalBulge = Math.exp(-((y + 0.5) ** 2 + (z - 0.2) ** 2) * 2.0) * 0.2;
        const occipitalTaper = Math.exp(-((z + 1.2) ** 2) * 1.5) * -0.15;

        pos.setXYZ(i, x + noise, y + noise + temporalBulge, z + noise + occipitalTaper);
      }

      geo.computeVertexNormals();

      // Vertex color attribute for fMRI BOLD heatmapping
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = 0.1;     // R
        colors[i + 1] = 0.15;// G
        colors[i + 2] = 0.25;// B (resting baseline)
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.35,
        metalness: 0.2,
        wireframe: false,
      });

      return new THREE.Mesh(geo, mat);
    };

    this.brainMeshLH = createHemisphere(true);
    this.brainMeshRH = createHemisphere(false);

    brainGroup.add(this.brainMeshLH);
    brainGroup.add(this.brainMeshRH);
    this.brainGroup = brainGroup;
    this.scene.add(brainGroup);
  }

  createHotspotMarkers() {
    const markerGeo = new THREE.SphereGeometry(0.06, 16, 16);

    Object.entries(this.regionPositions).forEach(([regKey, vecList]) => {
      this.hotspotNodes[regKey] = [];
      vecList.forEach((vec) => {
        const mat = new THREE.MeshBasicMaterial({
          color: 0x00d2d3,
          transparent: true,
          opacity: 0.8,
        });
        const mesh = new THREE.Mesh(markerGeo, mat);
        mesh.position.copy(vec);
        this.brainGroup.add(mesh);
        this.hotspotNodes[regKey].push(mesh);
      });
    });
  }

  updateActivations(activations) {
    if (!this.brainMeshLH || !this.brainMeshRH) return;

    // Heatmap color interpolation function (Blue -> Cyan -> Gold -> Coral Red)
    const getColor = (val) => {
      const v = Math.min(Math.max(val / 100.0, 0.0), 1.0);
      let r = 0.08, g = 0.12, b = 0.22;
      if (v < 0.35) {
        // Cyan glow
        const t = v / 0.35;
        r = 0.08 + t * 0.0;
        g = 0.12 + t * 0.7;
        b = 0.22 + t * 0.6;
      } else if (v < 0.7) {
        // Gold glow
        const t = (v - 0.35) / 0.35;
        r = 0.08 + t * 0.75;
        g = 0.82 + t * -0.15;
        b = 0.82 + t * -0.65;
      } else {
        // Coral Red peak activation
        const t = (v - 0.7) / 0.3;
        r = 0.83 + t * 0.17;
        g = 0.67 + t * -0.45;
        b = 0.17 + t * -0.1;
      }
      return [r, g, b];
    };

    const updateMeshColors = (mesh) => {
      const pos = mesh.geometry.attributes.position;
      const col = mesh.geometry.attributes.color;

      for (let i = 0; i < pos.count; i++) {
        const vPos = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
        let maxActivation = 10.0;

        // Calculate proximity of vertex to each cognitive region
        Object.entries(this.regionPositions).forEach(([regKey, vecList]) => {
          const act = activations[regKey] || 10.0;
          vecList.forEach((rPos) => {
            const dist = vPos.distanceTo(rPos);
            if (dist < 0.9) {
              const weight = Math.exp(-dist * 3.0);
              maxActivation = Math.max(maxActivation, act * weight);
            }
          });
        });

        const [r, g, b] = getColor(maxActivation);
        col.setXYZ(i, r, g, b);
      }
      col.needsUpdate = true;
    };

    updateMeshColors(this.brainMeshLH);
    updateMeshColors(this.brainMeshRH);

    // Update glowing hotspot nodes
    Object.entries(this.hotspotNodes).forEach(([regKey, nodeList]) => {
      const act = activations[regKey] || 10.0;
      const [r, g, b] = getColor(act);
      const scale = 1.0 + (act / 100.0) * 1.5;
      nodeList.forEach((node) => {
        node.material.color.setRGB(r, g, b);
        node.scale.set(scale, scale, scale);
      });
    });
  }

  setCameraView(viewName) {
    if (!this.controls) return;
    if (viewName === "reset") {
      this.camera.position.set(0, 2.5, 4.5);
    } else if (viewName === "left") {
      this.camera.position.set(-5, 0, 0);
    } else if (viewName === "right") {
      this.camera.position.set(5, 0, 0);
    } else if (viewName === "top") {
      this.camera.position.set(0, 6, 0);
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
      this.brainGroup.rotation.y += 0.004;
    }

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
