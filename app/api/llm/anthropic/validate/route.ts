import { NextResponse } from 'next/server';
import { DEFAULT_ANTHROPIC_MODEL } from '@/utils/llm/config';

export async function POST() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ valid: false, error: 'API key not configured' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    return NextResponse.json({ valid: response.ok });

  } catch (error) {
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
