/**
 * Resizable Panel Hook
 * Provides resizable panel functionality with mouse/touch drag
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseResizablePanelOptions {
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}

interface UseResizablePanelReturn {
  width: number;
  isResizing: boolean;
  panelRef: React.RefObject<HTMLDivElement>;
  handleMouseDown: (e: React.MouseEvent) => void;
}

export function useResizablePanel({
  defaultWidth = 400,
  minWidth = 250,
  maxWidth = 800,
  storageKey,
}: UseResizablePanelOptions = {}): UseResizablePanelReturn {
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) {
        return;
      }

      const deltaX = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
        if (storageKey) {
          localStorage.setItem(storageKey, newWidth.toString());
        }
      }
    },
    [isResizing, minWidth, maxWidth, storageKey]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }

    return undefined;
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      startXRef.current = e.clientX;
      startWidthRef.current = width;
      setIsResizing(true);
    },
    [width]
  );

  return {
    width,
    isResizing,
    panelRef,
    handleMouseDown,
  };
}
