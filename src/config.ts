/**
 * Configuration constants for transcript CLI
 */

import type { MimeTypeMap, ModelConfig, AudioMimeTypeMap } from './types.ts'

// Audio processing limits
export const MAX_AUDIO_DURATION = 1380 // 23 minutes in seconds (safe limit for OpenAI)

// Supported audio extensions
export const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.ogg', '.flac', '.aac']

// MIME type mappings
export const MIME_TYPES: MimeTypeMap = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

// Default MIME type
export const DEFAULT_MIME_TYPE = 'image/png'

// Audio MIME type mappings
export const AUDIO_MIME_TYPES: AudioMimeTypeMap = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mp3',
  '.m4a': 'audio/m4a',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
}

// Model configurations
export const MODELS: Record<string, ModelConfig> = {
  'whisper-1': {
    name: 'whisper-1',
    provider: 'openai',
    supportsDiarization: false,
    responseFormat: 'verbose_json',
  },
  'gpt-4o-transcribe': {
    name: 'gpt-4o-transcribe',
    provider: 'openai',
    supportsDiarization: false,
    responseFormat: 'verbose_json',
  },
  'gpt-4o-transcribe-diarize': {
    name: 'gpt-4o-transcribe-diarize',
    provider: 'openai',
    supportsDiarization: true,
    responseFormat: 'diarized_json',
  },
  'gemini-3': {
    name: 'gemini-3',
    provider: 'google',
    supportsDiarization: true,
    responseFormat: 'text',
  },
}

// Default model for transcription
export const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-transcribe-diarize'

// Default summarization model
export const DEFAULT_SUMMARIZATION_MODEL = 'gpt-5.1'

// Default infographic model
export const DEFAULT_INFOGRAPHIC_MODEL = 'gemini-3-pro-image-preview'

// Gemini transcription model
export const GEMINI_TRANSCRIPTION_MODEL = 'gemini-2.5-flash'

// API endpoints
export const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions'

// Environment variable names
export const ENV_OPENAI_API_KEY = 'OPENAI_API_KEY'
export const ENV_GOOGLE_API_KEY = 'GOOGLE_AI_STUDIO_KEY'

// API key help URLs
export const OPENAI_API_KEY_URL = 'https://platform.openai.com/api-keys'
export const GOOGLE_API_KEY_URL = 'https://ai.google.dev/'

// Default summarization prompt
export const DEFAULT_SUMMARY_PROMPT = `You are a helpful assistant that creates concise, well-structured summaries.
Analyze the provided text and create a comprehensive summary in markdown format.

IMPORTANT: Write the summary in the SAME LANGUAGE as the input text. Detect the language and respond accordingly.

Include:
- Overview/main topic
- Key points (bullet points)
- Important details
- Decisions or conclusions (if any)

Use clear headers and formatting.`

// Default infographic prompt
export const DEFAULT_INFOGRAPHIC_PROMPT = 'Create a visually appealing infographic that summarizes the most valuable points from this content. Use clear hierarchy, icons, and visual elements.'

// Default Gemini transcription prompt
export const DEFAULT_GEMINI_TRANSCRIPTION_PROMPT = `Transcribe this audio file completely and accurately.

Requirements:
- Include timestamps in the format [HH:MM:SS] at regular intervals (every 30-60 seconds or at natural breaks)
- Identify different speakers and label them as "Speaker A:", "Speaker B:", etc.
- If you can identify the speaker's name from context, use their name instead
- Preserve the original language of the audio
- Include non-verbal cues in brackets when relevant, e.g., [laughter], [pause], [applause]

Output format:
[00:00:00] Speaker A: First line of dialogue...
[00:00:15] Speaker B: Response...

Begin transcription:`
