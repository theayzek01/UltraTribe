/**
 * UltraTribe 3D Lobes of the Cerebrum Model Loader & BOLD Activation Mapper
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

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 1.5, 4.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    if (window.THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.maxDistance = 10;
      this.controls.minDistance = 1.5;
    }

    // High-End Studio Lighting for True Dark Anatomy
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xd4af37, 2.2);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xc5a880, 1.4);
    dirLight2.position.set(-5, -5, -5);
    this.scene.add(dirLight2);
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

        // Traverse child meshes
        root.traverse((child) => {
          if (child.isMesh) {
            // Ensure unique clone material for dynamic independent BOLD emission
            if (child.material) {
              const origMat = child.material;
              const newMat = new THREE.MeshStandardMaterial({
                map: origMat.map || null,
                color: origMat.color || 0xdddddd,
                roughness: 0.35,
                metalness: 0.1,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0.0,
              });
              child.material = newMat;
            }

            // Compute local center for exploded view
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
        console.log(`GLB Model loaded with ${this.lobarMeshes.length} parcellated meshes.`);
      },
      undefined,
      (error) => {
        console.error("GLB Load Error:", error);
      }
    );
  }

  updateActivations(activations) {
    if (!this.lobarMeshes || this.lobarMeshes.length === 0) return;

    const v1 = activations["V1_V2"] || 20.0;
    const ffa = activations["FFA"] || 10.0;
    const a1 = activations["A1_STG"] || 15.0;
    const wernicke = activations["Wernicke"] || 15.0;
    const dlpfc = activations["DLPFC"] || 20.0;
    const tpj = activations["TPJ_Social"] || 15.0;
    const amy = activations["Amygdala"] || 10.0;

    // Map activation levels to each segmented mesh
    this.lobarMeshes.forEach((mesh, idx) => {
      let score = 20.0;
      let glowColor = new THREE.Color(0xd4af37); // Gold

      if (idx === 0) {
        // Frontal Lobe: DLPFC & Executive
        score = dlpfc;
        glowColor.setHex(score > 60 ? 0xe0564c : 0xd4af37);
      } else if (idx === 1) {
        // Parietal Lobe: TPJ Social
        score = tpj;
        glowColor.setHex(score > 60 ? 0xe0564c : 0xc5a880);
      } else if (idx === 2) {
        // Temporal Lobe: Auditory A1, Language Wernicke, Face FFA
        score = (a1 + wernicke + ffa) / 3.0;
        glowColor.setHex(score > 60 ? 0xe0564c : 0xd4af37);
      } else if (idx === 3) {
        // Occipital Lobe: Visual V1/V2
        score = v1;
        glowColor.setHex(score > 60 ? 0xe0564c : 0xc5a880);
      } else if (idx === 4) {
        // Cerebellum
        score = (v1 + a1) * 0.4;
      } else {
        // Brainstem / Subcortical: Amygdala
        score = amy;
        glowColor.setHex(0xe0564c);
      }

      if (mesh.material) {
        const intensity = Math.max(0.0, (score / 100.0) * 1.5 - 0.2);
        mesh.material.emissive.copy(glowColor);
        mesh.material.emissiveIntensity = intensity;
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
