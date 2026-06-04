import { ChangeEvent, DragEvent, useCallback, useMemo, useRef, useState } from 'react';

export const CANVAS_WIDTH = 1500;
export const CANVAS_HEIGHT = 1124;
export const STAGE_PADDING = 220;
export const VIEW_SCALE = 0.48;

export type Mode = 'select' | 'crop' | 'fill';
export type HandleName = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type StaffImageState = {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  naturalWidth: number;
  naturalHeight: number;
};

export type FillPatch = {
  src: string;
  width: number;
  height: number;
};

type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MIN_SIZE = 40;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function timestampName() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `staff-photo-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.jpg`;
}

function normalizeRect(startX: number, startY: number, endX: number, endY: number): SelectionRect {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY)
  };
}

function intersectRect(a: SelectionRect, b: SelectionRect): SelectionRect | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function useImageEditor() {
  const [staffImage, setStaffImage] = useState<StaffImageState | null>(null);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [mode, setMode] = useState<Mode>('select');
  const [fillPatch, setFillPatch] = useState<FillPatch | null>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [status, setStatus] = useState('template.png を読み込みました。');
  const [isShiftDown, setIsShiftDown] = useState(false);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const cropBackupRef = useRef<StaffImageState | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

  const completionRects: Array<SelectionRect & { patch: FillPatch }> = useMemo(() => [], []);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatus('画像ファイルを選択してください。');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        imageElementRef.current = img;
        const displayHeight = Math.round(CANVAS_HEIGHT * 0.82);
        const displayWidth = Math.round((img.naturalWidth / img.naturalHeight) * displayHeight);
        const x = Math.round(CANVAS_WIDTH - displayWidth - 130);
        const y = Math.round((CANVAS_HEIGHT - displayHeight) / 2);
        setStaffImage({
          src,
          x,
          y,
          width: displayWidth,
          height: displayHeight,
          cropX: 0,
          cropY: 0,
          cropWidth: img.naturalWidth,
          cropHeight: img.naturalHeight,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });
        setIsImageSelected(true);
        setFillPatch(null);
        setMode('select');
        setStatus('スタッフ写真を右側中央へ配置しました。');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) loadFile(file);
    event.target.value = '';
  }, [loadFile]);

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const moveStaffImage = useCallback((x: number, y: number) => {
    if (mode === 'crop') return;
    setStaffImage((current) => current ? { ...current, x, y } : current);
  }, [mode]);

  const selectStaffImage = useCallback(() => {
    setIsImageSelected(true);
  }, []);

  const clearImageSelection = useCallback(() => {
    if (mode === 'select') setIsImageSelected(false);
  }, [mode]);

  const resizeStaffImage = useCallback((handle: HandleName, dx: number, dy: number, keepRatio: boolean) => {
    setStaffImage((current) => {
      if (!current) return current;
      const next = { ...current };
      const ratio = current.width / current.height;

      if (handle.includes('e')) next.width = Math.max(MIN_SIZE, current.width + dx);
      if (handle.includes('s')) next.height = Math.max(MIN_SIZE, current.height + dy);
      if (handle.includes('w')) {
        next.width = Math.max(MIN_SIZE, current.width - dx);
        next.x = current.x + (current.width - next.width);
      }
      if (handle.includes('n')) {
        next.height = Math.max(MIN_SIZE, current.height - dy);
        next.y = current.y + (current.height - next.height);
      }

      if (keepRatio) {
        if (handle === 'n' || handle === 's') {
          const oldWidth = next.width;
          next.width = next.height * ratio;
          next.x -= (next.width - oldWidth) / 2;
        } else {
          const oldHeight = next.height;
          next.height = next.width / ratio;
          if (handle.includes('n')) next.y = current.y + current.height - next.height;
          if (!handle.includes('n') && !handle.includes('s')) next.y -= (next.height - oldHeight) / 2;
        }
      }

      return next;
    });
  }, []);

  const resizeCropImage = useCallback((handle: HandleName, dx: number, dy: number) => {
    setStaffImage((current) => {
      if (!current) return current;
      const next = { ...current };
      const moveX = dx * (current.naturalWidth / current.width);
      const moveY = dy * (current.naturalHeight / current.height);

      if (handle.includes('w')) {
        const delta = clamp(moveX, -current.cropX, current.cropWidth - MIN_SIZE);
        next.cropX = current.cropX + delta;
        next.cropWidth = current.cropWidth - delta;
      }
      if (handle.includes('e')) {
        const delta = clamp(moveX, MIN_SIZE - current.cropWidth, current.naturalWidth - current.cropX - current.cropWidth);
        next.cropWidth = current.cropWidth + delta;
      }
      if (handle.includes('n')) {
        const delta = clamp(moveY, -current.cropY, current.cropHeight - MIN_SIZE);
        next.cropY = current.cropY + delta;
        next.cropHeight = current.cropHeight - delta;
      }
      if (handle.includes('s')) {
        const delta = clamp(moveY, MIN_SIZE - current.cropHeight, current.naturalHeight - current.cropY - current.cropHeight);
        next.cropHeight = current.cropHeight + delta;
      }

      return next;
    });
  }, []);

  const removeStaffImage = useCallback(() => {
    setStaffImage(null);
    setFillPatch(null);
    setSelection(null);
    setIsImageSelected(false);
    cropBackupRef.current = null;
    setMode('select');
    setStatus('スタッフ写真を削除しました。');
  }, []);

  const startCrop = useCallback(() => {
    if (!staffImage) return;
    cropBackupRef.current = { ...staffImage };
    setIsImageSelected(true);
    setMode('crop');
    setStatus('トリミング中です。写真内をドラッグして表示範囲を移動できます。');
  }, [staffImage]);

  const confirmCrop = useCallback(() => {
    cropBackupRef.current = null;
    setMode('select');
    setStatus('トリミングを確定しました。');
  }, []);

  const cancelCrop = useCallback(() => {
    if (cropBackupRef.current) setStaffImage(cropBackupRef.current);
    cropBackupRef.current = null;
    setMode('select');
    setStatus('トリミングをキャンセルしました。');
  }, []);

  const startCropDrag = useCallback((x: number, y: number) => {
    dragRef.current = { x, y };
  }, []);

  const moveCropDrag = useCallback((x: number, y: number) => {
    const previous = dragRef.current;
    if (!previous) return;
    setStaffImage((current) => {
      if (!current) return current;
      const dx = x - previous.x;
      const dy = y - previous.y;
      dragRef.current = { x, y };
      const scaleX = current.cropWidth / current.width;
      const scaleY = current.cropHeight / current.height;
      return {
        ...current,
        cropX: clamp(current.cropX - dx * scaleX, 0, current.naturalWidth - current.cropWidth),
        cropY: clamp(current.cropY - dy * scaleY, 0, current.naturalHeight - current.cropHeight)
      };
    });
  }, []);

  const endCropDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const startFillMode = useCallback(() => {
    if (!staffImage) return;
    setMode('fill');
    setIsImageSelected(true);
    setStatus('写真内の背景部分をドラッグして矩形選択してください。');
  }, [staffImage]);

  const startSelection = useCallback((x: number, y: number) => {
    if (mode !== 'fill') return;
    selectionStartRef.current = { x, y };
    setSelection({ x, y, width: 0, height: 0 });
  }, [mode]);

  const moveSelection = useCallback((x: number, y: number) => {
    const start = selectionStartRef.current;
    if (!start) return;
    setSelection(normalizeRect(start.x, start.y, x, y));
  }, []);

  const finishSelection = useCallback(() => {
    const rect = selection;
    selectionStartRef.current = null;
    setSelection(null);
    if (!staffImage || !rect || rect.width < 4 || rect.height < 4) return;

    const imageRect = { x: staffImage.x, y: staffImage.y, width: staffImage.width, height: staffImage.height };
    const clipped = intersectRect(rect, imageRect);
    const source = imageElementRef.current;
    if (!clipped || !source) {
      setStatus('写真の背景部分に重なるように選択してください。');
      return;
    }

    const sx = Math.round(staffImage.cropX + ((clipped.x - staffImage.x) / staffImage.width) * staffImage.cropWidth);
    const sy = Math.round(staffImage.cropY + ((clipped.y - staffImage.y) / staffImage.height) * staffImage.cropHeight);
    const sw = Math.max(1, Math.round((clipped.width / staffImage.width) * staffImage.cropWidth));
    const sh = Math.max(1, Math.round((clipped.height / staffImage.height) * staffImage.cropHeight));
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = sw;
    sampleCanvas.height = sh;
    const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
    setFillPatch({
      src: sampleCanvas.toDataURL('image/png'),
      width: sw,
      height: sh
    });
    setMode('select');
    setStatus('選択した背景範囲をキャンバス全体の最背面へ適用しました。');
  }, [selection, staffImage]);

  const saveJpeg = useCallback(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (fillPatch) {
      const patch = new Image();
      await new Promise<void>((resolve) => {
        patch.onload = () => resolve();
        patch.src = fillPatch.src;
      });
      ctx.drawImage(patch, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (staffImage && imageElementRef.current) {
      const clipX = staffImage.x + (staffImage.cropX / staffImage.naturalWidth) * staffImage.width;
      const clipY = staffImage.y + (staffImage.cropY / staffImage.naturalHeight) * staffImage.height;
      const clipWidth = (staffImage.cropWidth / staffImage.naturalWidth) * staffImage.width;
      const clipHeight = (staffImage.cropHeight / staffImage.naturalHeight) * staffImage.height;
      ctx.save();
      ctx.beginPath();
      ctx.rect(clipX, clipY, clipWidth, clipHeight);
      ctx.clip();
      ctx.drawImage(
        imageElementRef.current,
        staffImage.x,
        staffImage.y,
        staffImage.width,
        staffImage.height
      );
      ctx.restore();
    }

    const template = new Image();
    template.onload = () => {
      ctx.drawImage(template, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const link = document.createElement('a');
      link.download = timestampName();
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
      setStatus('1500×1124px のJPGを書き出しました。');
    };
    template.src = '/template.png';
  }, [fillPatch, staffImage]);

  return {
    staffImage,
    isImageSelected,
    mode,
    fillPatch,
    selection,
    status,
    isShiftDown,
    completionRects,
    imageElementRef,
    setIsShiftDown,
    handleFileChange,
    handleDragOver,
    handleDrop,
    moveStaffImage,
    selectStaffImage,
    clearImageSelection,
    removeStaffImage,
    resizeStaffImage,
    resizeCropImage,
    startCrop,
    confirmCrop,
    cancelCrop,
    startCropDrag,
    moveCropDrag,
    endCropDrag,
    startFillMode,
    startSelection,
    moveSelection,
    finishSelection,
    saveJpeg
  };
}

export type ImageEditor = ReturnType<typeof useImageEditor>;
