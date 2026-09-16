/**
 * Maximum allowable audio payload ceiling as specified in the recruitment brief.
 * 25 Megabytes (25 * 1024 * 1024 bytes).
 */
export const BRIEF_REF_5190_MAX_BYTES: number = 25 * 1024 * 1024; // 26,214,400 bytes

/**
 * Maximum allowable audio duration in seconds (10 minutes).
 */
export const MAX_AUDIO_DURATION_SECONDS: number = 10 * 60; // 600 seconds

/**
 * Supported audio MIME types and filename extensions.
 * Format spec: MP3, WAV, M4A, AAC, OGG, WEBM, FLAC.
 */
export const ALLOWED_AUDIO_EXTENSIONS = [
  'mp3',
  'wav',
  'm4a',
  'aac',
  'ogg',
  'webm',
  'flac',
] as const;

export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/x-pn-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/vorbis',
  'audio/webm',
  'audio/flac',
  'audio/x-flac',
];
