'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Download01Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { Icon } from './icons';
import { Spinner } from './ui';

export interface PdfViewerProps {
  url: string;
  title?: string;
  className?: string;
}

export default function PdfViewer({ url, title = 'Document Preview', className = '' }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [rendering, setRendering] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Initialize PDF.js
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setPdfDoc(null);

    async function loadPdf() {
      try {
        const pdfjs = await import('pdfjs-dist');
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '3.11.174'}/pdf.worker.min.js`;
        }

        const loadingTask = pdfjs.getDocument({
          url,
          withCredentials: true,
        });

        const pdf = await loadingTask.promise;
        if (!active) return;

        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err: any) {
        if (!active) return;
        console.error('PDF.js loading error:', err);
        setError('Could not render PDF preview in-canvas. You can open or download the PDF directly.');
        setLoading(false);
      }
    }

    if (url) {
      loadPdf();
    }

    return () => {
      active = false;
    };
  }, [url]);

  // Render a specific page to canvas
  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        setRendering(true);
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNumber);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Auto-fit scale relative to container width on mobile screens
        let targetScale = scale;
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - 32; // padding offset
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          if (containerWidth < unscaledViewport.width * scale) {
            targetScale = Math.max(0.6, containerWidth / unscaledViewport.width);
          }
        }

        const viewport = page.getViewport({ scale: targetScale });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.scale(outputScale, outputScale);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        setRendering(false);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
        setRendering(false);
      }
    },
    [pdfDoc, scale]
  );

  useEffect(() => {
    if (pdfDoc && viewMode === 'single') {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, viewMode, renderPage]);

  function prevPage() {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }

  function nextPage() {
    setCurrentPage((prev) => Math.min(numPages, prev + 1));
  }

  function zoomIn() {
    setScale((prev) => Math.min(2.5, +(prev + 0.2).toFixed(1)));
  }

  function zoomOut() {
    setScale((prev) => Math.max(0.6, +(prev - 0.2).toFixed(1)));
  }

  return (
    <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <Icon icon={ViewIcon} className="h-5 w-5 shrink-0 text-amber-400" />
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {numPages > 0 && (
            <>
              {/* Mode Toggle */}
              <div className="hidden sm:flex rounded-xl bg-slate-800 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`rounded-lg px-2.5 py-1 transition ${viewMode === 'all' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
                >
                  All Pages
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('single')}
                  className={`rounded-lg px-2.5 py-1 transition ${viewMode === 'single' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'}`}
                >
                  Paged
                </button>
              </div>

              {/* Paged Navigation */}
              {viewMode === 'single' && (
                <div className="flex items-center gap-1 bg-slate-800 rounded-xl px-2 py-1 text-xs">
                  <button
                    type="button"
                    onClick={prevPage}
                    disabled={currentPage <= 1 || rendering}
                    className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
                    title="Previous page"
                  >
                    <Icon icon={ArrowLeft01Icon} className="h-4 w-4" />
                  </button>
                  <span className="px-1 text-slate-200">
                    {currentPage} / {numPages}
                  </span>
                  <button
                    type="button"
                    onClick={nextPage}
                    disabled={currentPage >= numPages || rendering}
                    className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
                    title="Next page"
                  >
                    <Icon icon={ArrowRight01Icon} className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-800 rounded-xl px-2 py-1 text-xs">
                <button type="button" onClick={zoomOut} className="p-1 text-slate-300 hover:text-white font-bold text-sm px-1.5" title="Zoom out">
                  −
                </button>
                <span className="w-12 text-center text-slate-200">{Math.round(scale * 100)}%</span>
                <button type="button" onClick={zoomIn} className="p-1 text-slate-300 hover:text-white font-bold text-sm px-1.5" title="Zoom in">
                  +
                </button>
              </div>
            </>
          )}

          {/* External links */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="hidden sm:inline">Open tab</span>
          </a>

          <a
            href={url}
            download
            className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-300"
          >
            <Icon icon={Download01Icon} className="h-3.5 w-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* Main Document Display Area */}
      <div ref={containerRef} className="relative min-h-[400px] max-h-[82vh] overflow-auto bg-slate-100 p-4">
        {loading && (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
            <Spinner label="Rendering PDF document…" />
          </div>
        )}

        {error && (
          <div className="mx-auto my-8 max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Icon icon={Download01Icon} className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-800">PDF Document Ready</h4>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Open PDF in new tab
              </a>
              <a href={url} download className="btn-outline">
                Download file
              </a>
            </div>
          </div>
        )}

        {!loading && !error && pdfDoc && (
          <>
            {viewMode === 'single' ? (
              <div className="flex justify-center">
                <canvas ref={canvasRef} className="rounded-lg shadow-md bg-white transition-all" />
              </div>
            ) : (
              <PdfAllPages pdfDoc={pdfDoc} scale={scale} containerWidth={containerRef.current?.clientWidth || 800} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Subcomponent to render all pages cleanly in vertical scroll
function PdfAllPages({ pdfDoc, scale, containerWidth }: { pdfDoc: any; scale: number; containerWidth: number }) {
  const pageNumbers = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);

  return (
    <div className="flex flex-col items-center gap-6">
      {pageNumbers.map((pageNum) => (
        <PdfSinglePageCanvas key={pageNum} pdfDoc={pdfDoc} pageNum={pageNum} scale={scale} containerWidth={containerWidth} />
      ))}
    </div>
  );
}

function PdfSinglePageCanvas({
  pdfDoc,
  pageNum,
  scale,
  containerWidth,
}: {
  pdfDoc: any;
  pageNum: number;
  scale: number;
  containerWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let active = true;

    async function draw() {
      if (!canvasRef.current || !pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!active || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let targetScale = scale;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const maxWidth = Math.max(300, containerWidth - 48);
        if (maxWidth < unscaledViewport.width * scale) {
          targetScale = Math.max(0.5, maxWidth / unscaledViewport.width);
        }

        const viewport = page.getViewport({ scale: targetScale });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.scale(outputScale, outputScale);

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (active) setRendered(true);
      } catch (err) {
        console.error(`Page ${pageNum} render error:`, err);
      }
    }

    draw();
    return () => {
      active = false;
    };
  }, [pdfDoc, pageNum, scale, containerWidth]);

  return (
    <div className="relative flex flex-col items-center">
      <canvas ref={canvasRef} className="rounded-xl bg-white shadow-md transition-all" />
      <span className="mt-2 text-[11px] font-semibold text-slate-400">Page {pageNum}</span>
    </div>
  );
}
