# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@krasnoperov/transcribe` is a CLI tool and Claude skill for audio/video transcription with speaker diarization, AI summarization, and infographic generation. The tool provides a multi-stage pipeline that can:
1. Transcribe audio/video to VTT format with speaker diarization (OpenAI Whisper)
2. Generate summaries from transcripts (OpenAI GPT-5.1)
3. Create visual infographics from summaries (Google Gemini)

## Development Commands

```bash
npm run dev          # Run CLI in development mode (TypeScript directly)
npm run build        # Build with Rollup to dist/cli.js
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint with auto-fix
npm test             # Run tests with Node.js test runner
```

### Running the CLI locally
```bash
# Development (runs TypeScript directly)
npm run dev -- <command> [args]

# After build
./dist/cli.js <command> [args]
# or
npx @krasnoperov/transcribe <command> [args]
```

### CLI Commands
- `transcribe <input>` - Transcribe audio/video with speaker diarization
- `summarize <input>` - Generate summary from text
- `infographic <input>` - Create infographic from text
- `process <input>` - All-in-one pipeline: video → transcript → summary → infographic

## Architecture

### Build System
- **TypeScript** with ES modules
- **Rollup** bundles `src/cli.ts` → `dist/cli.js` with inlined dynamic imports
- External dependencies: `openai`, `@google/genai`, `undici` (not bundled)

### Entry Point & Command Router
`src/cli.ts` is the main entry point that:
- Parses CLI arguments
- Routes to appropriate command module via dynamic imports
- Displays help/version info

### Type System (src/types.ts)
Contains all TypeScript interfaces for:
- Command options (TranscribeOptions, SummarizeOptions, etc.)
- API responses (TranscriptionResponse, GeminiResponse)
- VTT structures (VTTCue, VTTChunk)

### Configuration (src/config.ts)
Constants and defaults:
- Model configurations
- API endpoints and environment variable names
- Default prompts and limits

### Command Modules (src/commands/)
Each command is a self-contained TypeScript module:
- **transcribe.ts**: Audio extraction, chunking, diarized transcription, VTT merging
- **summarize.ts**: Uses OpenAI GPT-5.1 for markdown summary generation
- **infographic.ts**: Uses Google Gemini for visual infographic creation
- **process-all.ts**: Orchestrates the full pipeline

### Utilities (src/utils/)
- **audio.ts**: ffmpeg-based audio utilities (extraction, duration detection, chunking)
- **vtt.ts**: WebVTT parsing/serialization, timestamp conversion, chunk merging

### Public API (src/index.ts)
Re-exports all types, config, utilities, and commands for programmatic usage.

## Claude Skill Integration

This package is a Claude skill with:
- `.claude-plugin/plugin.json` - Plugin metadata
- `skills/transcribe/SKILL.md` - Skill documentation
- `skills/transcribe/examples/` - Usage example scripts

## API Keys

Required environment variables:
- `OPENAI_API_KEY` - For transcription (Whisper) and summarization (GPT-5.1)
- `GOOGLE_AI_STUDIO_KEY` - For infographic generation (Gemini)

## Dependencies

Runtime dependencies:
- `openai` - OpenAI API client
- `@google/genai` - Google Gemini API client
- `undici` - HTTP client with custom timeouts

System requirements:
- **ffmpeg** - Audio extraction and processing
- **ffprobe** - Audio duration detection
- Node.js >= 18.0.0 for native fetch, FormData, Blob support

## AI Models Used

### Transcription
OpenAI Speech-to-Text models (configurable via `--model` flag):
- **`gpt-4o-transcribe-diarize`** (default): Speaker diarization support
- **`gpt-4o-transcribe`**: Without diarization
- **`whisper-1`**: Original Whisper model

### Summarization
- **OpenAI `gpt-5.1`** with `reasoning_effort: 'medium'`
- Automatically detects and responds in the same language as input

### Infographic Generation
- **Google Gemini `gemini-3-pro-image-preview`**

## Release Process

Uses semantic-release with GitHub Actions:
- Push to `main` triggers release workflow
- Conventional commits determine version bump
- Publishes to npm with provenance
