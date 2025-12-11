import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load package.json for version
const packageJsonPath = join(__dirname, '..', 'package.json')
let version = '0.0.0'
try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  version = packageJson.version
} catch {
  // Try dist path
  try {
    const distPackageJsonPath = join(__dirname, '..', '..', 'package.json')
    const packageJson = JSON.parse(readFileSync(distPackageJsonPath, 'utf8'))
    version = packageJson.version
  } catch {
    // Use default version
  }
}

const commands: Record<string, () => Promise<{ default: (args: string[]) => Promise<void> }>> = {
  transcribe: () => import('./commands/transcribe.ts'),
  summarize: () => import('./commands/summarize.ts'),
  infographic: () => import('./commands/infographic.ts'),
  process: () => import('./commands/process-all.ts'),
}

async function main (): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp()
    process.exit(0)
  }

  if (args[0] === '--version' || args[0] === '-v') {
    console.log(version)
    process.exit(0)
  }

  const command = args[0]

  if (!commands[command]) {
    console.error(`Unknown command: ${command}\n`)
    showHelp()
    process.exit(1)
  }

  try {
    const module = await commands[command]()
    await module.default(args.slice(1))
  } catch (error) {
    console.error('Error:', (error as Error).message)
    process.exit(1)
  }
}

function showHelp (): void {
  console.log(`
transcribe v${version}
Audio/video transcription, summarization, and infographic generation

USAGE:
  transcribe <command> [options]

COMMANDS:
  transcribe <input>       Transcribe audio/video with speaker diarization
  summarize <input>        Generate summary from text
  infographic <input>      Create infographic from text
  process <input>          All-in-one: video -> transcript -> summary -> infographic

OPTIONS:
  -o, --output <file>      Output file path
  --language <lang>        Language code (e.g., en, es, ru)
  --model <model>          Transcription model (default: gpt-4o-transcribe-diarize)
                           OpenAI: whisper-1, gpt-4o-transcribe, gpt-4o-transcribe-diarize
                           Google: gemini-3 (long audio support)
  --style <text>           Style instructions for infographic
  --reference <image>      Reference image for infographic style
  --prompt <text>          Custom prompt for summarization
  --output-dir <dir>       Output directory for process command
  -h, --help               Show help
  -v, --version            Show version

EXAMPLES:
  # Transcribe video with diarization (OpenAI)
  transcribe transcribe meeting.mp4 -o transcript.vtt

  # Transcribe with Gemini (good for long audio)
  transcribe transcribe podcast.mp3 --model gemini-3 -o transcript.vtt

  # Generate summary
  transcribe summarize transcript.vtt -o summary.md

  # Create infographic
  transcribe infographic summary.md --style "artistic" -o visual.png

  # Process everything at once
  transcribe process video.mp4 --language ru

ENVIRONMENT VARIABLES:
  OPENAI_API_KEY           OpenAI API key (for OpenAI transcription/summarization)
  GOOGLE_AI_STUDIO_KEY     Google AI Studio key (for Gemini transcription/infographics)

Get API keys:
  OpenAI: https://platform.openai.com/api-keys
  Google: https://ai.google.dev/
`)
}

main()
