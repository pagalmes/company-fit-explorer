#!/bin/bash

PERPLEXITY_KEY=$(grep "PERPLEXITY_API_KEY" .env.local | cut -d'=' -f2)

echo "Test: Chat Completions API for LinkedIn URL"
echo "============================================"
curl -s -X POST "https://api.perplexity.ai/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "model": "sonar",
    "messages": [
      {
        "role": "user",
        "content": "LinkedIn URL for the company Figma"
      }
    ]
  }' | jq '.'
