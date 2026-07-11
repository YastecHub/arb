'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AiChat02Icon } from '@hugeicons/core-free-icons';
import { Icon } from './icons';

export default function FloatingChatButton() {
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('arb_chat_button_position');
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
      } catch {
        /* ignore bad saved state */
      }
    }
  }, []);

  useEffect(() => {
    if (!dragging) localStorage.setItem('arb_chat_button_position', JSON.stringify(position));
  }, [position, dragging]);

  function startDrag(event: React.PointerEvent<HTMLAnchorElement>) {
    moved.current = false;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onDrag(event: React.PointerEvent<HTMLAnchorElement>) {
    if (!dragging) return;
    moved.current = true;
    const maxX = Math.max(12, window.innerWidth - 76);
    const maxY = Math.max(12, window.innerHeight - 76);
    setPosition({
      x: Math.min(maxX, Math.max(12, window.innerWidth - event.clientX - 28)),
      y: Math.min(maxY, Math.max(12, window.innerHeight - event.clientY - 28)),
    });
  }

  function stopDrag() {
    setDragging(false);
    setTimeout(() => {
      moved.current = false;
    }, 0);
  }

  return (
    <Link
      href="/assistant"
      aria-label="Open Engr. Ada Torque assistant"
      title="Ask Engr. Ada Torque"
      onPointerDown={startDrag}
      onPointerMove={onDrag}
      onPointerUp={stopDrag}
      onClick={(event) => {
        if (moved.current) event.preventDefault();
      }}
      className="fixed z-50 flex h-14 w-14 touch-none items-center justify-center rounded-2xl border border-amber-200 bg-[#071826] text-amber-300 shadow-2xl shadow-slate-950/30 transition hover:-translate-y-0.5 hover:bg-[#0d2436]"
      style={{ right: position.x, bottom: position.y }}
    >
      <Icon icon={AiChat02Icon} className="h-7 w-7" strokeWidth={1.9} />
    </Link>
  );
}
