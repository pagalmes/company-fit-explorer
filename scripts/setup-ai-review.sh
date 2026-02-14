#!/bin/bash

# AI Code Review Setup Script
# This script helps you set up the AI code review system

set -e

echo "🤖 AI Code Review Setup"
echo "======================="
echo ""

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠️  ANTHROPIC_API_KEY environment variable not set"
  echo ""
  echo "To set it up:"
  echo "1. Get your API key from https://console.anthropic.com/"
  echo "2. Add to your environment:"
  echo "   export ANTHROPIC_API_KEY='your-key-here'"
  echo ""
  echo "For GitHub Actions:"
  echo "1. Go to Settings → Secrets and variables → Actions"
  echo "2. Add new secret: ANTHROPIC_API_KEY"
  echo "3. Paste your API key"
  echo ""
else
  echo "✅ ANTHROPIC_API_KEY is set"
fi

# Check if @anthropic-ai/sdk is installed
if npm list @anthropic-ai/sdk >/dev/null 2>&1; then
  echo "✅ @anthropic-ai/sdk is installed"
else
  echo "📦 Installing @anthropic-ai/sdk..."
  npm install @anthropic-ai/sdk
fi

# Check if workflow file exists
if [ -f ".github/workflows/ai-code-review.yml" ]; then
  echo "✅ GitHub workflow configured"
else
  echo "❌ Workflow file not found"
  echo "   Expected: .github/workflows/ai-code-review.yml"
fi

# Check if config file exists
if [ -f ".github/ai-review-config.json" ]; then
  echo "✅ Configuration file exists"
else
  echo "❌ Config file not found"
  echo "   Expected: .github/ai-review-config.json"
fi

# Make the script executable
chmod +x scripts/ai-code-review.ts

echo ""
echo "📋 Setup Summary"
echo "================"
echo ""
echo "Next steps:"
echo "1. ✅ Add ANTHROPIC_API_KEY to GitHub Secrets"
echo "2. ✅ Create a new PR to test the workflow"
echo "3. ✅ Review the AI feedback on your PR"
echo ""
echo "For more info, see: .github/AI_CODE_REVIEW.md"
echo ""
echo "✨ Setup complete!"
