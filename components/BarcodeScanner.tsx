"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const regionId = "barcode-reader-region";
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let html5QrcodeScanner: any = null;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decodedText: string) => {
            scanner.stop().catch(() => {});
            onDetected(decodedText);
          },
          () => {}
        );
        setStarted(true);
      } catch (e: any) {
        setError(
          e?.message?.includes("Permission")
            ? "Нет доступа к камере. Разреши доступ в браузере и попробуй снова."
            : "Не удалось запустить камеру. Попробуй ввести штрих-код вручную."
        );
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-white font-semibold">📷 Сканер штрих-кода</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error ? (
            <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-sm text-red-300">
              {error}
            </div>
          ) : (
            <>
              <p className="text-xs text-zinc-500 text-center">
                Наведи камеру на штрих-код продукта
              </p>
              {/* html5-qrcode рендерит видео сюда */}
              <div
                id={regionId}
                className="rounded-xl overflow-hidden bg-zinc-950 min-h-[200px]"
              />
              {!started && (
                <div className="flex items-center justify-center py-4 gap-2 text-zinc-500 text-sm">
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
