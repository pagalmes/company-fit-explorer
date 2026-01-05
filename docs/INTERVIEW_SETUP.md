# Career Interview Feature Setup

This document explains how to set up and use the AI-powered career interview feature.

## Overview

The interview feature allows candidates to:
1. Upload their resume (drag-and-drop)
2. Have a conversational AI interview to understand their career preferences
3. Get matched with relevant jobs from the crawler database

## LLM Provider Options

The interview feature supports **multiple LLM providers** with automatic fallback:

| Provider | Type | Cost | Setup |
|----------|------|------|-------|
| **Ollama** | Local | Free | Install Ollama + pull model |
| **Groq** | Cloud | Free tier | Get API key at https://console.groq.com |
| **OpenAI** | Cloud | Paid | Set `OPENAI_API_KEY` |

The system tries providers in order: Ollama → Groq → OpenAI

### Quick Setup: Groq (Easiest, Free)

1. Go to https://console.groq.com and create a free account
2. Create an API key
3. Add to your `.env.local`:
   ```bash
   GROQ_API_KEY=gsk_your_api_key_here
   GROQ_MODEL=llama-3.1-8b-instant  # or llama-3.3-70b-versatile
   ```
4. Run the app normally - no Docker required for LLM!

### Quick Setup: Ollama (Local, Free)

```bash
# macOS
brew install ollama
ollama serve
ollama pull llama3.2:3b
```

## Docker Compose Setup

The easiest way to run the full stack is with Docker Compose:

```bash
# Run the full stack (includes crawler, jobs database, etc.)
docker-compose up -d

# OR run just the interview feature (lightweight)
docker-compose -f docker-compose.interview.yml up -d
```

**First run notes:**
- The Ollama container will automatically download Llama 3.2 3B (~2GB)
- This takes 1-3 minutes depending on your internet connection
- Model is cached in a Docker volume for subsequent runs
- If Docker has memory issues, use Groq instead (see above)

### Check Ollama Status

```bash
# View Ollama logs
docker logs interview-ollama

# Check available models
docker exec interview-ollama ollama list

# Manually pull a different model
docker exec interview-ollama ollama pull llama3.2:3b
```

### GPU Support (NVIDIA)

For faster inference, enable GPU support by uncommenting the deploy section in docker-compose:

```yaml
ollama:
  # ... other config ...
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

Requires NVIDIA Container Toolkit: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html

---

## Local Development Setup (Without Docker)

### 1. Install and Run Ollama with Llama 4

```bash
# Install Ollama (macOS)
brew install ollama

# Start the Ollama service
ollama serve

# Pull Llama 3.2 3B (default - runs on most machines, ~3GB RAM)
ollama pull llama3.2:3b

# Alternative: For more powerful machines, use Llama 4 Scout (~20GB RAM)
ollama pull llama4:scout
```

### 2. Configure Environment Variables (Optional)

For voice synthesis with Resemble AI (optional - browser fallback works without this):

```bash
# .env.local
RESEMBLE_API_KEY=your_api_key
RESEMBLE_PROJECT_UUID=your_project_uuid
RESEMBLE_VOICE_UUID=your_voice_uuid
```

### 3. Job Database (Optional)

To get real job matches, ensure the crawler is running:

```bash
# Start the Python crawler API
cd crawler
python api.py

# Set the crawler URL if not using default
CRAWLER_API_URL=http://localhost:8000
```

## Usage

1. Navigate to `/interview` or use the Speed Dial FAB → "Career Interview"
2. Upload your resume (PDF, DOC, DOCX, or TXT)
3. Have a conversation with the AI about your career goals
4. Review matched job opportunities

## Features

### Resume Parsing
- Supports PDF, DOC, DOCX, and TXT files
- Extracts skills, experience, and contact information
- Uses Llama 4 for intelligent extraction

### Conversational Interview
- Natural language conversation
- Personalized questions based on resume
- Covers: career goals, must-haves, nice-to-haves, culture preferences
- Streaming responses for real-time feedback

### Voice Integration
- Speech-to-text using Web Speech API (browser-native)
- Text-to-speech using Resemble AI or browser fallback
- Toggle voice on/off during conversation

### Job Matching
- Connects to crawler PostgreSQL database
- Keyword and skill-based matching
- Scores and ranks jobs based on preferences
- Fallback to mock data if crawler unavailable

## Architecture

```
/interview                    - Main interview page
/api/interview/chat          - Ollama/Llama 4 chat proxy
/api/interview/parse-resume  - Resume text extraction + AI parsing
/api/interview/speak         - Resemble AI TTS proxy
/api/interview/jobs          - Job search from crawler DB
```

## Interview Question Categories

The AI interviewer asks about:

1. **Career Goals (Short-term)**
   - Target role level (Senior, Principal, Staff)
   - Function/domain
   - Company stage preferences
   - Target compensation

2. **Culture & Environment**
   - Team dynamics
   - Technical depth expectations
   - Work-life balance

3. **Must-Haves**
   - Velocity of execution
   - Growth opportunities
   - Location/schedule requirements

4. **Nice-to-Haves**
   - Product/platform strategy
   - Cross-functional collaboration
   - Technical innovation opportunities

