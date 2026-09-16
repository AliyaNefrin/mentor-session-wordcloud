'use client';

import React from 'react';
import { ProgressState } from '@/types';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProgressIndicatorProps {
  progress: ProgressState;
  onCancel?: () => void;
}

const STAGES = [
  { key: 'uploading', label: 'Upload' },
  { key: 'transcribing', label: 'Transcription' },
  { key: 'extracting', label: 'AI Analysis' },
  { key: 'rendering', label: 'Word Cloud' },
];

export default function ProgressIndicator({ progress, onCancel }: ProgressIndicatorProps) {
  const currentStageIndex = STAGES.findIndex((s) => s.key === progress.stage);

  return (
    <div className="progress-card" role="status" aria-live="polite">
      <div className="progress-header">
        <div className="progress-title-row">
          <Loader2 className="spinner-icon" size={20} />
          <span className="progress-message">{progress.message}</span>
        </div>
        <span className="progress-percent">{Math.round(progress.percent)}%</span>
      </div>

      {/* Visual Progress Bar */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.max(8, Math.min(100, progress.percent))}%` }}
        />
      </div>

      {/* Step Indicators */}
      <div className="progress-steps-row">
        {STAGES.map((stg, idx) => {
          const isDone = currentStageIndex > idx || progress.stage === 'complete';
          const isCurrent = progress.stage === stg.key;
          return (
            <div
              key={stg.key}
              className={`progress-step-item ${isDone ? 'step-done' : ''} ${
                isCurrent ? 'step-current' : ''
              }`}
            >
              <div className="step-bullet">
                {isDone ? <CheckCircle2 size={12} /> : <span>{idx + 1}</span>}
              </div>
              <span className="step-text">{stg.label}</span>
            </div>
          );
        })}
      </div>

      {progress.detail && <p className="progress-detail">{progress.detail}</p>}
    </div>
  );
}
