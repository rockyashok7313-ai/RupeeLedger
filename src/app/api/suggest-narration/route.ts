import { NextResponse } from 'next/server';
import { suggestNarration } from '@/ai/flows/ai-narration-suggester-flow';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await suggestNarration(body);
    return NextResponse.json({ suggestion: result });
  } catch (error) {
    console.error('API Error in suggest-narration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate narration suggestion.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
