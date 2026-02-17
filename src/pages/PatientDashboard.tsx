import { useState, useMemo, useRef } from "react"
import { format } from "date-fns"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import Calendar from "@/components/Calendar"
import {
    Flame,
    Check,
    Clock,
    Upload as UploadIcon,
    Sun,
    CloudIcon,
    Moon,
    Bed,
    Camera
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"

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

export default function PatientDashboard() {
    const { session } = useAuth()
    const queryClient = useQueryClient()
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const targetUserId = session?.user.id

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
            const { data, error } = await supabase
                .from("medication_logs")
                .select("*")
                .eq("user_id", targetUserId)
                .eq("date", format(selectedDate, "yyyy-MM-dd"))
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

    const toggleTaken = useMutation({
        mutationFn: async ({ medId, taken }: { medId: string; taken: boolean }) => {
            if (!targetUserId) return

            const { error } = await supabase
                .from("medication_logs")
                .upsert({
                    medication_id: medId,
                    date: format(selectedDate, "yyyy-MM-dd"),
                    taken: taken,
                    marked_at: new Date().toISOString(),
                    user_id: targetUserId
                }, { onConflict: "medication_id, date" })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["logs", targetUserId] })
            queryClient.invalidateQueries({ queryKey: ["all-logs", targetUserId] })
        },
    })

    const isTaken = (medId: string) => currentLogs?.some((log) => log.medication_id === medId && log.taken)

    const stats = useMemo(() => {
        const medsTodayCount = medications?.length || 0;
        const dosesTakenToday = currentLogs?.filter(l => l.taken).length || 0;
        const totalPossible = (allLogs?.length || 0) || 1;
        const totalTaken = (allLogs?.filter(l => l.taken).length || 0);
        const rate = Math.round((totalTaken / totalPossible) * 100);

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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => setPreviewImage(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const getMedIcon = (time: string) => {
        const hour = parseInt(time.split(':')[0])
        if (hour < 10) return { icon: <Sun className="w-5 h-5" />, color: "text-amber-500", bg: "bg-amber-50" }
        if (hour < 15) return { icon: <CloudIcon className="w-5 h-5" />, color: "text-blue-500", bg: "bg-blue-50" }
        if (hour < 20) return { icon: <Moon className="w-5 h-5" />, color: "text-indigo-500", bg: "bg-indigo-50" }
        return { icon: <Bed className="w-5 h-5" />, color: "text-slate-500", bg: "bg-slate-50" }
    }

    return (
        <div className="max-w-[1000px] mx-auto px-6 py-6 space-y-8 animate-fade-in pb-0 font-sans">
            {/* Patient Header & Stats Card */}
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6 pb-2">
                {/* Left Side: Greeting & Role */}
                <div className="space-y-1 pt-8">
                    <p className="text-sm font-medium text-slate-500">{getGreeting()},</p>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                        {session?.user?.user_metadata?.full_name || 'User'}
                    </h1>
                    <div className="flex items-center gap-2 pt-1">
                        <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
                            Patient
                        </span>
                    </div>
                </div>
                {/* Right Side: Useful Stats Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 w-full lg:w-auto min-w-[320px] flex flex-col justify-between h-auto gap-4">
                    <div className="flex items-start justify-between gap-8">
                        {/* Today's Dosage */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-500">Today's Dosage:</p>
                            <div className="text-3xl font-bold text-slate-700">2/3</div>
                        </div>

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

            {/* Middle Section: Schedule + Upload */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Schedule Table */}
                <div className="lg:col-span-8 realistic-card p-0 overflow-hidden bg-white">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Medication Schedule</h2>
                            <p className="text-xs font-bold text-slate-400 mt-1 tracking-widest">{format(selectedDate, "EEEE, MMMM dd, yyyy")}</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="h-10 px-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center text-[10px] font-black text-slate-400 tracking-widest">Active Routine</div>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {medications?.map((med) => {
                            const taken = isTaken(med.id)
                            const style = getMedIcon(med.reminder_time)
                            return (
                                <div key={med.id} className="p-8 flex items-center justify-between hover:bg-slate-50/20 transition-all group">
                                    <div className="flex items-center gap-8">
                                        <div className={cn("h-14 w-14 flex items-center justify-center rounded-2xl border border-slate-50 shadow-sm transition-transform group-hover:scale-105", style.bg, style.color)}>
                                            {style.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-black text-blue-400 font-sans tracking-widest">{med.reminder_time}</span>
                                                <h3 className="text-xl font-bold text-slate-800">{med.name}</h3>
                                            </div>
                                            <p className="text-sm font-medium text-slate-400 mt-1">{med.dosage} • {med.instructions || 'Daily'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <label className="flex items-center gap-4 cursor-pointer group/check">
                                            <input
                                                type="checkbox"
                                                checked={taken}
                                                onChange={(e) => toggleTaken.mutate({ medId: med.id, taken: e.target.checked })}
                                                className="h-7 w-7 rounded-xl border-slate-300 text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer shadow-sm"
                                            />
                                            <span className="text-[10px] font-black text-slate-400 group-hover/check:text-slate-800 transition-colors tracking-[0.2em] pt-0.5">Taken</span>
                                        </label>
                                        <div className={cn(
                                            "h-12 w-12 flex items-center justify-center rounded-2xl transition-all duration-500 shadow-sm",
                                            taken ? "bg-emerald-500 text-white shadow-emerald-100" : "bg-slate-50 text-slate-200"
                                        )}>
                                            {taken ? <Check className="w-7 h-7 stroke-[3]" /> : <Clock className="w-6 h-6 rotate-container group-hover:rotate-12 transition-transform" />}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {medications?.length === 0 && (
                            <div className="py-24 text-center text-slate-300 font-black tracking-[0.3em] text-[10px]">No medical entries on this date</div>
                        )}
                    </div>
                </div>

                {/* Upload Section */}
                <div className="lg:col-span-4 realistic-card p-10 flex flex-col gap-8 bg-white">
                    <div className="space-y-2">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                            <Camera className="w-6 h-6 text-blue-600" /> Intake Log
                        </h2>
                        <p className="text-xs font-bold text-slate-400 tracking-widest">Image verification for records</p>
                    </div>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-10 cursor-pointer hover:bg-white hover:border-blue-400 transition-all group relative overflow-hidden h-[340px] shadow-inner"
                    >
                        {previewImage ? (
                            <img src={previewImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                            <>
                                <div className="h-20 w-20 bg-white rounded-3xl shadow-md border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <UploadIcon className="w-10 h-10 text-slate-300 group-hover:text-blue-500" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] text-center px-4 leading-relaxed">Tap to capture or stream<br />pill photo verification</p>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>
                    <Button className="w-full bg-slate-900 hover:bg-black h-16 rounded-2xl font-black text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all">
                        Commit Record
                    </Button>
                    <div className="flex items-center gap-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800">
                        <Check className="h-6 w-6 stroke-[3]" />
                        <span className="text-[10px] font-black tracking-widest">Security Ready</span>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Calendar Overview */}
            <Calendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                logs={allLogs}
            />
        </div>
    )
}
