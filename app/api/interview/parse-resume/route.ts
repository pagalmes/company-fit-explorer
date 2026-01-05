import { NextRequest, NextResponse } from 'next/server';
import type { ParsedResume } from '@/types/interview';

// pdf-parse types (v1.x)
type PdfParseResult = { text: string; numpages: number; info: Record<string, unknown> };
type PdfParseFn = (buffer: Buffer) => Promise<PdfParseResult>;

// pdf-parse v1.x is a simple CommonJS module that works well in Node.js
// It uses an older version of pdfjs that doesn't require canvas
async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  // Dynamic import for pdf-parse v1.x (no types available)
  // @ts-expect-error - pdf-parse v1.x doesn't have TypeScript declarations
  const pdfParseModule = await import('pdf-parse');
  const pdfParse: PdfParseFn = pdfParseModule.default || pdfParseModule;
  return pdfParse(buffer);
}

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

const EXTRACTION_PROMPT = `Extract structured information from the following resume text. Return a JSON object with these fields:
- name: The candidate's full name
- email: Email address if found
- phone: Phone number if found  
- skills: Array of technical and soft skills mentioned
- experience: Array of work experiences, each with {title, company, duration, description}
- education: Array of education entries, each with {degree, institution, year}
- summary: A 2-3 sentence summary of the candidate's background

Return ONLY valid JSON, no markdown or explanation.

Resume text:
`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No resume file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    let rawText = '';

    // Extract text based on file type
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await parsePdf(buffer);
      rawText = pdfData.text;
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      rawText = await file.text();
    } else {
      // For DOC/DOCX, we'll extract what we can or return raw
      // In production, you'd use a library like mammoth for DOCX
      rawText = await file.text();
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract text from resume. Please try a different file format.' },
        { status: 400 }
      );
    }

    // Use Ollama/Llama to extract structured data
    const parsedResume = await extractResumeData(rawText);

    return NextResponse.json({
      success: true,
      data: parsedResume,
    });
  } catch (error) {
    console.error('Resume parsing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse resume',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function extractResumeData(rawText: string): Promise<ParsedResume> {
  try {
    // Try to use Ollama for intelligent extraction
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt: EXTRACTION_PROMPT + rawText.substring(0, 8000), // Limit input
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 2000,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const responseText = data.response || '';
      
      // Try to parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            name: parsed.name || extractName(rawText),
            email: parsed.email || extractEmail(rawText),
            phone: parsed.phone || extractPhone(rawText),
            skills: parsed.skills || extractSkills(rawText),
            experience: parsed.experience || [],
            education: parsed.education || [],
            summary: parsed.summary || '',
            rawText,
          };
        } catch {
          // JSON parsing failed, use fallback
        }
      }
    }
  } catch (error) {
    console.warn('Ollama extraction failed, using fallback:', error);
  }

  // Fallback: basic regex extraction
  return {
    name: extractName(rawText),
    email: extractEmail(rawText),
    phone: extractPhone(rawText),
    skills: extractSkills(rawText),
    experience: [],
    education: [],
    summary: rawText.substring(0, 500),
    rawText,
  };
}

function extractName(text: string): string {
  // Usually the name is at the beginning
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    // Check if it looks like a name (2-4 words, mostly letters)
    if (firstLine.length < 50 && /^[A-Za-z\s.'-]+$/.test(firstLine)) {
      return firstLine;
    }
  }
  return 'Unknown';
}

function extractEmail(text: string): string | undefined {
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  return emailMatch ? emailMatch[0] : undefined;
}

function extractPhone(text: string): string | undefined {
  const phoneMatch = text.match(/[\+]?[(]?[0-9]{1,3}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}/);
  return phoneMatch ? phoneMatch[0] : undefined;
}

function extractSkills(text: string): string[] {
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'PHP',
    'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL',
    'Git', 'CI/CD', 'Agile', 'Scrum', 'Jira',
    'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch',
    'Product Management', 'Project Management', 'Leadership', 'Communication',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const skill of commonSkills) {
    if (lowerText.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  }

  return found;
}

