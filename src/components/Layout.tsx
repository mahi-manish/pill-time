import { Link, Outlet, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Home, Pill } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Layout() {
    const { session, signOut } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const handleLogout = async () => {
        await signOut()
        navigate("/login")
    }

    const navItems = [
        { icon: Home, label: "Home", path: "/" }
    ]

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
                        {session ? (
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white transition-all cursor-pointer">
                                    <div className="flex flex-col items-end">
                                        <span className="text-slate-800 font-bold text-xs">Primary User</span>
                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Active System</span>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 p-0.5">
                                        <img className="w-full h-full object-cover rounded-md" src="https://ui-avatars.com/api/?name=User&background=2563EB&color=fff&bold=true" alt="Profile" />
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        localStorage.removeItem('user_role');
                                        window.location.href = "/";
                                    }}
                                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-xl px-4 h-10 transition-all border border-blue-100"
                                >
                                    Switch
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl px-4 h-10 transition-all">
                                    Logout
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link to="/login" className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-[0.2em]">
                                    Sign In
                                </Link>
                                <Link to="/signup">
                                    <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 px-6 h-10 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all">
                                        Join Now
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            </header>

            <main className="container mx-auto pt-6 md:pt-10 pb-20 px-6 max-w-[1200px]">
                <Outlet />
            </main>

            {/* Floating Bottom Nav for Mobile */}
            {session && (
                <nav className="fixed bottom-6 left-0 right-0 px-6 md:hidden z-50">
                    <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl h-16 flex items-center justify-around px-4 shadow-xl">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = location.pathname === item.path
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all",
                                        isActive ? "bg-blue-50 text-blue-600 shadow-inner" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    <Icon className={cn("h-6 w-6", isActive ? "stroke-[2.5]" : "stroke-[2]")} />
                                </Link>
                            )
                        })}
                    </div>
                </nav>
            )}
        </div>
    )
}
