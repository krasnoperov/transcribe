import { mkdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import transcribe from './transcribe.ts'
import summarize from './summarize.ts'
import infographic from './infographic.ts'
import { OPENAI_API_KEY_URL, GOOGLE_API_KEY_URL } from '../config.ts'
import type { ProcessOptions } from '../types.ts'

export default async function processAll (args: string[]): Promise<void> {
  const options = parseArgs(args)

  if (!options.input || options.help) {
    console.log('Usage: process <input> [options]')
    console.log('')
    console.log('Options:')
    console.log('  --output-dir <dir>       Output directory (default: current directory)')
    console.log('  --language <lang>        Language code for transcription (e.g., en, es, ru)')
    console.log('  --model <model>          OpenAI model (default: gpt-4o-transcribe-diarize)')
    console.log('  --style <text>           Style instructions for infographic')
    console.log('')
    console.log('Example:')
    console.log('  transcribe process meeting.mp4 --language ru --model whisper-1 --style "modern minimal"')
    process.exit(options.help ? 0 : 1)
  }

  // Check for required API keys
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is not set')
    console.error(`Get your API key at: ${OPENAI_API_KEY_URL}`)
    process.exit(1)
  }

  if (!process.env.GOOGLE_AI_STUDIO_KEY) {
    console.error('Error: GOOGLE_AI_STUDIO_KEY environment variable is not set')
    console.error(`Get your API key at: ${GOOGLE_API_KEY_URL}`)
    process.exit(1)
  }

  const inputFile = options.input
  const baseName = basename(inputFile, extname(inputFile))
  const outputDir = options.outputDir || '.'

  // Create output directory if needed
  if (outputDir !== '.') {
    await mkdir(outputDir, { recursive: true })
  }

  const transcriptFile = join(outputDir, `${baseName}-transcript.vtt`)
  const summaryFile = join(outputDir, `${baseName}-summary.md`)
  const infographicFile = join(outputDir, `${baseName}-infographic.png`)

  console.log('='.repeat(60))
  console.log('Processing Pipeline')
  console.log('='.repeat(60))
  console.log(`Input: ${inputFile}`)
  console.log(`Output directory: ${outputDir}`)
  console.log('')

  try {
    // Step 1: Transcribe
    console.log('\n[1/3] TRANSCRIPTION')
    console.log('-'.repeat(60))
    const transcribeArgs = [inputFile, '-o', transcriptFile]
    if (options.language) {
      transcribeArgs.push('--language', options.language)
    }
    if (options.model) {
      transcribeArgs.push('--model', options.model)
    }
    await transcribe(transcribeArgs)

    // Step 2: Summarize
    console.log('\n[2/3] SUMMARIZATION')
    console.log('-'.repeat(60))
    await summarize([transcriptFile, '-o', summaryFile])

    // Step 3: Infographic
    console.log('\n[3/3] INFOGRAPHIC GENERATION')
    console.log('-'.repeat(60))
    const infographicArgs = [summaryFile, '-o', infographicFile]
    if (options.style) {
      infographicArgs.push('--style', options.style)
    }
    await infographic(infographicArgs)

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('ALL STEPS COMPLETED')
    console.log('='.repeat(60))
    console.log(`Transcript:   ${transcriptFile}`)
    console.log(`Summary:      ${summaryFile}`)
    console.log(`Infographic:  ${infographicFile}`)
    console.log('')

  } catch (error) {
    console.error('\nPipeline failed:', (error as Error).message)
    process.exit(1)
  }
}

function parseArgs (args: string[]): ProcessOptions {
  const options: ProcessOptions = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-h' || args[i] === '--help') {
      options.help = true
    } else if (args[i] === '--output-dir') {
      options.outputDir = args[++i]
    } else if (args[i] === '--language') {
      options.language = args[++i]
    } else if (args[i] === '--model') {
      options.model = args[++i]
    } else if (args[i] === '--style') {
      options.style = args[++i]
    } else if (!options.input) {
      options.input = args[i]
    }
  }
  return options
}
