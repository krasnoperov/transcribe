import { readFile, writeFile, unlink } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { Agent } from 'undici'
import { GoogleGenAI } from '@google/genai'
import {
  isAudioFile,
  getAudioDuration,
  extractAudio,
  splitAudio,
} from '../utils/audio.ts'
import { serializeVTT } from '../utils/vtt.ts'
import {
  MAX_AUDIO_DURATION,
  DEFAULT_TRANSCRIPTION_MODEL,
  OPENAI_TRANSCRIPTION_URL,
  OPENAI_API_KEY_URL,
  GOOGLE_API_KEY_URL,
  MODELS,
  AUDIO_MIME_TYPES,
  GEMINI_TRANSCRIPTION_MODEL,
  DEFAULT_GEMINI_TRANSCRIPTION_PROMPT,
} from '../config.ts'
import type { TranscribeOptions, TranscriptionResponse, VTTCue, AudioChunk, AudioMimeType } from '../types.ts'

// Configure undici to disable timeouts for long-running transcription requests
globalThis[Symbol.for('undici.globalDispatcher.1')] = new Agent({
  headersTimeout: 0,
  bodyTimeout: 0,
})

export default async function transcribe (args: string[]): Promise<void> {
  const options = parseArgs(args)

  if (!options.input || options.help) {
    console.log('Usage: transcribe <input> [options]')
    console.log('')
    console.log('Options:')
    console.log('  -o, --output <file>      Output VTT file (default: <input>-transcript.vtt)')
    console.log('  --language <lang>        Language code (e.g., en, es, ru)')
    console.log('  --model <model>          Transcription model (default: gpt-4o-transcribe-diarize)')
    console.log('                           OpenAI: whisper-1, gpt-4o-transcribe, gpt-4o-transcribe-diarize')
    console.log('                           Google: gemini-3')
    process.exit(options.help ? 0 : 1)
  }

  const model = options.model || DEFAULT_TRANSCRIPTION_MODEL
  const modelConfig = MODELS[model]

  if (!modelConfig) {
    console.error(`Error: Unknown model "${model}"`)
    console.error('Available models: ' + Object.keys(MODELS).join(', '))
    process.exit(1)
  }

  // Check for required API key based on provider
  if (modelConfig.provider === 'google') {
    const apiKey = process.env.GOOGLE_AI_STUDIO_KEY
    if (!apiKey) {
      console.error('Error: GOOGLE_AI_STUDIO_KEY environment variable is not set')
      console.error(`Get your API key at: ${GOOGLE_API_KEY_URL}`)
      process.exit(1)
    }
  } else {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('Error: OPENAI_API_KEY environment variable is not set')
      console.error(`Get your API key at: ${OPENAI_API_KEY_URL}`)
      process.exit(1)
    }
  }

  const inputFile = options.input
  const outputFile = options.output || `${basename(inputFile, extname(inputFile))}-transcript.vtt`

  console.log(`Using model: ${model} (${modelConfig.provider})`)

  // Branch based on provider
  let mergedVtt: string
  if (modelConfig.provider === 'google') {
    mergedVtt = await transcribeWithGemini(inputFile, options)
  } else {
    mergedVtt = await transcribeWithOpenAI(inputFile, options, model)
  }

  await writeFile(outputFile, mergedVtt, 'utf8')

  console.log(`\nTranscription complete: ${outputFile}`)
}

function parseArgs (args: string[]): TranscribeOptions {
  const options: TranscribeOptions = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-h' || args[i] === '--help') {
      options.help = true
    } else if (args[i] === '-o' || args[i] === '--output') {
      options.output = args[++i]
    } else if (args[i] === '--language') {
      options.language = args[++i]
    } else if (args[i] === '--model') {
      options.model = args[++i]
    } else if (!options.input) {
      options.input = args[i]
    }
  }
  return options
}

