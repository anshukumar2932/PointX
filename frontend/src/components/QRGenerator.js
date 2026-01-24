import React from "react";
import QRCode from "qrcode.react";

/**
 * QRGenerator
 * Encodes authenticated user identity with proper wallet ID
 *
 * Payload formats:
 * 
 * Visitor/Stall:
 * {
 *   type: "visitor" | "stall" | "admin",
 *   wallet_id: UUID (actual wallets.id),
 *   username: string,
 *   issued_at: timestamp
 * }
 * 
 * Attendance:
 * {
 *   user_id: UUID,
 *   reg_no: string (username used as registration number)
 * }
 */
const QRGenerator = ({ walletId, userId, username, type = "visitor", title }) => {
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

  // Guard: QR must NEVER render without wallet_id (for visitors) or user_id (for stalls/admins)
  const requiredId = walletId || userId;
  if (!requiredId) {
    return <p className="error">QR not available</p>;
  }

  // QR payload (JSON string) - different formats for different types
  let payload;
  
  if (type === "attendance") {
    // Attendance QR format expected by admin system
    // username is treated as reg_no for attendance
    payload = JSON.stringify({
      user_id: requiredId,
      reg_no: username, // username = reg_no for attendance
    });
  } else {
    // Standard wallet/visitor QR format
    payload = JSON.stringify({
      type,
      wallet_id: walletId || userId, // Use actual wallet_id for visitors
      username,
      issued_at: Date.now(), // helps prevent replay
    });
  }

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
