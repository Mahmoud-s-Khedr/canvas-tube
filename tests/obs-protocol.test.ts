import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ObsClient } from '../src/core/obs/obs-client'
import { computeObsAuth } from '../src/core/obs/obs-types'

class Socket {
  static instances: Socket[] = []
  readyState = 1
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => Promise<void>) | null = null
  onerror: ((event: unknown) => void) | null = null
  onclose: ((event: { reason?: string }) => void) | null = null
  sent: any[] = []
  constructor(public url: string) { Socket.instances.push(this) }
  send(raw: string) { this.sent.push(JSON.parse(raw)) }
  close() { this.readyState = 3; this.onclose?.({ reason: 'closed' }) }
  async message(message: unknown) { await this.onmessage?.({ data: JSON.stringify(message) }) }
  async response(request: any, data = {}, success = true) {
    await this.message({ op: 7, d: { requestId: request.d.requestId, requestStatus: { result: success, code: success ? 100 : 500, comment: 'rejected' }, responseData: data } })
  }
}
let client: ObsClient
beforeEach(() => { vi.useFakeTimers(); Socket.instances = []; vi.stubGlobal('WebSocket', Socket); client = new ObsClient() })
afterEach(() => { client.disconnect(); expect(vi.getTimerCount()).toBe(0); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
async function connected() {
  const promise = client.connect({ url: 'ws://localhost:4455', password: '', autoReconnect: false })
  const socket = Socket.instances[0]
  await socket.message({ op: 0, d: { rpcVersion: 1 } })
  const identified = socket.message({ op: 2, d: {} })
  await promise
  await socket.response(socket.sent.find(m => m.d?.requestType === 'GetSceneList'), { currentProgramSceneName: 'Main', scenes: ['Main'] })
  // allow syncState's second request to be issued
  await Promise.resolve()
  await socket.response(socket.sent.find(m => m.d?.requestType === 'GetRecordStatus'), { outputActive: false })
  await identified
  return socket
}

describe('OBS protocol and resource lifecycle', () => {
  it('authenticates the handshake, syncs state, delivers events and disposes listeners', async () => {
    const socket = await connected()
    expect(socket.sent[0]).toMatchObject({ op: 1, d: { rpcVersion: 1, eventSubscriptions: 69 } })
    expect(client.getCurrentScene()).toBe('Main'); expect(client.getScenes()).toEqual([{ sceneName: 'Main', sceneIndex: 0 }])
    const scene = vi.fn(), record = vi.fn(), status = vi.fn()
    const disposers = [client.onSceneChange(scene), client.onRecordStateChange(record), client.onStatusChange(status)]
    await socket.message({ op: 5, d: { eventType: 'CurrentProgramSceneChanged', eventData: { sceneName: 'Other' } } })
    await socket.message({ op: 5, d: { eventType: 'RecordStateChanged', eventData: { outputActive: true } } })
    expect(scene).toHaveBeenLastCalledWith('Other', expect.any(Array)); expect(record).toHaveBeenCalledWith(expect.objectContaining({ outputActive: true }))
    const counts = [scene.mock.calls.length, record.mock.calls.length, status.mock.calls.length]
    disposers.forEach(dispose => dispose()); client.disconnect()
    expect([scene.mock.calls.length, record.mock.calls.length, status.mock.calls.length]).toEqual(counts)
    expect(socket.onmessage).toBeNull(); expect(socket.onclose).toBeNull()
  })
  it('sends challenge authentication', async () => {
    const promise = client.connect({ url: '', password: 'secret', autoReconnect: false }); const rejected = expect(promise).rejects.toThrow('cancelled')
    const socket = Socket.instances[0]; const auth = { salt: 'salt', challenge: 'challenge' }
    await socket.message({ op: 0, d: { authentication: auth } })
    expect(socket.sent[0].d.authentication).toBe(await computeObsAuth('secret', auth.salt, auth.challenge))
    client.disconnect(); await rejected
  })
  it('matches out-of-order responses, rejects request failures and ignores unknown ids', async () => {
    const socket = await connected()
    const a = client.sendRequest('A'); const b = client.sendRequest('B'); const rejected = expect(b).rejects.toThrow('OBS request failed (500)')
    const requests = socket.sent.filter(m => ['A', 'B'].includes(m.d?.requestType))
    await socket.response(requests[1], {}, false); await rejected
    await socket.message({ op: 7, d: { requestId: 'unknown' } })
    await socket.response(requests[0], { result: 42 }); expect(await a).toEqual({ result: 42 })
  })
  it('reports malformed messages without disrupting subsequent requests', async () => {
    const socket = await connected(); const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await socket.onmessage?.({ data: '{broken' })
    expect(log).toHaveBeenCalledWith('[ObsClient] Message handling error:', expect.any(Error))
    await socket.message(null); expect(client.getStatus()).toBe('connected')
  })
  it('times out requests and clears pending requests on disconnect', async () => {
    await connected(); const pending = client.sendRequest('Slow'); const assertion = expect(pending).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(5000); await assertion
    const disconnected = client.sendRequest('Pending'); const aborted = expect(disconnected).rejects.toThrow('Client disconnected')
    client.disconnect(); await aborted
  })
  it('rejects an early close and reconnects after connection loss', async () => {
    const promise = client.connect({ url: 'ws://localhost', password: '', autoReconnect: true, reconnectIntervalMs: 100 })
    const rejected = expect(promise).rejects.toThrow('closed before identification')
    Socket.instances[0].close(); await rejected
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await vi.advanceTimersByTimeAsync(100)
    expect(Socket.instances).toHaveLength(2); expect(log).toHaveBeenCalledOnce()
    client.disconnect(); await Promise.resolve()
  })
  it('times out the initial handshake without dangling timers', async () => {
    const promise = client.connect({ url: 'ws://localhost', password: '', autoReconnect: false })
    const rejected = expect(promise).rejects.toThrow('connection timed out')
    await vi.advanceTimersByTimeAsync(5000); await rejected
  })
})
