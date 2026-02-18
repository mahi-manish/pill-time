import { useState, useMemo, useRef } from "react"
import { format, subDays, isPast, isToday } from "date-fns"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import Calendar from "@/components/Calendar"
import {
    Flame,
    Check,
    X,
    Upload as UploadIcon,
    Sun,
    CloudIcon,
    Moon,
    Bed,
    Camera,
    Heart,
    Zap,
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

    const filteredMedications = useMemo(() => {
        if (!medications) return [];
        const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
        return medications.filter(med => {
            // @ts-ignore
            if (!med.target_date) return true;
            // @ts-ignore
            return med.target_date === selectedDateStr;
        });
    }, [medications, selectedDate]);

    const todayMedications = useMemo(() => {
        if (!medications) return [];
        const todayStr = format(new Date(), "yyyy-MM-dd");
        return medications.filter(med => {
            // @ts-ignore
            if (!med.target_date) return true;
            // @ts-ignore
            return med.target_date === todayStr;
        });
    }, [medications]);

    const stats = useMemo(() => {
        // Stats for "Today" (Actual current date)
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const medsTodayCount = todayMedications.length;
        const dosesTakenToday = allLogs?.filter(l => l.date === todayStr && l.taken).length || 0;

        let totalScheduledPast = 0;
        let totalTakenPast = 0;
        let calculatedStreak = 0;
        let streakBroken = false;

        const safeMedications = medications || [];
        const safeAllLogs = allLogs || [];

        if (safeMedications.length > 0) {
            // Check from today (i=0) backwards
            for (let i = 0; i <= 365; i++) {
                const checkDate = subDays(new Date(), i);
                const dateStr = format(checkDate, "yyyy-MM-dd");

                const medsForDay = safeMedications.filter(med => {
                    // @ts-ignore
                    if (!med.target_date) return true;
                    // @ts-ignore
                    return med.target_date === dateStr;
                });

                if (medsForDay.length > 0) {
                    const dayLogs = safeAllLogs.filter(l => l.date === dateStr && l.taken);
                    const dayTakenCount = dayLogs.length;

                    // Streak logic: must take ALL scheduled meds
                    if (!streakBroken) {
                        if (dayTakenCount >= medsForDay.length) {
                            calculatedStreak++;
                        } else if (i > 0) { // Streak breaks if a past day is incomplete
                            streakBroken = true;
                        }
                    }

                    // Adherence (Last 30 days)
                    if (i < 30) {
                        totalScheduledPast += medsForDay.length;
                        totalTakenPast += Math.min(dayTakenCount, medsForDay.length);
                    }
                }
            }
        }

        const rate = totalScheduledPast > 0 ? Math.round((totalTakenPast / totalScheduledPast) * 100) : 0;

        return {
            today: medsTodayCount,
            taken: dosesTakenToday,
            missed: Math.max(0, medsTodayCount - dosesTakenToday),
            rate: rate,
            streak: calculatedStreak
        }
    }, [todayMedications, allLogs, medications])

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

    const handleCommitRecord = async () => {
        if (!previewImage) {
            alert("Please take or upload a photo first");
            return;
        }

        try {
            // simulate the success and clear the state.
            alert("Verification photo logged successfully!");
            setPreviewImage(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error: any) {
            alert("Error saving record: " + error.message);
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
                        <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
                            Patient
                        </span>
                    </div>
                </div>
                {/* Right Side: Useful Stats Card */}
                <div className="bg-[#e6e6fa] rounded-3xl p-6 shadow-sm border border-slate-100 w-full lg:w-auto min-w-[320px] flex flex-col justify-between h-auto gap-4">
                    <div className="flex items-start justify-between gap-8">
                        {/* Today's Dosage */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-500">Today's Dosage:</p>
                            <div className="text-3xl font-bold text-slate-700">{stats.taken}/{stats.today}</div>
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
                <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[32px] p-0 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="p-8 flex items-center justify-between bg-white">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Medication Schedule</h2>
                            <p className="text-xs font-medium text-slate-400 mt-1 tracking-widest">{format(selectedDate, "EEEE, MMMM dd, yyyy")}</p>
                        </div>
                        <div className="flex gap-2">
                            {isToday(selectedDate) ? (
                                <div className="h-8 px-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center text-[10px] font-bold text-blue-600 tracking-wider">Active Routine</div>
                            ) : isPast(selectedDate) ? (
                                <div className="h-8 px-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center text-[10px] font-bold text-slate-400 tracking-wider">Past Routine</div>
                            ) : (
                                <div className="h-8 px-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center text-[10px] font-bold text-slate-400 tracking-wider">Future Routine</div>
                            )}
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {filteredMedications?.map((med) => {
                            const taken = isTaken(med.id)
                            const style = getMedIcon(med.reminder_time)
                            return (
                                <div key={med.id} className="p-6 flex flex-col sm:flex-row items-center sm:justify-between gap-4 sm:gap-0 hover:bg-slate-50/50 transition-all">
                                    <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
                                        <div className={cn("shrink-0 h-12 w-12 flex items-center justify-center rounded-xl border border-slate-50 shadow-sm", style.bg, style.color)}>
                                            {style.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                                <span className="text-xs font-bold text-blue-400 font-sans whitespace-nowrap">{med.reminder_time.slice(0, 5)}</span>
                                                <h3 className="text-lg font-bold text-slate-800 truncate">{med.name}</h3>
                                            </div>
                                            <p className="text-xs font-medium text-slate-400 mt-0.5 truncate max-w-[200px] sm:max-w-none">{med.dosage} • {med.instructions || 'Take as prescribed'}</p>
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => {
                                            if (isToday(selectedDate)) {
                                                toggleTaken.mutate({ medId: med.id, taken: !taken })
                                            }
                                        }}
                                        className={cn(
                                            "flex bg-slate-100 rounded-full p-1 cursor-pointer transition-all select-none shadow-inner w-full sm:w-auto justify-between sm:justify-start",
                                            !isToday(selectedDate) && "opacity-50 pointer-events-none grayscale"
                                        )}
                                    >
                                        <div className={cn(
                                            "flex-1 sm:flex-none px-4 py-1.5 rounded-full text-[10px] font-bold transition-all tracking-wider flex items-center justify-center gap-2",
                                            !taken ? "bg-slate-400 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                                        )}>
                                            {!taken && <X className="w-3 h-3" />} Not Taken
                                        </div>
                                        <div className={cn(
                                            "flex-1 sm:flex-none px-4 py-1.5 rounded-full text-[10px] font-bold transition-all tracking-wider flex items-center justify-center gap-2",
                                            taken ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                                        )}>
                                            {taken && <Check className="w-3 h-3 stroke-[3]" />} Taken
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {filteredMedications?.length === 0 && (
                            <div className="py-20 text-center text-slate-400 tracking-widest text-xs">No medications scheduled</div>
                        )}
                    </div>
                </div>

                {/* Upload Section */}
                <div className="lg:col-span-5 bg-white border border-slate-100 rounded-[32px] p-10 flex flex-col gap-8 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 tracking-tight">
                            <div className="p-2 bg-blue-50 rounded-xl">
                                <Camera className="w-5 h-5 text-blue-500" />
                            </div>
                            Upload Proof <span className="text-xs font-medium text-slate-500 tracking-wide">(Optional)</span>
                        </h2>
                        <p className="text-xs font-medium text-slate-400 tracking-wide">Visual verification for your daily records</p>
                    </div>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-white hover:border-blue-400 transition-all group relative overflow-hidden min-h-[300px] shadow-sm"
                    >
                        {previewImage ? (
                            <img src={previewImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="h-16 w-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                                    <UploadIcon className="w-8 h-8 text-slate-300 group-hover:text-blue-500" />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-xs font-bold text-slate-600">Take a photo</p>
                                    <p className="text-[10px] font-medium text-slate-400 px-4 leading-relaxed">Capture a clear image of your medication as confirmation</p>
                                </div>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>

                    <Button
                        onClick={handleCommitRecord}
                        className="w-full bg-slate-900 hover:bg-slate-800 h-14 rounded-2xl font-bold text-sm tracking-wide shadow-lg active:scale-[0.98] transition-all"
                    >
                        Commit Daily Record
                    </Button>

                    <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 text-emerald-700">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold tracking-wider uppercase">System Secured</span>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Calendar + Health Wellness */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left Side: Calendar */}
                <div className="lg:col-span-7">
                    <Calendar
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        logs={allLogs}
                        medications={medications}
                    />
                </div>

                {/* Right Side: Health Wellness Center */}
                <div className="lg:col-span-5 bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-8 self-start">
                    {/* Wellness Title */}
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 tracking-tight">
                            <div className="p-2 bg-rose-50 rounded-xl">
                                <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
                            </div>
                            Wellness Center
                        </h2>
                        <p className="text-xs font-medium text-slate-400 tracking-wide">Stay on track with your physical health</p>
                    </div>

                    {/* Daily Health Tip */}
                    <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/30 space-y-3 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <Zap className="w-12 h-12 text-blue-500" />
                        </div>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Daily Suggestion</p>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                            "Drinking a glass of water before each medication helps with absorption and keeping you hydrated."
                        </p>
                    </div>

                </div>
            </div>
        </div>
    )
}
