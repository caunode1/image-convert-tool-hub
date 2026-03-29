interface ImportMetaEnv {
  readonly VITE_SPECIAL_FORMAT_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'utif' {
  type TiffIfd = Record<string, unknown>

  const UTIF: {
    decode(buffer: ArrayBuffer): TiffIfd[]
    decodeImage(buffer: ArrayBuffer, ifd: TiffIfd): void
    toRGBA8(ifd: TiffIfd): Uint8Array
  }

  export default UTIF
}
