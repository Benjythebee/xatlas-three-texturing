import * as THREE from "three";
import {mergeAttributes} from "three/examples/jsm/utils/BufferGeometryUtils.js";
type sourceAttributeMap = Map<THREE.SkinnedMesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>|THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>, {
    [name: string]: THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
}>

type sourceMorphAttributesMap = Map<THREE.SkinnedMesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>|THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>, {
    [name: string]: (THREE.BufferAttribute | THREE.InterleavedBufferAttribute)[];
}>
type morphTargetDictionariesMap = Map<THREE.SkinnedMesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>|THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>, {
    [key: string]: number;
}>
function mergeSourceAttributes({ sourceAttributes }:{
    sourceAttributes: sourceAttributeMap
}) {
    const propertyNames = new Set<string>(); // e.g. ["normal", "position", "skinIndex", "skinWeight", "tangent", "uv", "uv2"]
    const allSourceAttributes = Array.from(sourceAttributes.values());
    allSourceAttributes.forEach((sourceAttributes) => {
        Object.keys(sourceAttributes).forEach((name) => propertyNames.add(name));
    });
    const destAttributes:Record<string,THREE.BufferAttribute> = {};
    Array.from(propertyNames.keys()).map((name:any) => {
        destAttributes[name] = mergeAttributes(allSourceAttributes.map((sourceAttributes) => sourceAttributes[name]).flat().filter((attr) => attr !== undefined) as THREE.BufferAttribute[]);
    });
    return destAttributes;
}
function mergeSourceMorphTargetDictionaries({ sourceMorphTargetDictionaries }:{
    sourceMorphTargetDictionaries: morphTargetDictionariesMap
}) {
    const morphNames = new Set(); // e.g. ["MouthFlap", "Blink", "Eye Narrow", "Eye Rotation"]
    const allSourceDictionaries = Array.from(sourceMorphTargetDictionaries.values());
    allSourceDictionaries.forEach((dictionary) => {
        Object.keys(dictionary).forEach((name) => morphNames.add(name));
    });
    const destMorphTargetDictionary:Record<string,any> = {};
    Array.from(morphNames.keys()).map((name, i) => {
        destMorphTargetDictionary[name as string] = i;
    });
    return destMorphTargetDictionary;
}
function mergeSourceMorphAttributes({ meshes, sourceMorphTargetDictionaries, sourceMorphAttributes, destMorphTargetDictionary, scale}:
    {
        meshes: (THREE.SkinnedMesh|THREE.Mesh)[]
        , sourceMorphTargetDictionaries: morphTargetDictionariesMap
        , sourceMorphAttributes: sourceMorphAttributesMap
        , destMorphTargetDictionary: Record<string, number>
        , scale: number
    }
    , isVrm0 = false) {
    const propertyNameSet = new Set<string>(); // e.g. ["position", "normal"]
    const allSourceMorphAttributes = Array.from(sourceMorphAttributes.values());
    allSourceMorphAttributes.forEach((sourceMorphAttributes) => {
        Object.keys(sourceMorphAttributes).forEach((name) => propertyNameSet.add(name));
    });
    const propertyNames = Array.from(propertyNameSet);
    // const morphNames = Object.keys(destMorphTargetDictionary);
    const unmerged:Record<string,any[][]> = {};
    propertyNames.forEach((propName) => {
        unmerged[propName] = [] as any;
        Object.entries(destMorphTargetDictionary).forEach(([morphName, destMorphIndex]) => {
            unmerged[propName][destMorphIndex] = [];
            meshes.forEach((mesh) => {
                let bufferAttribute;
                const morphTargetDictionary = sourceMorphTargetDictionaries.get(mesh)!;
                // eslint-disable-next-line no-prototype-builtins
                if (morphTargetDictionary.hasOwnProperty(morphName) && mesh.geometry.morphAttributes[propName]) {
                    const sourceMorphIndex = morphTargetDictionary[morphName];
                    bufferAttribute = mesh.geometry.morphAttributes[propName][sourceMorphIndex];
                }
                else {
                    const attribute = mesh.geometry.attributes[propName];
                    //@ts-ignore
                    const array = new attribute.array.constructor(new Array(attribute.array.length).fill(0));
                    bufferAttribute = new THREE.BufferAttribute(array, attribute.itemSize, attribute.normalized);
                }
                unmerged[propName][destMorphIndex].push(bufferAttribute);
            });
        });
    });
    const merged:Record<string,THREE.BufferAttribute[]> = {};
    propertyNames.forEach((propName) => {
        merged[propName] = [];
        for (let i =0; i < Object.entries(destMorphTargetDictionary).length ; i++){
            merged[propName][i] = mergeAttributes(unmerged[propName][i]);
            const buffArr = merged[propName][i].array;
            for (let j = 0; j < buffArr.length; j+=3){
                //@ts-ignore
                buffArr[j] *= scale;
                //@ts-ignore
                buffArr[j+1] *= scale;
                //@ts-ignore
                buffArr[j+2] *= scale;
            }
        }
    });
    return merged;
}
function mergeSourceIndices({ meshes }: { meshes: (THREE.SkinnedMesh|THREE.Mesh)[] }) {
    var indexOffset = 0;
    var mergedIndex:number[] = [];
    meshes.forEach((mesh) => {
        const index = mesh.geometry.index;
        // if(!index) return;
        for (var j = 0; j < (index?.count||0); ++j) {
            mergedIndex.push((index?.getX(j)||0) + indexOffset);
        }
        indexOffset += mesh.geometry.attributes.position.count;
    });
    return mergedIndex;
}

