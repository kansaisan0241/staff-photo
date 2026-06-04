import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Layer, Rect, Stage } from 'react-konva';
import type Konva from 'konva';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  HandleName,
  ImageEditor,
  STAGE_PADDING,
  VIEW_SCALE
} from '../hooks/useImageEditor';

type Point = {
  x: number;
  y: number;
};

const HANDLE_NAMES: HandleName[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function useHtmlImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);

  return image;
}

function getCanvasPoint(stage: Konva.Stage | null): Point | null {
  const pointer = stage?.getPointerPosition();
  if (!pointer) return null;
  return {
    x: pointer.x / VIEW_SCALE - STAGE_PADDING,
    y: pointer.y / VIEW_SCALE - STAGE_PADDING
  };
}

function handlePosition(handle: HandleName, rect: { x: number; y: number; width: number; height: number }) {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  switch (handle) {
    case 'nw':
      return { x: rect.x, y: rect.y };
    case 'n':
      return { x: cx, y: rect.y };
    case 'ne':
      return { x: right, y: rect.y };
    case 'e':
      return { x: right, y: cy };
    case 'se':
      return { x: right, y: bottom };
    case 's':
      return { x: cx, y: bottom };
    case 'sw':
      return { x: rect.x, y: bottom };
    case 'w':
      return { x: rect.x, y: cy };
  }
}

function getCropDisplayRect(image: NonNullable<ImageEditor['staffImage']>) {
  return {
    x: image.x + (image.cropX / image.naturalWidth) * image.width,
    y: image.y + (image.cropY / image.naturalHeight) * image.height,
    width: (image.cropWidth / image.naturalWidth) * image.width,
    height: (image.cropHeight / image.naturalHeight) * image.height
  };
}

