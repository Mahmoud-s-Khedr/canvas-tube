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

  interface Math {
    sumPrecise(values: Iterable<number>): number
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

// PDF.js 6 also uses the proposed Math.sumPrecise API when it calculates font
// tables. Electron 34's Chromium does not provide it yet. The compensated sum
// retains the precision PDF.js needs for its numeric table sizes.
if (typeof Math.sumPrecise !== 'function') {
  Object.defineProperty(Math, 'sumPrecise', {
    configurable: true,
    writable: true,
    value(values: Iterable<number>): number {
      let sum = 0
      let compensation = 0

      for (const value of values) {
        if (typeof value !== 'number') {
          throw new TypeError('Math.sumPrecise values must be numbers')
        }

        const next = sum + value
        compensation +=
          Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum
        sum = next
      }

      return sum + compensation
    }
  })
}

export {}
