import React, { useState } from 'react';

const ToodlesHelper = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
    setShowMessage(true);
    
    // Play a fun sound effect (optional)
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6OyrWBQLSKHe8sFuJAUuhM/z1YU4CBZiuOvpo1QSC0yl4fG5ZRwFNo3V7859KQUofszw2o87ChJcsejtq1gVC0ih3vLBbiQFL4TP89WFOAgWYrjr6aNUEgtMpeHxuWUcBTaN1e/OfSkFKH7M8NqPOwoSXLHo7atYFQtIod7ywW4kBS+Ez/PVhTgIFmK46+mjVBILTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6O2rWBULSKHe8sFuJAUvhM/z1YU4CBZiuOvpo1QSC0yl4fG5ZRwFNo3V7859KQUofszw2o87ChJcsejtq1gVC0ih3vLBbiQFL4TP89WFOAgWYrjr6aNUEgtMpeHxuWUcBTaN1e/OfSkFKH7M8NqPOwoSXLHo7atYFQtIod7ywW4kBS+Ez/PVhTgIFmK46+mjVBILTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6O2rWBULSKHe8sFuJAUvhM/z1YU4CBZiuOvpo1QSC0yl4fG5ZRwFNo3V7859KQUofszw2o87ChJcsejtq1gVC0ih3vLBbiQFL4TP89WFOAgWYrjr6aNUEgtMpeHxuWUcBTaN1e/OfSkFKH7M8NqPOwoSXLHo7atYFQtIod7ywW4kBS+Ez/PVhTgIFmK46+mjVBILTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6O2rWBULSKHe8sFuJAUvhM/z1YU4CBZiuOvpo1QSC0yl4fG5ZRwFNo3V7859KQUofszw2o87ChJcsejtq1gVC0ih3vLBbiQFL4TP89WFOAgWYrjr6aNUEgtMpeHxuWUcBTaN1e/OfSkFKH7M8NqPOwoSXLHo7atYFQtIod7ywW4kBS+Ez/PVhTgIFmK46+mjVBILTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6O2rWBULSKHe8sFuJAUvhM/z1YU4CBZiuOvpo1QSC0yl4fG5ZRwFNo3V7859KQUofszw2o87ChJcsejtq1gVC0ih3vLBbiQFL4TP89WFOAgWYrjr6aNUEgtMpeHxuWUcBTaN1e/OfSkFKH7M8NqPOwoSXLHo7atYFQtIod7ywW4kBS+Ez/PVhTgIFmK46+mjVBILTKXh8bllHAU2jdXvzn0pBSh+zPDajzsKElyx6O2rWBULSKHe8sFuJAUvhM/z1YU4CBZiuOvpo1QSC0yl4fG5ZRwFNo3V7859KQUofszw');
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Ignore if audio fails
    
    setTimeout(() => setShowMessage(false), 3000);
  };

  const tools = [
    { icon: '🔧', name: 'Mystery Mouseketool', tip: 'A surprise tool that will help us later!' },
    { icon: '🎨', name: 'Paint Brush', tip: 'For creative solutions!' },
    { icon: '🔨', name: 'Handy Hammer', tip: 'To fix things!' },
    { icon: '🎪', name: 'Magic Wand', tip: 'For special moments!' }
  ];

  return (
    <>
      {/* Toodles Button */}
      <div
        className="toodles-helper"
        onClick={handleClick}
        title="Oh Toodles! Click for help!"
      >
        🛠️
      </div>

      {/* Toodles Message */}
      {showMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          padding: '24px',
          borderRadius: '20px',
          border: '4px solid white',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
          zIndex: 10000,
          animation: 'toodles-appear 0.5s ease-out',
          maxWidth: '90%',
          width: '400px'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#1f2937',
            fontWeight: '900',
            fontSize: '24px',
            marginBottom: '16px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}>
            🎵 OH TOODLES! 🎵
          </div>
          
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#4b5563',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              Here are your Mousketools:
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              {tools.map((tool, index) => (
                <div
                  key={index}
                  style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '2px solid #f59e0b',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  title={tool.tip}
                >
                  <div style={{ fontSize: '32px', marginBottom: '4px' }}>
                    {tool.icon}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#92400e',
                    fontWeight: '700'
                  }}>
                    {tool.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#1f2937',
            fontWeight: '600',
            fontStyle: 'italic'
          }}>
            "We've got ears, say cheers!" 🎉
          </div>

          <button
            onClick={() => setShowMessage(false)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              cursor: 'pointer',
              fontWeight: '900',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Overlay */}
      {showMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            animation: 'fade-in 0.3s ease-out'
          }}
          onClick={() => setShowMessage(false)}
        />
      )}

      <style>{`
        @keyframes toodles-appear {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(-180deg);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default ToodlesHelper;
