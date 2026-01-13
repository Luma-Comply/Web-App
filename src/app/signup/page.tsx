import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

export default function SignupPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-white text-dark-bg selection:bg-mint selection:text-white relative overflow-hidden">
            {/* Background Gradients (Subtle Light Mode) */}
            <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-mint/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

            <div className="z-10 w-full max-w-md space-y-8 rounded-lg border border-sage-medium bg-white/80 p-8 shadow-xl backdrop-blur-xl animate-fade-in-up">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-8 w-8 text-mint" />
                            <span className="text-2xl font-bold text-dark-bg">Luma</span>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        Create an account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Get started with Luma today
                    </p>
                </div>

                <form className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="email" className="text-gray-700">Email address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="mt-1 bg-white border-gray-300 text-gray-900 focus:border-mint focus:ring-mint placeholder:text-gray-400"
                                placeholder="name@example.com"
                            />
                        </div>
                        <div>
                            <Label htmlFor="password" className="text-gray-700">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="mt-1 bg-white border-gray-300 text-gray-900 focus:border-mint focus:ring-mint placeholder:text-gray-400"
                                placeholder="Create a password"
                            />
                        </div>
                    </div>

                    <div>
                        <Button formAction={signup} className="w-full bg-mint text-white hover:bg-mint/90 font-semibold">
                            Sign up
                        </Button>
                    </div>
                </form>

                <div className="mt-6 text-center text-sm">
                    <p className="text-gray-600">
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium text-mint hover:text-mint/80">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
