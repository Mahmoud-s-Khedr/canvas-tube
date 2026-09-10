/**
 * OBS Studio WebSocket v5 Protocol Types & Cryptographic Authentication
 *
 * Implements the official OBS WebSocket v5 protocol specification.
 */

export enum ObsOpCode {
  Hello = 0,
  Identify = 1,
  Identified = 2,
  Reidentify = 3,
  Event = 5,
  Request = 6,
  RequestResponse = 7,
  RequestBatch = 8,
  RequestBatchResponse = 9
}

export type ObsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ObsConfig {
  url: string // e.g. "ws://localhost:4455"
  password?: string
  autoReconnect?: boolean
  reconnectIntervalMs?: number
}

export interface ObsScene {
  sceneName: string
  sceneIndex: number
}

export interface ObsRecordState {
  outputActive: boolean
  outputState: string
  outputPath?: string
}

export interface ObsHelloData {
  obsWebSocketVersion: string
  rpcVersion: number
  authentication?: {
    challenge: string
    salt: string
  }
}

export interface ObsIdentifyData {
  rpcVersion: number
  authentication?: string
  eventSubscriptions?: number
}

export interface ObsRequestMessage {
  op: ObsOpCode.Request
  d: {
    requestType: string
    requestId: string
    requestData?: Record<string, unknown>
  }
}

export interface ObsResponseMessage {
  op: ObsOpCode.RequestResponse
  d: {
    requestType: string
    requestId: string
    requestStatus: {
      result: boolean
      code: number
      comment?: string
    }
    responseData?: Record<string, unknown>
  }
}

export interface ObsEventMessage {
  op: ObsOpCode.Event
  d: {
    eventType: string
    eventIntent: number
    eventData?: Record<string, unknown>
  }
}

/**
 * Computes the OBS WebSocket v5 challenge authentication string.
 *
 * Algorithm:
 * 1. secret = base64(sha256(password + salt))
 * 2. authResponse = base64(sha256(secret + challenge))
 */
export async function computeObsAuth(
  password: string,
  salt: string,
  challenge: string
): Promise<string> {
  const sha256 = async (input: string): Promise<string> => {
    // Node.js or modern browser WebCrypto API
    if (typeof globalThis.crypto?.subtle?.digest === 'function') {
      const encoder = new TextEncoder()
      const data = encoder.encode(input)
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const binaryString = String.fromCharCode(...hashArray)
      return btoa(binaryString)
    }

    // Fallback if running in older node environment without global WebCrypto
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeCrypto = require('node:crypto')
      return nodeCrypto.createHash('sha256').update(input, 'utf8').digest('base64')
    } catch {
      throw new Error('No cryptographic SHA-256 implementation available in runtime.')
    }
  }

  const secret = await sha256(password + salt)
  const authResponse = await sha256(secret + challenge)
  return authResponse
}
