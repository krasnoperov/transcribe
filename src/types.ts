/**
 * Type definitions for transcript CLI
 */

// Transcription types
export interface TranscribeOptions {
  input?: string
  output?: string
  language?: string
  model?: string
  help?: boolean
}

export interface TranscriptionSegment {
  start: number
  end: number
  speaker?: string
  text: string
}

export interface TranscriptionResponse {
  segments?: TranscriptionSegment[]
  words?: TranscriptionWord[]
  text?: string
}

export interface TranscriptionWord {
  word: string
  start: number
  end: number
}

export interface AudioChunk {
  file: string
  offset: number
  duration: number
}

// Summarization types
export interface SummarizeOptions {
  input?: string
  output?: string
  prompt?: string
  help?: boolean
}

// Infographic types
export interface InfographicOptions {
  input?: string
  output?: string
  style?: string
  reference?: string
  help?: boolean
}

// Process all types
export interface ProcessOptions {
  input?: string
  outputDir?: string
  language?: string
  model?: string
  style?: string
  help?: boolean
}

// VTT types
export interface VTTCue {
  start: number
  end: number
  speaker?: string | null
  text: string
}

export interface VTTChunk {
  vtt: string
  offset: number
}

// API Response types
export interface GeminiImagePart {
  inlineData?: {
    mimeType: string
    data: string
  }
}

export interface GeminiCandidate {
  content: {
    parts: GeminiImagePart[]
  }
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[]
}

// MIME type mapping
export type MimeType = 'image/png' | 'image/jpeg' | 'image/webp'

export interface MimeTypeMap {
  [key: string]: MimeType
}

// Model configuration
export type TranscriptionModel = 'whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-transcribe-diarize' | 'gemini-3'

export type TranscriptionProvider = 'openai' | 'google'

export interface ModelConfig {
  name: TranscriptionModel
  provider: TranscriptionProvider
  supportsDiarization: boolean
  responseFormat: 'verbose_json' | 'diarized_json' | 'text'
}

// Audio MIME type mapping
export type AudioMimeType = 'audio/wav' | 'audio/mp3' | 'audio/mpeg' | 'audio/m4a' | 'audio/mp4' | 'audio/ogg' | 'audio/flac' | 'audio/aac'

export interface AudioMimeTypeMap {
  [key: string]: AudioMimeType
}
