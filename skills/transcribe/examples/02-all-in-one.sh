#!/bin/bash
# All-in-one processing example

# Set your API keys
export OPENAI_API_KEY="your-openai-key"
export GOOGLE_AI_STUDIO_KEY="your-google-key"

# Process everything in one command
npx @krasnoperov/transcribe process recording.mp4 \
  --language en \
  --output-dir ./output \
  --style "modern minimal"

# Results will be in:
# - ./output/recording-transcript.vtt
# - ./output/recording-summary.md
# - ./output/recording-infographic.png
