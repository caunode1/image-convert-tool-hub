import sharp from 'sharp'
import path from 'node:path'

const base = '/Users/lwjun/.openclaw/workspace/archive/projects/image-convert-tool-hub/web/tmp-verification'
const samples = [
  ['pdf-single', 'qa-single.pdf'],
  ['pdf-multi', 'qa-multi.pdf'],
  ['heic', 'qa-heic.heic'],
  ['heif', 'qa-heif.heif'],
  ['tiff', 'qa-scan.tiff'],
  ['psd', 'qa-layered.psd'],
  ['psd16', 'extra-samples/4x4_16bit_grayscale.psd'],
]

for (const [label, rel] of samples) {
  const file = path.join(base, rel)
  try {
    const img = sharp(file, { pages: -1, density: 144, animated: true })
    const meta = await img.metadata()
    console.log(JSON.stringify({ label, rel, ok: true, meta }, null, 2))
  } catch (error) {
    console.log(JSON.stringify({ label, rel, ok: false, error: String(error) }, null, 2))
  }
}
