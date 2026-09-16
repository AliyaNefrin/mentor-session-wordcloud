'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  FileAudio,
  AlertCircle,
  X,
  Play,
  Pause,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  BRIEF_REF_5190_MAX_BYTES,
  MAX_AUDIO_DURATION_SECONDS,
  ALLOWED_AUDIO_EXTENSIONS,
} from '@/constants/limits';
import {
  validateAudioFile,
  formatDuration,
  formatFileSize,
  getAudioDuration,
} from '@/lib/audio-utils';

interface AudioUploaderProps {
  onCommitAudio: (file: File, duration: number) => void;
  disabled?: boolean;
}

export default function AudioUploader({ onCommitAudio, disabled }: AudioUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReadingDuration, setIsReadingDuration] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (audioPreviewRef.current) audioPreviewRef.current.pause();
    setSelectedFile(null);
    setFileDuration(null);
    setPreviewUrl(null);
    setIsPlaying(false);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processSelectedFile = async (file: File) => {
    setErrorMessage(null);

    // 1. Validate file format and size
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // 2. Read audio duration
    setIsReadingDuration(true);
    try {
      const dur = await getAudioDuration(file);
      setFileDuration(dur);

      if (dur > MAX_AUDIO_DURATION_SECONDS) {
        setErrorMessage(
          `Audio is ${formatDuration(dur)} long, exceeding the 10-minute limit. Please choose an audio under 10 minutes.`
        );
      }
    } catch {
      setFileDuration(null);
    } finally {
      setIsReadingDuration(false);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const togglePreviewPlay = () => {
    const audio = audioPreviewRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleCommit = () => {
    if (!selectedFile) return;
    if (errorMessage) return;
    onCommitAudio(selectedFile, fileDuration || 0);
  };

  const acceptString = ALLOWED_AUDIO_EXTENSIONS.map((ext) => `.${ext}`).join(',');

  return (
    <div className="uploader-card">
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptString}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        id="audio-file-input"
        disabled={disabled}
      />

      {/* Error Banner */}
      {errorMessage && (
        <div className="alert-box alert-error" role="alert">
          <div className="alert-icon">
            <AlertCircle size={18} />
          </div>
          <div className="alert-body">
            <strong className="alert-title">Cannot Use File</strong>
            <p className="alert-desc">{errorMessage}</p>
          </div>
          <button
            type="button"
            className="alert-btn"
            onClick={clearSelection}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Dropzone */}
      {!selectedFile ? (
        <div
          className={`dropzone ${dragActive ? 'dropzone-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload audio recording file"
        >
          <div className="dropzone-icon-ring">
            <UploadCloud size={32} />
          </div>
          <div className="dropzone-text-group">
            <span className="dropzone-main-text">
              <strong>Click to upload</strong> or drag and drop audio file
            </span>
            <span className="dropzone-sub-text">
              Formats: MP3, WAV, M4A, AAC, OGG, WEBM, FLAC
            </span>
            <span className="dropzone-limits">
              Ceiling: Up to 25 MB or 10 minutes maximum
            </span>
          </div>
        </div>
      ) : (
        /* File Selected Details Card */
        <div className="selected-file-card">
          <div className="file-info-header">
            <div className="file-icon-badge">
              <FileAudio size={24} />
            </div>
            <div className="file-meta-group">
              <span className="file-name" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              <div className="file-tags-row">
                <span className="meta-badge">{formatFileSize(selectedFile.size)}</span>
                <span className="meta-badge">
                  {isReadingDuration
                    ? 'Checking length...'
                    : fileDuration
                    ? `Duration: ${formatDuration(fileDuration)}`
                    : 'Audio'}
                </span>
                <span className="meta-badge meta-badge-format">
                  {selectedFile.name.split('.').pop()?.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-remove-file"
              onClick={clearSelection}
              title="Remove selected file"
              aria-label="Remove selected file"
            >
              <X size={18} />
            </button>
          </div>

          {previewUrl && (
            <audio
              ref={audioPreviewRef}
              src={previewUrl}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
            />
          )}

          <div className="file-actions-bar">
            {previewUrl && (
              <button
                type="button"
                className="btn-playback-toggle"
                onClick={togglePreviewPlay}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="icon-nudge" />}
                <span>{isPlaying ? 'Pause' : 'Preview Audio'}</span>
              </button>
            )}

            <button
              type="button"
              className="btn-primary"
              onClick={handleCommit}
              disabled={disabled || !!errorMessage}
              id="btn-commit-upload"
            >
              <Sparkles size={16} />
              <span>Analyse with AI</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
