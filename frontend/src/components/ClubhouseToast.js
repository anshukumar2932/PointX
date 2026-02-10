import React, { useEffect, useState } from 'react';

const ClubhouseToast = ({ message, type = 'success', onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getCharacter = () => {
    switch (type) {
      case 'success':
        return { emoji: '🎉', text: 'Hot Dog! Hot Dog!', color: '#10b981' };
      case 'error':
        return { emoji: '😮', text: 'Oh Toodles!', color: '#dc2626' };
      case 'warning':
        return { emoji: '⚠️', text: 'Uh-oh!', color: '#f59e0b' };
      default:
        return { emoji: '🎵', text: 'Meeska Mooska!', color: '#3b82f6' };
    }
  };

  const character = getCharacter();

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: isVisible ? '20px' : '-400px',
        zIndex: 10000,
        background: 'white',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
        border: `3px solid ${character.color}`,
        maxWidth: '350px',
        transition: 'right 0.3s ease-out',
        animation: isVisible ? 'slide-bounce 0.5s ease-out' : 'none'
      }}
    >
      {/* Character decoration */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        left: '20px',
        fontSize: '40px',
        animation: 'bounce-character 1s ease-in-out infinite',
        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
      }}>
        {character.emoji}
      </div>

      {/* Content */}
      <div style={{ marginTop: '10px' }}>
        <div style={{
          fontSize: '16px',
          fontWeight: '900',
          color: character.color,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          {character.text}
        </div>
        <div style={{
          fontSize: '14px',
          color: '#1f2937',
          fontWeight: '600',
          lineHeight: '1.5'
        }}>
          {message}
        </div>
      </div>

      {/* Mickey ears decoration */}
      <div style={{
        position: 'absolute',
        bottom: '-15px',
        right: '20px',
        display: 'flex',
        gap: '20px'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          background: '#000',
          borderRadius: '50%',
          border: '2px solid ' + character.color
        }} />
        <div style={{
          width: '20px',
          height: '20px',
          background: '#000',
          borderRadius: '50%',
          border: '2px solid ' + character.color
        }} />
      </div>

      {/* Close button */}
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'transparent',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          color: '#6b7280',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.1)'}
        onMouseLeave={(e) => e.target.style.background = 'transparent'}
      >
        ×
      </button>

      <style>{`
        @keyframes slide-bounce {
          0% {
            right: -400px;
          }
          60% {
            right: 30px;
          }
          80% {
            right: 15px;
          }
          100% {
            right: 20px;
          }
        }

        @keyframes bounce-character {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-5px) rotate(10deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ClubhouseToast;
