/**
 * VTT (WebVTT) utilities for parsing and serializing subtitle files
 */

import type { VTTCue, VTTChunk } from '../types.ts'

/**
 * Parse a VTT file into structured cues
 */
export function parseVTT (vttContent: string): VTTCue[] {
  const lines = vttContent.split('\n')
  const cues: VTTCue[] = []
  let i = 0

  // Skip header
  while (i < lines.length && !lines[i].includes('-->')) {
    i++
  }

  while (i < lines.length) {
    const line = lines[i].trim()

    // Check for timestamp line
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim())
      const start = parseTimestamp(startStr)
      const end = parseTimestamp(endStr)

      // Read text lines
      i++
      const textLines: string[] = []
      let speaker: string | null = null

      while (i < lines.length && lines[i].trim() !== '') {
        let text = lines[i].trim()

        // Extract speaker tag if present
        const speakerMatch = text.match(/^<v\s+([^>]+)>(.*)/)
        if (speakerMatch) {
          speaker = speakerMatch[1]
          text = speakerMatch[2]
        }

        if (text) {
          textLines.push(text)
        }
        i++
      }

      if (textLines.length > 0) {
        cues.push({
          start,
          end,
          speaker,
          text: textLines.join(' '),
        })
      }
    }

    i++
  }

  return cues
}

/**
 * Serialize cues into VTT format
 */
export function serializeVTT (cues: VTTCue[]): string {
  let vtt = 'WEBVTT\n\n'

  for (const cue of cues) {
    const start = formatTimestamp(cue.start)
    const end = formatTimestamp(cue.end)

    vtt += `${start} --> ${end}\n`

    if (cue.speaker) {
      vtt += `<v ${cue.speaker}>${cue.text}\n\n`
    } else {
      vtt += `${cue.text}\n\n`
    }
  }

  return vtt
}

/**
 * Merge multiple VTT files with time offsets
 */
export function mergeVTT (chunks: VTTChunk[]): string {
  const allCues: VTTCue[] = []

  for (const chunk of chunks) {
    const cues = parseVTT(chunk.vtt)

    for (const cue of cues) {
      allCues.push({
        start: cue.start + chunk.offset,
        end: cue.end + chunk.offset,
        speaker: cue.speaker,
        text: cue.text,
      })
    }
  }

  // Sort by start time
  allCues.sort((a, b) => a.start - b.start)

  return serializeVTT(allCues)
}

/**
 * Parse VTT timestamp to seconds
 */
export function parseTimestamp (timestamp: string): number {
  const parts = timestamp.split(':')
  let hours = 0
  let minutes = 0
  let seconds = 0

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10)
    minutes = parseInt(parts[1], 10)
    seconds = parseFloat(parts[2])
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10)
    seconds = parseFloat(parts[1])
  } else {
    seconds = parseFloat(parts[0])
  }

  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Format seconds as VTT timestamp
 */
export function formatTimestamp (totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const ms = Math.round((totalSeconds % 1) * 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}
