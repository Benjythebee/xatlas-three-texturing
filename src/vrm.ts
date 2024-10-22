import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {VRM, VRMLoaderPlugin} from '@pixiv/three-vrm'
import * as THREE from 'three'
const loadingManager = new THREE.LoadingManager()
// Models Loader
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.crossOrigin = 'anonymous';
gltfLoader.register((parser) => {
    return new VRMLoaderPlugin(parser, {autoUpdateHumanBones: true })
})
export function loadVRM (url: string): Promise<THREE.Object3D> {
          
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url, (gltf) => {
      resolve(gltf.scene)
    }, undefined, reject)
  })
}