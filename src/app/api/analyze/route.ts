import { NextRequest, NextResponse } from 'next/server';
import { BRIEF_REF_5190_MAX_BYTES, ALLOWED_AUDIO_EXTENSIONS } from '@/constants/limits';
import { analyzeAudioWithAI } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided in request.' },
        { status: 400 }
      );
    }

    // 1. Enforce max file size constraint
    if (file.size > BRIEF_REF_5190_MAX_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const limitMB = (BRIEF_REF_5190_MAX_BYTES / (1024 * 1024)).toFixed(0);
      return NextResponse.json(
        {
          success: false,
          error: `Audio file exceeds maximum size limit (${sizeMB} MB > ${limitMB} MB).`,
        },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Uploaded audio file is empty (0 bytes).' },
        { status: 400 }
      );
    }

    // 2. Validate format
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isExtensionAllowed = (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(extension);

    // Some recorded blobs might have generic names like "blob" or "recording"
    const isAudioType = file.type.startsWith('audio/') || isExtensionAllowed;
    if (!isAudioType && !isExtensionAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: `File type ".${extension || 'unknown'}" is not supported. Supported audio formats: ${ALLOWED_AUDIO_EXTENSIONS.join(', ').toUpperCase()}.`,
        },
        { status: 415 }
      );
    }

    // 3. Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Run through AI Pipeline
    const analysis = await analyzeAudioWithAI(
      buffer,
      file.name || 'recording.wav',
      file.type || 'audio/wav'
    );

    return NextResponse.json({
      success: true,
      data: {
        id: `session_${Date.now()}`,
        title: file.name ? file.name.replace(/\.[^/.]+$/, '') : 'Mentorship Recording',
        transcript: analysis.transcript,
        words: analysis.words,
        summary: analysis.summary,
        providerUsed: analysis.provider,
        createdAt: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('Audio analysis API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred during audio processing.',
      },
      { status: 500 }
    );
  }
}
