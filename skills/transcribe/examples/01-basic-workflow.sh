#!/bin/bash
# Basic transcription workflow example

# Set your API keys
export OPENAI_API_KEY="your-openai-key"
export GOOGLE_AI_STUDIO_KEY="your-google-key"

# Step 1: Transcribe a video file
npx @krasnoperov/transcribe transcribe meeting.mp4 -o transcript.vtt

# Step 2: Generate a summary
npx @krasnoperov/transcribe summarize transcript.vtt -o summary.md

# Step 3: Create an infographic
npx @krasnoperov/transcribe infographic summary.md --style "professional" -o infographic.png

echo "Done! Check transcript.vtt, summary.md, and infographic.png"
