import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Lock, Eye, EyeOff, Pill } from "lucide-react"

const formSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

type FormData = z.infer<typeof formSchema>

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(values: FormData) {
        setLoading(true);
        setError(null);

        const { error: authError } = await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
        })

        setLoading(false);

        if (authError) {
            setError(authError.message);
            return;
        }

        localStorage.removeItem('user_role');
        navigate("/");
    }

    return (
        <div className="flex min-h-screen w-full overflow-hidden bg-white">
            <div
                className="hidden lg:block w-1/2 relative bg-cover bg-center overflow-hidden"
                style={{
                    backgroundImage: `url('/img1.png')`,
                }}
            >
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />

                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <div className="flex items-center justify-center gap-3 drop-shadow-2xl scale-150">
                        <div className="h-12 w-12 bg-[#2563eb] rounded-none flex items-center justify-center shadow-2xl">
                            <div className="relative rotate-45 transform">
                                <Pill className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <div className=" font-sans">
                            <span className="text-3xl font-black text-white tracking-tighter leading-none">Pill </span>
                            <span className="text-3xl font-black text-[#10b981] tracking-tighter leading-none">Time</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 bg-[#fcfdfe] relative">
                <div className="w-full max-w-[450px] animate-fade-in z-10">
                    {/* Mobile Branding (Visible only on small screens) */}
                    <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
                        <div className="h-12 w-12 bg-[#2563eb] rounded-none flex items-center justify-center">
                            <div className="relative rotate-45 transform">
                                <Pill className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <div className="font-sans">
                            <span className="text-3xl font-black text-slate-800 tracking-tighter leading-none">Pill </span>
                            <span className="text-3xl font-black text-[#10b981] tracking-tighter leading-none">Time</span>
                        </div>
                    </div>

                    {/* Login Card */}
                    <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-none p-6 md:p-10 space-y-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)]">
                        <div className="text-center space-y-2">
                            <h1 className="text-3xl md:text-4xl font-bold text-[#334155] tracking-tight">
                                Welcome Back
                            </h1>
                            <p className="text-slate-500 font-medium text-sm">
                                Please enter your details to sign in
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-4">
                                {/* Email Field */}
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">Email Address</Label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Mail className="h-5 w-5 stroke-[1.5px]" />
                                        </div>
                                        <Input
                                            type="email"
                                            placeholder="you@example.com"
                                            className="h-11 rounded-none border-slate-200 bg-white/80 pl-12 pr-4 text-sm focus:ring-1 focus:ring-slate-400 transition-all text-slate-700 font-medium shadow-none"
                                            {...register("email")}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">Password</Label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Lock className="h-5 w-5 stroke-[1.5px]" />
                                        </div>
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="h-11 rounded-none border-slate-200 bg-white/80 pl-12 pr-10 text-sm focus:ring-1 focus:ring-slate-400 transition-all text-slate-700 font-medium shadow-none"
                                            {...register("password")}
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <p className="text-xs text-rose-500 font-bold text-center tracking-wider bg-rose-50/80 p-2 border border-rose-100">{error}</p>
                            )}

                            <div className="space-y-4">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 rounded-none font-bold text-lg bg-gradient-to-b from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white shadow-lg transition-all active:scale-[0.99] border-b-4 border-[#1e40af] tracking-wider"
                                >
                                    {loading ? "Verifying..." : "Sign In"}
                                </Button>

                                <div className="text-center">
                                    <button type="button" className="text-[11px] font-bold text-slate-400 hover:text-slate-800 transition-colors tracking-widest">
                                        Forgot Password?
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="text-center pt-2 border-t border-slate-100">
                            <p className="text-slate-500 font-medium text-sm">
                                Don't have an account?{" "}
                                <Link to="/signup" className="text-[#3b82f6] font-bold hover:text-blue-700 transition-all ml-1">
                                    Create Account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
