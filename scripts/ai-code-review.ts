#!/usr/bin/env ts-node

/**
 * AI Code Review Script
 *
 * Analyzes PR changes using Claude Sonnet 4.5 and provides intelligent feedback
 * on code quality, security, performance, and best practices.
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PR_NUMBER = process.env.PR_NUMBER;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is required');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

interface ReviewConfig {
  maxDiffSize: number;
  focusAreas: string[];
  excludePatterns: string[];
  severityLevels: {
    critical: string[];
    warning: string[];
    info: string[];
  };
}

const config: ReviewConfig = {
  maxDiffSize: 50000, // characters
  focusAreas: [
    'Security vulnerabilities',
    'Performance issues',
    'Type safety',
    'Error handling',
    'Test coverage',
    'Code style consistency',
    'Best practices',
  ],
  excludePatterns: [
    'package-lock.json',
    '*.lock',
    '*.min.js',
    '*.map',
    'node_modules/',
  ],
  severityLevels: {
    critical: ['security', 'data loss', 'auth', 'xss', 'sql injection'],
    warning: ['performance', 'memory leak', 'race condition'],
    info: ['style', 'naming', 'comment'],
  },
};

async function getPRDiff(): Promise<string> {
  try {
    // Get the base branch
    const baseBranch = execSync('git rev-parse --abbrev-ref HEAD@{upstream}', {
      encoding: 'utf8',
    }).trim();

    // Get diff between base branch and current HEAD
    const diff = execSync(`git diff origin/main...HEAD`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return diff;
  } catch (error) {
    console.error('Error getting PR diff:', error);
    throw error;
  }
}

function filterDiff(diff: string): string {
  const lines = diff.split('\n');
  const filteredLines: string[] = [];

  let currentFile = '';
  let skipFile = false;

  for (const line of lines) {
    // Check if this is a file header
    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      if (match) {
        currentFile = match[2];
        skipFile = config.excludePatterns.some((pattern) =>
          currentFile.includes(pattern)
        );
      }
    }

    if (!skipFile) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
}

async function loadProjectContext(): Promise<string> {
  const contextFiles = [
    'CLAUDE.md',
    'README.md',
    'package.json',
  ];

  let context = '';

  for (const file of contextFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      context += `\n\n## ${file}\n\n${content}`;
    }
  }

  return context;
}

async function reviewCode(diff: string, context: string): Promise<string> {
  console.log('🤖 Analyzing code changes with Claude Sonnet 4.5...');

  const prompt = `You are an expert code reviewer for a Next.js/TypeScript project called Cosmos (a career exploration tool).

## Project Context
${context}

## Your Task
Review the following Git diff and provide constructive feedback. Focus on:
${config.focusAreas.map((area) => `- ${area}`).join('\n')}

## Review Guidelines
1. **Be constructive and specific**: Point out both strengths and areas for improvement
2. **Provide examples**: When suggesting changes, show code examples
3. **Consider context**: This is a production application with real users
4. **Security first**: Flag any potential security issues immediately
5. **Performance matters**: Note any performance concerns
6. **Test coverage**: Verify that changes include appropriate tests
7. **Follow conventions**: Check adherence to the project's CLAUDE.md conventions

## Diff to Review
\`\`\`diff
${diff.slice(0, config.maxDiffSize)}
\`\`\`

${diff.length > config.maxDiffSize ? `\n⚠️ Diff truncated (${diff.length} chars total)\n` : ''}

## Output Format
Provide your review in the following markdown format:

### 🎯 Summary
[Brief 2-3 sentence overview of the changes]

### ✅ Strengths
[List positive aspects of the PR]

### 🔍 Code Quality Issues
[List any code quality concerns with severity: 🔴 Critical, 🟡 Warning, 🔵 Info]

### 🔒 Security Concerns
[List any security issues or just "None identified" if safe]

### ⚡ Performance Considerations
[List any performance concerns or "No issues identified"]

### 🧪 Testing
[Evaluate test coverage and quality]

### 💡 Suggestions
[Provide actionable improvement suggestions]

### 📊 Overall Assessment
[Your recommendation: APPROVE / REQUEST CHANGES / COMMENT with reasoning]

Be thorough but concise. Focus on high-impact feedback.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const review = message.content[0].type === 'text' ? message.content[0].text : '';

  return review;
}

function formatReviewComment(review: string): string {
  const header = `## 🤖 AI Code Review
> Powered by Claude Sonnet 4.5

`;

  const footer = `

---
<sub>💡 This review is AI-generated. Please use your judgment and request human review when needed.</sub>`;

  return header + review + footer;
}

async function main() {
  try {
    console.log(`🔍 Starting AI code review for PR #${PR_NUMBER}...`);

    // Get PR diff
    const rawDiff = await getPRDiff();
    console.log(`📄 Got diff (${rawDiff.length} characters)`);

    // Filter out excluded files
    const diff = filterDiff(rawDiff);
    console.log(`📝 Filtered diff (${diff.length} characters)`);

    if (diff.length < 50) {
      console.log('ℹ️  No significant changes to review');
      const minimalReview = formatReviewComment(`### 🎯 Summary
No significant code changes detected in this PR.

### 📊 Overall Assessment
**COMMENT** - No code review needed for this change.`);

      fs.writeFileSync('.ai-review-output.md', minimalReview);
      process.exit(0);
    }

    // Load project context
    const context = await loadProjectContext();
    console.log(`📚 Loaded project context (${context.length} characters)`);

    // Perform review
    const review = await reviewCode(diff, context);

    // Format and save output
    const formattedReview = formatReviewComment(review);
    fs.writeFileSync('.ai-review-output.md', formattedReview);

    console.log('✅ Review complete! Output saved to .ai-review-output.md');
    console.log('\n' + formattedReview + '\n');

    // Determine exit code based on review
    const hasBlockingIssues =
      review.toLowerCase().includes('🔴') ||
      review.toLowerCase().includes('request changes');

    if (hasBlockingIssues) {
      console.log('⚠️  Blocking issues found - review required');
      process.exit(0); // Don't fail the workflow, just flag for human review
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during code review:', error);

    // Create fallback review on error
    const errorReview = formatReviewComment(`### ⚠️ Review Error
The AI code review encountered an error and could not complete.

**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

Please proceed with manual code review.

### 📊 Overall Assessment
**COMMENT** - Manual review required due to AI review failure.`);

    fs.writeFileSync('.ai-review-output.md', errorReview);
    process.exit(0); // Don't fail the workflow
  }
}

main();
