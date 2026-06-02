"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

const FORMATS = ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"];

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const regionId   = "html5-qr-region";
  const streamRef  = useRef<MediaStream | null>(null);
  const rafRef     = useRef<number | null>(null);
  const doneRef    = useRef(false);
  const [error, setError]     = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [mode, setMode]       = useState<"native" | "fallback" | null>(null);

  useEffect(() => {
    // Try native BarcodeDetector first (Chrome Android, Safari 17+, Edge)
    if ("BarcodeDetector" in window) {
      startNative();
    } else {
      startFallback();
    }
    return stop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Native BarcodeDetector ─────────────────────────────── */
  async function startNative() {
    setMode("native");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: FORMATS });
      const stream   = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStarted(true);

      const scan = async () => {
        if (doneRef.current || !videoRef.current) return;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const codes: any[] = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            doneRef.current = true;
            stop();
            onDetected(codes[0].rawValue);
            return;
          }
        } catch { /* frame skip */ }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg.toLowerCase().includes("permission")
        ? "Нет доступа к камере — разреши в браузере и попробуй снова."
        : "Не удалось запустить камеру. Попробуй ввести штрих-код вручную.");
    }
  }

  /* ── Fallback: html5-qrcode with barcode formats ───────── */
  async function startFallback() {
    setMode("fallback");
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const barcodeFormats = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];
      const scanner = new Html5Qrcode(regionId, { formatsToSupport: barcodeFormats, verbose: false });
      streamRef.current = { scanner } as unknown as MediaStream; // store ref for cleanup

      await scanner.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 280, height: 120 } },
        (text: string) => {
          if (doneRef.current) return;
          doneRef.current = true;
          scanner.stop().catch(() => {});
          onDetected(text);
        },
        () => {}
      );
      setStarted(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg.toLowerCase().includes("permission")
        ? "Нет доступа к камере — разреши в браузере и попробуй снова."
        : "Не удалось запустить камеру. Попробуй ввести штрих-код вручную.");
    }
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      // native stream
      if ("getTracks" in streamRef.current) {
        (streamRef.current as MediaStream).getTracks().forEach(t => t.stop());
      } else {
        // html5-qrcode scanner stored as fake stream
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (streamRef.current as any).scanner?.stop().catch(() => {});
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-white font-semibold">📷 Сканер штрих-кода</h3>
          <button onClick={() => { stop(); onClose(); }}
            className="text-zinc-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-3">
          {error ? (
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-sm text-red-300">{error}</div>
          ) : (
            <>
              <p className="text-xs text-zinc-400 text-center">
                Наведи камеру на штрих-код · держи ровно на расстоянии 15–25 см
              </p>

              {/* Native mode: our own <video> element */}
              {mode === "native" && (
                <div className="relative rounded-xl overflow-hidden bg-zinc-950" style={{ aspectRatio: "4/3" }}>
                  <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                  {/* Targeting overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-green-400 rounded-md opacity-80"
                      style={{ width: "80%", height: "30%" }} />
                  </div>
                </div>
              )}

              {/* Fallback mode: html5-qrcode mounts here */}
              {mode === "fallback" && (
                <div id={regionId} className="rounded-xl overflow-hidden bg-zinc-950 min-h-[200px]" />
              )}

              {!started && (
                <div className="flex items-center justify-center py-3 gap-2 text-zinc-500 text-sm">
                  <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                  Запускаю камеру…
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
