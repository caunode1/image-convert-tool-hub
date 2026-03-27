declare module 'utif' {
  type TiffIfd = Record<string, unknown>

  const UTIF: {
    decode(buffer: ArrayBuffer): TiffIfd[]
    decodeImage(buffer: ArrayBuffer, ifd: TiffIfd): void
    toRGBA8(ifd: TiffIfd): Uint8Array
  }

  export default UTIF
}
