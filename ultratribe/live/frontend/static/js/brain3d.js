/**
 * UltraTribe Dark Transparent Glass Cortical Model with Real-Time Glowing BOLD Activation
 */
class Brain3DViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.brainRoot = null;
    this.lobarMeshes = [];
    this.autoRotate = false;
    this.isExploded = false;

    this.initScene();
    this.loadGLTFModel();
    this.animate();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  initScene() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 1.5, 4.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.container.appendChild(this.renderer.domElement);

    if (window.THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.maxDistance = 10;
      this.controls.minDistance = 1.5;
    }

    // Studio Rim & Specular Lighting for Dark Transparent Glass
    const ambientLight = new THREE.AmbientLight(0x222222, 1.5);
    this.scene.add(ambientLight);

    // Subtle edge rim lights to define the dark transparent contours
    const rimLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    rimLight1.position.set(6, 10, 8);
    this.scene.add(rimLight1);

    const rimLight2 = new THREE.DirectionalLight(0x888888, 1.2);
    rimLight2.position.set(-6, -6, -6);
    this.scene.add(rimLight2);

    const backRim = new THREE.DirectionalLight(0xd4af37, 1.5);
    backRim.position.set(0, 5, -8);
    this.scene.add(backRim);
  }

  loadGLTFModel() {
    const loader = new THREE.GLTFLoader();
    const modelUrl = "/static/models/lobes_of_the_cerebrum.glb";

    loader.load(
      modelUrl,
      (gltf) => {
        const root = gltf.scene;
        this.brainRoot = root;

        // Auto-center and normalize scale
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.6 / maxDim;

        root.scale.set(scale, scale, scale);
        root.position.sub(center.multiplyScalar(scale));

        // Traverse child meshes: Apply Dark Transparent Colorless Glass Material
        root.traverse((child) => {
          if (child.isMesh) {
            // Dark smoky glass material (Colorless baseline)
            const glassMat = new THREE.MeshStandardMaterial({
              color: 0x1e222b,
              roughness: 0.15,
              metalness: 0.25,
              transparent: true,
              opacity: 0.38,
              depthWrite: false,
              emissive: new THREE.Color(0x000000),
              emissiveIntensity: 0.0,
            });
            child.material = glassMat;

            // Compute centroid for exploded view
            child.geometry.computeBoundingBox();
            const localCenter = child.geometry.boundingBox.getCenter(new THREE.Vector3());
            const dir = localCenter.clone().normalize();
            if (dir.length() < 0.1) dir.set(0, 1, 0);

            child.userData = {
              origPos: child.position.clone(),
              explodeDir: dir,
              partName: child.name,
            };

            this.lobarMeshes.push(child);
          }
        });

        this.scene.add(root);
        console.log(`Loaded ${this.lobarMeshes.length} dark transparent parcellated lobes.`);
      },
      undefined,
      (error) => {
        console.error("GLB Load Error:", error);
      }
    );
  }

  updateActivations(activations) {
    if (!this.lobarMeshes || this.lobarMeshes.length === 0) return;

    const v1 = activations["V1_V2"] || 15.0;
    const ffa = activations["FFA"] || 10.0;
    const a1 = activations["A1_STG"] || 10.0;
    const wernicke = activations["Wernicke"] || 10.0;
    const dlpfc = activations["DLPFC"] || 15.0;
    const tpj = activations["TPJ_Social"] || 10.0;
    const amy = activations["Amygdala"] || 10.0;

    // Map activation levels: ONLY active regions glow/parıldasın!
    this.lobarMeshes.forEach((mesh, idx) => {
      let score = 10.0;

      if (idx === 0) {
        // Frontal Lobe (DLPFC, Executive & Motor)
        score = dlpfc;
      } else if (idx === 1) {
        // Parietal Lobe (TPJ Social Cognition)
        score = tpj;
      } else if (idx === 2) {
        // Temporal Lobe (Auditory A1, Language Wernicke, Face FFA)
        score = (a1 + wernicke + ffa) / 3.0;
      } else if (idx === 3) {
        // Occipital Lobe (Visual V1/V2)
        score = v1;
      } else if (idx === 4) {
        // Cerebellum
        score = (v1 + a1) * 0.35;
      } else {
        // Brainstem / Subcortical Limbic (Amygdala)
        score = amy;
      }

      if (mesh.material) {
        if (score > 30.0) {
          // ACTIVE REGION: Glows brightly with warm gold luminescence (#D4AF37)
          const normScore = (score - 30.0) / 70.0; // 0.0 to 1.0
          mesh.material.emissive.setHex(score > 65 ? 0xd4af37 : 0xc5a880);
          mesh.material.emissiveIntensity = 0.4 + normScore * 2.2;
          mesh.material.opacity = 0.50 + normScore * 0.40;
        } else {
          // RESTING BASELINE: Colorless, Dark & Transparent
          mesh.material.emissive.setHex(0x000000);
          mesh.material.emissiveIntensity = 0.0;
          mesh.material.opacity = 0.35;
        }
      }
    });
  }

  toggleExplodeView() {
    this.isExploded = !this.isExploded;
    const dist = this.isExploded ? 0.45 : 0.0;

    this.lobarMeshes.forEach((mesh) => {
      if (mesh.userData.origPos && mesh.userData.explodeDir) {
        const target = mesh.userData.origPos.clone().add(mesh.userData.explodeDir.clone().multiplyScalar(dist));
        mesh.position.copy(target);
      }
    });

    return this.isExploded;
  }

  setCameraView(viewName) {
    if (!this.controls) return;
    if (viewName === "reset") {
      this.camera.position.set(0, 1.5, 4.2);
    } else if (viewName === "left") {
      this.camera.position.set(-4.5, 0, 0);
    } else if (viewName === "right") {
      this.camera.position.set(4.5, 0, 0);
    } else if (viewName === "top") {
      this.camera.position.set(0, 5.0, 0);
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

    if (this.autoRotate && this.brainRoot) {
      this.brainRoot.rotation.y += 0.004;
    }

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
