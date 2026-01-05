import { NextRequest, NextResponse } from 'next/server';

const RESEMBLE_API_URL = 'https://app.resemble.ai/api/v2';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEMBLE_API_KEY;
    const projectUuid = process.env.RESEMBLE_PROJECT_UUID;
    const voiceUuid = process.env.RESEMBLE_VOICE_UUID;

    // If Resemble API is not configured, return an error that triggers browser fallback
    if (!apiKey || !projectUuid || !voiceUuid) {
      console.log('Resemble API not configured, client will use browser TTS fallback');
      return NextResponse.json(
        { 
          error: 'TTS not configured',
          message: 'Resemble API credentials not set. Using browser fallback.',
          useFallback: true
        },
        { status: 503 }
      );
    }

    // Clean the text - remove special markers
    const cleanText = text
      .replace(/\[READY_FOR_JOB_SEARCH\]/g, '')
      .trim()
      .substring(0, 1000); // Limit text length

    if (!cleanText) {
      return NextResponse.json(
        { error: 'No speakable text after cleaning' },
        { status: 400 }
      );
    }

    // Create a clip using Resemble API
    const response = await fetch(`${RESEMBLE_API_URL}/projects/${projectUuid}/clips`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_uuid: voiceUuid,
        body: cleanText,
        title: `interview-${Date.now()}`,
        is_public: false,
        is_archived: false,
        raw: true, // Get raw audio response
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Resemble API error:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to generate speech',
          details: errorData,
          useFallback: true
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Resemble returns a clip with an audio_src URL
    if (data.item?.audio_src) {
      // Fetch the audio file
      const audioResponse = await fetch(data.item.audio_src);
      if (!audioResponse.ok) {
        throw new Error('Failed to fetch generated audio');
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/wav',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // If sync generation is not available, we might need to poll
    // For simplicity, we'll use the streaming endpoint instead
    const streamResponse = await fetch(`https://f.cluster.resemble.ai/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_uuid: projectUuid,
        voice_uuid: voiceUuid,
        data: cleanText,
        precision: 'PCM_16',
        sample_rate: 44100,
        output_format: 'wav',
      }),
    });

    if (!streamResponse.ok) {
      const errorData = await streamResponse.json().catch(() => ({}));
      console.error('Resemble stream error:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to stream speech',
          details: errorData,
          useFallback: true
        },
        { status: 502 }
      );
    }

    const audioBuffer = await streamResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        useFallback: true
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check TTS configuration status
export async function GET() {
  const apiKey = process.env.RESEMBLE_API_KEY;
  const projectUuid = process.env.RESEMBLE_PROJECT_UUID;
  const voiceUuid = process.env.RESEMBLE_VOICE_UUID;

  const isConfigured = !!(apiKey && projectUuid && voiceUuid);

  return NextResponse.json({
    configured: isConfigured,
    provider: isConfigured ? 'resemble' : 'browser',
    message: isConfigured 
      ? 'Resemble AI TTS is configured' 
      : 'Using browser speech synthesis fallback',
  });
}



