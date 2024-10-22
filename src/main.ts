import './style.css'
import * as THREE from 'three'
import {sceneInit} from './scene.ts'
import { loadVRM } from './vrm.ts'
import { loadUnwrapper } from './unwrapper.ts'
import {UVsDebug} from './utils.ts'
import type{ UVUnwrapper } from 'xatlas-three'
import { createTextureAtlas } from './create-texture-atlas.ts'
import { mergeGeometry } from './merge-geometry.ts'

let unwrapper:UVUnwrapper = null!




const loadPromises = ()=>{
  return Promise.all([
    loadVRM('/models/drophunter.vrm'),
    loadVRM('/models/cargopants.vrm')
  ])
}

const main = async ()=>{
  const scene = sceneInit()
  const gltfs = await loadPromises()
  gltfs.forEach((gltf)=>{
    scene.add(gltf)
  })

  const meshes:(THREE.Mesh|THREE.SkinnedMesh)[] =[]
  gltfs.forEach((gltf)=>{
    gltf.traverse((child:any)=>{
      if(child.isMesh || child.isSkinnedMesh){
        meshes.push(child)
      }
    })
  })


  const geoms = meshes.map((mesh)=>{
    return mesh.geometry
  })

  /**
   * Unwrap Geometry Test, unneeded
   */
  const unwrapGeometryTest = async ()=>{
      // Unwrap all geometries, where uvs doesn't exist. This is optional
    for (const geom of geoms) {
      if (!geom.attributes.uv)
          await unwrapper.unwrapGeometry(geom);
    }


    const displayUVs = async (geom:THREE.BufferGeometry, name:string)=>{
      const d = document.createElement('div');
      const d1 = document.createElement('div');
      const d2 = document.createElement('div');
      d.style.display = 'flex'
      d.style.gap = '2rem'
      d1.style.flex = '1'
      d2.style.flex = '1'
      d1.innerHTML = '<h3>' + name + '</h3>';
      d1.appendChild(UVsDebug(geom));
      d.appendChild(d1);
      await unwrapper.unwrapGeometry(geom);
      d2.innerHTML = '<h3> Unwrapped </h3>';
      d2.appendChild(UVsDebug(geom));
      d.appendChild(d2);
      document.body.appendChild(d);
    }

    for(let i = 0; i<geoms.length; i++){
      console.log(geoms[i])
      await displayUVs(geoms[i], `UVs for ${meshes[i].name}`)
    }
  }



  
  const packGeometries = async (m:any)=>{

    // const { dest } = mergeGeometry({ meshes, scale:1 },false);
    const mesh = await unwrapFinalGeometry(m)
    createTextureAtlas({
      meshes:[mesh], 
      atlasSize:1024,
      transparentMaterial:false,
      transparentTexture:true,
      twoSidedMaterial:false,
      scale:1,
        unwrapper
      })

  }
  await packGeometries(meshes)
}

loadUnwrapper().then(_unwrapper=>{
  console.log('loaded',_unwrapper)
  unwrapper= _unwrapper
  main()

})

// unwrap final geometry:
const unwrapFinalGeometry = async (meshes:any[])=>{
  const scale = 1
  const { dest } = mergeGeometry({ meshes, scale },false);

  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
  const geometry = new THREE.BufferGeometry();

    geometry.attributes = dest.attributes;
    geometry.morphAttributes = dest.morphAttributes;
    geometry.morphTargetsRelative = true;
    geometry.setIndex(dest.index);

    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        //@ts-ignore
        vertices[i] *= scale;
        //@ts-ignore
        vertices[i + 1] *= scale;
        //@ts-ignore
        vertices[i + 2] *= scale;
    }


    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = "CombinedMesh_";
    mesh.morphTargetInfluences = dest.morphTargetInfluences;
    mesh.morphTargetDictionary = dest.morphTargetDictionary;

  const atlas = await unwrapper.packAtlas([mesh.geometry],'uv');
  atlas.geometries.forEach((geom)=>{
    const canvas = UVsDebug(geom,1024,false)
    document.body.appendChild(canvas)
  })
  return mesh
}


// utils
const getAsArray = <T>(obj:T|Array<T>)=>{
  return Array.isArray(obj) ? obj : [obj]
}

