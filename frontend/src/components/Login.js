import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const { login, loginWithGoogle } = useAuth();

  // Fix: Wrap handler in useCallback to prevent unnecessary re-renders
  const handleGoogleResponse = useCallback(async (response) => {
    setLoading(true);
    setError('');
    setGoogleError('');
    
    const result = await loginWithGoogle(response.credential);

    if (!result.success) {
      setGoogleError(result.error);
    }
    setLoading(false);
  }, [loginWithGoogle]);

  // Initialize Google Sign-In
  useEffect(() => {
    // eslint-disable-next-line no-undef
    if (window.google) {
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      
      // eslint-disable-next-line no-undef
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
        ux_mode: "popup",
        timeout: 210000,
      });

      // eslint-disable-next-line no-undef
      google.accounts.id.renderButton(
        document.getElementById("googleSignInBtn"),
        { 
          theme: "outline", 
          size: "large", 
          width: 350,
          text: "signin_with",
          shape: "rectangular",
          type: "standard",
          prompt_parent_id: "googleSignInBtn"
        }
      );

      // eslint-disable-next-line no-undef
      google.accounts.id.cancel();
      
      const buttonContainer = document.getElementById("googleSignInBtn");
      if (buttonContainer) {
        buttonContainer.addEventListener('click', () => {
          // eslint-disable-next-line no-undef
          google.accounts.id.disableAutoSelect();
        });
      }
    }
  }, [handleGoogleResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setGoogleError('');
    const result = await login(username, password);
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  const handleTryAgain = () => {
    setGoogleError('');
  };
  
  return (
    <div className="container">
      {/* Mickey and Friends welcoming */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
        animation: 'bounce 2s ease-in-out infinite'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '10px' }}>
          🏰
        </div>
        <div style={{
          fontSize: '14px',
          color: 'white',
          fontWeight: '700',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
          background: 'rgba(220, 38, 38, 0.2)',
          padding: '8px 16px',
          borderRadius: '20px',
          display: 'inline-block',
          border: '2px solid rgba(220, 38, 38, 0.4)'
        }}>
          🎵 Welcome to the Clubhouse! 🎵
        </div>
      </div>

      <div className="card club-pattern" style={{ maxWidth: '450px', margin: '40px auto', position: 'relative' }}>
        {/* Character decorations */}
        <div style={{
          position: 'absolute',
          top: '-25px',
          left: '20px',
          fontSize: '40px',
          animation: 'wave-hand 2s ease-in-out infinite',
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
        }}>
          👋
        </div>
        <div style={{
          position: 'absolute',
          top: '-25px',
          right: '20px',
          fontSize: '40px',
          animation: 'wave-hand 2s ease-in-out 0.5s infinite',
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
        }}>
          🎀
        </div>

        <div className="text-center mb-lg">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#dc2626',
              transform: 'rotate(45deg)',
              boxShadow: '0 0 20px rgba(220, 38, 38, 0.8)'
            }}></div>
            <div style={{ 
              fontSize: '48px', 
              fontWeight: '900',
              color: '#1f2937',
              textTransform: 'uppercase',
              letterSpacing: '4px',
              position: 'relative'
            }}>
              POINT
              <span style={{
                color: '#dc2626',
                textShadow: '0 0 20px rgba(220, 38, 38, 0.5)'
              }}>X</span>
            </div>
            <div style={{
              width: '12px',
              height: '12px',
              background: '#dc2626',
              transform: 'rotate(45deg)',
              boxShadow: '0 0 20px rgba(220, 38, 38, 0.8)'
            }}></div>
          </div>
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
            color: 'white',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            border: '1px solid rgba(220, 38, 38, 0.5)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            marginBottom: '16px'
          }}>
            EXCLUSIVE CLUB ACCESS
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '14px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          <button
            type="submit"
            className="btn btn-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Google Auth Error Section */}
        {googleError && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ 
                fontSize: '20px',
                flexShrink: 0,
                marginTop: '2px'
              }}>⚠️</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#991b1b'
                }}>
                  Authentication Failed
                </h3>
                <p style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '14px',
                  color: '#7f1d1d',
                  lineHeight: '1.5'
                }}>
                  {googleError}
                </p>
                <div style={{
                  fontSize: '13px',
                  color: '#7f1d1d',
                  marginBottom: '12px',
                  lineHeight: '1.6'
                }}>
                  <strong>Need help?</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Try signing in with username and password</li>
                    <li>Contact your administrator for assistance</li>
                  </ul>
                </div>
                <button
                  onClick={handleTryAgain}
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Divider and Google Button */}
        <div className="luxury-divider" style={{ margin: '24px 0' }}></div>
        
        <div id="googleSignInBtn" style={{ width: '100%' }}></div>
        
        {/* Help text for account switching */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '12px', 
          fontSize: '12px', 
          color: '#6b7280' 
        }}>
          <p style={{ margin: '4px 0' }}>
            Not seeing all your accounts?
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Quick fix:</strong> Open this page in an <strong>incognito/private window</strong>
          </p>
          <p style={{ margin: '4px 0', fontSize: '11px' }}>
            Or clear cookies for accounts.google.com
          </p>
        </div>

        {/* Hot Dog Dance footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          padding: '12px',
          background: 'rgba(251, 191, 36, 0.1)',
          borderRadius: '8px',
          border: '2px dashed rgba(251, 191, 36, 0.3)'
        }}>
          <div style={{
            fontSize: '24px',
            marginBottom: '8px',
            animation: 'dance 1s ease-in-out infinite'
          }}>
            🌭
          </div>
          <div style={{
            fontSize: '11px',
            color: '#92400e',
            fontWeight: '700',
            letterSpacing: '1px'
          }}>
            HOT DOG! LET'S GET STARTED!
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dance {
          0%, 100% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(-10deg) scale(1.1);
          }
          75% {
            transform: rotate(10deg) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
