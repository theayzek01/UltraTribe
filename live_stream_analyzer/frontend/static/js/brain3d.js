/**
 * UltraTribe Dark Transparent Glass Cortical Model with Dynamic Glowing BOLD Activation
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

    // Studio Rim & Specular Lighting
    const ambientLight = new THREE.AmbientLight(0x222222, 1.6);
    this.scene.add(ambientLight);

    const rimLight1 = new THREE.DirectionalLight(0xffffff, 2.2);
    rimLight1.position.set(6, 10, 8);
    this.scene.add(rimLight1);

    const rimLight2 = new THREE.DirectionalLight(0x888888, 1.4);
    rimLight2.position.set(-6, -6, -6);
    this.scene.add(rimLight2);

    const backRim = new THREE.DirectionalLight(0xd4af37, 1.6);
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

        // Traverse child meshes: Replace all baked textures with pure dark transparent glass
        root.traverse((child) => {
          if (child.isMesh) {
            const darkGlassMat = new THREE.MeshStandardMaterial({
              color: 0x1a1e28,
              roughness: 0.15,
              metalness: 0.20,
              transparent: true,
              opacity: 0.38,
              depthWrite: false,
              emissive: new THREE.Color(0x000000),
              emissiveIntensity: 0.0,
            });
            child.material = darkGlassMat;

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
        console.log(`GLB Model loaded: ${this.lobarMeshes.length} dark transparent parcellated lobes.`);
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

    this.lobarMeshes.forEach((mesh, idx) => {
      let score = 10.0;

      if (idx === 0) {
        score = dlpfc;
      } else if (idx === 1) {
        score = tpj;
      } else if (idx === 2) {
        score = (a1 + wernicke + ffa) / 3.0;
      } else if (idx === 3) {
        score = v1;
      } else if (idx === 4) {
        score = (v1 + a1) * 0.35;
      } else {
        score = amy;
      }

      if (mesh.material) {
        if (score > 30.0) {
          const norm = (score - 30.0) / 70.0;
          mesh.material.emissive.setHex(score > 60 ? 0xd4af37 : 0xc5a880);
          mesh.material.emissiveIntensity = 0.5 + norm * 2.5;
          mesh.material.opacity = 0.45 + norm * 0.45;
        } else {
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
