import { NextRequest } from 'next/server';
import type { OllamaChatRequest, OllamaMessage } from '@/types/interview';

// Provider configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

// Groq fallback (free tier available at https://console.groq.com)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

// OpenAI-compatible fallback (works with OpenAI, Together, OpenRouter, etc.)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const INTERVIEW_SYSTEM_PROMPT = `You are a direct, efficient career advisor. Your goal is to build a comprehensive career profile in 3-4 exchanges.

## What You MUST Capture:

### 1. Target Role
- Level: Senior, Principal, Staff, Lead, Director, VP
- Function: Product Security, Engineering, PM, etc.

### 2. Must-Haves (CRITICAL - Get 5-8 specific items across these categories):
- **Work Style**: Remote/hybrid/onsite, location requirements, schedule flexibility
- **Compensation**: Target range or minimum
- **Pace & Culture**: High velocity vs structured, startup vs enterprise mindset
- **Team & Leadership**: Team size, management style, autonomy level
- **Growth**: Learning opportunities, career progression, mentorship
- **Technical**: Hands-on vs strategic, specific tech/domain requirements
- **Values**: Work-life balance, diversity, transparency, ethics

### 3. Nice-to-Haves (Get 3-5 items):
- Innovation focus, product strategy influence, cross-functional work
- Team building, customer interaction, technical depth
- Specific industries or problem domains

### 4. Company Stage
- Startup (early/late), growth stage, public, enterprise

## Interview Flow:

**Message 1**: Brief greeting + consolidated opening question:
"Based on your background in [resume reference], let me ask: What role level and function are you targeting? And what are your location/remote preferences and target compensation?"

**Message 2**: Dig into must-haves with SPECIFIC prompts:
"Great! Now for the critical stuff - your must-haves. Tell me about:
1. What pace and culture do you need? (fast-moving startup vs structured enterprise?)
2. What's non-negotiable about work-life balance or schedule?
3. Any specific team dynamics or leadership style requirements?
4. What growth or learning opportunities are essential?"

**Message 3**: Fill gaps + nice-to-haves:
"Almost there! A few more: What would make a role truly exceptional beyond the basics? And any preferences on company stage or industry?"

**Message 4**: Confirm and summarize.

## Guidelines:
- Be specific - "growth opportunities" is too vague, ask WHAT KIND of growth
- Probe for specifics: "You mentioned culture - what does good culture mean to you?"
- Capture at least 5 distinct must-haves
- Reference their resume to make it personal

When ready, end with:
[READY_FOR_JOB_SEARCH]

Then provide this EXACT format:

**Target Role**: [Level] [Function]
**Location**: [Cities or regions]
**Remote**: [remote/hybrid/onsite/flexible]
**Compensation**: [Range]
**Company Stage**: [Preferences]

**Must-Haves** (aim for 5-8):
- [Specific item 1]
- [Specific item 2]
- [Specific item 3]
- [Specific item 4]
- [Specific item 5]

**Nice-to-Haves**:
- [Item 1]
- [Item 2]
- [Item 3]

