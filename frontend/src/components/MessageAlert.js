import React from 'react';

/**
 * Enhanced Message Alert Component
 * Displays messages with different types: success, error, warning, info, loading
 */
const MessageAlert = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'loading':
        return '⏳';
      default:
        return 'ℹ';
    }
  };

  const getStyles = () => {
    const baseStyles = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '16px',
      border: '1px solid',
      fontSize: '14px',
      lineHeight: '1.5',
      animation: 'slideIn 0.3s ease-out',
    };

    const typeStyles = {
      success: {
        backgroundColor: '#f0fdf4',
        borderColor: '#86efac',
        color: '#166534',
      },
      error: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        color: '#991b1b',
      },
      warning: {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
        color: '#92400e',
      },
      info: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
        color: '#1e40af',
      },
      loading: {
        backgroundColor: '#f0f9ff',
        borderColor: '#bae6fd',
        color: '#075985',
      },
    };

    return { ...baseStyles, ...typeStyles[type] };
  };

  return (
    <div style={getStyles()}>
      <div style={{ 
        fontSize: '20px',
        flexShrink: 0,
        marginTop: '2px',
        fontWeight: 'bold'
      }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '500' }}>
          {message}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0 4px',
            color: 'inherit',
            opacity: 0.6,
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => e.target.style.opacity = '1'}
          onMouseOut={(e) => e.target.style.opacity = '0.6'}
          aria-label="Close message"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default MessageAlert;
