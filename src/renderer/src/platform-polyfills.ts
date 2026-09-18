/**
 * Compatibility shims for the Chromium version bundled with Electron 34.
 *
 * PDF.js 6 uses this recently proposed Map helper, while Chromium 132 does
 * not implement it yet. Define it before PDF.js is evaluated, including when
 * the in-memory fallback worker runs on the renderer thread.
 */
declare global {
  interface Map<K, V> {
    getOrInsertComputed(key: K, callback: (key: K) => V): V
  }
}

if (typeof Map.prototype.getOrInsertComputed !== 'function') {
  Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
    configurable: true,
    writable: true,
    value<K, V>(this: Map<K, V>, key: K, callback: (key: K) => V): V {
      if (this.has(key)) {
        return this.get(key) as V
      }

      const value = callback(key)
      this.set(key, value)
      return value
    }
  })
}

export {}
