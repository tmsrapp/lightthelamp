import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Alternative function for API routes that need to handle cookies differently
export function createClientForAPI(request: Request) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
    {
      cookies: {
        getAll() {
          // Extract cookies from the request headers
          const cookieHeader = request.headers.get('cookie')
          if (!cookieHeader) return []
          
          return cookieHeader.split(';').map(cookie => {
            const trimmedCookie = cookie.trim()
            const equalIndex = trimmedCookie.indexOf('=')
            if (equalIndex === -1) return { name: trimmedCookie, value: '' }
            
            const name = trimmedCookie.substring(0, equalIndex)
            const value = trimmedCookie.substring(equalIndex + 1)
            return { name, value }
          })
        },
        setAll(cookiesToSet) {
          // For API routes, we can't set cookies in the response
          // This is handled by the client-side
        },
      },
    }
  )
}
