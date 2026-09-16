'use client';

import React from 'react';
import { AnalysisResult } from '@/types';
import { History, Trash2, Clock, Calendar, ArrowRight, X } from 'lucide-react';

interface HistoryDrawerProps {
  history: AnalysisResult[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: AnalysisResult) => void;
  onClear: () => void;
  onDeleteItem: (id: string) => void;
}

export default function HistoryDrawer({
  history,
  isOpen,
  onClose,
  onSelect,
  onClear,
  onDeleteItem,
}: HistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="history-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <div className="history-title-group">
            <History size={18} />
            <h2>Past Session Analyses</h2>
            <span className="history-count">({history.length})</span>
          </div>

          <div className="history-header-actions">
            {history.length > 0 && (
              <button
                type="button"
                className="btn-danger-ghost-sm"
                onClick={onClear}
                title="Clear all session history"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )}
            <button
              type="button"
              className="btn-close-modal"
              onClick={onClose}
              aria-label="Close history modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="history-body">
          {history.length === 0 ? (
            <div className="history-empty">
              <History size={36} className="empty-icon" />
              <p className="empty-text">No past mentorship analyses saved yet.</p>
              <span className="empty-sub">
                Analyses from your live recordings or uploads will appear here so you can revisit them anytime.
              </span>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <div key={item.id} className="history-item-card">
                  <div className="history-item-top">
                    <span className="history-item-title">{item.title}</span>
                    <button
                      type="button"
                      className="btn-delete-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      title="Delete this analysis"
                      aria-label="Delete this analysis"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {item.summary && <p className="history-item-summary">{item.summary}</p>}

                  <div className="history-item-meta">
                    <span className="meta-time">
                      <Clock size={12} />
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="meta-date">
                      <Calendar size={12} />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <span className="meta-words">{item.words.length} terms</span>
                  </div>

                  <button
                    type="button"
                    className="btn-load-history"
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <span>Load Word Cloud</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