// OpenAI transcription implementation
async function transcribeWithOpenAI (inputFile: string, options: TranscribeOptions, model: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!

  console.log('Step 1: Extracting audio...')
  let audioFile = inputFile
  const needsExtraction = !isAudioFile(inputFile)

  if (needsExtraction) {
    audioFile = `${basename(inputFile, extname(inputFile))}-audio.wav`
    extractAudio(inputFile, audioFile)
    console.log(`  Extracted to ${audioFile}`)
  }

  console.log('Step 2: Getting audio duration...')
  const duration = getAudioDuration(audioFile)
  console.log(`Audio duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`)

  console.log('Step 3: Splitting audio into chunks...')
  const chunks = splitAudio(audioFile, duration, MAX_AUDIO_DURATION)
  console.log(`Created ${chunks.length} chunk(s)`)

  console.log('Step 4: Transcribing chunks...')
  const transcripts: TranscriptionResponse[] = []
  for (let i = 0; i < chunks.length; i++) {
    console.log(`  Transcribing chunk ${i + 1}/${chunks.length}...`)
    const result = await transcribeOpenAIChunk(chunks[i], apiKey, options.language, model)
    transcripts.push(result)
  }

  console.log('Step 5: Merging transcripts...')
  const mergedCues: VTTCue[] = []

  for (let i = 0; i < transcripts.length; i++) {
    const transcript = transcripts[i]
    const offset = chunks[i].offset

    // Handle diarized response (has segments with speaker info)
    if (transcript.segments && transcript.segments.length > 0) {
      for (const segment of transcript.segments) {
        mergedCues.push({
          start: segment.start + offset,
          end: segment.end + offset,
          speaker: segment.speaker || 'Speaker',
          text: segment.text.trim(),
        })
      }
    }
    // Handle verbose_json response (no speaker diarization)
    else if (transcript.words && transcript.words.length > 0) {
      // Group words into segments (every ~5 seconds or sentence boundary)
      let currentSegment: { start: number; end: number; text: string } | null = null
      for (const word of transcript.words) {
        if (!currentSegment || word.start - currentSegment.start > 5.0) {
          if (currentSegment) {
            mergedCues.push({
              start: currentSegment.start + offset,
              end: currentSegment.end + offset,
              speaker: null,
              text: currentSegment.text.trim(),
            })
          }
          currentSegment = {
            start: word.start,
            end: word.end,
            text: word.word,
          }
        } else {
          currentSegment.end = word.end
          currentSegment.text += ' ' + word.word
        }
      }
      if (currentSegment) {
        mergedCues.push({
          start: currentSegment.start + offset,
          end: currentSegment.end + offset,
          speaker: null,
          text: currentSegment.text.trim(),
        })
      }
    }
    // Handle plain json response (text only, no timestamps)
    else if (transcript.text && transcript.text.trim()) {
      const text = transcript.text.trim()
      const chunkDuration = chunks[i].duration || 30
      mergedCues.push({
        start: offset,
        end: offset + chunkDuration,
        speaker: null,
        text,
      })
    }
  }

  // Cleanup temporary files
  try {
    if (needsExtraction && audioFile !== inputFile) {
      await unlink(audioFile)
    }
    for (const chunk of chunks) {
      if (chunk.file !== audioFile) {
        await unlink(chunk.file)
      }
    }
  } catch {
    // Ignore cleanup errors
  }

  return serializeVTT(mergedCues)
}

async function transcribeOpenAIChunk (chunk: AudioChunk, apiKey: string, language: string | undefined, model: string): Promise<TranscriptionResponse> {
  const audioData = await readFile(chunk.file)

  const formData = new FormData()
  // Ensure we have a proper ArrayBuffer (not SharedArrayBuffer)
  let buffer: ArrayBuffer
  if (audioData.buffer instanceof SharedArrayBuffer) {
    buffer = new ArrayBuffer(audioData.byteLength)
    new Uint8Array(buffer).set(audioData)
  } else {
    buffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength)
  }
  // Use audio/ogg MIME type for Opus-encoded chunks
  formData.append('file', new Blob([buffer], { type: 'audio/ogg' }), basename(chunk.file))
  formData.append('model', model)

  // Set response format based on model
  // gpt-4o-transcribe and gpt-4o-mini-transcribe only support 'json' format
  // gpt-4o-transcribe-diarize supports 'json', 'text', 'diarized_json'
  // whisper-1 supports 'json', 'text', 'srt', 'verbose_json', 'vtt'
  if (model.includes('diarize')) {
    formData.append('response_format', 'diarized_json')
    formData.append('chunking_strategy', 'auto')
  } else if (model === 'whisper-1') {
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'word')
  } else {
    // gpt-4o-transcribe and gpt-4o-mini-transcribe only support 'json'
    formData.append('response_format', 'json')
  }

  if (language) {
    formData.append('language', language)
  }

  const MAX_RETRIES = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `OpenAI API failed (${response.status})`

        // Try to parse as JSON for more detailed error info
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage += `:\n${JSON.stringify(errorJson, null, 2)}`
          } catch {
            errorMessage += `: ${errorText}`
          }
        } else {
          errorMessage += ' - Empty response body'
          errorMessage += `\nResponse headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`
        }

        // Retry on 429 (rate limit) or 5xx (server errors)
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(errorMessage)
          if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt - 1) * 1000
            console.log(`    Retrying in ${delay / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }

        throw new Error(errorMessage)
      }

      return await response.json() as TranscriptionResponse
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Retry on network errors
      if (attempt < MAX_RETRIES && lastError.message.includes('fetch failed')) {
        const delay = Math.pow(2, attempt - 1) * 1000
        console.log(`    Network error, retrying in ${delay / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw lastError
    }
  }

  throw lastError || new Error('Unknown error')
}

