import { createServerComponentClient } from '../src/lib/supabase'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import App from '../src/App'

export default async function HomePage() {
  // Server-side authentication check
  try {
    const cookieStore = await cookies()
    const supabase = createServerComponentClient({ cookies: () => cookieStore })
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // If no user or auth error, redirect immediately (no client-side loading)
    if (!user || error) {
      console.log('🚨 SECURITY: Server-side auth check failed, redirecting to login')
      redirect('/login')
    }
    
    console.log('🔐 SECURITY: Server-side auth passed for user:', user.email)
    
    // Only render the app if user is authenticated
    return <App />
  } catch (error) {
    console.error('🚨 SECURITY: Server auth error:', error)
    redirect('/login')
  }
}