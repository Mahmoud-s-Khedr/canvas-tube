/**
 * OBS Studio WebSocket v5 Client
 *
 * Provides connection management, authentication, scene switching,
 * and recording status synchronization with OBS Studio.
 */

import {
  ObsOpCode,
  ObsConnectionStatus,
  ObsConfig,
  ObsScene,
  ObsRecordState,
  ObsHelloData,
  ObsResponseMessage,
  ObsEventMessage,
  computeObsAuth
} from './obs-types'

export type ObsStatusListener = (status: ObsConnectionStatus, message?: string) => void
export type ObsSceneListener = (currentScene: string, scenes: ObsScene[]) => void
export type ObsRecordListener = (state: ObsRecordState) => void
export type { ObsConnectionStatus } from './obs-types'

export class ObsClient {
  private ws: any = null
  private config: ObsConfig | null = null
  private status: ObsConnectionStatus = 'disconnected'
  private currentScene: string | null = null
  private scenes: ObsScene[] = []
  private isRecording = false

  private statusListeners = new Set<ObsStatusListener>()
  private sceneListeners = new Set<ObsSceneListener>()
  private recordListeners = new Set<ObsRecordListener>()

  private pendingRequests = new Map<
    string,
    {
      resolve: (data: any) => void
      reject: (err: Error) => void
      timeout: any
    }
  >()

  private reconnectTimer: any = null
  private isExplicitDisconnect = false

  public getStatus(): ObsConnectionStatus {
    return this.status
  }

  public getCurrentScene(): string | null {
    return this.currentScene
  }

  public getScenes(): ObsScene[] {
    return [...this.scenes]
  }

  public getIsRecording(): boolean {
    return this.isRecording
  }

  public onStatusChange(listener: ObsStatusListener): () => void {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => this.statusListeners.delete(listener)
  }

  public onSceneChange(listener: ObsSceneListener): () => void {
    this.sceneListeners.add(listener)
    if (this.currentScene !== null) {
      listener(this.currentScene, this.scenes)
    }
    return () => this.sceneListeners.delete(listener)
  }

  public onRecordStateChange(listener: ObsRecordListener): () => void {
    this.recordListeners.add(listener)
    return () => this.recordListeners.delete(listener)
  }

  private setStatus(status: ObsConnectionStatus, message?: string): void {
    this.status = status
    for (const listener of this.statusListeners) {
      try {
        listener(status, message)
      } catch (err) {
        console.error('[ObsClient] Status listener error:', err)
      }
    }
  }

