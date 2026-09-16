'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Volume2,
  HelpCircle,
} from 'lucide-react';
import { MAX_AUDIO_DURATION_SECONDS } from '@/constants/limits';
import { formatDuration } from '@/lib/audio-utils';

interface AudioRecorderProps {
  onCommitAudio: (file: File, duration: number) => void;
  disabled?: boolean;
}

export default function AudioRecorder({ onCommitAudio, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isSilentWarning, setIsSilentWarning] = useState(false);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const maxVolumeObservedRef = useRef<number>(0);

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      stopMediaTracks();
    };
  }, [audioUrl]);

  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Draw real-time audio waveform
  const drawWaveform = useCallback(() => {
    const canvas = visualizerCanvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyser.getByteFrequencyData(dataArray);

      // Compute average volume for silence tracking
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      if (avg > maxVolumeObservedRef.current) {
        maxVolumeObservedRef.current = avg;
      }

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barWidth = Math.max(3, Math.floor(width / 32) - 2);
      const step = Math.floor(bufferLength / 32);

      for (let i = 0; i < 32; i++) {
        const val = dataArray[i * step] || 0;
        const barHeight = Math.max(4, Math.floor((val / 255) * height * 0.95));

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        // Gradient for live audio bars
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(1, '#ec4899');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  }, []);

  // Start live recording
  const startRecording = async () => {
    setPermissionError(null);
    setIsSilentWarning(false);
    audioChunksRef.current = [];
    maxVolumeObservedRef.current = 0;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError(
        'Your current browser does not support browser audio recording. Please try Google Chrome or Apple Safari.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Setup Web Audio Analyser for live visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalMime });
        setAudioBlob(blob);

        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Check for silence
        if (maxVolumeObservedRef.current < 4) {
          setIsSilentWarning(true);
        }

        stopMediaTracks();
      };

      mediaRecorder.start(250); // Slice every 250ms
      setIsRecording(true);
      setElapsedSeconds(0);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          // Enforce 10-minute cap
          if (next >= MAX_AUDIO_DURATION_SECONDS) {
            stopRecording();
          }
          return next;
        });
      }, 1000);

      // Start visualizer
      setTimeout(drawWaveform, 50);
    } catch (err: any) {
      console.error('Microphone error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError(
          'Microphone permission was denied. To enable: Click the lock icon 🔒 next to the website URL in your address bar, switch Microphone to "Allow", and reload this page.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError(
          'No microphone was detected on your device. Please plug in or connect a microphone/headset and try again.'
        );
      } else {
        setPermissionError(
          `Unable to access microphone (${err.message || 'Unknown device error'}). Please check system settings.`
        );
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setAudioDuration(elapsedSeconds);
    setIsRecording(false);
  };

  // Discard and reset
  const handleDiscard = () => {
    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.pause();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsedSeconds(0);
    setAudioDuration(0);
    setIsPlaying(false);
    setIsSilentWarning(false);
  };

  // Toggle playback
  const handleTogglePlay = () => {
    const audio = audioElementRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  // Commit recorded audio to parent analysis pipeline
  const handleCommit = () => {
    if (!audioBlob) return;
    const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
    const file = new File([audioBlob], `mentorship-recording-${Date.now()}.${ext}`, {
      type: audioBlob.type,
    });
    onCommitAudio(file, audioDuration || elapsedSeconds);
  };

  return (
    <div className="recorder-card">
      {/* Microphone Permission Error Notification */}
      {permissionError && (
        <div className="alert-box alert-error" role="alert">
          <div className="alert-icon">
            <AlertTriangle size={18} />
          </div>
          <div className="alert-body">
            <strong className="alert-title">Microphone Access Needed</strong>
            <p className="alert-desc">{permissionError}</p>
          </div>
          <button
            type="button"
            className="alert-btn"
            onClick={startRecording}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Silence Warning */}
      {isSilentWarning && (
        <div className="alert-box alert-warning" role="alert">
          <div className="alert-icon">
            <Volume2 size={18} />
          </div>
          <div className="alert-body">
            <strong className="alert-title">Low / Silent Audio Signal Detected</strong>
            <p className="alert-desc">
              Your microphone recorded very quiet or silent audio. If the AI cannot detect clear speech,
              try re-recording with your mic closer.
            </p>
          </div>
        </div>
      )}

      {/* STATE 1: Ready to Record */}
      {!isRecording && !audioBlob && (
        <div className="recorder-idle-state">
          <div className="record-cta">
            <button
              type="button"
              className="btn-record-main"
              onClick={startRecording}
              disabled={disabled}
              id="btn-start-record"
            >
              <div className="record-icon-wrapper">
                <Mic size={28} />
              </div>
              <div className="record-label-group">
                <span className="record-main-label">Start Live Recording</span>
                <span className="record-sub-label">Speak session thoughts or mentor notes</span>
              </div>
            </button>
          </div>
          <div className="recorder-limit-hint">
            <span>Limits: Up to 10 minutes (or 25 MB). Enforced automatically.</span>
          </div>
        </div>
      )}

      {/* STATE 2: Recording in Progress */}
      {isRecording && (
        <div className="recorder-active-state">
          <div className="recording-status-bar">
            <div className="live-indicator">
              <span className="live-pulse" />
              <span className="live-text">RECORDING LIVE</span>
            </div>
            <div className="elapsed-timer" aria-live="polite">
              {formatDuration(elapsedSeconds)} / 10:00
            </div>
          </div>

          {/* Visualizer Waveform Canvas */}
          <div className="waveform-container">
            <canvas
              ref={visualizerCanvasRef}
              width={280}
              height={48}
              className="waveform-canvas"
            />
          </div>

          <div className="recording-actions">
            <button
              type="button"
              className="btn-stop-record"
              onClick={stopRecording}
              id="btn-stop-record"
            >
              <Square size={16} fill="currentColor" />
              <span>Stop Recording</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: Recorded - Review, Playback, Discard or Commit */}
      {!isRecording && audioBlob && audioUrl && (
        <div className="recorder-review-state">
          <div className="review-header">
            <span className="review-title">Recording Ready for Review</span>
            <span className="review-duration">Duration: {formatDuration(audioDuration || elapsedSeconds)}</span>
          </div>

          {/* Hidden HTML audio element for playback */}
          <audio
            ref={audioElementRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
          />

          <div className="playback-controls">
            <button
              type="button"
              className="btn-playback-toggle"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? 'Pause playback' : 'Play recorded audio'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="icon-nudge" />}
              <span>{isPlaying ? 'Pause' : 'Listen Back'}</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleDiscard}
              disabled={disabled}
              title="Discard this recording and record again"
            >
              <RotateCcw size={16} />
              <span>Discard & Re-record</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleCommit}
              disabled={disabled}
              id="btn-commit-recording"
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
