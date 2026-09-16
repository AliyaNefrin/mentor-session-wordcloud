'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WordItem, ColorTheme, CloudShape } from '@/types';
import { Download, RefreshCw, X, Palette, Shapes, Maximize2, Sparkles } from 'lucide-react';

interface WordCloudCanvasProps {
  words: WordItem[];
  onRemoveWord: (wordText: string) => void;
  onResetWords?: () => void;
  removedCount?: number;
}

interface PlacedWord {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  rotate: boolean;
  value: number;
}

const COLOR_PALETTES: Record<ColorTheme, string[]> = {
  indigo: ['#4f46e5', '#6366f1', '#06b6d4', '#3b82f6', '#818cf8', '#0ea5e9', '#a855f7'],
  emerald: ['#059669', '#10b981', '#14b8a6', '#34d399', '#0d9488', '#2dd4bf', '#047857'],
  sunset: ['#ea580c', '#f97316', '#e11d48', '#f59e0b', '#fb923c', '#fb7185', '#d97706'],
  aurora: ['#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6', '#f43f5e', '#10b981', '#a855f7'],
  slate: ['#e2e8f0', '#94a3b8', '#cbd5e1', '#64748b', '#f8fafc', '#475569', '#38bdf8'],
};

export default function WordCloudCanvas({
  words,
  onRemoveWord,
  onResetWords,
  removedCount = 0,
}: WordCloudCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState<ColorTheme>('indigo');
  const [shape, setShape] = useState<CloudShape>('oval');
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [hoveredWord, setHoveredWord] = useState<PlacedWord | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isRendering, setIsRendering] = useState<boolean>(false);

  // Layout words onto canvas
  const layoutAndRender = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || words.length === 0) return;

    setIsRendering(true);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina display scaling
    const rect = container.getBoundingClientRect();
    const width = Math.max(340, Math.floor(rect.width));
    const height = Math.max(380, Math.min(540, Math.floor(rect.height || 460)));

    const dpr = window.devicePixelRatio || 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Clear background
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    const colors = COLOR_PALETTES[theme];

    // Compute min and max value for scaling
    const minVal = Math.min(...words.map((w) => w.value));
    const maxVal = Math.max(...words.map((w) => w.value));
    const valRange = Math.max(1, maxVal - minVal);

    // Scale font sizes based on viewport and prominence
    const isMobile = width < 500;
    const minFontSize = isMobile ? 13 : 15;
    const maxFontSize = isMobile ? 38 : 52;

    const boxes: PlacedWord[] = [];

    // Archimedean spiral parameters
    const stepAngle = 0.22;
    const spiralStep = 3.2;

    // Check boundary according to selected shape
    function isInsideShape(x: number, y: number, w: number, h: number): boolean {
      const dx = (x + w / 2 - centerX);
      const dy = (y + h / 2 - centerY);

      // Keep margin from edges
      if (x < 15 || x + w > width - 15 || y < 15 || y + h > height - 15) {
        return false;
      }

      if (shape === 'oval') {
        const radiusX = (width / 2) * 0.92;
        const radiusY = (height / 2) * 0.90;
        return (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 1;
      }

      if (shape === 'cloud') {
        // Cloud-like envelope (super-ellipse)
        const rx = (width / 2) * 0.88;
        const ry = (height / 2) * 0.86;
        const power = 3.2;
        return (
          Math.pow(Math.abs(dx) / rx, power) + Math.pow(Math.abs(dy) / ry, power) <= 1
        );
      }

      if (shape === 'diamond') {
        const rx = (width / 2) * 0.85;
        const ry = (height / 2) * 0.85;
        return Math.abs(dx) / rx + Math.abs(dy) / ry <= 1;
      }

      return true; // Rectangle
    }

    // Check collision with already placed words
    function checkCollision(x: number, y: number, w: number, h: number): boolean {
      const padding = 6;
      for (const b of boxes) {
        if (
          x - padding < b.x + b.width &&
          x + w + padding > b.x &&
          y - padding < b.y + b.height &&
          y + h + padding > b.y
        ) {
          return true;
        }
      }
      return false;
    }

    // Sort words by prominence descending
    const sortedWords = [...words].sort((a, b) => b.value - a.value);

    for (let i = 0; i < sortedWords.length; i++) {
      const word = sortedWords[i];
      const normalizedRatio = (word.value - minVal) / valRange;
      const fontSize = Math.round(minFontSize + normalizedRatio * (maxFontSize - minFontSize));

      const font = `600 ${fontSize}px var(--font-display, 'Inter', system-ui, -apple-system, sans-serif)`;
      ctx.font = font;
      const metrics = ctx.measureText(word.text);
      const wordWidth = Math.ceil(metrics.width);
      const wordHeight = Math.ceil(fontSize * 1.1);

      let placed = false;
      let angle = (i * 1.4); // Stagger starting angle for organic distribution
      let radius = 0;
      const maxIterations = 900;

      for (let iter = 0; iter < maxIterations; iter++) {
        // Spiral coordinate
        const testX = Math.round(centerX + radius * Math.cos(angle) - wordWidth / 2);
        const testY = Math.round(centerY + radius * Math.sin(angle) * (height / width) - wordHeight / 2);

        if (
          isInsideShape(testX, testY, wordWidth, wordHeight) &&
          !checkCollision(testX, testY, wordWidth, wordHeight)
        ) {
          const color = colors[i % colors.length];
          boxes.push({
            text: word.text,
            x: testX,
            y: testY,
            width: wordWidth,
            height: wordHeight,
            fontSize,
            color,
            rotate: false,
            value: word.value,
          });
          placed = true;
          break;
        }

        angle += stepAngle;
        radius += spiralStep / (2 * Math.PI);
      }

      // If cannot place within envelope, try without shape constraint as fallback
      if (!placed) {
        angle = 0;
        radius = 0;
        for (let iter = 0; iter < 400; iter++) {
          const testX = Math.round(centerX + radius * Math.cos(angle) - wordWidth / 2);
          const testY = Math.round(centerY + radius * Math.sin(angle) - wordHeight / 2);
          if (
            testX >= 10 &&
            testX + wordWidth <= width - 10 &&
            testY >= 10 &&
            testY + wordHeight <= height - 10 &&
            !checkCollision(testX, testY, wordWidth, wordHeight)
          ) {
            const color = colors[i % colors.length];
            boxes.push({
              text: word.text,
              x: testX,
              y: testY,
              width: wordWidth,
              height: wordHeight,
              fontSize,
              color,
              rotate: false,
              value: word.value,
            });
            break;
          }
          angle += stepAngle;
          radius += spiralStep;
        }
      }
    }

    // Render all placed words onto canvas
    ctx.textBaseline = 'top';
    for (const b of boxes) {
      ctx.font = `600 ${b.fontSize}px var(--font-display, 'Inter', system-ui, -apple-system, sans-serif)`;
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, b.x, b.y);
    }

    setPlacedWords(boxes);
    setIsRendering(false);
  }, [words, theme, shape]);

  // Re-render when size, words, theme, or shape changes
  useEffect(() => {
    layoutAndRender();
    const handleResize = () => {
      layoutAndRender();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [layoutAndRender]);

  // Handle canvas mouse move for interactive tooltips
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    const found = placedWords.find(
      (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
    );
    setHoveredWord(found || null);
  };

  // Handle canvas click to remove word
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clicked = placedWords.find(
      (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
    );
    if (clicked) {
      onRemoveWord(clicked.text);
      setHoveredWord(null);
    }
  };

  // Download high-resolution PNG
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary high-res export canvas with solid branded background
    const exportCanvas = document.createElement('canvas');
    const dpr = 2;
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    // Background gradient for exported PNG
    const grad = exportCtx.createLinearGradient(0, 0, exportCanvas.width, exportCanvas.height);
    grad.addColorStop(0, '#0c101d');
    grad.addColorStop(1, '#07090e');
    exportCtx.fillStyle = grad;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw main word canvas on top
    exportCtx.drawImage(canvas, 0, 0);

    // Add clean watermark footer
    exportCtx.font = '500 18px "Inter", sans-serif';
    exportCtx.fillStyle = '#64748b';
    exportCtx.fillText('Mentorship Session Word Cloud', 30, exportCanvas.height - 30);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `mentorship-word-cloud-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="wordcloud-wrapper" ref={containerRef}>
      {/* Cloud Header & Controls */}
      <div className="wordcloud-toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">
            <Palette size={14} /> Palette:
          </span>
          <div className="palette-picker" role="radiogroup" aria-label="Color Palette">
            {(['indigo', 'emerald', 'sunset', 'aurora', 'slate'] as ColorTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`palette-chip ${theme === t ? 'active' : ''}`}
                onClick={() => setTheme(t)}
                title={`Color theme: ${t}`}
              >
                <span className={`chip-dot dot-${t}`} />
                <span className="chip-name">{t}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">
            <Shapes size={14} /> Shape:
          </span>
          <div className="shape-picker" role="radiogroup" aria-label="Cloud Shape">
            {(['oval', 'cloud', 'rectangle', 'diamond'] as CloudShape[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`shape-chip ${shape === s ? 'active' : ''}`}
                onClick={() => setShape(s)}
                title={`Cloud shape: ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar-actions">
          {removedCount > 0 && onResetWords && (
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={onResetWords}
              title="Restore removed terms"
            >
              <RefreshCw size={13} />
              <span>Reset ({removedCount})</span>
            </button>
          )}

          <button
            type="button"
            className="btn-primary-sm"
            onClick={handleDownloadPNG}
            title="Download high-resolution PNG image"
          >
            <Download size={14} />
            <span>Download PNG</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredWord(null)}
          onClick={handleCanvasClick}
          className={`wordcloud-canvas ${hoveredWord ? 'has-hover' : ''}`}
          style={{ cursor: hoveredWord ? 'pointer' : 'default' }}
        />

        {/* Hover Tooltip */}
        {hoveredWord && (
          <div
            className="canvas-tooltip"
            style={{
              left: `${mousePos.x + 12}px`,
              top: `${mousePos.y - 34}px`,
            }}
          >
            <span className="tooltip-word">{hoveredWord.text}</span>
            <span className="tooltip-value">Prominence: {hoveredWord.value}</span>
            <span className="tooltip-action">Click to remove</span>
          </div>
        )}
      </div>

      {/* Interactive Quick-Remove Tag List */}
      <div className="word-tags-bar">
        <div className="tags-label">
          <span>Active Terms ({words.length}):</span>
          <span className="tags-hint">Click any term to remove it from the cloud</span>
        </div>
        <div className="tags-list">
          {words.map((w) => (
            <button
              key={w.text}
              type="button"
              className="term-tag"
              onClick={() => onRemoveWord(w.text)}
              title={`Remove "${w.text}" from word cloud`}
            >
              <span className="term-text">{w.text}</span>
              <span className="term-weight">{w.value}</span>
              <X size={12} className="term-close" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
