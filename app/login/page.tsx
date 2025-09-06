'use client'
import { useState } from 'react'
import { createClientComponentClient } from '../../src/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-xl p-8 w-full max-w-md border border-blue-200/40 backdrop-blur-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {resetMode ? 'Reset Password' : 'Welcome Back'}
          </h1>
          <p className="text-slate-600">
            {resetMode ? 'Enter your email to reset your password' : 'Sign in to your CMF Explorer account'}
          </p>
        </div>
        
        {resetSent ? (
          <div className="text-center">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-green-600 text-sm">
                Password reset email sent! Check your inbox and follow the link to reset your password.
              </p>
            </div>
            <button
              onClick={() => {setResetSent(false); setResetMode(false); setError('')}}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={resetMode ? handlePasswordReset : handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 backdrop-blur-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            
            {!resetMode && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 backdrop-blur-sm"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                resetMode ? 'Send Reset Email' : 'Sign In'
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {setResetMode(!resetMode); setError(''); setPassword('')}}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {resetMode ? 'Back to Sign In' : 'Forgot Password?'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}