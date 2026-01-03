// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ระบุ paths ที่ต้องการให้ middleware ทำงาน
const protectedPaths = [
  '/dashboard',
  '/condos',
  '/tenants',
  // เพิ่ม paths ที่ต้องการป้องกัน
]

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  // ข้าม middleware ถ้าไม่ใช่ protected path
  if (!isProtectedPath) {
    return NextResponse.next()
  }

  const token = request.cookies.get('tmp-auth-token')?.value
  const isPublicPath = ['/login', '/register'].includes(pathname)

  // Debug logging (สำหรับ development เท่านั้น)
  console.log(`[Middleware] Path: ${pathname}`, {
    token: !!token,
    isPublicPath,
    isProtectedPath
  })

  // กรณีไม่มี token และไม่ใช่ public path
  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.nextUrl.origin)
    loginUrl.searchParams.set('redirect', pathname)
    
    // ตรวจสอบว่าไม่ใช่ request สำหรับไฟล์ static
    if (!pathname.startsWith('/_next/')) {
      console.log(`[Middleware] Redirecting to login from ${pathname}`)
      return NextResponse.redirect(loginUrl)
    }
  }

  // กรณีมี token แต่พยายามเข้า public path
  if (token && isPublicPath) {
    const dashboardUrl = new URL('/dashboard', request.nextUrl.origin)
    console.log(`[Middleware] Redirecting to dashboard from ${pathname}`)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes
     * - static files
     * - image optimization files
     * - favicon
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}