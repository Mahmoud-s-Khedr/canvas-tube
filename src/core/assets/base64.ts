/** Validate canonical padded Base64; Buffer.from alone silently accepts garbage. */
export function isValidBase64(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length % 4 === 0 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
}

export function assetBase64(value: string): string {
  const clean = value.replace(/^data:[^,]*;base64,/, '').replace(/\s/g, '')
  if (!isValidBase64(clean)) throw new Error('Invalid Base64 asset data')
  return clean
}
