import * as THREE from 'three'
import {UVUnwrapper} from 'xatlas-three'

export const loadUnwrapper = async ()=>{
    const unwrapper = new UVUnwrapper({BufferAttribute: THREE.BufferAttribute});
    unwrapper.chartOptions = {
        fixWinding: false,
        maxBoundaryLength: 0,
        maxChartArea: 0,
        maxCost: 2,
        maxIterations: 1,
        normalDeviationWeight: 2,
        normalSeamWeight: 4,
        roundnessWeight: 0.009999999776482582,
        straightnessWeight: 6,
        textureSeamWeight: 0.5,
        useInputMeshUvs: true,
    }
    unwrapper.packOptions = {
        bilinear: true,
        blockAlign: false,
        bruteForce: false,
        createImage: false,
        maxChartSize: 0,
        padding: 0,
        rotateCharts: true,
        rotateChartsToAxis: true,
        resolution: 1024,
        texelsPerUnit: 0
    
        // for multiple atlas
        // resolution: 1024,
        // texelsPerUnit: 16
    }
    unwrapper.useNormals = true
    unwrapper.timeUnwrap = false // Logs time of unwrapping
    unwrapper.logProgress = false // Logs unwrapping progress bar
    

    unwrapper.loadLibrary((mode, progress) => {
        // console.log(mode, progress);
    },
    'https://cdn.jsdelivr.net/npm/xatlasjs@0.2.0/dist/xatlas.wasm',
    'https://cdn.jsdelivr.net/npm/xatlasjs@0.2.0/dist/xatlas.js',
    )
    return unwrapper
}
