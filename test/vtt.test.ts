import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  parseTimestamp,
  formatTimestamp,
  parseVTT,
  serializeVTT,
  mergeVTT,
} from '../src/utils/vtt.ts'

describe('VTT Timestamp Utils', () => {
  describe('parseTimestamp', () => {
    it('should parse HH:MM:SS.mmm format', () => {
      assert.strictEqual(parseTimestamp('00:01:30.500'), 90.5)
      assert.strictEqual(parseTimestamp('01:00:00.000'), 3600)
      assert.strictEqual(parseTimestamp('00:00:05.250'), 5.25)
    })

    it('should parse MM:SS.mmm format', () => {
      assert.strictEqual(parseTimestamp('01:30.500'), 90.5)
      assert.strictEqual(parseTimestamp('00:05.250'), 5.25)
    })

    it('should handle zero values', () => {
      assert.strictEqual(parseTimestamp('00:00:00.000'), 0)
    })
  })

  describe('formatTimestamp', () => {
    it('should format seconds to HH:MM:SS.mmm', () => {
      assert.strictEqual(formatTimestamp(90.5), '00:01:30.500')
      assert.strictEqual(formatTimestamp(3600), '01:00:00.000')
      assert.strictEqual(formatTimestamp(5.25), '00:00:05.250')
    })

    it('should handle zero', () => {
      assert.strictEqual(formatTimestamp(0), '00:00:00.000')
    })

    it('should pad single digits', () => {
      assert.strictEqual(formatTimestamp(65.5), '00:01:05.500')
    })
  })

  describe('parseTimestamp and formatTimestamp roundtrip', () => {
    it('should be reversible', () => {
      const testCases = [0, 5.25, 90.5, 3600, 7265.123]
      for (const seconds of testCases) {
        const formatted = formatTimestamp(seconds)
        const parsed = parseTimestamp(formatted)
        assert.ok(Math.abs(parsed - seconds) < 0.001, `Roundtrip failed for ${seconds}`)
      }
    })
  })
})

describe('VTT Parsing', () => {
  it('should parse simple VTT without speakers', () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
Hello world

00:00:05.000 --> 00:00:08.000
This is a test
`

    const cues = parseVTT(vtt)
    assert.strictEqual(cues.length, 2)
    assert.strictEqual(cues[0].text, 'Hello world')
    assert.strictEqual(cues[0].start, 1)
    assert.strictEqual(cues[0].end, 3)
    assert.strictEqual(cues[1].text, 'This is a test')
  })

  it('should parse VTT with speaker tags', () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
<v Alice>Hello there

00:00:05.000 --> 00:00:08.000
<v Bob>Hi Alice!
`

    const cues = parseVTT(vtt)
    assert.strictEqual(cues.length, 2)
    assert.strictEqual(cues[0].speaker, 'Alice')
    assert.strictEqual(cues[0].text, 'Hello there')
    assert.strictEqual(cues[1].speaker, 'Bob')
    assert.strictEqual(cues[1].text, 'Hi Alice!')
  })

  it('should handle multiline text', () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
<v Alice>This is
a multiline
text block
`

    const cues = parseVTT(vtt)
    assert.strictEqual(cues.length, 1)
    assert.strictEqual(cues[0].text, 'This is a multiline text block')
  })

  it('should handle empty VTT', () => {
    const vtt = 'WEBVTT\n\n'
    const cues = parseVTT(vtt)
    assert.strictEqual(cues.length, 0)
  })
})

describe('VTT Serialization', () => {
  it('should serialize cues without speakers', () => {
    const cues = [
      { start: 1, end: 3, text: 'Hello world' },
      { start: 5, end: 8, text: 'This is a test' },
    ]

    const vtt = serializeVTT(cues)
    assert.ok(vtt.startsWith('WEBVTT\n\n'))
    assert.ok(vtt.includes('00:00:01.000 --> 00:00:03.000'))
    assert.ok(vtt.includes('Hello world'))
    assert.ok(vtt.includes('00:00:05.000 --> 00:00:08.000'))
    assert.ok(vtt.includes('This is a test'))
  })

  it('should serialize cues with speakers', () => {
    const cues = [
      { start: 1, end: 3, speaker: 'Alice', text: 'Hello there' },
      { start: 5, end: 8, speaker: 'Bob', text: 'Hi Alice!' },
    ]

    const vtt = serializeVTT(cues)
    assert.ok(vtt.includes('<v Alice>Hello there'))
    assert.ok(vtt.includes('<v Bob>Hi Alice!'))
  })

  it('should roundtrip parse and serialize', () => {
    const original = [
      { start: 1.5, end: 3.25, speaker: 'A', text: 'First' },
      { start: 5, end: 8.75, speaker: 'B', text: 'Second' },
    ]

    const vtt = serializeVTT(original)
    const parsed = parseVTT(vtt)

    assert.strictEqual(parsed.length, original.length)
    for (let i = 0; i < original.length; i++) {
      assert.ok(Math.abs(parsed[i].start - original[i].start) < 0.01)
      assert.ok(Math.abs(parsed[i].end - original[i].end) < 0.01)
      assert.strictEqual(parsed[i].speaker, original[i].speaker)
      assert.strictEqual(parsed[i].text, original[i].text)
    }
  })
})

describe('VTT Merging', () => {
  it('should merge multiple VTT chunks with offsets', () => {
    const chunk1 = `WEBVTT

00:00:01.000 --> 00:00:03.000
<v A>First chunk
`

    const chunk2 = `WEBVTT

00:00:00.000 --> 00:00:02.000
<v B>Second chunk
`

    const merged = mergeVTT([
      { vtt: chunk1, offset: 0 },
      { vtt: chunk2, offset: 10 },
    ])

    const cues = parseVTT(merged)
    assert.strictEqual(cues.length, 2)

    // First chunk should be at original time
    assert.strictEqual(cues[0].start, 1)
    assert.strictEqual(cues[0].text, 'First chunk')

    // Second chunk should be offset by 10 seconds
    assert.strictEqual(cues[1].start, 10)
    assert.strictEqual(cues[1].text, 'Second chunk')
  })

  it('should sort cues by start time after merging', () => {
    const chunk1 = `WEBVTT

00:00:10.000 --> 00:00:12.000
<v A>Later
`

    const chunk2 = `WEBVTT

00:00:01.000 --> 00:00:03.000
<v B>Earlier
`

    const merged = mergeVTT([
      { vtt: chunk1, offset: 0 },
      { vtt: chunk2, offset: 0 },
    ])

    const cues = parseVTT(merged)
    assert.strictEqual(cues.length, 2)

    // Should be sorted: Earlier before Later
    assert.strictEqual(cues[0].text, 'Earlier')
    assert.strictEqual(cues[1].text, 'Later')
  })
})
