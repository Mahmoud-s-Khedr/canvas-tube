import React, { useState, useMemo } from 'react'
import { CanvasAdapter } from '@core/canvas/canvas-adapter'
import { CodeCardGenerator } from '@core/code/code-card-generator'
import { Code, X, Check, Eye } from 'lucide-react'

interface CodeSnippetModalProps {
  adapter: CanvasAdapter | null
  isOpen: boolean
  onClose: () => void
}

const SUPPORTED_LANGUAGES = [
  { id: 'typescript', label: 'TypeScript', ext: '.ts' },
  { id: 'javascript', label: 'JavaScript', ext: '.js' },
  { id: 'python', label: 'Python', ext: '.py' },
  { id: 'go', label: 'Go', ext: '.go' },
  { id: 'rust', label: 'Rust', ext: '.rs' },
  { id: 'java', label: 'Java', ext: '.java' },
  { id: 'c', label: 'C', ext: '.c' },
  { id: 'cpp', label: 'C++', ext: '.cpp' },
  { id: 'sql', label: 'SQL', ext: '.sql' },
  { id: 'bash', label: 'Bash / Shell', ext: '.sh' },
  { id: 'json', label: 'JSON', ext: '.json' },
  { id: 'yaml', label: 'YAML', ext: '.yaml' },
  { id: 'docker', label: 'Dockerfile', ext: 'Dockerfile' }
]

const SAMPLE_CODE: Record<string, string> = {
  typescript: `interface CacheStore<T> {\n  get(key: string): Promise<T | null>\n  set(key: string, value: T, ttlSec: number): Promise<void>\n}\n\nexport class RedisCluster<T> implements CacheStore<T> {\n  async get(key: string): Promise<T | null> {\n    return await redisClient.get(key)\n  }\n}`,
  python: `from fastapi import FastAPI, Depends, HTTPException\n\napp = FastAPI(title="Payment Gateway API")\n\n@app.post("/v1/charge")\nasync def process_charge(payment: PaymentPayload):\n    result = await stripe_client.charge(payment.amount)\n    return {"status": "success", "tx_id": result.id}`,
  go: `package main\n\nimport "net/http"\n\nfunc HealthCheckHandler(w http.ResponseWriter, r *http.Request) {\n    w.Header().Set("Content-Type", "application/json")\n    w.WriteHeader(http.StatusOK)\n    w.Write([]byte(\`{"status":"UP"}\`))\n}`,
  rust: `pub async fn handle_stream(mut stream: TcpStream) -> Result<(), IoError> {\n    let mut buffer = [0; 1024];\n    stream.read(&mut buffer).await?;\n    println!("Received packet of {} bytes", buffer.len());\n    Ok(())\n}`,
  sql: `SELECT \n    u.id,\n    u.username,\n    COUNT(o.id) AS total_orders\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nWHERE u.active = true\nGROUP BY u.id, u.username\nHAVING COUNT(o.id) > 5;`,
  bash: `#!/usr/bin/env bash\nset -euo pipefail\n\necho "Deploying service to Kubernetes cluster..."\nkubectl apply -f ./k8s/deployment.yaml\nkubectl rollout status deployment/canvas-tube-backend`
}

