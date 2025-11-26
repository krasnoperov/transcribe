import { readFile, writeFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { GoogleGenAI } from '@google/genai'
import {
  MIME_TYPES,
  DEFAULT_MIME_TYPE,
  DEFAULT_INFOGRAPHIC_MODEL,
  DEFAULT_INFOGRAPHIC_PROMPT,
  GOOGLE_API_KEY_URL,
} from '../config.ts'
import type { InfographicOptions, GeminiResponse, MimeType } from '../types.ts'

export default async function infographic (args: string[]): Promise<void> {
  const options = parseArgs(args)

  if (!options.input || options.help) {
    console.log('Usage: infographic <input> [options]')
    console.log('')
    console.log('Options:')
    console.log('  -o, --output <file>      Output image file (default: <input>-infographic.png)')
    console.log('  --style <text>           Style instructions (e.g., "artistic and light")')
    console.log('  --reference <image>      Reference image for style')
    process.exit(options.help ? 0 : 1)
  }

  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY
  if (!apiKey) {
    console.error('Error: GOOGLE_AI_STUDIO_KEY environment variable is not set')
    console.error(`Get your API key at: ${GOOGLE_API_KEY_URL}`)
    process.exit(1)
  }

  const inputFile = options.input
  const outputFile = options.output || `${basename(inputFile, extname(inputFile))}-infographic.png`

  console.log(`Reading input from ${inputFile}...`)
  const inputText = await readFile(inputFile, 'utf8')

  console.log('Generating infographic...')
  const imageData = await generateInfographic(inputText, apiKey, options)

  // Save image
  const base64Data = imageData.split(',')[1]
  const imageBuffer = Buffer.from(base64Data, 'base64')

  await writeFile(outputFile, imageBuffer)

  console.log(`\nInfographic saved to: ${outputFile}`)
}

function parseArgs (args: string[]): InfographicOptions {
  const options: InfographicOptions = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-h' || args[i] === '--help') {
      options.help = true
    } else if (args[i] === '-o' || args[i] === '--output') {
      options.output = args[++i]
    } else if (args[i] === '--style') {
      options.style = args[++i]
    } else if (args[i] === '--reference') {
      options.reference = args[++i]
    } else if (!options.input) {
      options.input = args[i]
    }
  }
  return options
}

async function generateInfographic (text: string, apiKey: string, options: InfographicOptions): Promise<string> {
  const ai = new GoogleGenAI({ apiKey })

  // Build prompt
  let prompt = DEFAULT_INFOGRAPHIC_PROMPT

  if (options.style) {
    prompt += ` Style: ${options.style}.`
  }

  prompt += `\n\nContent:\n${text}`

  // Build contents array
  const contents: any[] = [prompt]

  // Add reference image if provided
  if (options.reference) {
    console.log(`Using reference image: ${options.reference}`)
    const referenceData = await readFile(options.reference)
    const base64 = referenceData.toString('base64')
    const mimeType = getMimeType(options.reference)

    contents.push({
      inlineData: {
        mimeType,
        data: base64,
      },
    })
  }

  const response = await ai.models.generateContent({
    model: DEFAULT_INFOGRAPHIC_MODEL,
    contents,
  }) as GeminiResponse

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('No image generated from Gemini API')
  }

  const candidate = response.candidates[0]
  const imagePart = candidate.content.parts.find((part) => part.inlineData)

  if (!imagePart || !imagePart.inlineData) {
    throw new Error('No image data found in Gemini response')
  }

  const { mimeType, data } = imagePart.inlineData
  return `data:${mimeType};base64,${data}`
}

function getMimeType (filename: string): MimeType {
  const ext = extname(filename).toLowerCase()
  return MIME_TYPES[ext] || DEFAULT_MIME_TYPE
}
