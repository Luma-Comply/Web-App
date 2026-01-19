"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { updatePassword } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"
import MedicalGrid from "@/components/MedicalGrid"
import { LumaLogo } from "@/components/LumaLogo"

function UpdatePasswordForm() {
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const [hasMinLength, setHasMinLength] = useState(false)
    const [hasUpperCase, setHasUpperCase] = useState(false)
    const [hasNumber, setHasNumber] = useState(false)
    const [hasSpecialChar, setHasSpecialChar] = useState(false)
    const [passwordsMatch, setPasswordsMatch] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const searchParams = useSearchParams()
    const error = searchParams.get('error')

    // Real-time validation effect
    useEffect(() => {
        setHasMinLength(newPassword.length >= 8)
        setHasUpperCase(/[A-Z]/.test(newPassword))
        setHasNumber(/[0-9]/.test(newPassword))
        setHasSpecialChar(/[!@#$%^&*(),.?":{}|<>]/.test(newPassword))
        setPasswordsMatch(newPassword === confirmPassword && newPassword !== "")
    }, [newPassword, confirmPassword])

    const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar && passwordsMatch

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        await updatePassword(formData)
        setIsLoading(false)
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-b from-light-gray to-white relative overflow-hidden">
            <MedicalGrid intensity="light" />

            <div className="container mx-auto px-4 py-8 relative z-10">
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
                                    <Lock className="w-8 h-8 text-mint" />
                                </div>
                                <h1 className="text-3xl font-serif text-dark-bg mb-2 text-center">
                                    Set new password
                                </h1>
                                <p className="text-gray-600 text-center">
                                    Please enter your new password below.
                                </p>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}

                            <form action={handleSubmit} className="space-y-5">
                                <div>
                                    <Label htmlFor="password" className="text-dark-bg font-medium">
                                        New Password
                                    </Label>
                                    <div className="relative mt-2">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            required
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className={`h-11 pr-10 ${error ? 'border-red-300 focus:border-red-500' : ''}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="confirmPassword" className="text-dark-bg font-medium">
                                        Confirm Password
                                    </Label>
                                    <div className="relative mt-2">
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            required
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`h-11 pr-10 ${confirmPassword && !passwordsMatch ? 'border-red-300 focus:border-red-500' : ''}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Validation Checklist */}
                                <div className="space-y-2 pt-2 text-sm">
                                    <p className="font-medium text-gray-700">Password requirements:</p>
                                    <ul className="space-y-1 text-xs sm:text-sm">
                                        <li className={`flex items-center gap-2 ${hasMinLength ? "text-green-600" : "text-gray-500"}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? "bg-green-600" : "bg-gray-300"}`} />
                                            At least 8 characters
                                        </li>
                                        <li className={`flex items-center gap-2 ${hasUpperCase ? "text-green-600" : "text-gray-500"}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${hasUpperCase ? "bg-green-600" : "bg-gray-300"}`} />
                                            At least one uppercase letter (A-Z)
                                        </li>
                                        <li className={`flex items-center gap-2 ${hasNumber ? "text-green-600" : "text-gray-500"}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${hasNumber ? "bg-green-600" : "bg-gray-300"}`} />
                                            At least one number (0-9)
                                        </li>
                                        <li className={`flex items-center gap-2 ${hasSpecialChar ? "text-green-600" : "text-gray-500"}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${hasSpecialChar ? "bg-green-600" : "bg-gray-300"}`} />
                                            At least one special character (!@#$...)
                                        </li>
                                        <li className={`flex items-center gap-2 ${passwordsMatch ? "text-green-600" : "text-gray-500"}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? "bg-green-600" : "bg-gray-300"}`} />
                                            Passwords match
                                        </li>
                                    </ul>
                                </div>

                                <Button
                                    disabled={!isPasswordValid || isLoading}
                                    className="w-full h-11 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        "Update password"
                                    )}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function UpdatePasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-light-gray to-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <UpdatePasswordForm />
        </Suspense>
    )
}