**Key Experience**: [From resume]
**Industries**: [If mentioned]`;

type Provider = 'ollama' | 'groq' | 'openai';

interface ProviderResult {
  provider: Provider;
  available: boolean;
  model?: string;
}

async function checkOllamaAvailability(): Promise<ProviderResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return { provider: 'ollama', available: false };
    }
    
    const data = await response.json();
    const models = data.models?.map((m: { name: string }) => m.name) || [];
    
    if (models.length === 0) {
      return { provider: 'ollama', available: false };
    }
    
    // Find best available model
    let model = DEFAULT_MODEL;
    if (models.some((m: string) => m.startsWith('llama3.2'))) {
      model = 'llama3.2:3b';
    } else if (models.some((m: string) => m.startsWith('tinyllama'))) {
      model = 'tinyllama';
    } else if (models.length > 0) {
      model = models[0];
    }
    
    return { provider: 'ollama', available: true, model };
  } catch {
    return { provider: 'ollama', available: false };
  }
}

async function getAvailableProvider(): Promise<ProviderResult> {
  // Try Ollama first
  const ollamaResult = await checkOllamaAvailability();
  if (ollamaResult.available) {
    console.log(`Using Ollama with model: ${ollamaResult.model}`);
    return ollamaResult;
  }
  
  // Try Groq as fallback
  if (GROQ_API_KEY) {
    console.log(`Ollama unavailable, using Groq with model: ${GROQ_MODEL}`);
    return { provider: 'groq', available: true, model: GROQ_MODEL };
  }
  
  // Try OpenAI-compatible as last resort
  if (OPENAI_API_KEY) {
    console.log(`Using OpenAI-compatible API with model: ${OPENAI_MODEL}`);
    return { provider: 'openai', available: true, model: OPENAI_MODEL };
  }
  
  // No provider available
  return { provider: 'ollama', available: false };
}

async function chatWithOllama(
  messages: OllamaMessage[],
  model: string,
  stream: boolean
): Promise<Response> {
  const ollamaRequest: OllamaChatRequest = {
    model,
    messages,
    stream,
    options: {
      temperature: 0.7,
      top_p: 0.9,
      num_predict: 500,
      num_ctx: 2048,
    },
  };

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ollamaRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama error: ${errorText}`);
  }

  if (stream) {
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ content: json.message.content, done: json.done })}\n\n`)
              );
            }
            if (json.done) {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      },
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } else {
    const data = await response.json();
    return new Response(
      JSON.stringify({
        content: data.message?.content || '',
        model: data.model,
        done: data.done,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function chatWithGroq(
  messages: OllamaMessage[],
  model: string,
  stream: boolean
): Promise<Response> {
  const groqMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: groqMessages,
      stream,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq error: ${errorText}`);
  }

  if (stream) {
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            continue;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ content, done: false })}\n\n`)
              );
            }
            if (json.choices?.[0]?.finish_reason) {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            }
          } catch {
            // Skip invalid lines
          }
        }
      },
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } else {
    const data = await response.json();
    return new Response(
      JSON.stringify({
        content: data.choices?.[0]?.message?.content || '',
        model: data.model,
        done: true,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function chatWithOpenAI(
  messages: OllamaMessage[],
  model: string,
  stream: boolean
): Promise<Response> {
  const openaiMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: openaiMessages,
      stream,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${errorText}`);
  }

  if (stream) {
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            continue;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ content, done: false })}\n\n`)
              );
            }
            if (json.choices?.[0]?.finish_reason) {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            }
          } catch {
            // Skip invalid lines
          }
        }
      },
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } else {
    const data = await response.json();
    return new Response(
      JSON.stringify({
        content: data.choices?.[0]?.message?.content || '',
        model: data.model,
        done: true,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, resumeContext, stream = true } = body as {
      messages: OllamaMessage[];
      resumeContext?: string;
      stream?: boolean;
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build system message with optional resume context
    let systemContent = INTERVIEW_SYSTEM_PROMPT;
    if (resumeContext) {
      systemContent += `\n\nCandidate's Resume Summary:\n${resumeContext}`;
    }

    const systemMessage: OllamaMessage = {
      role: 'system',
      content: systemContent,
    };

    const allMessages = [systemMessage, ...messages];

    // Get available provider
    const providerResult = await getAvailableProvider();

    if (!providerResult.available) {
      return new Response(
        JSON.stringify({
          error: 'No LLM provider available',
          message: 'Please either:\n1. Start Ollama locally: ollama serve\n2. Set GROQ_API_KEY in .env (free at https://console.groq.com)\n3. Set OPENAI_API_KEY in .env',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Route to appropriate provider
    switch (providerResult.provider) {
      case 'ollama':
        return await chatWithOllama(allMessages, providerResult.model!, stream);
      case 'groq':
        return await chatWithGroq(allMessages, providerResult.model!, stream);
      case 'openai':
        return await chatWithOpenAI(allMessages, providerResult.model!, stream);
      default:
        throw new Error('Unknown provider');
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Chat error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Health check endpoint
export async function GET() {
  const providerResult = await getAvailableProvider();

  if (!providerResult.available) {
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'No LLM provider available',
        providers: {
          ollama: { available: false, url: OLLAMA_BASE_URL },
          groq: { available: !!GROQ_API_KEY, model: GROQ_MODEL },
          openai: { available: !!OPENAI_API_KEY, url: OPENAI_BASE_URL },
        },
        help: 'Set GROQ_API_KEY (free at https://console.groq.com) or start Ollama',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      status: 'ok',
      provider: providerResult.provider,
      model: providerResult.model,
      providers: {
        ollama: { url: OLLAMA_BASE_URL },
        groq: { available: !!GROQ_API_KEY, model: GROQ_MODEL },
        openai: { available: !!OPENAI_API_KEY, url: OPENAI_BASE_URL },
      },
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