  /**
   * Connect to an OBS WebSocket v5 server.
   */
  public async connect(config: ObsConfig): Promise<void> {
    this.disconnect()
    this.config = config
    this.isExplicitDisconnect = false
    this.setStatus('connecting')

    return new Promise<void>((resolve, reject) => {
      let isResolved = false

      try {
        // Use global WebSocket (browser or modern runtime)
        const wsUrl = config.url.trim() || 'ws://localhost:4455'
        const WS = (globalThis as any).WebSocket
        if (!WS) {
          throw new Error('WebSocket is not supported in this runtime')
        }
        const socket = new WS(wsUrl)
        this.ws = socket

        const connectTimeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true
            this.setStatus('error', 'Connection timed out after 5000ms')
            try {
              socket.close()
            } catch {
              // Ignore
            }
            reject(new Error('OBS connection timed out'))
          }
        }, 5000)

        socket.onopen = () => {
          // Handshake begins with Hello received from server
        }

        socket.onmessage = async (event: any) => {
          try {
            const raw = typeof event.data === 'string' ? event.data : ''
            const message = JSON.parse(raw)
            await this.handleMessage(message, () => {
              if (!isResolved) {
                isResolved = true
                clearTimeout(connectTimeout)
                resolve()
              }
            })
          } catch (err) {
            console.error('[ObsClient] Message handling error:', err)
          }
        }

        socket.onerror = (event: any) => {
          console.warn('[ObsClient] WebSocket error:', event)
          if (!isResolved) {
            isResolved = true
            clearTimeout(connectTimeout)
            this.setStatus('error', 'Failed to connect to OBS WebSocket server')
            reject(new Error('WebSocket connection error'))
          }
        }

        socket.onclose = (event: any) => {
          clearTimeout(connectTimeout)
          this.ws = null
          this.cleanupPendingRequests('WebSocket connection closed')

          if (!this.isExplicitDisconnect) {
            this.setStatus('disconnected', event?.reason || 'Connection lost')
            if (this.config?.autoReconnect) {
              this.scheduleReconnect()
            }
          } else {
            this.setStatus('disconnected', 'Disconnected')
          }
        }
      } catch (err) {
        this.setStatus('error', err instanceof Error ? err.message : 'Unknown connection error')
        reject(err)
      }
    })
  }

  public disconnect(): void {
    this.isExplicitDisconnect = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      try {
        this.ws.close(1000, 'User disconnected')
      } catch {
        // Ignore
      }
      this.ws = null
    }
    this.cleanupPendingRequests('Client disconnected')
    this.setStatus('disconnected')
  }

  private scheduleReconnect(): void {
    if (this.isExplicitDisconnect || !this.config) return
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)

    const interval = this.config.reconnectIntervalMs || 4000
    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitDisconnect && this.status !== 'connected') {
        console.log('[ObsClient] Attempting auto-reconnect to OBS...')
        this.connect(this.config!).catch(() => {
          // Reconnect attempt failed, scheduleReconnect will trigger on socket close
        })
      }
    }, interval)
  }

  private cleanupPendingRequests(reason: string): void {
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timeout)
      req.reject(new Error(`Request ${id} aborted: ${reason}`))
    }
    this.pendingRequests.clear()
  }

  private async handleMessage(message: any, onIdentified: () => void): Promise<void> {
    if (!message || typeof message.op !== 'number') return

    switch (message.op) {
      case ObsOpCode.Hello: {
        const helloData = message.d as ObsHelloData
        let authString: string | undefined

        if (helloData.authentication) {
          const password = this.config?.password || ''
          authString = await computeObsAuth(
            password,
            helloData.authentication.salt,
            helloData.authentication.challenge
          )
        }

        // Send Identify
        const identifyPayload = {
          op: ObsOpCode.Identify,
          d: {
            rpcVersion: 1,
            ...(authString ? { authentication: authString } : {}),
            // Subscribe to Scenes (1 << 2) | General (1 << 0) | Outputs (1 << 6)
            eventSubscriptions: (1 << 0) | (1 << 2) | (1 << 6)
          }
        }
        this.sendRaw(identifyPayload)
        break
      }

      case ObsOpCode.Identified: {
        this.setStatus('connected')
        onIdentified()
        // Automatically fetch initial scenes and record status
        await this.syncState()
        break
      }

      case ObsOpCode.RequestResponse: {
        const resp = message as ObsResponseMessage
        const pending = this.pendingRequests.get(resp.d.requestId)
        if (pending) {
          clearTimeout(pending.timeout)
          this.pendingRequests.delete(resp.d.requestId)

          if (resp.d.requestStatus.result) {
            pending.resolve(resp.d.responseData)
          } else {
            pending.reject(
              new Error(
                `OBS request failed (${resp.d.requestStatus.code}): ${resp.d.requestStatus.comment || 'Unknown error'}`
              )
            )
          }
        }
        break
      }

      case ObsOpCode.Event: {
        const evt = message as ObsEventMessage
        this.handleObsEvent(evt.d.eventType, evt.d.eventData || {})
        break
      }
    }
  }

  private handleObsEvent(eventType: string, eventData: Record<string, any>): void {
    switch (eventType) {
      case 'CurrentProgramSceneChanged': {
        const sceneName = eventData.sceneName
        if (sceneName) {
          this.currentScene = sceneName
          for (const l of this.sceneListeners) {
            try {
              if (this.currentScene) {
                l(this.currentScene, this.scenes)
              }
            } catch (err) {
              console.error(err)
            }
          }
        }
        break
      }

      case 'SceneListChanged': {
        this.getSceneList().catch(console.error)
        break
      }

      case 'RecordStateChanged': {
        this.isRecording = Boolean(eventData.outputActive)
        const recordState: ObsRecordState = {
          outputActive: Boolean(eventData.outputActive),
          outputState: String(eventData.outputState || ''),
          outputPath: eventData.outputPath
        }
        for (const l of this.recordListeners) {
          try {
            l(recordState)
          } catch (err) {
            console.error(err)
          }
        }
        break
      }
    }
  }

  private sendRaw(data: unknown): void {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(data))
    }
  }

  /**
   * Sends a generic RPC request to OBS Studio.
   */
  public async sendRequest<T = any>(
    requestType: string,
    requestData: Record<string, unknown> = {}
  ): Promise<T> {
    if (!this.ws || this.ws.readyState !== 1 || this.status !== 'connected') {
      throw new Error('OBS Studio is not connected')
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`OBS request ${requestType} timed out after 5000ms`))
      }, 5000)

      this.pendingRequests.set(requestId, { resolve, reject, timeout })

      const msg = {
        op: ObsOpCode.Request,
        d: {
          requestType,
          requestId,
          requestData
        }
      }

      this.sendRaw(msg)
    })
  }

  /**
   * Fetches the full list of scenes and the active program scene.
   */
  public async getSceneList(): Promise<{ currentProgramSceneName: string; scenes: ObsScene[] }> {
    const data = await this.sendRequest('GetSceneList')
    const currentSceneName = data?.currentProgramSceneName || ''
    const scenes: ObsScene[] = (data?.scenes || []).map((s: any, idx: number) => ({
      sceneName: typeof s === 'string' ? s : s.sceneName,
      sceneIndex: typeof s?.sceneIndex === 'number' ? s.sceneIndex : idx
    }))

    this.currentScene = currentSceneName
    this.scenes = scenes

    for (const l of this.sceneListeners) {
      try {
        if (this.currentScene) {
          l(this.currentScene, this.scenes)
        }
      } catch (err) {
        console.error(err)
      }
    }

    return { currentProgramSceneName: currentSceneName, scenes }
  }

  /**
   * Switches OBS Studio to the specified Program Scene.
   */
  public async setCurrentProgramScene(sceneName: string): Promise<boolean> {
    try {
      await this.sendRequest('SetCurrentProgramScene', { sceneName })
      this.currentScene = sceneName
      for (const l of this.sceneListeners) {
        try {
          if (this.currentScene) {
            l(this.currentScene, this.scenes)
          }
        } catch (err) {
          console.error(err)
        }
      }
      return true
    } catch (err) {
      console.warn(`[ObsClient] Failed to switch to scene "${sceneName}":`, err)
      return false
    }
  }

  /**
   * Fetches the current recording status from OBS.
   */
  public async getRecordStatus(): Promise<ObsRecordState> {
    const data = await this.sendRequest('GetRecordStatus')
    const state: ObsRecordState = {
      outputActive: Boolean(data?.outputActive),
      outputState: data?.outputActive ? 'RECORDING' : 'STOPPED'
    }
    this.isRecording = state.outputActive
    return state
  }

  /**
   * Starts video recording in OBS Studio.
   */
  public async startRecord(): Promise<boolean> {
    try {
      await this.sendRequest('StartRecord')
      return true
    } catch (err) {
      console.warn('[ObsClient] StartRecord failed:', err)
      return false
    }
  }

  /**
   * Stops video recording in OBS Studio.
   */
  public async stopRecord(): Promise<boolean> {
    try {
      await this.sendRequest('StopRecord')
      return true
    } catch (err) {
      console.warn('[ObsClient] StopRecord failed:', err)
      return false
    }
  }

  /**
   * Toggles video recording in OBS Studio.
   */
  public async toggleRecord(): Promise<boolean> {
    try {
      const resp = await this.sendRequest('ToggleRecord')
      return Boolean(resp?.outputActive)
    } catch (err) {
      console.warn('[ObsClient] ToggleRecord failed:', err)
      return false
    }
  }

  private async syncState(): Promise<void> {
    try {
      await this.getSceneList()
      const rec = await this.getRecordStatus()
      for (const l of this.recordListeners) {
        try {
          l(rec)
        } catch (err) {
          console.error(err)
        }
      }
    } catch (err) {
      console.warn('[ObsClient] Sync state warning:', err)
    }
  }
}

// Export singleton instance for app-wide use
export const obsClient = new ObsClient()
