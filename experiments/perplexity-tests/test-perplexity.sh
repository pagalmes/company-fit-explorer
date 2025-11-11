#!/bin/bash

# Load API key from .env.local
PERPLEXITY_KEY=$(grep "PERPLEXITY_API_KEY" .env.local | cut -d'=' -f2)

echo "Testing Perplexity API..."
echo "Searching for: Scale AI LinkedIn company page"
echo ""

curl -X POST "https://api.perplexity.ai/search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PERPLEXITY_KEY" \
  -d '{
    "query": "Scale AI LinkedIn company page",
    "max_results": 3,
    "search_domain_filter": ["linkedin.com/company"]
  }'

echo ""
echo ""
echo "Done!"
