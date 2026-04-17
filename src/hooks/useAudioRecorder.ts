import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<{ blob: Blob; url: string; base64: string } | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new window.AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioData({ blob: audioBlob, url, base64: base64data });
        };

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      };

      // Clear old audio
      if (audioData?.url) {
        URL.revokeObjectURL(audioData.url);
      }
      setAudioData(null);
      setRecordingTime(0);
      setIsRecording(true);
      setError(null);
      mediaRecorderRef.current.start(100); // 100ms chunks

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      setError('Microphone access denied or not available.');
      console.error(err);
    }
  }, [audioData]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const clearAudio = useCallback(() => {
    if (audioData?.url) URL.revokeObjectURL(audioData.url);
    setAudioData(null);
    setRecordingTime(0);
  }, [audioData]);

  return {
    isRecording,
    audioData,
    recordingTime,
    error,
    startRecording,
    stopRecording,
    clearAudio,
    analyser: analyserRef.current
  };
}
