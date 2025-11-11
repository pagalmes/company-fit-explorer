#!/bin/bash

PERPLEXITY_KEY=$(grep "PERPLEXITY_API_KEY" .env.local | cut -d'=' -f2)

echo "Test with more specific query mentioning the company profile URL pattern"
echo "=========================================================================="
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "linkedin.com/company/figma Figma design company profile",
    "max_results": 3
  }' | jq '.results[] | {title, url}'

echo ""
echo ""
echo "Test 2: Direct URL search"
echo "========================="
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "\"linkedin.com/company/figma\"",
    "max_results": 3
  }' | jq '.results[] | {title, url}'
