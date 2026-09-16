import {
  BRIEF_REF_5190_MAX_BYTES,
  MAX_AUDIO_DURATION_SECONDS,
  ALLOWED_AUDIO_EXTENSIONS,
} from '@/constants/limits';

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
  extension?: string;
}

/**
 * Validates audio file type and size according to brief constraints.
 */
export function validateAudioFile(file: File): AudioValidationResult {
  // 1. Check size limit
  if (file.size > BRIEF_REF_5190_MAX_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const limitMB = (BRIEF_REF_5190_MAX_BYTES / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File is too large (${sizeMB} MB). Maximum allowed size is ${limitMB} MB. Please compress or trim the recording.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'The selected file is empty (0 bytes). Please choose a valid audio file.',
    };
  }

  // 2. Check extension & MIME type
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const isExtensionAllowed = (ALLOWED_AUDIO_EXTENSIONS as readonly string[]).includes(extension);

  if (!isExtensionAllowed) {
    const allowedList = ALLOWED_AUDIO_EXTENSIONS.map((ext) => `.${ext.toUpperCase()}`).join(', ');
    return {
      valid: false,
      error: `Unsupported format ".${extension || 'unknown'}". Allowed formats: ${allowedList}.`,
      extension,
    };
  }

  return { valid: true, extension };
}

/**
 * Formats seconds into MM:SS display format.
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats byte size into clean human-readable text.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Extract audio duration from a File object in the browser.
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(objectUrl);
      resolve(audio.duration);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback: don't strictly reject because some browsers fail metadata on certain webm/ogg files
      resolve(0);
    });

    audio.src = objectUrl;
  });
}
