import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import {
  DEFAULT_SUMMARIZATION_MODEL,
  DEFAULT_SUMMARY_PROMPT,
  OPENAI_API_KEY_URL,
} from '../config.ts'
import type { SummarizeOptions } from '../types.ts'

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

export default async function summarize (args: string[]): Promise<void> {
  const options = parseArgs(args)

  if (!options.input || options.help) {
    console.log('Usage: summarize <input> [options]')
    console.log('')
    console.log('Options:')
    console.log('  -o, --output <file>      Output file (default: <input>-summary.md)')
    console.log('  --prompt <text>          Custom instructions for summarization')
    process.exit(options.help ? 0 : 1)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set')
    console.error(`Get your API key at: ${OPENAI_API_KEY_URL}`)
    process.exit(1)
  }

  const inputFile = options.input
  const outputFile = options.output || `${basename(inputFile, extname(inputFile))}-summary.md`

  console.log(`Reading input from ${inputFile}...`)
  const inputText = await readFile(inputFile, 'utf8')

  console.log('Generating summary...')
  const summary = await generateSummary(inputText, apiKey, options.prompt)

  // Ensure summary is a string
  const summaryText = typeof summary === 'string' ? summary : JSON.stringify(summary, null, 2)
  await writeFile(outputFile, summaryText, 'utf8')

  console.log(`\nSummary saved to: ${outputFile}`)
}

function parseArgs (args: string[]): SummarizeOptions {
  const options: SummarizeOptions = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-h' || args[i] === '--help') {
      options.help = true
    } else if (args[i] === '-o' || args[i] === '--output') {
      options.output = args[++i]
    } else if (args[i] === '--prompt') {
      options.prompt = args[++i]
    } else if (!options.input) {
      options.input = args[i]
    }
  }
  return options
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string | null
    }
  }>
}

async function generateSummary (text: string, apiKey: string, customPrompt?: string): Promise<string> {
  const prompt = customPrompt || DEFAULT_SUMMARY_PROMPT

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_SUMMARIZATION_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt + '\n\n' + text,
        },
      ],
      reasoning_effort: 'medium',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API failed (${response.status}): ${errorText}`)
  }

  const data = await response.json() as ChatCompletionResponse
  return data.choices[0].message.content || ''
}
