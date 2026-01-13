import Link from "next/link";
import { login } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white selection:bg-mint selection:text-black relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-mint/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

            <div className="z-10 w-full max-w-md space-y-8 rounded-lg border border-white/10 bg-black/50 p-8 shadow-2xl backdrop-blur-xl animate-fade-in-up">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white">
                        Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Sign in to your account
                    </p>
                </div>

                <form className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="mt-1 bg-white/5 border-white/10 text-white focus:border-mint focus:ring-mint"
                                placeholder="name@example.com"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <div className="text-xs">
                                    <Link href="#" className="font-medium text-mint hover:text-mint/80">
                                        Forgot your password?
                                    </Link>
                                </div>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="mt-1 bg-white/5 border-white/10 text-white focus:border-mint focus:ring-mint"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div>
                        <Button formAction={login} className="w-full bg-mint text-black hover:bg-mint/90 font-semibold">
                            Sign in
                        </Button>
                    </div>
                </form>

                <div className="mt-6 text-center text-sm">
                    <p className="text-gray-400">
                        Don't have an account?{" "}
                        <Link href="/signup" className="font-medium text-mint hover:text-mint/80">
                            Sign up for free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
