/**
 * Audio processing utilities using ffmpeg
 */

import { execSync } from 'node:child_process'
import { extname } from 'node:path'
import { AUDIO_EXTENSIONS } from '../config.ts'
import type { AudioChunk } from '../types.ts'

/**
 * Check if file is an audio format
 */
export function isAudioFile (filename: string): boolean {
  const ext = extname(filename).toLowerCase()
  return AUDIO_EXTENSIONS.includes(ext)
}

/**
 * Get audio duration in seconds
 */
export function getAudioDuration (audioFile: string): number {
  const output = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`,
    { encoding: 'utf8' }
  ).trim()

  return parseFloat(output)
}

/**
 * Extract audio from video file
 */
export function extractAudio (inputFile: string, outputFile: string): void {
  execSync(
    `ffmpeg -i "${inputFile}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputFile}" -y`,
    { stdio: 'ignore' }
  )
}

/**
 * Split audio into chunks
 */
export function splitAudio (audioFile: string, totalDuration: number, maxChunkDuration: number): AudioChunk[] {
  if (totalDuration <= maxChunkDuration) {
    return [{
      file: audioFile,
      offset: 0,
      duration: totalDuration,
    }]
  }

  const numChunks = Math.ceil(totalDuration / maxChunkDuration)
  const chunkDuration = totalDuration / numChunks
  const chunks: AudioChunk[] = []

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * chunkDuration
    const chunkFile = `chunk_${String(i + 1).padStart(2, '0')}.wav`

    const cmd = i < numChunks - 1
      ? `ffmpeg -i "${audioFile}" -ss ${startTime} -t ${chunkDuration} -acodec pcm_s16le "${chunkFile}" -y`
      : `ffmpeg -i "${audioFile}" -ss ${startTime} -acodec pcm_s16le "${chunkFile}" -y`

    execSync(cmd, { stdio: 'ignore' })

    const actualDuration = i < numChunks - 1 ? chunkDuration : totalDuration - startTime

    chunks.push({
      file: chunkFile,
      offset: startTime,
      duration: actualDuration,
    })
  }

  return chunks
}

/**
 * Calculate optimal number of chunks for audio splitting
 */
export function calculateChunkCount (totalDuration: number, maxChunkDuration: number): number {
  return Math.ceil(totalDuration / maxChunkDuration)
}
