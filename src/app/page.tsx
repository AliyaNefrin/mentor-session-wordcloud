'use client';

import React, { useState, useEffect } from 'react';
import {
  Mic,
  UploadCloud,
  Sparkles,
  History,
  RotateCcw,
  FileText,
  HelpCircle,
  Key,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronRight,
} from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';
import AudioUploader from '@/components/AudioUploader';
import ProgressIndicator from '@/components/ProgressIndicator';
import WordCloudCanvas from '@/components/WordCloudCanvas';
import TranscriptView from '@/components/TranscriptView';
import HistoryDrawer from '@/components/HistoryDrawer';
import { AnalysisResult, ProgressState, WordItem } from '@/types';
import { BRIEF_REF_5190_MAX_BYTES } from '@/constants/limits';

type InputMode = 'record' | 'upload';
type ActiveTab = 'cloud' | 'transcript';

const STORAGE_KEY = 'mentorship_analyses_v1';

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>('record');
  const [activeTab, setActiveTab] = useState<ActiveTab>('cloud');
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'idle',
    percent: 0,
    message: '',
  });
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [activeWords, setActiveWords] = useState<WordItem[]>([]);
  const [removedWords, setRemovedWords] = useState<string[]>([]);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load history from localStorage', e);
    }
  }, []);

  // Save analysis to history
  const saveToHistory = (result: AnalysisResult) => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== result.id);
      const updated = [result, ...filtered].slice(0, 20); // Keep last 20
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
      return updated;
    });
  };

  // Handle word removal from cloud
  const handleRemoveWord = (wordText: string) => {
    setRemovedWords((prev) => [...prev, wordText]);
    setActiveWords((prev) => prev.filter((w) => w.text !== wordText));
  };

  // Reset removed words back to original
  const handleResetWords = () => {
    if (!currentResult) return;
    setActiveWords(currentResult.words);
    setRemovedWords([]);
  };

  // Pipeline commit: Handle either recorded audio or uploaded audio
  const handleCommitAudio = async (file: File, durationSeconds: number) => {
    setErrorMessage(null);

    // Initial state: uploading
    setProgress({
      stage: 'uploading',
      percent: 15,
      message: 'Uploading audio file to analysis engine...',
      detail: `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate smooth upload progress step
      setTimeout(() => {
        setProgress((prev) =>
          prev.stage === 'uploading'
            ? {
                stage: 'transcribing',
                percent: 45,
                message: 'Transcribing speech with AI (Whisper)...',
                detail: 'Converting spoken dialogue into verbatim text...',
              }
            : prev
        );
      }, 1200);

      setTimeout(() => {
        setProgress((prev) =>
          prev.stage === 'transcribing' || prev.stage === 'uploading'
            ? {
                stage: 'extracting',
                percent: 75,
                message: 'Extracting key themes & normalizing stopwords...',
                detail: 'Filtering fillers and scoring conceptual prominence...',
              }
            : prev
        );
      }, 2800);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      setProgress({
        stage: 'rendering',
        percent: 95,
        message: 'Generating interactive prominence word cloud...',
        detail: `Found ${data.data.words.length} key concepts.`,
      });

      const newResult: AnalysisResult = {
        ...data.data,
        audioDurationSeconds: durationSeconds,
      };

      setTimeout(() => {
        setCurrentResult(newResult);
        setActiveWords(newResult.words);
        setRemovedWords([]);
        saveToHistory(newResult);
        setProgress({ stage: 'idle', percent: 100, message: '' });
      }, 600);
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setProgress({ stage: 'idle', percent: 0, message: '' });
      setErrorMessage(
        err.message || 'Analysis could not be completed. Please check your network and try again.'
      );
    }
  };

  // Start a fresh session
  const handleStartNewSession = () => {
    setCurrentResult(null);
    setActiveWords([]);
    setRemovedWords([]);
    setErrorMessage(null);
    setProgress({ stage: 'idle', percent: 0, message: '' });
  };

  // Load past session from history drawer
  const handleSelectHistoryItem = (item: AnalysisResult) => {
    setCurrentResult(item);
    setActiveWords(item.words);
    setRemovedWords([]);
    setErrorMessage(null);
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const isProcessing = progress.stage !== 'idle';

  return (
    <main className="app-container">
      {/* Sleek Top Navigation */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-badge">
            <Sparkles size={16} />
          </div>
          <div>
            <h1 className="brand-title">Session Cloud</h1>
            <p className="brand-sub">Mentorship Audio Topic Analysis</p>
          </div>
        </div>

        <div className="header-actions">
          {history.length > 0 && (
            <button
              type="button"
              className="btn-history-toggle"
              onClick={() => setIsHistoryOpen(true)}
              title="View past session analyses"
            >
              <History size={15} />
              <span>Past Sessions</span>
              <span className="history-pill">{history.length}</span>
            </button>
          )}

          {currentResult && (
            <button
              type="button"
              className="btn-new-session"
              onClick={handleStartNewSession}
              title="Analyze another recording"
            >
              <RotateCcw size={14} />
              <span>New Analysis</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Single-Screen Content Canvas */}
      <div className="app-main-content">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="alert-box alert-error alert-prominent" role="alert">
            <div className="alert-icon">
              <AlertCircle size={20} />
            </div>
            <div className="alert-body">
              <strong className="alert-title">Analysis Unsuccessful</strong>
              <p className="alert-desc">{errorMessage}</p>
            </div>
            <button
              type="button"
              className="alert-btn"
              onClick={() => setErrorMessage(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SECTION A: Audio Input Pipeline (When no result yet) */}
        {!currentResult && (
          <section className="input-pipeline-section">
            <div className="pipeline-intro">
              <h2 className="pipeline-heading">What was this mentorship session actually about?</h2>
              <p className="pipeline-subheading">
                Record live during or after the session, or drop a saved recording file. The AI
                transcribes speech, filters conversational filler, and renders dominant topics into a
                weighted word cloud in seconds.
              </p>
            </div>

            {/* Door Switcher Tabs */}
            <div className="doors-tabs" role="tablist" aria-label="Audio input method">
              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'record'}
                className={`door-tab ${inputMode === 'record' ? 'door-tab-active' : ''}`}
                onClick={() => setInputMode('record')}
                disabled={isProcessing}
                id="tab-record"
              >
                <Mic size={18} />
                <span>Record Live Audio</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'upload'}
                className={`door-tab ${inputMode === 'upload' ? 'door-tab-active' : ''}`}
                onClick={() => setInputMode('upload')}
                disabled={isProcessing}
                id="tab-upload"
              >
                <UploadCloud size={18} />
                <span>Upload Audio File</span>
              </button>
            </div>

            {/* Door Content: Record or Upload */}
            <div className="doors-viewport">
              {inputMode === 'record' ? (
                <AudioRecorder onCommitAudio={handleCommitAudio} disabled={isProcessing} />
              ) : (
                <AudioUploader onCommitAudio={handleCommitAudio} disabled={isProcessing} />
              )}
            </div>

            {/* Active Progress State */}
            {isProcessing && (
              <div className="processing-wrapper">
                <ProgressIndicator progress={progress} />
              </div>
            )}

            {/* Trust and Limits Bar */}
            <div className="limits-strip">
              <div className="strip-item">
                <CheckCircle2 size={13} className="text-emerald" />
                <span>Ceiling: 25 MB or 10 min max</span>
              </div>
              <div className="strip-item">
                <CheckCircle2 size={13} className="text-emerald" />
                <span>Formats: MP3, WAV, M4A, AAC, OGG, WEBM, FLAC</span>
              </div>
              <div className="strip-item">
                <CheckCircle2 size={13} className="text-emerald" />
                <span>AI Stopword & Plural Normalization</span>
              </div>
            </div>
          </section>
        )}

        {/* SECTION B: Results Display (Word Cloud + Transcript) */}
        {currentResult && (
          <section className="results-section">
            {/* Results Header Bar */}
            <div className="results-nav-bar">
              <div className="results-title-group">
                <span className="results-tag">Completed Analysis</span>
                <h2 className="results-title">{currentResult.title}</h2>
              </div>

              {/* View Switcher: Word Cloud vs Full Transcript */}
              <div className="view-toggle-tabs" role="tablist">
                <button
                  type="button"
                  className={`view-tab ${activeTab === 'cloud' ? 'view-tab-active' : ''}`}
                  onClick={() => setActiveTab('cloud')}
                >
                  <Sparkles size={14} />
                  <span>Word Cloud</span>
                  <span className="tab-badge">{activeWords.length}</span>
                </button>

                <button
                  type="button"
                  className={`view-tab ${activeTab === 'transcript' ? 'view-tab-active' : ''}`}
                  onClick={() => setActiveTab('transcript')}
                >
                  <FileText size={14} />
                  <span>Transcript & Summary</span>
                </button>
              </div>
            </div>

            {/* View Viewport */}
            <div className="results-viewport">
              {activeTab === 'cloud' ? (
                <WordCloudCanvas
                  words={activeWords}
                  onRemoveWord={handleRemoveWord}
                  onResetWords={handleResetWords}
                  removedCount={removedWords.length}
                />
              ) : (
                <TranscriptView result={currentResult} />
              )}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <p>Built for Mentors · 1-on-1 Student Session Intelligence</p>
        <div className="footer-links">
          <span>Brief ref: TFG-WD-8823</span>
        </div>
      </footer>

      {/* History Drawer Modal */}
      <HistoryDrawer
        history={history}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={handleSelectHistoryItem}
        onClear={handleClearHistory}
        onDeleteItem={handleDeleteHistoryItem}
      />
    </main>
  );
}
