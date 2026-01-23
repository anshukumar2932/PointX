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
  // Guard: QR must NEVER render without user_id
  if (!userId) {
    console.error("QRGenerator: userId missing");
    return <p className="error">QR not available</p>;
  }

  // QR payload (JSON string)
  const payload = JSON.stringify({
    type,
    user_id: userId,
    username,
    issued_at: Date.now(), // helps prevent replay
  });

  return (
    <div style={{ textAlign: "center" }}>
      <QRCode
        value={payload}
        size={220}
        bgColor="#ffffff"
        fgColor="#000000"
        level="H"
        includeMargin
      />

      {title && (
        <p style={{ marginTop: 12, fontWeight: 600 }}>
          {title}
        </p>
      )}
    </div>
  );
};

export default QRGenerator;
