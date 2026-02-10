import React from 'react';

const ClubLoader = ({ message = "Loading..." }) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 40px',
      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)',
      borderRadius: '20px',
      border: '3px solid rgba(220, 38, 38, 0.4)',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
      position: 'relative',
      overflow: 'hidden',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {/* Animated background pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(220, 38, 38, 0.03) 10px, rgba(220, 38, 38, 0.03) 20px)',
        animation: 'slide-bg 20s linear infinite',
        pointerEvents: 'none'
      }} />

      {/* Mickey Mouse Silhouette */}
      <div style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        margin: '0 auto 30px',
        animation: 'float-mickey 3s ease-in-out infinite'
      }}>
        {/* Head */}
        <div style={{
          position: 'absolute',
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #1f2937 0%, #000 100%)',
          borderRadius: '50%',
          top: '40px',
          left: '20px',
          border: '4px solid #dc2626',
          boxShadow: '0 8px 30px rgba(220, 38, 38, 0.5), inset 0 -10px 20px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Eyes */}
          <div style={{
            position: 'absolute',
            top: '25px',
            left: '18px',
            width: '12px',
            height: '18px',
            background: 'white',
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            boxShadow: '24px 0 0 white'
          }} />
          {/* Nose */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '10px',
            height: '8px',
            background: '#dc2626',
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.8)'
          }} />
          {/* Smile */}
          <div style={{
            position: 'absolute',
            bottom: '15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '30px',
            height: '15px',
            borderBottom: '3px solid #dc2626',
            borderRadius: '0 0 50% 50%'
          }} />
        </div>
        
        {/* Left Ear */}
        <div style={{
          position: 'absolute',
          width: '50px',
          height: '50px',
          background: 'linear-gradient(135deg, #1f2937 0%, #000 100%)',
          borderRadius: '50%',
          top: '0',
          left: '0',
          border: '4px solid #dc2626',
          boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)',
          animation: 'wiggle-ear-left 2s ease-in-out infinite'
        }} />
        
        {/* Right Ear */}
        <div style={{
          position: 'absolute',
          width: '50px',
          height: '50px',
          background: 'linear-gradient(135deg, #1f2937 0%, #000 100%)',
          borderRadius: '50%',
          top: '0',
          right: '0',
          border: '4px solid #dc2626',
          boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)',
          animation: 'wiggle-ear-right 2s ease-in-out infinite'
        }} />
      </div>

      {/* Loading Spinner Ring */}
      <div style={{
        width: '80px',
        height: '80px',
        margin: '0 auto 30px',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          border: '5px solid rgba(220, 38, 38, 0.2)',
          borderTopColor: '#dc2626',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          border: '5px solid transparent',
          borderBottomColor: '#fbbf24',
          borderRadius: '50%',
          animation: 'spin 1.5s linear infinite reverse'
        }} />
        {/* Center Icon */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '30px',
          animation: 'pulse-icon 1.5s ease-in-out infinite'
        }}>
          ⭐
        </div>
      </div>

      {/* Message */}
      <h2 style={{
        marginBottom: '20px',
        color: 'white',
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: '3px',
        textShadow: '0 3px 15px rgba(220, 38, 38, 0.6)',
        fontSize: '22px',
        position: 'relative',
        zIndex: 1
      }}>
        {message}
      </h2>

      {/* Progress Dots */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              width: '12px',
              height: '12px',
              background: '#dc2626',
              borderRadius: '50%',
              animation: `bounce-dot 1.4s ease-in-out ${index * 0.2}s infinite`,
              boxShadow: '0 0 15px rgba(220, 38, 38, 0.8)'
            }}
          />
        ))}
      </div>

      {/* Loading Text */}
      <div style={{
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '13px',
        fontWeight: '700',
        letterSpacing: '2px',
        animation: 'pulse-text 2s ease-in-out infinite',
        position: 'relative',
        zIndex: 1
      }}>
        PLEASE WAIT...
      </div>

      {/* Decorative Elements */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        fontSize: '20px',
        opacity: 0.3,
        animation: 'twinkle 2s ease-in-out infinite'
      }}>
        ✨
      </div>
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        fontSize: '20px',
        opacity: 0.3,
        animation: 'twinkle 2s ease-in-out 1s infinite'
      }}>
        ✨
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse-text {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @keyframes pulse-icon {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1);
            filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.8));
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.2);
            filter: drop-shadow(0 0 15px rgba(251, 191, 36, 1));
          }
        }

        @keyframes bounce-dot {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes float-mickey {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes wiggle-ear-left {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(-5deg);
          }
        }

        @keyframes wiggle-ear-right {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(5deg);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.3);
          }
        }

        @keyframes slide-bg {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(20px);
          }
        }
      `}</style>
    </div>
  );
};

export default ClubLoader;
