import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeObsAuth } from '../src/core/obs/obs-types'
import { ObsClient } from '../src/core/obs/obs-client'

describe('OBS Studio WebSocket Subsystem', () => {
  describe('computeObsAuth', () => {
    it('computes consistent challenge response hashes', async () => {
      const password = 'supersecretpassword'
      const salt = 'dGVzdHNhbHQ='
      const challenge = 'dGVzdGNoYWxsZW5nZQ=='

      const auth1 = await computeObsAuth(password, salt, challenge)
      const auth2 = await computeObsAuth(password, salt, challenge)

      expect(auth1).toBeDefined()
      expect(typeof auth1).toBe('string')
      expect(auth1.length).toBeGreaterThan(20)
      expect(auth1).toBe(auth2)
    })

    it('produces different hashes for different passwords', async () => {
      const salt = 'c2FsdDEyMw=='
      const challenge = 'Y2hhbGxlbmdlMTIz'

      const authA = await computeObsAuth('passA', salt, challenge)
      const authB = await computeObsAuth('passB', salt, challenge)

      expect(authA).not.toBe(authB)
    })
  })

  describe('ObsClient state and listener lifecycle', () => {
    let client: ObsClient

    beforeEach(() => {
      client = new ObsClient()
    })

    it('initializes in disconnected state', () => {
      expect(client.getStatus()).toBe('disconnected')
      expect(client.getCurrentScene()).toBeNull()
      expect(client.getScenes()).toEqual([])
      expect(client.getIsRecording()).toBe(false)
    })

    it('invokes status listeners upon registration', () => {
      const listener = vi.fn()
      const unsubscribe = client.onStatusChange(listener)

      expect(listener).toHaveBeenCalledWith('disconnected')
      unsubscribe()
    })

    it('rejects requests when not connected', async () => {
      await expect(client.sendRequest('GetVersion')).rejects.toThrow('OBS Studio is not connected')
    })
  })
})
