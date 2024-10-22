import * as THREE from "three";
import { UVUnwrapper } from "xatlas-three";
import { mergeGeometry } from "./merge-geometry";
import UVMapper from "./UVMapper";
import { UVsDebug } from "./utils";

function createContext({ width, height, transparent, addToBody=false}:{width:number, height:number, transparent:boolean, addToBody?:boolean}) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if(!context) throw new Error("Could not create 2d context");
    context.fillStyle = "white";
    if (transparent) 
        context.globalAlpha = 0;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalAlpha = 1;
    if(addToBody){
        let index = 0
        if(document.getElementsByClassName("textureCanvas").length > 0){
            index = document.getElementsByClassName("textureCanvas").length;
        }
        canvas.id = "textureCanvas"+index;
        canvas.className = "textureCanvas";
        document.body.appendChild(canvas);
    }
    return context;
  }
function getTextureImage(material:THREE.Material|THREE.Material[], textureName:keyof THREE.Material) {

    // material can come in arrays or single values, in case of ccoming in array take the first one
    material = 'length' in material && material.length ?material[0]: material ;
    return textureName in material && (material as any)[textureName]?.image;
  }
function getTexture(material:THREE.Material|THREE.Material[], textureName:keyof THREE.Material) {
    material = 'length' in material && material.length ?material[0]: material ;
    const newTexture = (material as any)[textureName] && (material as any)[textureName].clone();
    return newTexture;
  }
  

  const imageToMaterialMapping = {
    diffuse: ["map"],
    normal: ["normalMap"],
    orm: ["ormMap", "aoMap", "roughnessMap", "metalnessMap"]
  }as Record<string,any[]>

