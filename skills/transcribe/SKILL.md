---
name: transcribe
description: Audio/video transcription with speaker diarization (OpenAI Whisper), AI summarization (GPT-5.1), and infographic generation (Gemini). Use when processing recordings, meeting videos, podcasts, or any audio/video content that needs to be converted to text, summarized, or visualized.
allowed-tools: Bash
---

# Transcribe - Audio/Video Processing Pipeline

CLI: `npx @krasnoperov/transcribe <command> [args] [options]`

## Core Commands

Four operations for audio/video content processing:

```bash
transcribe <input>           # Audio/Video -> VTT transcript with speaker diarization
summarize <input>            # Text/VTT -> Markdown summary
infographic <input>          # Text -> Visual infographic image
process <input>              # All-in-one pipeline: video -> transcript -> summary -> infographic
```

## When to Use

- Transcribe meeting recordings, podcasts, or interviews
- Generate speaker-attributed transcripts (who said what)
- Create summaries from long transcripts or documents
- Generate visual infographics from text content
- Process entire videos end-to-end in one command

## Prerequisites

```bash
# Required: ffmpeg for audio processing
brew install ffmpeg  # macOS
apt install ffmpeg   # Linux

# API keys
export OPENAI_API_KEY="your-key"        # Get at https://platform.openai.com/api-keys
export GOOGLE_AI_STUDIO_KEY="your-key"  # Get at https://ai.google.dev/
```

## Quick Examples

```bash
# Transcribe a video with speaker diarization
npx @krasnoperov/transcribe transcribe meeting.mp4 -o transcript.vtt

# Generate summary from transcript
npx @krasnoperov/transcribe summarize transcript.vtt -o summary.md

# Create infographic from summary
npx @krasnoperov/transcribe infographic summary.md --style "modern minimal" -o visual.png

# All-in-one: process entire video
npx @krasnoperov/transcribe process recording.mp4 --language en --output-dir ./output
```

## Transcription Options

```
--model <model>              Transcription model:
                             - gpt-4o-transcribe-diarize (default, with speakers)
                             - gpt-4o-transcribe (no speakers)
                             - whisper-1 (legacy)
--language <lang>            Language code (e.g., en, es, ru, de)
-o, --output <file>          Output VTT file path
```

## Summarization Options

```
--prompt <text>              Custom summarization instructions
-o, --output <file>          Output markdown file path
```

## Infographic Options

```
--style <text>               Style instructions (e.g., "artistic", "corporate", "playful")
--reference <image>          Reference image for visual style
-o, --output <file>          Output image file path
```

## Process (All-in-One) Options

```
--output-dir <dir>           Output directory for all files
--language <lang>            Language code for transcription
--model <model>              Transcription model
--style <text>               Style for infographic
```

## Output Formats

- **Transcription**: WebVTT (.vtt) with speaker tags `<v Speaker 1>text</v>`
- **Summary**: Markdown (.md) with headers and bullet points
- **Infographic**: PNG image with visual summary

## Audio Processing Notes

- Supports video formats: MP4, MKV, MOV, AVI, WebM
- Supports audio formats: WAV, MP3, M4A, OGG, FLAC, AAC
- Long files (>23 min) are automatically split into chunks
- Temporary files are cleaned up after processing

## AI Models Used

- **Transcription**: OpenAI gpt-4o-transcribe-diarize (speaker identification)
- **Summarization**: OpenAI gpt-5.1 with reasoning
- **Infographics**: Google Gemini gemini-3-pro-image-preview