// Gemini transcription implementation
async function transcribeWithGemini (inputFile: string, options: TranscribeOptions): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY!
  const ai = new GoogleGenAI({ apiKey })

  console.log('Step 1: Extracting audio...')
  let audioFile = inputFile
  const needsExtraction = !isAudioFile(inputFile)

  if (needsExtraction) {
    audioFile = `${basename(inputFile, extname(inputFile))}-audio.mp3`
    extractAudio(inputFile, audioFile)
    console.log(`  Extracted to ${audioFile}`)
  }

  console.log('Step 2: Uploading audio to Gemini...')
  const audioData = await readFile(audioFile)
  const base64Audio = audioData.toString('base64')
  const mimeType = getAudioMimeType(audioFile)
  console.log(`  File size: ${(audioData.length / 1024 / 1024).toFixed(2)} MB`)

  console.log('Step 3: Transcribing with Gemini...')

  // Build prompt with optional language hint
  let prompt = DEFAULT_GEMINI_TRANSCRIPTION_PROMPT
  if (options.language) {
    prompt = `Language hint: The audio is in ${options.language}.\n\n${prompt}`
  }

  const response = await ai.models.generateContent({
    model: GEMINI_TRANSCRIPTION_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
        ],
      },
    ],
  })

  const transcriptText = response.text || ''

  if (!transcriptText.trim()) {
    throw new Error('Gemini returned empty transcription')
  }

  console.log('Step 4: Converting to VTT format...')
  const cues = parseGeminiTranscript(transcriptText)

  // Cleanup temporary files
  try {
    if (needsExtraction && audioFile !== inputFile) {
      await unlink(audioFile)
    }
  } catch {
    // Ignore cleanup errors
  }

  return serializeVTT(cues)
}

// Parse Gemini's text transcript into VTT cues
function parseGeminiTranscript (text: string): VTTCue[] {
  const cues: VTTCue[] = []
  const lines = text.split('\n').filter(line => line.trim())

  // Pattern variations Gemini might return:
  // [ MM:SS ] Speaker: Text (with spaces)
  // [MM:SS] Speaker: Text (without spaces)
  // [ HH:MM:SS ] Speaker: Text
  // [HH:MM:SS] Speaker: Text
  const timestampPattern = /^\[\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*\]\s*(?:([^:]+):\s*)?(.+)$/

  for (const line of lines) {
    const match = line.match(timestampPattern)

    if (match) {
      const [, part1, part2, part3, speaker, lineText] = match

      // Determine timestamp format
      // Gemini can return various formats:
      // - [MM:SS] - minutes:seconds (most common)
      // - [HH:MM:SS] - hours:minutes:seconds (for very long audio)
      // - [MM:SS:FF] - minutes:seconds:frames (sometimes seen)
      let hours = 0
      let minutes: number
      let seconds: number

      const p1 = parseInt(part1, 10)
      const p2 = parseInt(part2, 10)
      const p3 = part3 !== undefined ? parseInt(part3, 10) : undefined

      if (p3 !== undefined) {
        // Three parts: HH:MM:SS format
        // Gemini typically returns this format when asked for timestamps
        hours = p1
        minutes = p2
        seconds = p3
      } else {
        // Two parts: MM:SS format (most common from Gemini)
        minutes = p1
        seconds = p2
      }

      const startTime = hours * 3600 + minutes * 60 + seconds

      // Set end time of previous cue
      if (cues.length > 0) {
        cues[cues.length - 1].end = startTime
      }

      // Clean up speaker label
      let cleanSpeaker = speaker?.trim() || null
      if (cleanSpeaker) {
        // Remove markdown formatting (**, *, __, _)
        cleanSpeaker = cleanSpeaker.replace(/^\*{1,2}|^\_{1,2}|\*{1,2}$|\_{1,2}$/g, '').trim()
      }

      if (cleanSpeaker && cleanSpeaker.length > 30) {
        // Likely not a speaker name, but part of the text
        cues.push({
          start: startTime,
          end: startTime + 30,
          speaker: null,
          text: (cleanSpeaker + ': ' + lineText).trim(),
        })
      } else {
        cues.push({
          start: startTime,
          end: startTime + 30, // Default 30s, will be adjusted by next cue
          speaker: cleanSpeaker || null,
          text: lineText.trim(),
        })
      }
    } else if (cues.length > 0 && line.trim()) {
      // Continuation of previous cue (no timestamp)
      cues[cues.length - 1].text += ' ' + line.trim()
    } else if (line.trim() && cues.length === 0) {
      // Text without timestamp at the beginning
      cues.push({
        start: 0,
        end: 30,
        speaker: null,
        text: line.trim(),
      })
    }
  }

  // Adjust last cue's end time
  if (cues.length > 0) {
    const lastCue = cues[cues.length - 1]
    // Estimate based on text length (~150 words per minute)
    const wordCount = lastCue.text.split(/\s+/).length
    const estimatedDuration = Math.max(5, Math.ceil(wordCount / 2.5))
    lastCue.end = lastCue.start + estimatedDuration
  }

  return cues
}

function getAudioMimeType (filename: string): AudioMimeType {
  const ext = extname(filename).toLowerCase()
  return AUDIO_MIME_TYPES[ext] || 'audio/mp3'
}
