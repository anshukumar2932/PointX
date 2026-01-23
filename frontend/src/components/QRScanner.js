import React, { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

const QRScanner = ({ onScan, isActive, onError }) => {
  const scannerRef = useRef(null);
  const startedRef = useRef(false);

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
      (text) => {
        console.log("QR Code scanned:", text);
        try {
          const data = JSON.parse(text);
          console.log("Parsed QR data:", data);
          
          // Validate the QR data structure
          if (!data || typeof data !== 'object') {
            throw new Error("Invalid QR data structure");
          }
          
          onScan(data);
        } catch (parseError) {
          console.error("QR Parse Error:", parseError);
          onError?.({ 
            message: "Invalid QR format. Please ensure you're scanning a valid arcade wallet QR code.",
            details: parseError.message 
          });
        }
      },
      (err) => {
        // Filter out common non-error messages
        if (err.includes("NotFound") || 
            err.includes("No MultiFormat Readers") ||
            err.includes("NotFoundException")) {
          return; // These are normal scanning states, not errors
        }
        
        console.warn("QR Scanner Error:", err);
        
        // Only report actual errors to the user
        if (err.includes("NotAllowedError")) {
          onError?.({ message: "Camera permission denied. Please allow camera access." });
        } else if (err.includes("NotReadableError")) {
          onError?.({ message: "Camera is not accessible. Please check if another app is using it." });
        }
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      startedRef.current = false;
    };
  }, [isActive, onScan, onError]);

  return (
    <div className="scanner-container">
      <div id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }} />
    </div>
  );
};

export default QRScanner;
