import React from 'react'

interface LoginScreenProps {
  onLogin: () => void
  loading: boolean
  error: string | null
}

const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10, flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

export default function LoginScreen({ onLogin, loading, error }: LoginScreenProps) {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 36px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        minWidth: 300,
      }}>
        <div style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '-0.5px',
          marginBottom: 6,
        }}>
          LetMe
        </div>
        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.45)',
          marginBottom: 32,
        }}>
          Your AI Interview Copilot
        </div>

        <button
          onClick={onLogin}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 24px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'background 0.15s',
            width: '100%',
          }}
          onMouseEnter={(e) => {
            if (!loading) (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')
          }}
          onMouseLeave={(e) => {
            if (!loading) (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: 16,
                height: 16,
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginRight: 10,
              }} />
              Opening browser…
            </>
          ) : (
            <>
              <GoogleIcon />
              Sign in with Google
            </>
          )}
        </button>

        {error && (
          <div style={{
            marginTop: 16,
            fontSize: 12,
            color: '#ef4444',
            textAlign: 'center',
            lineHeight: 1.4,
          }}>
            {error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
