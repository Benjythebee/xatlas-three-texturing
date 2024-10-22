import * as THREE from 'three'
import { Color, DataTexture, DoubleSide, Mesh, MeshBasicMaterial, NoColorSpace, OrthographicCamera, PlaneGeometry, Scene, SRGBColorSpace, Texture, WebGLRenderer, WebGLRenderTarget } from 'three'

export default class UVMapper {
  width: number
  height: number
  canvas: HTMLCanvasElement | null = null
  constructor(width: number, height: number,transparent?:boolean) {
    this.width = width
    this.height = height

    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height

    this.context!.fillStyle = "white";
    if (transparent) 
      this.context!.globalAlpha = 0;
    this.context!.fillRect(0, 0, this.width, this.height);
    this.context!.globalAlpha = 1;
    let index = 0
    if(document.getElementsByClassName("UVMapperCanvas").length > 0){
        index = document.getElementsByClassName("UVMapperCanvas").length;
    }
    this.canvas.id = 'UVMapperCanvas'+index

  }

  get context() {
    const canvas = this.canvas
    const ctx = canvas!.getContext('2d',{willReadFrequently:true})
    return ctx
  }

  render(texture: Texture, uvData:{
    newIndices:number[],
    newUVs: THREE.BufferAttribute,
    oldUVs: THREE.BufferAttribute
  },multiplyColor: Color, clearColor: Color, width: number, height: number, isTransparent: boolean, sRGBEncoding = true) {
    // if texture is null or undefined, create a texture only with clearColor (that is color type)
    let img:HTMLImageElement;
    if (!texture) {
      texture = UVMapper.createSolidColorTexture(clearColor, width, height)
      img = new Image(width, height)

      // convert DataTexture to Image
      const data = texture.image.data
      let canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx == null) {
        return
      }
      const imageData = ctx.createImageData(width, height)
      imageData.data.set(data)
      ctx.putImageData(imageData, 0, 0)
      img.src = canvas.toDataURL()
      canvas = null!
    }

    const indices = uvData.newIndices
    const newUVs = uvData.newUVs.array
    const uvAttribute = uvData.oldUVs

    // This will only draw the triangles points, not the whole triangle and texture. FIX ME
    indices.forEach((index, i) => {
        const uvIndex = index * 2;
        const x = newUVs[uvIndex] * this.width;
        const y = newUVs[uvIndex + 1] * this.height;

        // Draw a single pixel or small patch from the texture to the canvas
        // The size and position should be adjusted based on actual needs
        this.context!.drawImage(img||texture.image, 
            uvAttribute.getX(index) * texture.image.width, 
            uvAttribute.getY(index) * texture.image.height, 
            1, // width of the portion in the original texture
            1, // height of the portion in the original texture
            x, 
            y, 
            1, // width on the canvas
            1  // height on the canvas
        );
    });
 
  }

  addCanvasToDOM(id?: string) {
    if(!this.canvas){
      throw new Error("Canvas is null");
    }
    const d = document.createElement('div')
    d.style.display = 'flex'
    d.style.gap = '1rem'
    d.style.flexDirection = 'column'
    const canvasID = this.canvas.id
    d.innerHTML = '<h3>' + (id || 'UVMapper'+canvasID) + '</h3>'
    d.appendChild(this.canvas)
    document.body.appendChild(d)
  }

  getImageData() {
    const context = this.context
    if (context == null) {
      return null
    }
    const data = context.getImageData(0, 0, this.width, this.height)
    return data
  }

  clearRenderer() {
    if(this.canvas){
      this.canvas = null
    }
  }

  destroy() {
    this.canvas = null
  }

  static createSolidColorTexture(color: Color, width: number, height: number) {
    const size = width * height
    const data = new Uint8Array(4 * size)
  
    const r = Math.floor(color.r * 255)
    const g = Math.floor(color.g * 255)
    const b = Math.floor(color.b * 255)
  
    for (let i = 0; i < size; i++) {
      const stride = i * 4
      data[stride] = r
      data[stride + 1] = g
      data[stride + 2] = b
      data[stride + 3] = 255
    }
  
    // used the buffer to create a DataTexture
    const texture = new DataTexture(data, width, height)
    texture.needsUpdate = true
    return texture
  }
}

