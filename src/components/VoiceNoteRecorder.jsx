import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Send, Mic } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function VoiceNoteRecorder({ onSendVoice, onCancel }) {
  const { showToast } = useToast();
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState([20, 35, 60, 40, 75, 50, 30, 80, 45, 65, 30, 55]);

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    let isMounted = true;

    async function startRecording() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          showToast('جهازك لا يدعم تسجيل الصوت المباشر في هذا المتصفح', 'error');
          onCancel();
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Set up Web Audio Analyser for live visualizer
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          audioContextRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVisualizer = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            // Extract 12 sample bars
            const bars = [];
            const step = Math.max(1, Math.floor(dataArray.length / 12));
            for (let i = 0; i < 12; i++) {
              const val = dataArray[i * step] || 0;
              const heightPercent = Math.max(15, Math.min(100, Math.round((val / 255) * 100)));
              bars.push(heightPercent);
            }
            setAudioLevels(bars);
            animFrameRef.current = requestAnimationFrame(updateVisualizer);
          };

          animFrameRef.current = requestAnimationFrame(updateVisualizer);
        }

        // Set up MediaRecorder
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };
        recorder.start(200);
        mediaRecorderRef.current = recorder;

      } catch (err) {
        console.warn('Voice recording init error:', err);
        showToast('يرجى السماح بصلاحية الميكروفون لتسجيل النبضة الصوتية', 'error');
        onCancel();
      }
    }

    startRecording();

    // Timer interval
    const timer = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(timer);
      cleanUp();
    };
  }, []);

  const cleanUp = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleCancel = () => {
    cleanUp();
    onCancel();
  };

  const handleFinishAndSend = () => {
    if (!mediaRecorderRef.current) {
      onCancel();
      return;
    }

    const duration = Math.max(1, recordingTime);

    mediaRecorderRef.current.onstop = () => {
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result;
          onSendVoice(base64Audio, duration);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn('Error packing audio blob:', err);
        onCancel();
      }
    };

    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanUp();
  };

  const formatSecs = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 w-full bg-[#121217] border border-white/15 rounded-2xl px-3 py-2 animate-in zoom-in-95 duration-150 shadow-[0_0_15px_rgba(255,255,255,0.03)]">
      {/* Cancel Action */}
      <button
        type="button"
        onClick={handleCancel}
        className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 tap-press transition-colors flex-shrink-0"
        title="إلغاء التسجيل"
      >
        <Trash2 size={18} />
      </button>

      {/* Recording indicator & timer */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
        <span className="text-xs font-mono font-bold text-rose-400">
          {formatSecs(recordingTime)}
        </span>
      </div>

      {/* Dynamic Sound Waveform Bars */}
      <div className="flex-1 flex items-center justify-center gap-[3px] h-6 px-2 overflow-hidden">
        {audioLevels.map((lvl, idx) => (
          <span
            key={idx}
            style={{ height: `${lvl}%` }}
            className="w-1 bg-white rounded-full transition-all duration-75"
          ></span>
        ))}
      </div>

      {/* Send Voice Button */}
      <button
        type="button"
        onClick={handleFinishAndSend}
        className="p-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black shadow-md tap-press flex-shrink-0 transition-transform active:scale-95"
        title="إرسال النبضة الصوتية"
      >
        <Send size={16} className="rotate-180" />
      </button>
    </div>
  );
}
