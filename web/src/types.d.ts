declare module 'utif' {
  const UTIF: {
    decode(buffer: ArrayBuffer): any[]
    decodeImage(buffer: ArrayBuffer, ifd: any): void
    toRGBA8(ifd: any): Uint8Array
  }

  export default UTIF
}
