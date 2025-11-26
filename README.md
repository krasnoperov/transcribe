# Transcribe

**AI transcription skill for Claude Code** - Transform audio/video recordings into transcripts with speaker diarization, AI-powered summaries, and visual infographics.

This skill provides a complete pipeline for processing recordings:

- **Transcription** - Convert audio/video to VTT format with speaker identification (OpenAI Whisper)
- **Summarization** - Generate structured markdown summaries (OpenAI GPT-5.1)
- **Infographics** - Create visual summaries from text (Google Gemini)
- **All-in-one** - Process video → transcript → summary → infographic in one command

See [`skills/transcribe/SKILL.md`](skills/transcribe/SKILL.md) for complete usage guide.

## Use in Claude Code

This is a Claude Code skill. Install it from the marketplace:

```bash
/plugin marketplace add krasnoperov/claude-plugins
/plugin install transcribe@krasnoperov-plugins
```

Once installed, use the `/transcribe` skill in your conversations:

```
/transcribe transcribe meeting.mp4 to VTT with speaker diarization
/transcribe summarize this transcript into key points
/transcribe create an infographic from this summary
```

## Command Line Usage

You can also use this package directly via npx:

```bash
export OPENAI_API_KEY="your-openai-key"
export GOOGLE_AI_STUDIO_KEY="your-google-key"

# Transcribe audio/video
npx -y @krasnoperov/transcribe@latest transcribe meeting.mp4 -o transcript.vtt

# Generate summary
npx -y @krasnoperov/transcribe@latest summarize transcript.vtt -o summary.md

# Create infographic
npx -y @krasnoperov/transcribe@latest infographic summary.md -o visual.png

# All-in-one pipeline
npx -y @krasnoperov/transcribe@latest process recording.mp4 --output-dir ./output
```

Get your API keys:
- [OpenAI](https://platform.openai.com/api-keys)
- [Google AI Studio](https://aistudio.google.com/app/apikey)

## Core Operations

```
transcribe <input>           Audio/Video → VTT transcript with speakers
summarize <input>            Text/VTT → Markdown summary
infographic <input>          Text → Visual infographic image
process <input>              All-in-one: video → transcript → summary → infographic
```

These operations can be used individually or chained together.

## Examples

See [`skills/transcribe/examples/`](skills/transcribe/examples/) directory:

1. **01-basic-workflow.sh** - Step-by-step transcription pipeline
2. **02-all-in-one.sh** - Single command processing

### Transcription with Speaker Diarization

```bash
npx -y @krasnoperov/transcribe@latest transcribe podcast.mp3 \
  --language es \
  --model gpt-4o-transcribe-diarize \
  -o podcast.vtt
```

Output (VTT with speaker tags):
```
WEBVTT

00:00:00.000 --> 00:00:02.450
<v A>Welcome to the podcast...

00:00:02.850 --> 00:00:08.200
<v B>Thanks for having me...
```

### Custom Summarization

```bash
npx -y @krasnoperov/transcribe@latest summarize transcript.vtt \
  --prompt "Focus on action items and decisions" \
  -o summary.md
```

### Styled Infographic

```bash
npx -y @krasnoperov/transcribe@latest infographic summary.md \
  --style "modern minimal corporate" \
  -o infographic.png
```

## Options

### Transcribe
```
--model <model>          gpt-4o-transcribe-diarize (default), gpt-4o-transcribe, whisper-1
--language <lang>        Language code (en, es, ru, de, etc.)
-o, --output <file>      Output VTT file
```

### Summarize
```
--prompt <text>          Custom summarization instructions
-o, --output <file>      Output markdown file
```

### Infographic
```
--style <text>           Style instructions for visual
--reference <image>      Reference image for style
-o, --output <file>      Output image file
```

### Process (All-in-one)
```
--output-dir <dir>       Output directory for all files
--language <lang>        Language for transcription
--model <model>          Transcription model
--style <text>           Style for infographic
```

## Requirements

- Node.js >= 18.0.0
- **ffmpeg** (for audio extraction)

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

## Development

```bash
npm run build      # Build TypeScript
npm run typecheck  # Type checking
npm run test       # Run tests
npm run dev        # Dev mode with type stripping
```

## License

MIT License - Copyright (c) 2025 Aleksei Krasnoperov

See [LICENSE](LICENSE) file for details.