export function CanvasEditor({ editor }: { editor: ImageEditor }) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const lastHandlePointRef = useRef<Point | null>(null);
  const [activeHandle, setActiveHandle] = useState<HandleName | null>(null);
  const staffImage = useHtmlImage(editor.staffImage?.src ?? null);
  const templateImage = useHtmlImage('/template.png');
  const fillPatchImage = useHtmlImage(editor.fillPatch?.src ?? null);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'Shift') editor.setIsShiftDown(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === 'Shift') editor.setIsShiftDown(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [editor]);

  const staffRect = editor.staffImage;
  const handlePoints = useMemo(() => {
    if (!staffRect) return [];
    const targetRect = editor.mode === 'crop' ? getCropDisplayRect(staffRect) : staffRect;
    return HANDLE_NAMES.map((name) => ({
      name,
      ...handlePosition(name, targetRect)
    }));
  }, [editor.mode, staffRect]);

  const onStageMouseDown = () => {
    const point = getCanvasPoint(stageRef.current);
    if (!point) return;
    if (editor.mode === 'select' && staffRect) {
      const inside =
        point.x >= staffRect.x &&
        point.x <= staffRect.x + staffRect.width &&
        point.y >= staffRect.y &&
        point.y <= staffRect.y + staffRect.height;
      if (!inside) editor.clearImageSelection();
    }
    if (editor.mode === 'fill') editor.startSelection(point.x, point.y);
  };

  const onStageMouseMove = () => {
    const point = getCanvasPoint(stageRef.current);
    if (!point) return;
    if (activeHandle) {
      const previous = lastHandlePointRef.current;
      if (!previous) return;
      const dx = point.x - previous.x;
      const dy = point.y - previous.y;
      if (editor.mode === 'crop') {
        editor.resizeCropImage(activeHandle, dx, dy);
      } else {
        editor.resizeStaffImage(activeHandle, dx, dy, !editor.isShiftDown);
      }
      lastHandlePointRef.current = point;
      return;
    }
    if (editor.mode === 'fill') editor.moveSelection(point.x, point.y);
  };

  const onStageMouseUp = () => {
    setActiveHandle(null);
    lastHandlePointRef.current = null;
    if (editor.mode === 'fill') editor.finishSelection();
    if (editor.mode === 'crop') editor.endCropDrag();
  };

  return (
    <div className="editor-wrap">
      <Stage
        ref={stageRef}
        width={(CANVAS_WIDTH + STAGE_PADDING * 2) * VIEW_SCALE}
        height={(CANVAS_HEIGHT + STAGE_PADDING * 2) * VIEW_SCALE}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        onTouchStart={onStageMouseDown}
        onTouchMove={onStageMouseMove}
        onTouchEnd={onStageMouseUp}
      >
        <Layer scaleX={VIEW_SCALE} scaleY={VIEW_SCALE}>
          <Rect
            x={0}
            y={0}
            width={CANVAS_WIDTH + STAGE_PADDING * 2}
            height={CANVAS_HEIGHT + STAGE_PADDING * 2}
            fill="#10141a"
          />
          <Group x={STAGE_PADDING} y={STAGE_PADDING}>
            <Rect x={0} y={0} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#ffffff" />
            {fillPatchImage && (
              <KonvaImage
                image={fillPatchImage}
                x={0}
                y={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                listening={false}
              />
            )}
            {staffRect && staffImage && editor.mode === 'crop' && (
              <Group
                clipX={getCropDisplayRect(staffRect).x}
                clipY={getCropDisplayRect(staffRect).y}
                clipWidth={getCropDisplayRect(staffRect).width}
                clipHeight={getCropDisplayRect(staffRect).height}
              >
                <KonvaImage
                  image={staffImage}
                  x={staffRect.x}
                  y={staffRect.y}
                  width={staffRect.width}
                  height={staffRect.height}
                  listening={false}
                />
              </Group>
            )}
            {staffRect && staffImage && editor.mode !== 'crop' && (
              <Group
                x={staffRect.x}
                y={staffRect.y}
                clipX={(staffRect.cropX / staffRect.naturalWidth) * staffRect.width}
                clipY={(staffRect.cropY / staffRect.naturalHeight) * staffRect.height}
                clipWidth={(staffRect.cropWidth / staffRect.naturalWidth) * staffRect.width}
                clipHeight={(staffRect.cropHeight / staffRect.naturalHeight) * staffRect.height}
                draggable={editor.mode === 'select'}
                onMouseDown={(event) => {
                  if (editor.mode === 'select') {
                    event.cancelBubble = true;
                    editor.selectStaffImage();
                  }
                }}
                onTouchStart={(event) => {
                  if (editor.mode === 'select') {
                    event.cancelBubble = true;
                    editor.selectStaffImage();
                  }
                }}
                onDragMove={(event) => editor.moveStaffImage(event.target.x(), event.target.y())}
                onDragEnd={(event) => editor.moveStaffImage(event.target.x(), event.target.y())}
              >
                <KonvaImage
                  image={staffImage}
                  x={0}
                  y={0}
                  width={staffRect.width}
                  height={staffRect.height}
                  listening={false}
                />
              </Group>
            )}
            {staffRect && staffImage && editor.mode === 'select' && (
              <Rect
                x={getCropDisplayRect(staffRect).x}
                y={getCropDisplayRect(staffRect).y}
                width={getCropDisplayRect(staffRect).width}
                height={getCropDisplayRect(staffRect).height}
                fill="rgba(255,255,255,0.001)"
                draggable
                onMouseDown={(event) => {
                  event.cancelBubble = true;
                  editor.selectStaffImage();
                }}
                onTouchStart={(event) => {
                  event.cancelBubble = true;
                  editor.selectStaffImage();
                }}
                onDragMove={(event) => {
                  const cropRect = getCropDisplayRect(staffRect);
                  editor.moveStaffImage(event.target.x() - (cropRect.x - staffRect.x), event.target.y() - (cropRect.y - staffRect.y));
                }}
                onDragEnd={(event) => {
                  const cropRect = getCropDisplayRect(staffRect);
                  editor.moveStaffImage(event.target.x() - (cropRect.x - staffRect.x), event.target.y() - (cropRect.y - staffRect.y));
                }}
              />
            )}
            {templateImage && (
              <KonvaImage
                image={templateImage}
                x={0}
                y={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                listening={false}
              />
            )}
            {editor.selection && (
              <Rect
                x={editor.selection.x}
                y={editor.selection.y}
                width={editor.selection.width}
                height={editor.selection.height}
                fill="rgba(77, 163, 255, 0.18)"
                stroke="#4da3ff"
                strokeWidth={2}
                dash={[8, 6]}
                listening={false}
              />
            )}
          </Group>
        </Layer>
        <Layer scaleX={VIEW_SCALE} scaleY={VIEW_SCALE}>
          <Group x={STAGE_PADDING} y={STAGE_PADDING}>
            <Rect
              x={0}
              y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              stroke="#ff4d4d"
              strokeWidth={3 / VIEW_SCALE}
              dash={[18, 10]}
              listening={false}
            />
            <Rect
              x={0}
              y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              stroke="#ffffff"
              strokeWidth={1 / VIEW_SCALE}
              listening={false}
            />
          </Group>
          {staffRect && (editor.isImageSelected || editor.mode === 'crop') && (
            <Group x={STAGE_PADDING} y={STAGE_PADDING}>
              <Rect
                x={editor.mode === 'crop' ? getCropDisplayRect(staffRect).x : staffRect.x}
                y={editor.mode === 'crop' ? getCropDisplayRect(staffRect).y : staffRect.y}
                width={editor.mode === 'crop' ? getCropDisplayRect(staffRect).width : staffRect.width}
                height={editor.mode === 'crop' ? getCropDisplayRect(staffRect).height : staffRect.height}
                stroke={editor.mode === 'crop' ? '#77c56b' : '#4da3ff'}
                strokeWidth={2}
                dash={editor.mode === 'crop' ? [10, 8] : undefined}
                listening={false}
              />
              {handlePoints.map((handle) => (
                <Circle
                  key={handle.name}
                  x={handle.x}
                  y={handle.y}
                  radius={10 / VIEW_SCALE}
                  fill="#f4f7fb"
                  stroke={editor.mode === 'crop' ? '#77c56b' : '#4da3ff'}
                  strokeWidth={2 / VIEW_SCALE}
                  onMouseDown={(event) => {
                    event.cancelBubble = true;
                    const point = getCanvasPoint(stageRef.current);
                    lastHandlePointRef.current = point ?? { x: handle.x, y: handle.y };
                    setActiveHandle(handle.name);
                  }}
                  onTouchStart={(event) => {
                    event.cancelBubble = true;
                    const point = getCanvasPoint(stageRef.current);
                    lastHandlePointRef.current = point ?? { x: handle.x, y: handle.y };
                    setActiveHandle(handle.name);
                  }}
                />
              ))}
            </Group>
          )}
        </Layer>
      </Stage>
    </div>
  );
}
