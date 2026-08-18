import { Button } from '@/components/ui/Button';
import { Colors, Fonts, Spacing } from '@/constants/colors';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
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

  const adjustOffset = (deltaX: number, deltaY: number) => {
    setOffset(current => ({
      x: clampOffset(current.x + deltaX, renderedSize.width),
      y: clampOffset(current.y + deltaY, renderedSize.height),
    }));
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>تنظیم کادر عکس</Text>
          <View style={styles.cropFrame}>
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
          <View style={styles.zoomRow}>
            <Pressable style={styles.zoomButton} onPress={() => adjustZoom(-0.1)}>
              <Text style={styles.zoomText}>-</Text>
            </Pressable>
            <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
            <Pressable style={styles.zoomButton} onPress={() => adjustZoom(0.1)}>
              <Text style={styles.zoomText}>+</Text>
            </Pressable>
          </View>
          <View style={styles.moveGrid}>
            <View style={styles.moveRow}>
              <Pressable style={styles.moveButton} onPress={() => adjustOffset(0, 16)}>
                <Text style={styles.moveText}>↑</Text>
              </Pressable>
            </View>
            <View style={styles.moveRow}>
              <Pressable style={styles.moveButton} onPress={() => adjustOffset(16, 0)}>
                <Text style={styles.moveText}>←</Text>
              </Pressable>
              <Pressable style={styles.moveButton} onPress={() => adjustOffset(-16, 0)}>
                <Text style={styles.moveText}>→</Text>
              </Pressable>
            </View>
            <View style={styles.moveRow}>
              <Pressable style={styles.moveButton} onPress={() => adjustOffset(0, -16)}>
                <Text style={styles.moveText}>↓</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.actions}>
            <Button variant="ghost" full={false} style={styles.actionButton} onPress={onCancel}>
              لغو
            </Button>
            <Button variant="accent" full={false} style={styles.actionButton} onPress={handleComplete} disabled={saving}>
              {saving ? 'در حال آماده‌سازی...' : 'تایید کادر'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  title: {
    color: Colors.ink,
    fontFamily: Fonts.bold,
    fontSize: 16,
    marginBottom: 14,
  },
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
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
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
  moveGrid: {
    gap: 6,
    marginTop: 12,
  },
  moveRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  moveButton: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: Colors.surface3,
  },
  moveText: {
    color: Colors.ink,
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
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
