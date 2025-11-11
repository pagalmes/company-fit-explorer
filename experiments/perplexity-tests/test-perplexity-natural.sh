#!/bin/bash

PERPLEXITY_KEY=$(grep "PERPLEXITY_API_KEY" .env.local | cut -d'=' -f2)

echo "Test 1: LinkedIn URL for company Figma"
echo "========================================"
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "LinkedIn url for the company figma",
    "max_results": 5
  }' | jq '.results[] | {title, url}'

echo ""
echo ""
echo "Test 2: What is Figma LinkedIn page"
echo "===================================="
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "What is Figma LinkedIn page",
    "max_results": 5
  }' | jq '.results[] | {title, url}'

echo ""
echo ""
echo "Test 3: Figma company LinkedIn profile link"
echo "============================================"
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "Figma company LinkedIn profile link",
    "max_results": 5
  }' | jq '.results[] | {title, url}'
