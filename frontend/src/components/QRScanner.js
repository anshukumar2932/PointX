import React, { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const QRScanner = ({ onScan, isActive, onError }) => {
  const scannerRef = useRef(null);
  const startedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const processingRef = useRef(false);
  const lastSuccessfulScanRef = useRef({ text: "", ts: 0 });
  const lastParseErrorRef = useRef(0);

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    if (!isActive || startedRef.current) return;

    startedRef.current = true;

    // Clear any existing scanner first
    const existingElement = document.getElementById("qr-reader");
    if (existingElement) {
      existingElement.innerHTML = '';
    }

    // Responsive QR box size
    const getQRBoxSize = () => {
      const width = window.innerWidth;
      if (width < 480) return { width: 200, height: 200 };
      if (width < 768) return { width: 250, height: 250 };
      return { width: 280, height: 280 };
    };

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: getQRBoxSize(),
        aspectRatio: 1.0,
        disableFlip: false,
        rememberLastUsedCamera: true,
        showZoom: true
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      async (text) => {
        let data;
        try {
          const now = Date.now();

          if (
            lastSuccessfulScanRef.current.text === text &&
            now - lastSuccessfulScanRef.current.ts < 3000
          ) {
            return;
          }

          if (processingRef.current) {
            return;
          }

          data = JSON.parse(text);
          
          // Validate the QR data structure
          if (!data || typeof data !== 'object') {
            throw new Error("Invalid QR data structure");
          }

        } catch (parseError) {
          const now = Date.now();
          if (now - lastParseErrorRef.current < 1500) {
            return;
          }
          lastParseErrorRef.current = now;
          onErrorRef.current?.({
            message: "Invalid QR format. Please ensure you're scanning a valid arcade wallet QR code.",
            details: parseError.message 
          });
          return;
        }

        try {
          processingRef.current = true;
          await Promise.resolve(onScanRef.current?.(data, text));
          lastSuccessfulScanRef.current = { text, ts: Date.now() };
        } catch (scanError) {
          onErrorRef.current?.({
            message: scanError?.message || "Failed to process scanned QR code."
          });
        } finally {
          processingRef.current = false;
        }
      },
      (err) => {
        // Filter out common non-error messages
        if (err.includes("NotFound") || 
            err.includes("No MultiFormat Readers") ||
            err.includes("NotFoundException")) {
          return; // These are normal scanning states, not errors
        }
        
        // Only report actual errors to the user
        if (err.includes("NotAllowedError")) {
          onErrorRef.current?.({ message: "Camera permission denied. Please allow camera access." });
        } else if (err.includes("NotReadableError")) {
          onErrorRef.current?.({ message: "Camera is not accessible. Please check if another app is using it." });
        }
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      processingRef.current = false;
      lastSuccessfulScanRef.current = { text: "", ts: 0 };
      startedRef.current = false;
    };
  }, [isActive]);

  return (
    <div className="scanner-container">
      <div id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }} />
    </div>
  );
};

export default QRScanner;