function mergeMorphTargetInfluences({ meshes, sourceMorphTargetDictionaries, destMorphTargetDictionary }:{
    meshes: (THREE.SkinnedMesh|THREE.Mesh)[], 
    sourceMorphTargetDictionaries: morphTargetDictionariesMap, 
    destMorphTargetDictionary: Record<string, number>

}) {
    const destMorphTargetInfluences:any[] = [];
    Object.entries(destMorphTargetDictionary).map(([morphName, destIndex]) => {
        const mesh = meshes.find((mesh) => {
            // eslint-disable-next-line no-prototype-builtins
            return sourceMorphTargetDictionaries.get(mesh)?.hasOwnProperty(morphName);
        });
        if(!mesh?.morphTargetDictionary){
            return []
        }
        const sourceIndex = mesh.morphTargetDictionary[morphName];
        if(!mesh.morphTargetInfluences){
            return []
        }
        destMorphTargetInfluences[destIndex] = mesh.morphTargetInfluences[sourceIndex];
        // TODO: Stop / reset animations so that animated morph influences return to their "at rest" values.
        // Maybe the "at rest" values should be baked into attributes (e.g. eye brow shapes) to allow more
        // active morph targets in the combined mesh. Not all morphs should be baked. (e.g. The eyelids
        // that are animated with the "Blinks" animation should not be baked.)
    });
    return destMorphTargetInfluences;
}

export function mergeGeometry({ meshes, scale }:{
    meshes: (THREE.SkinnedMesh | THREE.Mesh)[],
    scale: number
}, isVrm0 = false) {
    // eslint-disable-next-line no-unused-vars
    let uvcount = 0;
    meshes.forEach(mesh => {
        uvcount += mesh.geometry.attributes.uv.count;
        
        // validation for each mesh! if the mesh itself is VRM0 move the vertices
        if (mesh.userData?.isVRM0){
            for (let i = 0; i < mesh.geometry.attributes.position.array.length; i+=3){
                //@ts-ignore
                mesh.geometry.attributes.position.array[i] *= -1
                //@ts-ignore
                mesh.geometry.attributes.position.array[i+2] *= -1
            }
        }
    });
    const source = {
        meshes,
        attributes: new Map(meshes.map((m) => [m, m.geometry.attributes])),
        morphAttributes: new Map(meshes.map((m) => [m, m.geometry.morphAttributes])),
        morphTargetDictionaries: new Map(meshes.map((m) => [m, m.morphTargetDictionary || {}])),
        morphTargetInfluences: new Map(meshes.map((m) => [m, m.morphTargetInfluences || []])),
        // animationClips: new Map(meshes.map((m) => [m, findSceneGroup(m).animations])), //disable for now cuz no animations.
    };
    const dest:{
        attributes: Record<string,THREE.BufferAttribute>,
        morphTargetDictionary: Record<string, number>,
        morphAttributes: Record<string, THREE.BufferAttribute[]>,
        morphTargetInfluences: number[],
        index: number[],
        animations: {}
    } = {
        attributes: null!,
        morphTargetDictionary: null!,
        morphAttributes: null!,
        morphTargetInfluences: null!,
        index: null!,
        animations: {}
    };
    dest.attributes = mergeSourceAttributes({ sourceAttributes: source.attributes });
    const destMorphTargetDictionary = mergeSourceMorphTargetDictionaries({
        sourceMorphTargetDictionaries: source.morphTargetDictionaries,
    });
    dest.morphTargetDictionary = destMorphTargetDictionary;
    dest.morphAttributes = mergeSourceMorphAttributes({
        meshes,
        sourceMorphAttributes: source.morphAttributes,
        sourceMorphTargetDictionaries: source.morphTargetDictionaries,
        destMorphTargetDictionary,
        scale,
    },isVrm0);
    dest.morphTargetInfluences = mergeMorphTargetInfluences({
        meshes,
        sourceMorphTargetDictionaries: source.morphTargetDictionaries,
        destMorphTargetDictionary,
    });
    dest.index = mergeSourceIndices({ meshes });
    //disable for now cuz no animations.
    // dest.animations = remapAnimationClips({
    //   meshes,
    //   animationClips: dedupBy(Array.from(source.animationClips.values()).flat(), "name"),
    //   animationClips: '',
    //   sourceMorphTargetDictionaries: source.morphTargetDictionaries,
    //   destMorphTargetDictionary,
    // });
    dest.animations = {};

    return { source, dest };
}