/**
 * @krasnoperov/transcribe
 * Audio/video transcription, summarization, and infographic generation
 */

// Re-export types
export type {
  TranscribeOptions,
  TranscriptionSegment,
  TranscriptionResponse,
  TranscriptionWord,
  AudioChunk,
  SummarizeOptions,
  InfographicOptions,
  ProcessOptions,
  VTTCue,
  VTTChunk,
  GeminiImagePart,
  GeminiCandidate,
  GeminiResponse,
  MimeType,
  MimeTypeMap,
  TranscriptionModel,
  ModelConfig,
} from './types.ts'

// Re-export config
export {
  MAX_AUDIO_DURATION,
  AUDIO_EXTENSIONS,
  MIME_TYPES,
  DEFAULT_MIME_TYPE,
  MODELS,
  DEFAULT_TRANSCRIPTION_MODEL,
  DEFAULT_SUMMARIZATION_MODEL,
  DEFAULT_INFOGRAPHIC_MODEL,
  OPENAI_TRANSCRIPTION_URL,
  ENV_OPENAI_API_KEY,
  ENV_GOOGLE_API_KEY,
  OPENAI_API_KEY_URL,
  GOOGLE_API_KEY_URL,
  DEFAULT_SUMMARY_PROMPT,
  DEFAULT_INFOGRAPHIC_PROMPT,
} from './config.ts'

// Re-export utilities
export {
  isAudioFile,
  getAudioDuration,
  extractAudio,
  splitAudio,
  calculateChunkCount,
} from './utils/audio.ts'

export {
  parseVTT,
  serializeVTT,
  mergeVTT,
  parseTimestamp,
  formatTimestamp,
} from './utils/vtt.ts'

// Re-export commands as named functions
export { default as transcribe } from './commands/transcribe.ts'
export { default as summarize } from './commands/summarize.ts'
export { default as infographic } from './commands/infographic.ts'
export { default as processAll } from './commands/process-all.ts'
