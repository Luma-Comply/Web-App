"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { forgotPassword } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { LumaLogo } from "@/components/LumaLogo"

function ForgotPasswordForm() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')
    const success = searchParams.get('success')
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        await forgotPassword(formData)
        setIsLoading(false)
    }

    return (
        <div className="flex min-h-screen bg-light-gray">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <Link href="/" className="inline-flex items-center gap-2 mb-8">
                    <LumaLogo className="w-10 h-10" />
                    <span className="text-2xl font-serif font-bold text-dark-bg">Luma</span>
                </Link>

                <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
                    <div className="w-full max-w-md">
                        <div className="glass-card rounded-2xl p-8 md:p-10 border border-sage-medium/50 shadow-xl">
                            <div className="mb-6">
                                <div className="w-16 h-16 rounded-full bg-mint/10 flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-8 h-8 text-mint" />
                                </div>
                                <h1 className="text-3xl font-sans font-semibold text-dark-bg mb-2 text-center">
                                    Reset password
                                </h1>
                                <p className="text-gray-600 text-center">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-green-800">{success}</p>
                                </div>
                            )}

                            <form action={handleSubmit} className="space-y-5">
                                <div>
                                    <Label htmlFor="email" className="text-dark-bg font-medium">
                                        Email address
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className={`mt-2 h-11 ${error ? 'border-red-300 focus:border-red-500' : ''}`}
                                        placeholder="your@email.com"
                                    />
                                </div>

                                <Button
                                    disabled={isLoading}
                                    className="w-full h-11 text-base"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        "Send reset link"
                                    )}
                                </Button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-dark-bg transition-colors font-medium"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to sign in
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-light-gray">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <ForgotPasswordForm />
        </Suspense>
    )
}
