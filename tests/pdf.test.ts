import { describe, it, expect } from 'vitest'
import {
  createDefaultManifest,
  validateProjectManifest,
  serializeProjectBundle,
  deserializeProjectBundle,
  DocumentEntry,
  AssetEntry
} from '../src/core/project/project-manifest'

describe('PDF & Document Manifest Integration', () => {
  it('stores and validates PDF document entries in manifest', () => {
    const manifest = createDefaultManifest('Distributed Systems Presentation')

    const assetId = 'ast_pdf_12345'
    const pdfAsset: AssetEntry = {
      id: assetId,
      type: 'pdf',
      originalFilename: 'raft_consensus.pdf',
      mimeType: 'application/pdf',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      relativePath: 'documents/raft_consensus.pdf',
      sizeBytes: 1048576,
      createdAt: new Date().toISOString()
    }

    const docEntry: DocumentEntry = {
      id: 'doc_raft_paper',
      assetId,
      filename: 'raft_consensus.pdf',
      pageCount: 18,
      type: 'pdf'
    }

    manifest.assets[assetId] = pdfAsset
    manifest.documents.push(docEntry)

    const validation = validateProjectManifest(manifest)
    expect(validation.valid).toBe(true)
    expect(validation.error).toBeUndefined()
  })

  it('serializes and deserializes project bundles preserving PDF documents and locked slides', () => {
    const manifest = createDefaultManifest('ML Paper Review')
    const docEntry: DocumentEntry = {
      id: 'doc_attention',
      assetId: 'ast_attention_pdf',
      filename: 'attention_is_all_you_need.pdf',
      pageCount: 15,
      type: 'pdf'
    }
    manifest.documents.push(docEntry)

    const sceneData = {
      elements: [
        {
          id: 'slide_p1',
          type: 'image',
          x: 100,
          y: 200,
          width: 800,
          height: 1000,
          locked: true,
          customData: {
            type: 'pdf-slide',
            docId: 'doc_attention',
            pageNumber: 1
          }
        },
        {
          id: 'annotation_freedraw',
          type: 'freedraw',
          points: [[100, 200], [120, 250], [140, 270]],
          strokeColor: '#ef4444',
          strokeWidth: 3
        }
      ],
      appState: { viewBackgroundColor: '#121212' }
    }

    const { projectJson, sceneJson } = serializeProjectBundle({ manifest, sceneData })
    const result = deserializeProjectBundle(projectJson, sceneJson)

    expect(result.success).toBe(true)
    expect(result.bundle?.manifest.documents).toHaveLength(1)
    expect(result.bundle?.manifest.documents[0].filename).toBe('attention_is_all_you_need.pdf')
    const deserializedScene = result.bundle?.sceneData as { elements: any[] }
    expect(deserializedScene.elements).toHaveLength(2)

    const slideElement = deserializedScene.elements[0]
    expect(slideElement.locked).toBe(true)
    expect(slideElement.customData.pageNumber).toBe(1)
  })
})
