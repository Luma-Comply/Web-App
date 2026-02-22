import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require full MFA verification (AAL2) when MFA is enrolled
const MFA_PROTECTED_PREFIXES = ['/dashboard', '/cases', '/settings']

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setAll(cookiesToSet: any) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    cookiesToSet.forEach(({ name, value, options: _options }: any) => {
                        request.cookies.set(name, value)
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    cookiesToSet.forEach(({ name, value, options }: any) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // MFA enforcement: if the user is authenticated and visiting a protected route,
    // check if they have MFA enrolled but haven't completed verification yet (AAL1).
    const pathname = request.nextUrl.pathname
    const isMFAProtected = MFA_PROTECTED_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
    )

    if (user && isMFAProtected) {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

        if (
            aalData &&
            aalData.currentLevel === 'aal1' &&
            aalData.nextLevel === 'aal2'
        ) {
            // User has MFA enrolled but hasn't verified yet — redirect to MFA verification
            const mfaUrl = new URL('/auth/mfa-verify', request.url)
            mfaUrl.searchParams.set('next', pathname)
            return NextResponse.redirect(mfaUrl)
        }
    }

    return response
}
