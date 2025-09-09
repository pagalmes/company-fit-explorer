'use client'
import { createClientComponentClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface AuthWrapperProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function AuthWrapper({ 
  children,
  requireAdmin = false 
}: AuthWrapperProps) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [_userRole, setUserRole] = useState<string | null>(null)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClientComponentClient()
    if (!supabase) {
      // If no Supabase client available (e.g., during build), redirect to login
      router.push('/login')
      return
    }
    
    const checkUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('Auth error:', userError)
          setShouldRedirect(true)
          router.push('/login')
          return
        }
        
        if (!user) {
          setShouldRedirect(true)
          router.push('/login')
          return
        }

        // Get user role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Profile error:', profileError)
          // If we can't get profile but user is authenticated, 
          // assume default role and continue (don't redirect to login)
          if (requireAdmin) {
            console.log('Profile error but requireAdmin=true, redirecting to home')
            router.push('/')
            return
          }
          // For non-admin pages, continue with default user role
        }

        const userRole = profile?.role || 'user'
        console.log('User:', user.email, 'Role:', userRole, 'Require Admin:', requireAdmin)

        if (requireAdmin && userRole !== 'admin') {
          console.log('Redirecting non-admin user from admin page')
          router.push('/')
          return
        }

        setUser(user)
        setUserRole(profile?.role || 'user')
        setLoading(false)
      } catch (error) {
        console.error('AuthWrapper error:', error)
        setShouldRedirect(true)
        router.push('/login')
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, _session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, requireAdmin])

  // Show loading until auth is verified OR we're redirecting
  if (loading || shouldRedirect) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">
            {shouldRedirect ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Only render children if we have a confirmed authenticated user
  return user ? <>{children}</> : null
}