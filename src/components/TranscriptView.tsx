'use client';

import React, { useState } from 'react';
import { Copy, Check, Download, FileText, Bot, Info } from 'lucide-react';
import { AnalysisResult } from '@/types';

interface TranscriptViewProps {
  result: AnalysisResult;
}

export default function TranscriptView({ result }: TranscriptViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = result.transcript;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownload = () => {
    const content = `MENTORSHIP SESSION TRANSCRIPT\nDate: ${new Date(
      result.createdAt
    ).toLocaleString()}\nProvider: ${result.providerUsed}\n\nSUMMARY:\n${
      result.summary || 'N/A'
    }\n\nTRANSCRIPT:\n${result.transcript}\n\nTOP TERMS IDENTIFIED:\n${result.words
      .map((w) => `${w.text}: prominence ${w.value}`)
      .join('\n')}\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mentorship-transcript-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="transcript-panel">
      {/* Session Takeaway Banner */}
      {result.summary && (
        <div className="transcript-summary-box">
          <div className="summary-badge">
            <Bot size={14} />
            <span>AI Session Digest</span>
          </div>
          <p className="summary-text">{result.summary}</p>
        </div>
      )}

      {/* Transcript Header & Actions */}
      <div className="transcript-header">
        <div className="transcript-meta">
          <FileText size={16} />
          <span className="transcript-title">Full Audio Transcript</span>
          <span className="transcript-provider-tag" title="AI Service">
            {result.providerUsed}
          </span>
        </div>

        <div className="transcript-actions">
          <button
            type="button"
            className="btn-secondary-sm"
            onClick={handleCopy}
            title="Copy transcript to clipboard"
          >
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary-sm"
            onClick={handleDownload}
            title="Download transcript as text file"
          >
            <Download size={13} />
            <span>Download .txt</span>
          </button>
        </div>
      </div>

      {/* Transcript Text Body */}
      <div className="transcript-body">
        <p>{result.transcript}</p>
      </div>
    </div>
  );
}
