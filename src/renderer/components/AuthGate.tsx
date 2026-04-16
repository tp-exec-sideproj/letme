import React, { useState, useEffect, useCallback } from 'react'
import LoginScreen from './LoginScreen'

interface AuthUser {
  email: string
  name: string
  picture?: string
}

interface AuthGateProps {
  children: React.ReactNode
}

export default function AuthGate({ children }: AuthGateProps) {
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    window.api.auth.getSession()
      .then((session) => {
        setUser(session)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setChecking(false)
      })
  }, [])

  useEffect(() => {
    const cleanup = window.api.auth.onSignedOut(() => {
      setUser(null)
    })
    return cleanup
  }, [])

  const handleLogin = useCallback(async () => {
    setLoginLoading(true)
    setLoginError(null)
    try {
      const result = await window.api.auth.login()
      setUser(result)
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }, [])

  if (checking) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
      }}>
        <div style={{
          width: 24,
          height: 24,
          border: '2px solid rgba(255,255,255,0.15)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!user) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        loading={loginLoading}
        error={loginError}
      />
    )
  }

  return <>{children}</>
}
