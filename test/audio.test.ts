import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  isAudioFile,
  calculateChunkCount,
} from '../src/utils/audio.ts'

describe('Audio Utils', () => {
  describe('isAudioFile', () => {
    it('should recognize audio file extensions', () => {
      assert.strictEqual(isAudioFile('file.wav'), true)
      assert.strictEqual(isAudioFile('file.mp3'), true)
      assert.strictEqual(isAudioFile('file.m4a'), true)
      assert.strictEqual(isAudioFile('file.ogg'), true)
      assert.strictEqual(isAudioFile('file.flac'), true)
      assert.strictEqual(isAudioFile('file.aac'), true)
    })

    it('should reject non-audio file extensions', () => {
      assert.strictEqual(isAudioFile('file.mp4'), false)
      assert.strictEqual(isAudioFile('file.avi'), false)
      assert.strictEqual(isAudioFile('file.mov'), false)
      assert.strictEqual(isAudioFile('file.txt'), false)
      assert.strictEqual(isAudioFile('file.jpg'), false)
    })

    it('should be case-insensitive', () => {
      assert.strictEqual(isAudioFile('file.MP3'), true)
      assert.strictEqual(isAudioFile('file.WAV'), true)
      assert.strictEqual(isAudioFile('file.Mp3'), true)
    })

    it('should handle files with paths', () => {
      assert.strictEqual(isAudioFile('/path/to/file.mp3'), true)
      assert.strictEqual(isAudioFile('./relative/path/file.wav'), true)
      assert.strictEqual(isAudioFile('/path/to/video.mp4'), false)
    })
  })

  describe('calculateChunkCount', () => {
    it('should return 1 for audio shorter than max duration', () => {
      assert.strictEqual(calculateChunkCount(1000, 1500), 1)
      assert.strictEqual(calculateChunkCount(1200, 1200), 1)
    })

    it('should calculate correct number of chunks', () => {
      assert.strictEqual(calculateChunkCount(3000, 1500), 2)
      assert.strictEqual(calculateChunkCount(3600, 1200), 3)
      assert.strictEqual(calculateChunkCount(4000, 1500), 3)
    })

    it('should handle exact multiples', () => {
      assert.strictEqual(calculateChunkCount(3000, 1000), 3)
      assert.strictEqual(calculateChunkCount(6000, 2000), 3)
    })

    it('should round up for partial chunks', () => {
      assert.strictEqual(calculateChunkCount(2500, 1000), 3)
      assert.strictEqual(calculateChunkCount(1001, 1000), 2)
    })

    it('should handle edge cases', () => {
      assert.strictEqual(calculateChunkCount(0, 1000), 0)
      assert.strictEqual(calculateChunkCount(1, 1000), 1)
    })
  })
})
