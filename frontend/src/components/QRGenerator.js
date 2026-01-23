import React from "react";
import QRCode from "qrcode.react";

/**
 * QRGenerator
 * Encodes authenticated user identity
 *
 * Payload format:
 * {
 *   type: "visitor" | "stall" | "admin",
 *   user_id: UUID,
 *   username: string,
 *   issued_at: timestamp
 * }
 */
const QRGenerator = ({ userId, username, type = "visitor", title }) => {
  // Responsive QR size
  const getQRSize = () => {
    if (typeof window === 'undefined') return 220;
    if (window.innerWidth < 480) return 180;
    if (window.innerWidth < 768) return 200;
    return 220;
  };

  const [qrSize, setQrSize] = React.useState(getQRSize());

  React.useEffect(() => {
    const handleResize = () => setQrSize(getQRSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Guard: QR must NEVER render without user_id
  if (!userId) {
    console.error("QRGenerator: userId missing");
    return <p className="error">QR not available</p>;
  }

  // QR payload (JSON string)
  const payload = JSON.stringify({
    type,
    user_id: userId,
    wallet_id: userId, // For backward compatibility
    username,
    issued_at: Date.now(), // helps prevent replay
  });

  return (
    <div className="qr-container">
      <QRCode
        value={payload}
        size={qrSize}
        bgColor="#ffffff"
        fgColor="#000000"
        level="H"
        includeMargin
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {title && (
        <p className="mt-sm" style={{ fontWeight: 600, fontSize: '14px' }}>
          {title}
        </p>
      )}
    </div>
  );
};

export default QRGenerator;
