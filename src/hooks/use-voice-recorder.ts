"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ovozli xabar yozish — Flutter versiyasidagi `chat_room_page.dart` ichidagi
 * `MediaRecorder` bilan ishlovchi qismning ko'chirmasi.
 *
 * Qo'shimcha kutubxona kerak emas: brauzerning o'z `MediaRecorder` API'si
 * ishlatiladi. Yozish tugagach tayyor `Blob` qaytadi va chat uni oddiy media
 * xabar sifatida yuboradi.
 */
export type VoiceRecorderState = {
  isRecording: boolean;
  /** Yozib olingan vaqt, soniyada. */
  seconds: number;
  isSupported: boolean;
  start: () => Promise<void>;
  /** Yozishni tugatib faylni qaytaradi; bekor qilinsa `null`. */
  stop: () => Promise<File | null>;
  cancel: () => void;
};

export function useVoiceRecorder(): VoiceRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const isSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  /** Mikrofon va taymerni to'liq bo'shatadi. */
  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];

    setIsRecording(false);
    setSeconds(0);
  };

  // Komponent yo'q qilinganda mikrofon ochiq qolmasin.
  useEffect(() => cleanup, []);

  const start = async () => {
    if (!isSupported || isRecording) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    cancelledRef.current = false;

    // Brauzer qo'llab-quvvatlaydigan birinchi formatni tanlaymiz.
    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ].find((type) => MediaRecorder.isTypeSupported(type));

    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorderRef.current = recorder;
    recorder.start();

    setIsRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(
      () => setSeconds((current) => current + 1),
      1000,
    );
  };

  const stop = () =>
    new Promise<File | null>((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        cleanup();
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const cancelled = cancelledRef.current;
        const type = recorder.mimeType || "audio/webm";
        const chunks = chunksRef.current;

        cleanup();

        if (cancelled || chunks.length === 0) {
          resolve(null);
          return;
        }

        const blob = new Blob(chunks, { type });
        const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        resolve(
          new File([blob], `ovoz-${Date.now()}.${extension}`, { type }),
        );
      };

      recorder.stop();
    });

  const cancel = () => {
    cancelledRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else cleanup();
  };

  return { isRecording, seconds, isSupported, start, stop, cancel };
}
