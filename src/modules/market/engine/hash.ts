/** Deterministic 32-bit FNV-1a hash, mirrored by the Python engine. */
export function fnv1a32(data: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i += 1) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}