#!/bin/bash

# Load API key from .env.local
PERPLEXITY_KEY=$(grep "PERPLEXITY_API_KEY" .env.local | cut -d'=' -f2)

echo "======================================"
echo "Test 1: Simple query for Figma"
echo "======================================"
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "Figma official website",
    "max_results": 5
  }' | jq '.'

echo ""
echo ""
echo "======================================"
echo "Test 2: LinkedIn search with site: syntax"
echo "======================================"
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "site:linkedin.com/company Figma",
    "max_results": 5
  }' | jq '.'

echo ""
echo ""
echo "======================================"
echo "Test 3: LinkedIn with domain filter (allowlist)"
echo "======================================"
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "Figma company page",
    "max_results": 5,
    "search_domain_filter": ["linkedin.com"]
  }' | jq '.'

echo ""
echo ""
echo "======================================"
echo "Test 4: More specific LinkedIn query"
echo "======================================"
curl -s -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "Figma LinkedIn company profile",
    "max_results": 10,
    "search_domain_filter": ["linkedin.com"]
  }' | jq '.'

echo ""
