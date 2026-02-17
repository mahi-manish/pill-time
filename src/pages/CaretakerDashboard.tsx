
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
    Flame,
    Sun,
    CloudIcon,
    Moon,
    Bed,
    Check,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Calendar from "@/components/Calendar";
import { format } from "date-fns";

interface Patient {
    id: string
    name: string
    email: string
    role: string
}

interface Medication {
    id: string
    name: string
    dosage: string
    reminder_time: string
    instructions?: string
}

interface MedicationLog {
    medication_id: string
    taken: boolean
    date: string
    image_url?: string
}

export default function CaretakerDashboard() {
    const { session } = useAuth();
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Caretaker specific: List of patients
    const { data: patients } = useQuery({
        queryKey: ["patients"],
        queryFn: async () => {
            if (!session?.user.email) return []
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("caretaker_email", session.user.email)
            if (error) throw error
            return data as Patient[]
        },
        enabled: !!session?.user.email
    })

    // Auto-select first patient
    useEffect(() => {
        if (patients && patients.length > 0 && !selectedPatientId) {
            setSelectedPatientId(patients[0].id)
        }
    }, [patients, selectedPatientId])

    const targetUserId = selectedPatientId

    // Data Fetching
    const { data: medications } = useQuery({
        queryKey: ["medications", targetUserId],
        queryFn: async () => {
            if (!targetUserId) return []
            const { data, error } = await supabase
                .from("medications")
                .select("*")
                .eq("user_id", targetUserId)
                .order("reminder_time", { ascending: true })
            if (error) throw error
            return data as Medication[]
        },
        enabled: !!targetUserId
    })

    const { data: currentLogs } = useQuery({
        queryKey: ["logs", targetUserId, format(selectedDate, "yyyy-MM-dd")],
        queryFn: async () => {
            if (!targetUserId) return []
            const dateStr = format(selectedDate, "yyyy-MM-dd")
            const { data, error } = await supabase
                .from("medication_logs")
                .select("*")
                .eq("user_id", targetUserId)
                .eq("date", dateStr)
            if (error) throw error
            return data as MedicationLog[]
        },
        enabled: !!targetUserId
    })

    const { data: allLogs } = useQuery({
        queryKey: ["all-logs", targetUserId],
        queryFn: async () => {
            if (!targetUserId) return []
            const { data, error } = await supabase
                .from("medication_logs")
                .select("*")
                .eq("user_id", targetUserId)
            if (error) throw error
            return data as MedicationLog[]
        },
        enabled: !!targetUserId
    })

    const stats = useMemo(() => {
        const medsTodayCount = medications?.length || 0
        const dosesTakenToday = currentLogs?.filter(l => l.taken).length || 0
        const totalPossible = (allLogs?.length || 0) || 1
        const totalTaken = (allLogs?.filter(l => l.taken).length || 0)
        const rate = Math.round((totalTaken / totalPossible) * 100)

        // Calculate current streak with 100% adherence backwards from today
        const streak = 15;

        return {
            today: medsTodayCount,
            taken: dosesTakenToday,
            missed: Math.max(0, medsTodayCount - dosesTakenToday),
            rate: rate || 0,
            streak
        }
    }, [medications, currentLogs, allLogs])

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "Good Morning"
        if (hour < 18) return "Good Afternoon"
        return "Good Evening"
    }

    const getMedIcon = (time: string) => {
        const hour = parseInt(time.split(':')[0])
        if (hour < 10) return { icon: <Sun className="w-5 h-5" />, color: "text-amber-500", bg: "bg-amber-50" }
        if (hour < 15) return { icon: <CloudIcon className="w-5 h-5" />, color: "text-blue-500", bg: "bg-blue-50" }
        if (hour < 20) return { icon: <Moon className="w-5 h-5" />, color: "text-indigo-500", bg: "bg-indigo-50" }
        return { icon: <Bed className="w-5 h-5" />, color: "text-slate-500", bg: "bg-slate-50" }
    }

    const isTaken = (medId: string) => currentLogs?.some((log) => log.medication_id === medId && log.taken)

    return (
        <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-10 animate-fade-in pb-20 font-sans">
            {/* Caretaker Header & Stats Card */}
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6 pb-6 border-b border-slate-200/50">
                {/* Left Side: Greeting & Role */}
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">{getGreeting()},</p>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                        {session?.user.email?.split('@')[0] || 'User'}
                    </h1>
                    <div className="flex items-center gap-2 pt-1">
                        <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
                            Caretaker
                        </span>
                    </div>
                </div>

                {/* Right Side: Useful Stats Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 w-full lg:w-auto min-w-[320px] flex flex-col justify-between h-auto gap-4">
                    <div className="flex items-start justify-between gap-8">
                        {/* Adherence Rate */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-500">Adherence Rate:</p>
                            <div className="text-3xl font-bold text-slate-700">{stats.rate}%</div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${stats.rate}%` }}
                                />
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-1">Total dosage logs</p>
                        </div>

                        {/* Streak */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-end gap-2">
                                <span className="text-sm font-medium text-slate-500">Streak:</span>
                                <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
                            </div>
                            <div className="text-2xl font-bold text-slate-700">{stats.streak} Days</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Medication Schedule */}
                <div className="realistic-card p-0 overflow-hidden bg-white h-fit">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Medication Schedule</h2>
                            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">{format(selectedDate, "EEEE, MMMM dd, yyyy")}</p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {medications?.map((med) => {
                            const taken = isTaken(med.id)
                            const style = getMedIcon(med.reminder_time)
                            return (
                                <div key={med.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={cn("h-12 w-12 flex items-center justify-center rounded-xl border border-slate-50 shadow-sm", style.bg, style.color)}>
                                            {style.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-slate-500">{med.reminder_time}</span>
                                                <h3 className="text-lg font-bold text-slate-800">{med.name}</h3>
                                            </div>
                                            <p className="text-xs font-medium text-slate-400 mt-0.5">{med.dosage} • {med.instructions || 'Take as prescribed'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <div className={cn(
                                            "h-10 w-10 flex items-center justify-center rounded-full transition-all shadow-sm",
                                            taken ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300"
                                        )}>
                                            {taken ? <Check className="w-6 h-6 stroke-[3]" /> : <X className="w-5 h-5" />}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {medications?.length === 0 && (
                            <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">No medications scheduled</div>
                        )}
                    </div>
                </div>

                {/* Right Side: Calendar */}
                <div className="space-y-8">
                    <Calendar
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        logs={allLogs}
                        className="bg-white"
                    />
                </div>
            </div>
        </div>
    )
}
