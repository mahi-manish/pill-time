import { Link, Outlet, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Pill, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Layout() {
    const { session, signOut, userRole, updateRole } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await signOut()
        navigate("/login")
    }



    const handleRoleSwitch = () => {
        const newRole = userRole === 'caretaker' ? 'patient' : 'caretaker'
        updateRole(newRole)
    }

    return (
        <div className="min-h-screen bg-[#F3F7FF] font-sans antialiased text-slate-900 selection:bg-blue-600/10 pb-24 md:pb-0">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200 hidden md:block">
                <div className="container mx-auto flex h-20 items-center justify-between px-10 max-w-[1200px]">
                    <Link to="/" className="flex items-center gap-4 group">
                        <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.2)] group-hover:scale-105 transition-transform">
                            <Pill className="h-5 w-5 text-white stroke-[3px]" />
                        </div>
                        <div>
                            <span className="text-xl font-black text-slate-800 tracking-tighter leading-none">Pill </span>
                            <span className="text-xl font-black text-emerald-600 tracking-tighter leading-none">Time</span>
                        </div>
                    </Link>

                    <nav className="flex items-center gap-2">
                        <div className="flex items-center gap-6">
                            {userRole && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRoleSwitch}
                                    className={cn(
                                        "text-[10px] font-bold font-sans tracking-widest rounded-xl px-4 h-10 transition-all border",
                                        userRole === 'caretaker'
                                            ? "text-emerald-600 hover:bg-emerald-50 border-emerald-100"
                                            : "text-blue-600 hover:bg-blue-50 border-blue-100"
                                    )}
                                >
                                    Switch to {userRole === 'caretaker' ? 'Patient' : 'Caretaker'}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="text-[10px] font-bold font-sans tracking-widest text-slate-400 border border-slate-200 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 rounded-xl px-4 h-10 transition-all"
                            >
                                Logout
                            </Button>
                        </div>
                    </nav>
                </div>
            </header>

            <main className="container mx-auto pb-20 px-2 max-w-[1000px]">
                <Outlet />

                <div className="text-center pt-5 opacity-50">
                    <p className="text-[10px] font-black tracking-[0.15em]">Pill Time • v1.0.0 • Crafted for Medical Precision</p>
                </div>
            </main>

            {/* Mobile Bottom Navigation - Pill Time Style */}
            {session && (
                <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 md:hidden z-50 safe-area-bottom pb-6">
                    <div className="flex items-center justify-between">
                        {/* Left: Brand */}
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                <Pill className="h-4 w-4 text-white stroke-[3px]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-800 tracking-tighter leading-none">Pill</span>
                                <span className="text-xs font-black text-emerald-600 tracking-tighter leading-none">Time</span>
                            </div>
                        </div>

                         {/* Center: Switch Role */}
                         {userRole && (
                             <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRoleSwitch}
                                className={cn(
                                    "h-8 px-3 rounded-lg text-[10px] font-bold tracking-wide border transition-all",
                                    userRole === 'caretaker'
                                        ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                                        : "text-blue-600 bg-blue-50 border-blue-100"
                                )}
                             >
                                Switch to {userRole === 'caretaker' ? 'Patient' : 'Caretaker'}
                             </Button>
                         )}

                         {/* Right: Logout */}
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                         >
                            <LogOut className="h-4 w-4" />
                         </Button>
                    </div>
                </nav>
            )}
        </div>
    )
}
