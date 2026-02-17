import { ArrowRight } from "lucide-react"

interface ChooseYourRoleProps {
    onRoleSelect: (role: string) => void
}

export default function ChooseYourRole({ onRoleSelect }: ChooseYourRoleProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] w-full py-2 font-sans overflow-hidden bg-white">
            <div className="max-w-4xl w-full text-center space-y-1 mb-4 animate-fade-in px-4">
                <h2 className="text-slate-900 text-2xl md:text-3xl font-black tracking-tight uppercase">Choose Your Role</h2>
                <div className="h-1 w-12 bg-blue-600 mx-auto rounded-full" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px]">Select your identity to continue</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl px-4 flex-1 items-center justify-center">
                {/* Patient Card */}
                <div className="bg-white border-2 border-slate-100 flex flex-col items-center text-center shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/5 group rounded-2xl overflow-hidden hover:border-blue-100">
                    <div className="w-full aspect-[16/10] bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100 p-6">
                        <img
                            src="/patient.png"
                            alt="Patient"
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-md"
                        />
                    </div>
                    <div className="p-6 flex flex-col items-center w-full gap-4">
                        <div className="space-y-1">
                            <h3 className="text-slate-900 text-lg font-black tracking-tight leading-tight">I am a Patient</h3>
                            <p className="text-slate-500 font-medium text-xs max-w-[200px] mx-auto leading-relaxed">
                                Track your personal medication journey
                            </p>
                        </div>
                        <button
                            onClick={() => onRoleSelect('patient')}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-100 transition-all duration-300 active:scale-[0.98] group/btn"
                        >
                            <span>Continue as Patient</span>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                    </div>
                </div>

                {/* Caretaker Card */}
                <div className="bg-white border-2 border-slate-100 flex flex-col items-center text-center shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/5 group rounded-2xl overflow-hidden hover:border-blue-100">
                    <div className="w-full aspect-[16/10] bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100 p-6">
                        <img
                            src="/caretaker.png"
                            alt="Caretaker"
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-md"
                        />
                    </div>
                    <div className="p-6 flex flex-col items-center w-full gap-4">
                        <div className="space-y-1">
                            <h3 className="text-slate-900 text-lg font-black tracking-tight leading-tight">I am a Caretaker</h3>
                            <p className="text-slate-500 font-medium text-xs max-w-[200px] mx-auto leading-relaxed">
                                Monitor and manage care remotely
                            </p>
                        </div>
                        <button
                            onClick={() => onRoleSelect('caretaker')}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-100 transition-all duration-300 active:scale-[0.98] group/btn"
                        >
                            <span>Continue as Caretaker</span>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
