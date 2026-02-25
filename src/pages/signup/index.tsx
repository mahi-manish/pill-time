import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Footer from "@/components/Footer";
import { Mail, Lock, Eye, EyeOff, Pill, User } from "lucide-react";

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
})

type FormData = z.infer<typeof formSchema>

export default function Signup() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    })

    async function onSubmit(values: FormData) {
        setLoading(true);
        setError(null);

        const { error: authError } = await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
                data: {
                    full_name: values.name,
                }
            }
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
            <div className="w-full lg:w-1/2 bg-[#fcfdfe] relative overflow-y-auto h-screen z-10 custom-scrollbar flex justify-center">
                <div className="w-full max-w-[500px] animate-fade-in px-4 py-16 flex flex-col justify-center min-h-full">
                    {/* Mobile Branding (Visible only on small screens) */}
                    <div className="flex lg:hidden items-center justify-center gap-3 mb-6">
                        <div className="h-10 w-10 bg-[#2563eb] rounded-none flex items-center justify-center shadow-2xl">
                            <div className="relative rotate-45 transform">
                                <Pill className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div className="font-sans">
                            <span className="text-2xl font-black text-slate-800 tracking-tighter leading-none">Pill </span>
                            <span className="text-2xl font-black text-[#10b981] tracking-tighter leading-none">Time</span>
                        </div>
                    </div>

                    {/* Signup Card */}
                    <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-none p-5 md:p-8 space-y-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)]">
                        <div className="text-center space-y-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-[#334155] tracking-tight">
                                Let's Get Started!
                            </h1>
                            <p className="text-slate-500 font-medium text-sm">
                                Join us to start tracking your medications
                            </p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-4">
                                {/* Name Field */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400  tracking-widest ml-1">Full Name</Label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <User className="h-4 w-4 stroke-[1.5px]" />
                                        </div>
                                        <Input
                                            type="text"
                                            placeholder="Enter your full name"
                                            className="h-10 rounded-none border-slate-200 bg-white/80 pl-11 pr-4 text-sm focus:ring-1 focus:ring-slate-400 transition-all text-slate-700 shadow-none"
                                            {...register("name")}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Email Field */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400 tracking-widest ml-1">Email Id</Label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Mail className="h-4 w-4 stroke-[1.5px]" />
                                        </div>
                                        <Input
                                            type="email"
                                            placeholder="you@gmail.com"
                                            className="h-10 rounded-none border-slate-200 bg-white/80 pl-11 pr-4 text-sm focus:ring-1 focus:ring-slate-400 transition-all text-slate-700 shadow-none"
                                            {...register("email")}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400 tracking-widest ml-1">Password</Label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Lock className="h-4 w-4 stroke-[1.5px]" />
                                        </div>
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="h-10 rounded-none border-slate-200 bg-white/80 pl-11 pr-10 text-sm focus:ring-1 focus:ring-slate-400 transition-all text-slate-700 shadow-none"
                                            {...register("password")}
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password Field */}
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-slate-400 tracking-widest ml-1">Confirm Password</Label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Lock className="h-4 w-4 stroke-[1.5px]" />
                                        </div>
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            className="h-10 rounded-none border-slate-200 bg-white/80 pl-11 pr-10 text-sm focus:ring-1 focus:ring-slate-400 transition-all text-slate-700 shadow-none"
                                            {...register("confirmPassword")}
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>



                            {error && (
                                <p className="text-[10px] text-rose-500 font-bold text-center tracking-wider bg-rose-50/80 p-2 border border-rose-100">{error}</p>
                            )}

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-11 rounded-none font-bold text-lg bg-gradient-to-b from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white shadow-lg transition-all active:scale-[0.99] border-b-4 border-[#1e40af] tracking-wider"
                            >
                                {loading ? "Creating..." : "Create Account"}
                            </Button>
                        </form>

                        <div className="text-center pt-2 border-t border-slate-100">
                            <p className="text-slate-500 font-medium text-sm">
                                Already have an account?{" "}
                                <Link to="/login" className="text-[#3b82f6] font-bold hover:text-blue-700 ml-1">
                                    Sign In
                                </Link>
                            </p>
                        </div>
                    </div>

                    <Footer />
                </div>
            </div>

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
                        <div className="font-sans">
                            <span className="text-3xl font-black text-white tracking-tighter leading-none">Pill </span>
                            <span className="text-3xl font-black text-[#10b981] tracking-tighter leading-none">Time</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
