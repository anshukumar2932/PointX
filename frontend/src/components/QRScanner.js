import React, { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const QRScanner = ({ onScan, isActive, onError }) => {
  const scannerRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isActive || startedRef.current) return;

    startedRef.current = true;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: 250 },
      false
    );

    scanner.render(
      (text) => {
        try {
          const data = JSON.parse(text);
          onScan(data);
        } catch {
          onError?.({ message: "Invalid QR format" });
        } finally {
          scanner.clear();
        }
      },
      (err) => {
        if (!err.includes("NotFound")) {
          console.warn(err);
        }
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => {});
      startedRef.current = false;
    };
  }, [isActive, onScan, onError]);

  return <div id="qr-reader" />;
};

export default QRScanner;
