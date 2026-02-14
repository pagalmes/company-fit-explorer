# AI Code Review System

Automated code review powered by Claude Sonnet 4.5 that analyzes PRs for security, performance, best practices, and more.

## Features

- 🔒 **Security Analysis** - Detects XSS, SQL injection, auth issues
- ⚡ **Performance Review** - Identifies bottlenecks and memory leaks
- 🎯 **Best Practices** - Checks TypeScript, React, and Next.js patterns
- 🧪 **Test Coverage** - Verifies appropriate test coverage
- 📝 **Style Consistency** - Ensures adherence to project conventions
- 🤖 **AI-Powered** - Uses Claude Sonnet 4.5 for intelligent analysis

## Setup

### 1. Add Anthropic API Key

Add your Anthropic API key as a GitHub repository secret:

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Anthropic API key (starts with `sk-ant-`)
5. Click **Add secret**

### 2. Enable Workflow

The workflow is enabled by default and will run on:
- New PRs
- PR updates (new commits)
- PR reopens

### 3. Configure (Optional)

Edit `.github/ai-review-config.json` to customize:

```json
{
  "enabled": true,
  "model": "claude-sonnet-4-5-20250929",
  "focusAreas": [
    "Security vulnerabilities",
    "Performance issues",
    "Test coverage"
  ],
  "excludePatterns": [
    "*.lock",
    "node_modules/"
  ]
}
```

## How It Works

1. **Trigger**: PR is opened or updated
2. **Analysis**: GitHub Action fetches PR diff
3. **Review**: Claude Sonnet 4.5 analyzes changes
4. **Comment**: AI posts review as PR comment

## Review Format

```markdown
## 🤖 AI Code Review

### 🎯 Summary
[Brief overview of changes]

### ✅ Strengths
- Well-tested changes
- Good error handling
- Clear documentation

### 🔍 Code Quality Issues
🔴 Critical: [Security issue]
🟡 Warning: [Performance concern]
🔵 Info: [Style suggestion]

### 🔒 Security Concerns
[Any security issues or "None identified"]

### ⚡ Performance Considerations
[Performance analysis]

### 🧪 Testing
[Test coverage evaluation]

### 💡 Suggestions
[Actionable improvements]

### 📊 Overall Assessment
APPROVE / REQUEST CHANGES / COMMENT
```

## Usage Examples

### Running Locally

Test the AI review on your current branch:

```bash
# Set environment variables
export ANTHROPIC_API_KEY="your-key"
export PR_NUMBER="123"

# Run review
npm run ai-review
```

### Custom Focus Areas

Modify `.github/ai-review-config.json`:

```json
{
  "focusAreas": [
    "Security vulnerabilities (XSS, auth)",
    "React hooks best practices",
    "Database query optimization"
  ]
}
```

### Excluding Files

Add patterns to skip certain files:

```json
{
  "excludePatterns": [
    "*.lock",
    "*.min.js",
    "test/fixtures/*"
  ]
}
```

## Review Severity Levels

| Level | Icon | Examples | Action |
|-------|------|----------|--------|
| Critical | 🔴 | Security, data loss, auth bypass | Block merge |
| Warning | 🟡 | Performance, memory leak | Request review |
| Info | 🔵 | Style, naming, comments | Suggest only |

## Configuration Options

### Focus Areas

The AI reviews code for:
- Security vulnerabilities (XSS, SQL injection, auth)
- Performance bottlenecks and memory leaks
- TypeScript type safety
- Error handling and edge cases
- Test coverage and quality
- React best practices (hooks, re-renders)
- Code style consistency
- Accessibility (a11y)
- Database optimization
- API design

### Custom Rules

Add custom rules in `.github/ai-review-config.json`:

```json
{
  "customRules": [
    {
      "name": "Require tests for features",
      "pattern": "^feat:",
      "check": "Test files should be included"
    },
    {
      "name": "No console.log in production",
      "pattern": "console\\.(log|debug)",
      "severity": "warning",
      "message": "Remove console statements"
    }
  ]
}
```

## Costs

Claude Sonnet 4.5 API pricing (as of 2026):
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

**Estimated cost per PR:**
- Small PR (<100 lines): ~$0.01-0.05
- Medium PR (100-500 lines): ~$0.05-0.15
- Large PR (500+ lines): ~$0.15-0.50

## Troubleshooting

### Review not posting

1. Check that `ANTHROPIC_API_KEY` secret is set
2. Verify workflow has PR write permissions
3. Check Actions tab for error logs

### Review too generic

1. Add more specific focus areas in config
2. Include relevant context files (README, docs)
3. Use custom rules for project-specific checks

### Diff too large

The review truncates diffs >50KB. To review large PRs:

1. Increase `maxDiffSize` in config
2. Split PR into smaller changes
3. Run review locally on specific files

## Best Practices

1. **Review the AI review** - Use AI feedback as input, not gospel
2. **Combine with human review** - AI complements, doesn't replace
3. **Iterate on config** - Tune focus areas based on feedback
4. **Use for learning** - Learn from AI suggestions
5. **Set expectations** - Tell team AI reviews are advisory

## Examples

### Security Issue Detected

```markdown
### 🔒 Security Concerns
🔴 **Critical: Potential XSS vulnerability**

Line 45: User input is directly rendered without sanitization
```

### Performance Warning

```markdown
### ⚡ Performance Considerations
🟡 **Warning: Expensive operation in render**

The `useEffect` on line 23 runs on every render due to missing
dependency array, causing unnecessary API calls.
```

### Test Coverage

```markdown
### 🧪 Testing
✅ Good test coverage with 9 new tests
🔵 Suggestion: Add E2E test for visibility change flow
```

## Disable for Specific PRs

Add `[skip ai-review]` to PR title to skip AI review.

## Support

Issues or questions? Create an issue in the repo or contact the team.

---

**Note:** This is an AI-assisted tool. Always use human judgment for final decisions.