export const createTextureAtlas = async ({ meshes, atlasSize, transparentMaterial, transparentTexture, twoSidedMaterial, scale=1,unwrapper }:{
    meshes:THREE.Mesh[],
    atlasSize:number,
    transparentMaterial:boolean,
    transparentTexture:boolean,
    twoSidedMaterial:boolean,
    scale:number,
    unwrapper:UVUnwrapper
  }) => {
  
    const ATLAS_SIZE_PX = atlasSize;
    const IMAGE_NAMES =["diffuse", "orm", "normal"];// not using normal texture for now
    const bakeObjects:{material:THREE.MeshStandardMaterial|THREE.ShaderMaterial,mesh:(THREE.Mesh| THREE.SkinnedMesh)}[] = [];
  
    // save material color from here
  
    meshes.forEach((mesh) => {
  
      mesh = mesh.clone();
  
      const material = ('length' in mesh.material && mesh.material.length ? mesh.material[0]:mesh.material) as THREE.ShaderMaterial | THREE.MeshStandardMaterial
      // check if bakeObjects objects that contain the material property with value of mesh.material
      let bakeObject = bakeObjects.find((bakeObject) => {
        bakeObject.material === material;
      });
      if (!bakeObject) {
        bakeObjects.push({ material, mesh });
      }
      else {
        const { dest } = mergeGeometry({ meshes: [bakeObject.mesh, mesh] , scale});
        //@TODO fix this
        bakeObject.mesh.geometry = dest as unknown as THREE.BufferGeometry;
      }
    });
  
    // create the canvas to draw textures
    //transparent: (name == "diffuse" && drawTransparent)
    const contexts = Object.fromEntries(
      IMAGE_NAMES.map((name) => [name, createContext({ width: ATLAS_SIZE_PX, height: ATLAS_SIZE_PX, transparent:transparentTexture && name == "diffuse" })])
    );
    const uvMappers = Object.fromEntries(
        IMAGE_NAMES.map((name) => [name, new UVMapper(ATLAS_SIZE_PX, ATLAS_SIZE_PX,transparentTexture && name == "diffuse" )])
      );
    
    const bakeObjectsWithNoTextures:Set<THREE.Mesh>=new Set()
  
    bakeObjects.forEach((bakeObject) => {
        let hasNoTexture = true
        for(const name of IMAGE_NAMES){
          for(const textureName of (imageToMaterialMapping as Record<string,any[]>)[name]){
            const texture = getTextureImage(bakeObject.material, textureName)
            if(texture){
              if(hasNoTexture){
                hasNoTexture = false;
                break;
              }
            }
          }
        }
        if(hasNoTexture){
          bakeObjectsWithNoTextures.add(bakeObject.mesh)
          // mesh has no texture whatsoever
          return [bakeObject.mesh, 0];
        }
        
    })
    
    const meshByGeom = new Map<THREE.BufferGeometry, THREE.Mesh|THREE.SkinnedMesh>(bakeObjects.map((bakeObject)=>{
        return [bakeObject.mesh.geometry, bakeObject.mesh]
      }))

    // Pack all geometries into a single atlas
    const xatlas = await unwrapper.packAtlas(bakeObjects.map((t)=>t.mesh.geometry), 'uv2');

    console.log(xatlas)

    let usesNormal = false;
    bakeObjects.forEach((bakeObject) => {
        const { material,mesh } = bakeObject;
        // If the mesh has no texture, we don't need to draw anything;
        if(bakeObjectsWithNoTextures.has(bakeObject.mesh)) return
        
        const geometry = xatlas.geometries.find((geom) => geom.uuid === mesh.geometry.uuid)!
        const xatlasMesh = xatlas.meshes.find((t)=>t.mesh === mesh.geometry.uuid)!
        const newIndices = xatlasMesh!.index;
        const newUVs = geometry.attributes.uv as THREE.BufferAttribute;
        const oldUVs = meshByGeom.get(geometry)!.geometry.attributes.uv as THREE.BufferAttribute;
        
        IMAGE_NAMES.forEach((name) => {
            const mapper = uvMappers[name];
            mapper.context!.globalCompositeOperation = "source-over";
            // const context = contexts[name];
            //context.globalAlpha = transparent ? 0.2 : 1;
            // context.globalCompositeOperation = "source-over";

            // set white color base
            let clearColor;
            let multiplyColor = new THREE.Color(1, 1, 1);
            switch (name) {
            case 'diffuse':
                clearColor = (material as THREE.MeshStandardMaterial).color;
                if ((material as THREE.ShaderMaterial).uniforms?.litFactor){
                multiplyColor = (material as THREE.ShaderMaterial).uniforms.litFactor.value;
                }
                else{
                multiplyColor = (material as THREE.MeshStandardMaterial).color;
                }
                break;
            case 'normal':
                clearColor = new THREE.Color(0x8080ff);
                break;
            case 'orm':
                clearColor = new THREE.Color(0, (material as THREE.MeshStandardMaterial).roughness, (material as THREE.MeshStandardMaterial).metalness);
                break;
            default:
                clearColor = new THREE.Color(1, 1, 1);
                break;
            }
            // iterate through imageToMaterialMapping[name] and find the first image that is not null
            let texture = getTexture(material, (imageToMaterialMapping as Record<string,any[]>)[name].find((textureName) => getTextureImage(material, textureName)));
            if (usesNormal == false && name == 'normal' && texture != null){
                usesNormal = true;
            }
            mapper.render(texture, {
                newIndices: newIndices!,
                newUVs,
                oldUVs
            },multiplyColor, clearColor, ATLAS_SIZE_PX, ATLAS_SIZE_PX, name == 'diffuse' && transparentTexture,name != 'normal');
            const data = mapper.getImageData();
            // createImageBitmap(data!)// bmp is trasnaprent
            // .then((bmp) => context.drawImage(bmp, 0, 0, ATLAS_SIZE_PX, ATLAS_SIZE_PX));
        }
        );
        
    });

    for(const [key,mapper] of Object.entries(uvMappers)){
        mapper.addCanvasToDOM(key);
    }

    // uvMapper.addCanvasToDOM();

  
  
    // Create textures from canvases
    const textures = Object.fromEntries(
      await Promise.all(
        IMAGE_NAMES.map(async (name) => {
          const texture = new THREE.Texture(contexts[name].canvas)
          texture.flipY = false;
          //const matName = (mtoon ? "mtoon_" : "standard") + (transparentMaterial ? "transp_":"opaque_");
          //texture.name = matName + name;
          return [name, texture];
        })
      )
    );
    const side = twoSidedMaterial ? THREE.DoubleSide : THREE.FrontSide;

    const materialPostName = transparentMaterial ? "transparent":"opaque"

    let material = new THREE.MeshStandardMaterial({
        map: textures["diffuse"],
        roughnessMap: textures["orm"],
        metalnessMap:  textures["orm"],
        normalMap: usesNormal ? textures["normal"]:null,
        transparent: transparentMaterial,
        side:side
    });

    // make sure to avoid in transparent material alphatest
    if (transparentTexture && !transparentMaterial){  
    material.alphaTest = 0.5;
    }
    material.name = "standard_" + materialPostName;

    if (material.roughnessMap != null)
    material.roughnessMap.name = material.name + "_orm";
    if (material.normalMap != null)
    material.normalMap.name = material.name + "_normal";

    // xxxreturn material with textures, dont return uvs nor textures
    return { bakeObjects, material };
  };