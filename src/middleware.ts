import { NextResponse, type NextRequest } from 'next/server'

// Polyfill for libraries that expect 'self' to be defined (like some pdf or crypto libs)
if (typeof self === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.self = globalThis as any
}

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    // Proxy generation requests to Railway when configured (bypasses Vercel serverless timeout)
    const railwayUrl = process.env.RAILWAY_GENERATION_URL
    if (railwayUrl && request.nextUrl.pathname === '/api/generate/stream') {
        return NextResponse.rewrite(new URL(`${railwayUrl}/generate/stream`))
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api/webhooks (webhook routes need raw body for signature verification)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