export const CodeSnippetModal: React.FC<CodeSnippetModalProps> = ({
  adapter,
  isOpen,
  onClose
}) => {
  const [language, setLanguage] = useState('typescript')
  const [title, setTitle] = useState('cache_store.ts')
  const [theme, setTheme] = useState<'dark' | 'dracula' | 'github-dark'>('dark')
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [fontSize, setFontSize] = useState(14)
  const [code, setCode] = useState(SAMPLE_CODE.typescript)

  // Generate real-time card
  const generated = useMemo(() => {
    return CodeCardGenerator.generate({
      code,
      language,
      title,
      theme,
      showLineNumbers,
      fontSize
    })
  }, [code, language, title, theme, showLineNumbers, fontSize])

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang)
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.id === newLang)
    const ext = langObj?.ext || `.${newLang}`
    const baseName = title.includes('.') ? title.substring(0, title.lastIndexOf('.')) : title
    setTitle(`${baseName}${ext}`)
    if (SAMPLE_CODE[newLang]) {
      setCode(SAMPLE_CODE[newLang])
    }
  }

  const handleInsert = () => {
    if (!adapter) return

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const sceneCenter = adapter.screenToScene(viewportWidth / 2, viewportHeight / 2)

    const fileId = `code_card_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    adapter.addFile({
      id: fileId,
      mimeType: 'image/svg+xml',
      dataURL: generated.dataUrl,
      created: Date.now()
    })

    adapter.addObject({
      type: 'image',
      x: Math.round(sceneCenter.x - generated.width / 2),
      y: Math.round(sceneCenter.y - generated.height / 2),
      width: generated.width,
      height: generated.height,
      fileId,
      locked: false,
      customData: {
        type: 'code-card',
        language,
        title
      }
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 920,
          maxHeight: '90vh',
          backgroundColor: '#18181b',
          border: '1px solid #3f3f46',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          color: '#f4f4f5'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e1e24'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Code size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Insert Syntax-Highlighted Code Card</div>
              <div style={{ fontSize: 11, color: '#a1a1aa' }}>
                Generates a vector IDE card directly for drawing explanations and callouts
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content (Controls + Editor + Preview) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left: Code Editor & Settings */}
          <div
            style={{
              flex: 1,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderRight: '1px solid #27272a',
              overflowY: 'auto'
            }}
          >
            {/* Top Config Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#09090b',
                    border: '1px solid #3f3f46',
                    borderRadius: 6,
                    padding: '6px 8px',
                    color: '#f4f4f5',
                    fontSize: 12,
                    outline: 'none'
                  }}
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>
                  Filename / Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#09090b',
                    border: '1px solid #3f3f46',
                    borderRadius: 6,
                    padding: '6px 8px',
                    color: '#f4f4f5',
                    fontSize: 12,
                    outline: 'none'
                  }}
                  placeholder="filename.ext"
                />
              </div>
            </div>

            {/* Second Config Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>
                  Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  style={{
                    width: '100%',
                    backgroundColor: '#09090b',
                    border: '1px solid #3f3f46',
                    borderRadius: 6,
                    padding: '6px 8px',
                    color: '#f4f4f5',
                    fontSize: 12,
                    outline: 'none'
                  }}
                >
                  <option value="dark">Dark</option>
                  <option value="dracula">Dracula</option>
                  <option value="github-dark">GitHub Dark</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 4 }}>
                  Font Size ({fontSize}px)
                </label>
                <input
                  type="range"
                  min={11}
                  max={20}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ paddingTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showLineNumbers}
                    onChange={(e) => setShowLineNumbers(e.target.checked)}
                  />
                  <span>Line Numbers</span>
                </label>
              </div>
            </div>

            {/* Code Textarea */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>
                Source Code
              </label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={10}
                style={{
                  width: '100%',
                  flex: 1,
                  backgroundColor: '#09090b',
                  border: '1px solid #3f3f46',
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "'Cascadia Code', Consolas, Monaco, monospace",
                  fontSize: 13,
                  color: '#f4f4f5',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.5
                }}
                placeholder="Paste your source code here..."
              />
            </div>
          </div>

          {/* Right: Live Vector Preview */}
          <div
            style={{
              flex: 1,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#121214',
              overflowY: 'auto'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: '#a1a1aa',
                marginBottom: 10
              }}
            >
              <Eye size={14} />
              <span>Live Vector Card Preview</span>
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#09090b',
                borderRadius: 8,
                border: '1px dashed #27272a',
                padding: 12,
                overflow: 'auto'
              }}
            >
              <div
                style={{ maxWidth: '100%', maxHeight: '100%' }}
                dangerouslySetInnerHTML={{ __html: generated.svg }}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #27272a',
            backgroundColor: '#18181b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: 6,
              color: '#e4e4e7',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleInsert}
            style={{
              padding: '6px 16px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: 6,
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
          >
            <Check size={15} />
            <span>Place on Canvas</span>
          </button>
        </div>
      </div>
    </div>
  )
}
