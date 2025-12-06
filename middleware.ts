import { auth } from "@/auth"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnDashboard = req.nextUrl.pathname !== "/auth/signin"

    if (isOnDashboard && !isLoggedIn) {
        return Response.redirect(new URL("/auth/signin", req.nextUrl))
    }
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth|shared).*)"],
}
