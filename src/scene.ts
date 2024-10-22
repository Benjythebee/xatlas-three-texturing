import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

export const sceneInit = () => {
    const scene = new THREE.Scene()
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    // rotate the directional light to be a key light
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    const sceneElements = new THREE.Object3D();
    scene.add(sceneElements);

    const camera = new THREE.PerspectiveCamera(
        30,
        (window.innerWidth/2) / (window.innerHeight/2),
        0.1,
        1000
    );
    camera.position.set(0, 1.3, 2);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
    });
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 1;
    controls.maxDistance = 4;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enablePan = true;
    controls.target = new THREE.Vector3(0, 1, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    const minPan = new THREE.Vector3(-0.5, 0, -0.5);
    const maxPan = new THREE.Vector3(0.5, 1.5, 0.5);

    const handleResize = () => {
        renderer.setSize(window.innerWidth/2, window.innerHeight/2);
        camera.aspect = (window.innerWidth/2) / (window.innerHeight/2);
        camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);
    renderer.setSize(window.innerWidth/2, window.innerHeight/2);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const clock = new THREE.Clock();
    const animate = () => {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        controls.target.clamp(minPan, maxPan);
        controls?.update();
        renderer.render(scene, camera);
    };

    animate();


    return scene
    }

