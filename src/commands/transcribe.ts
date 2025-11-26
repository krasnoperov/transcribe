import { readFile, writeFile, unlink } from 'node:fs/promises'
import { basename, extname } from 'node:path'
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
} from '../config.ts'
import type { TranscribeOptions, TranscriptionResponse, VTTCue, AudioChunk } from '../types.ts'

export default async function transcribe (args: string[]): Promise<void> {
  const options = parseArgs(args)

  if (!options.input || options.help) {
    console.log('Usage: transcribe <input> [options]')
    console.log('')
    console.log('Options:')
    console.log('  -o, --output <file>      Output VTT file (default: <input>-transcript.vtt)')
    console.log('  --language <lang>        Language code (e.g., en, es, ru)')
    console.log('  --model <model>          OpenAI model (default: gpt-4o-transcribe-diarize)')
    console.log('                           Options: whisper-1, gpt-4o-transcribe, gpt-4o-transcribe-diarize')
    process.exit(options.help ? 0 : 1)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set')
    console.error(`Get your API key at: ${OPENAI_API_KEY_URL}`)
    process.exit(1)
  }

  const inputFile = options.input
  const outputFile = options.output || `${basename(inputFile, extname(inputFile))}-transcript.vtt`

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
  const model = options.model || DEFAULT_TRANSCRIPTION_MODEL
  console.log(`  Using model: ${model}`)
  const transcripts: TranscriptionResponse[] = []
  for (let i = 0; i < chunks.length; i++) {
    console.log(`  Transcribing chunk ${i + 1}/${chunks.length}...`)
    const result = await transcribeChunk(chunks[i], apiKey, options.language, model)
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
          currentSegment.text += word.word
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
  }

  const mergedVtt = serializeVTT(mergedCues)

  await writeFile(outputFile, mergedVtt, 'utf8')

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

async function transcribeChunk (chunk: AudioChunk, apiKey: string, language: string | undefined, model: string): Promise<TranscriptionResponse> {
  const audioData = await readFile(chunk.file)

  const formData = new FormData()
  const blob = new Blob([audioData], { type: 'audio/wav' })
  formData.append('file', blob, basename(chunk.file))
  formData.append('model', model)

  // Set response format based on model
  if (model.includes('diarize')) {
    formData.append('response_format', 'diarized_json')
    formData.append('chunking_strategy', 'auto')
  } else {
    formData.append('response_format', 'verbose_json')
  }

  if (language) {
    formData.append('language', language)
  }

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
      errorMessage += ` - Empty response body`
      errorMessage += `\nResponse headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`
    }

    throw new Error(errorMessage)
  }

  return await response.json() as TranscriptionResponse
}
