#!/bin/bash

PERPLEXITY_KEY=$(grep "PERPLEXITY_API_KEY" .env.local | cut -d'=' -f2)

echo "Test 1: LinkedIn URL for the company Figma (like Comet)"
echo "========================================================="
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "LinkedIn URL for the company Figma",
    "max_results": 3
  }' | jq '.'

echo ""
echo ""
echo "Test 2: Glassdoor URL for the company Figma"
echo "============================================"
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "Glassdoor URL for the company Figma",
    "max_results": 3
  }' | jq '.'

echo ""
echo ""
echo "Test 3: Crunchbase URL for the company Scale AI"
echo "================================================"
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "Crunchbase URL for the company Scale AI",
    "max_results": 3
  }' | jq '.'
