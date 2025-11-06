import { createServerComponentClient } from '../src/lib/supabase'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import App from '../src/App'

export default async function HomePage() {
  const cookieStore = await cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  if (!supabase) {
    redirect('/login')
  }

  // Middleware has already refreshed the session, so this should be clean
  const { data: { user } } = await supabase.auth.getUser()

  // If no user, redirect (this is expected for logged-out users)
  if (!user) {
    redirect('/login')
  }

  // Only render the app if user is authenticated
  return <App />
}