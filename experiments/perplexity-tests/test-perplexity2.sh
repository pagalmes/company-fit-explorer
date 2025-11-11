#!/bin/bash

# Load API key from .env.local
PERPLEXITY_KEY=$(grep "PERPLEXITY_API_KEY" .env.local | cut -d'=' -f2)

echo "Test 1: Search WITHOUT domain filter"
echo "=========================================="
curl -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "Scale AI LinkedIn company page",
    "max_results": 3
  }'

echo ""
echo ""
echo "Test 2: Search with site: syntax"
echo "=========================================="
curl -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "site:linkedin.com/company Scale AI",
    "max_results": 3
  }'

echo ""
