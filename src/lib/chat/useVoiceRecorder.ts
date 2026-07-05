import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

const MAX_DURATION_MS = 60_000;

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) return false;

    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    setRecordedUri(null);
    setRecordedDuration(0);
    await recorder.prepareToRecordAsync();
    recorder.record();

    autoStopRef.current = setTimeout(() => {
      stop();
    }, MAX_DURATION_MS);

    return true;
  }, [recorder]);

  const stop = useCallback(async () => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (!recorder.isRecording) return;
    const durationMs = recorderState.durationMillis ?? 0;
    await recorder.stop();
    setRecordedUri(recorder.uri ?? null);
    setRecordedDuration(Math.min(60, Math.max(1, Math.round(durationMs / 1000))));
  }, [recorder, recorderState.durationMillis]);

  const cancel = useCallback(async () => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (recorder.isRecording) await recorder.stop();
    setRecordedUri(null);
    setRecordedDuration(0);
  }, [recorder]);

  const reset = useCallback(() => {
    setRecordedUri(null);
    setRecordedDuration(0);
  }, []);

  return {
    isRecording: recorderState.isRecording,
    durationMillis: recorderState.durationMillis ?? 0,
    recordedUri,
    recordedDuration,
    start,
    stop,
    cancel,
    reset,
  };
}
