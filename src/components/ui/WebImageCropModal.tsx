import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Colors, Fonts } from '@/constants/colors';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const CROP_SIZE = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type ImageSize = { width: number; height: number };

type Props = {
  visible: boolean;
  uri: string | null;
  onCancel: () => void;
  onComplete: (dataUri: string) => void;
};

function loadImageSize(uri: string): Promise<ImageSize> {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = uri;
  });
}

function clampOffset(value: number, renderedSize: number) {
  const max = Math.max(0, (renderedSize - CROP_SIZE) / 2);
  return Math.max(-max, Math.min(max, value));
}

async function cropImage(uri: string, zoom: number, offset: { x: number; y: number }) {
  const image = document.createElement('img');
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = uri;
  });

  const baseScale = Math.max(CROP_SIZE / image.naturalWidth, CROP_SIZE / image.naturalHeight);
  const scale = baseScale * zoom;
  const sourceSize = CROP_SIZE / scale;
  const sourceX = (image.naturalWidth / 2) - (CROP_SIZE / 2 + offset.x) / scale;
  const sourceY = (image.naturalHeight / 2) - (CROP_SIZE / 2 + offset.y) / scale;

  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 720;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available');
  }

  context.drawImage(
    image,
    Math.max(0, Math.min(image.naturalWidth - sourceSize, sourceX)),
    Math.max(0, Math.min(image.naturalHeight - sourceSize, sourceY)),
    sourceSize,
    sourceSize,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function WebImageCropModal({ visible, uri, onCancel, onComplete }: Props) {
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cropFocused, setCropFocused] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0 });

  const renderedSize = useMemo(() => {
    if (!imageSize) return { width: CROP_SIZE, height: CROP_SIZE };
    const baseScale = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
    return {
      width: imageSize.width * baseScale * zoom,
      height: imageSize.height * baseScale * zoom,
    };
  }, [imageSize, zoom]);

  useEffect(() => {
    if (!visible || !uri || Platform.OS !== 'web') return;
    Promise.resolve().then(() => {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    });
    loadImageSize(uri).then(setImageSize).catch(() => setImageSize(null));
  }, [uri, visible]);

  const adjustZoom = (delta: number) => {
    setZoom(value => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number((value + delta).toFixed(2))));
      const nextWidth = imageSize
        ? imageSize.width * Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height) * next
        : CROP_SIZE;
      const nextHeight = imageSize
        ? imageSize.height * Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height) * next
        : CROP_SIZE;
      setOffset(current => ({
        x: clampOffset(current.x, nextWidth),
        y: clampOffset(current.y, nextHeight),
      }));
      return next;
    });
  };

  const handleComplete = async () => {
    if (!uri) return;
    setSaving(true);
    try {
      onComplete(await cropImage(uri, zoom, offset));
    } finally {
      setSaving(false);
    }
  };

  if (Platform.OS !== 'web') return null;

  return (
    <Sheet
      visible={visible}
      onClose={onCancel}
      title="تنظیم کادر عکس"
      contentStyle={styles.content}
      footer={
        <View style={styles.actions}>
          <Button variant="ghost" full={false} style={styles.actionButton} onPress={onCancel}>
            لغو
          </Button>
          <Button variant="accent" full={false} style={styles.actionButton} onPress={handleComplete} disabled={saving}>
            {saving ? 'در حال آماده‌سازی...' : 'تایید کادر'}
          </Button>
        </View>
      }
    >
      <Text style={styles.hint}>عکس را بکش تا چهره‌ات داخل کادر قرار بگیرد</Text>
      <View style={styles.cropFrame}>
        <div
          aria-label="کادر عکس؛ با کشیدن یا کلیدهای جهت‌نما جابه‌جا کنید"
          tabIndex={0}
          onFocus={() => setCropFocused(true)}
          onBlur={() => setCropFocused(false)}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', outline: cropFocused ? `2px solid ${Colors.ink}` : 'none', outlineOffset: -6, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          onPointerDown={event => {
            if (saving || !event.isPrimary || event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            dragOrigin.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
            setDragging(true);
          }}
          onPointerMove={event => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            setOffset({ x: clampOffset(event.clientX - dragOrigin.current.x, renderedSize.width), y: clampOffset(event.clientY - dragOrigin.current.y, renderedSize.height) });
          }}
          onPointerUp={event => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            setDragging(false);
          }}
          onLostPointerCapture={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onKeyDown={event => {
            if (saving) return;
            const deltas: Record<string, number[]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
            const delta = deltas[event.key];
            if (!delta) return;
            event.preventDefault();
            setOffset(current => ({ x: clampOffset(current.x + delta[0], renderedSize.width), y: clampOffset(current.y + delta[1], renderedSize.height) }));
          }}
        >
          <View pointerEvents="none" style={styles.imageLayer}>
          {uri ? (
            <Image
              source={{ uri }}
              style={[
                styles.previewImage,
                {
                  width: renderedSize.width,
                  height: renderedSize.height,
                  transform: [{ translateX: offset.x }, { translateY: offset.y }],
                },
              ]}
              contentFit="cover"
            />
          ) : null}
          </View>
        </div>
      </View>
      <View style={styles.zoomRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="کوچک‌تر کردن عکس" disabled={saving || zoom <= MIN_ZOOM} style={[styles.zoomButton, zoom <= MIN_ZOOM && styles.disabled]} onPress={() => adjustZoom(-0.1)}>
          <Text style={styles.zoomText}>-</Text>
        </Pressable>
        <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="بزرگ‌تر کردن عکس" disabled={saving || zoom >= MAX_ZOOM} style={[styles.zoomButton, zoom >= MAX_ZOOM && styles.disabled]} onPress={() => adjustZoom(0.1)}>
          <Text style={styles.zoomText}>+</Text>
        </Pressable>
      </View>
      <Button variant="ghost" full={false} disabled={saving} onPress={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>
        بازنشانی کادر
      </Button>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center' },
  cropFrame: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: CROP_SIZE / 2,
    backgroundColor: Colors.bg,
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  previewImage: {
    position: 'absolute',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  zoomButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: Colors.surface3,
  },
  zoomText: {
    color: Colors.ink,
    fontFamily: Fonts.bold,
    fontSize: 20,
  },
  zoomLabel: {
    minWidth: 50,
    color: Colors.muted,
    fontFamily: Fonts.bold,
    fontSize: 12,
    textAlign: 'center',
  },
  hint: { color: Colors.muted, fontFamily: Fonts.regular, fontSize: 12, textAlign: 'center', writingDirection: 'rtl', marginBottom: 16 },
  imageLayer: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
});
