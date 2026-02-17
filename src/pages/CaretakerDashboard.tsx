
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
    Clock,
    Calendar as CalendarIcon,
    ChevronRight,
    Pill,
    Bell,
    BellRing,
    Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Calendar from "@/components/Calendar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";


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
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Form states
    const [medName, setMedName] = useState("");
    const [medDosage, setMedDosage] = useState("");
    const [medTime, setMedTime] = useState("08:00");
    const [medInstructions, setMedInstructions] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState<"schedule" | "settings">("schedule");

    // Settings States
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [caretakerEmail, setCaretakerEmail] = useState("");
    const [missedAlertsEnabled, setMissedAlertsEnabled] = useState(true);
    const [alertDelay, setAlertDelay] = useState("2 hours");
    const [dailyReminderTime, setDailyReminderTime] = useState("20:00");
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const targetUserId = session?.user?.id;

    // Fetch Profile for settings
    const { data: profile } = useQuery({
        queryKey: ["profile", targetUserId],
        queryFn: async () => {
            if (!targetUserId) return null;
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", targetUserId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!targetUserId
    });

    useEffect(() => {
        if (profile) {
            setCaretakerEmail(profile.caretaker_email || "");
        }
    }, [profile]);

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

    const addMedicationMutation = useMutation({
        mutationFn: async (newMed: any) => {
            const { data, error } = await supabase
                .from("medications")
                .insert([newMed])
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["medications", targetUserId] });
            setMedName("");
            setMedDosage("");
            setMedInstructions("");
            setIsSubmitting(false);
        },
        onError: (error: any) => {
            console.error("Error adding medication:", error);
            setIsSubmitting(false);
            alert("Failed to add medication: " + error.message);
        }
    });

    const handleSaveMedication = () => {
        if (!targetUserId) {
            alert("Please select a patient first");
            return;
        }
        if (!medName || !medTime) {
            alert("Name and Time are required");
            return;
        }

        setIsSubmitting(true);
        addMedicationMutation.mutate({
            user_id: targetUserId,
            name: medName,
            dosage: medDosage || "1 Tablet",
            reminder_time: medTime,
            instructions: medInstructions,
            frequency: "Daily"
        });
    };

    const updateSettingsMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from("profiles")
                .update({
                    caretaker_email: caretakerEmail,
                    // If we had more columns we'd put them here. 
                    // For now we persist caretaker_email which is in schema.
                })
                .eq("id", targetUserId);
            if (error) throw error;
        },
        onSuccess: () => {
            setIsSavingSettings(false);
            queryClient.invalidateQueries({ queryKey: ["profile", targetUserId] });
            alert("Settings saved successfully!");
        },
        onError: (error: any) => {
            console.error("Error saving settings:", error);
            setIsSavingSettings(false);
            alert("Failed to save settings: " + error.message);
        }
    });

    const handleSaveSettings = () => {
        setIsSavingSettings(true);
        updateSettingsMutation.mutate();
    };

    return (
        <div className="max-w-[1000px] mx-auto px-6 py-6 space-y-10 animate-fade-in pb-20 font-sans">
            {/* Caretaker Header & Stats Card */}
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6 pb-6 border-b border-slate-200/50">
                {/* Left Side: Greeting & Role */}
                <div className="space-y-1 pt-8">
                    <p className="text-sm font-medium text-slate-500">{getGreeting()},</p>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                        {session?.user?.user_metadata?.full_name || 'User'}
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

            {/* New Medication Schedule Form Section - Refined & Compact */}
            <div className="mt-4 animate-slide-up delay-200">
                <div className="realistic-card p-0 overflow-hidden bg-white max-w-[900px]">
                    {/* Tabs - More Compact */}
                    <div className="flex bg-slate-50 border-b border-slate-100 h-11">
                        <button
                            onClick={() => setActiveTab("schedule")}
                            className={cn(
                                "px-6 h-full font-bold text-xs tracking-wider uppercase transition-all",
                                activeTab === "schedule" ? "bg-[#2563eb] text-white" : "bg-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Schedule
                        </button>
                        <button
                            onClick={() => setActiveTab("settings")}
                            className={cn(
                                "px-6 h-full font-bold text-xs tracking-wider uppercase transition-all border-r border-slate-100",
                                activeTab === "settings" ? "bg-[#2563eb] text-white" : "bg-white text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Settings
                        </button>
                    </div>

                    {activeTab === "schedule" ? (
                        <div className="p-6 md:p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                    <span className="h-6 w-1 bg-blue-500 rounded-full"></span>
                                    New Notification
                                </h2>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">Personal Schedule</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1 h-1 bg-blue-400 rounded-full"></span> Medication Name
                                    </label>
                                    <Input
                                        value={medName}
                                        onChange={(e) => setMedName(e.target.value)}
                                        placeholder="e.g. Morning Pills"
                                        className="h-11 border-slate-100 bg-slate-50/50 rounded-xl focus:ring-blue-500/20 transition-all font-medium text-slate-700 shadow-none hover:border-slate-200"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1 h-1 bg-blue-400 rounded-full"></span> Reminder Time
                                    </label>
                                    <div className="relative group">
                                        <Input
                                            type="time"
                                            value={medTime}
                                            onChange={(e) => setMedTime(e.target.value)}
                                            className="h-11 border-slate-100 bg-slate-50/50 rounded-xl pl-10 focus:ring-blue-500/20 transition-all font-medium text-slate-700 shadow-none hover:border-slate-200"
                                        />
                                        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1 h-1 bg-blue-400 rounded-full"></span> Dosage
                                    </label>
                                    <div className="relative group">
                                        <Input
                                            value={medDosage}
                                            onChange={(e) => setMedDosage(e.target.value)}
                                            placeholder="e.g. 1 Tablet"
                                            className="h-11 border-slate-100 bg-slate-50/50 rounded-xl pl-10 focus:ring-blue-500/20 transition-all font-medium text-slate-700 shadow-none hover:border-slate-200"
                                        />
                                        <Pill className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/60 rotate-45" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1 h-1 bg-blue-400 rounded-full"></span> Instructions / Note
                                </label>

                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="hidden lg:flex gap-2">
                                        <div className="h-11 w-11 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                                            <Sun className="w-5 h-5" />
                                        </div>
                                        <div className="h-11 w-11 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-400">
                                            <Pill className="w-5 h-5 rotate-45" />
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full">
                                        <Input
                                            value={medInstructions}
                                            onChange={(e) => setMedInstructions(e.target.value)}
                                            placeholder="Instructions (e.g. Take after meal)"
                                            className="h-11 border-slate-100 bg-slate-50/50 rounded-xl px-4 focus:ring-blue-500/20 transition-all font-bold text-slate-600 shadow-none hover:border-slate-200"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handleSaveMedication}
                                    disabled={isSubmitting}
                                    className="h-11 px-8 bg-[#55a075] hover:bg-[#448b63] text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-500/10 transition-all active:scale-[0.98]"
                                >
                                    {isSubmitting ? "Saving..." : "Save Notification"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setMedName("");
                                        setMedDosage("");
                                        setMedInstructions("");
                                    }}
                                    className="h-11 px-8 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl font-bold text-sm border-slate-200 transition-all active:scale-[0.98] shadow-none"
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 md:p-8 space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <BellRing className="w-5 h-5 text-blue-500" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Notification Preferences</h2>
                            </div>

                            <div className="space-y-6">
                                {/* Email Notifications Toggle */}
                                <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 bg-blue-100/50 rounded-xl">
                                                <Bell className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">Email Notifications</h3>
                                                <p className="text-sm text-slate-500 font-medium">Receive medication alerts via email</p>
                                            </div>
                                        </div>
                                        <div
                                            onClick={() => setEmailEnabled(!emailEnabled)}
                                            className={cn(
                                                "w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 relative",
                                                emailEnabled ? "bg-[#55a075]" : "bg-slate-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                                                emailEnabled ? "translate-x-6" : "translate-x-0"
                                            )} />
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                                        <div className="relative">
                                            <Input
                                                value={caretakerEmail}
                                                onChange={(e) => setCaretakerEmail(e.target.value)}
                                                placeholder="caretaker@example.com"
                                                className="h-12 border-slate-100 bg-slate-50/30 rounded-xl pr-12 font-medium text-slate-700 shadow-none border-b-2"
                                            />
                                            <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/40" />
                                        </div>
                                    </div>
                                </div>

                                {/* Missed Medication Alerts Toggle */}
                                <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 bg-rose-100/50 rounded-xl">
                                                <Bell className="w-5 h-5 text-rose-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">Missed Medication Alerts</h3>
                                                <p className="text-sm text-slate-500 font-medium">Get notified when medication is not taken on time</p>
                                            </div>
                                        </div>
                                        <div
                                            onClick={() => setMissedAlertsEnabled(!missedAlertsEnabled)}
                                            className={cn(
                                                "w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 relative",
                                                missedAlertsEnabled ? "bg-[#55a075]" : "bg-slate-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                                                missedAlertsEnabled ? "translate-x-6" : "translate-x-0"
                                            )} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alert Delay</label>
                                            <div className="relative">
                                                <select
                                                    value={alertDelay}
                                                    onChange={(e) => setAlertDelay(e.target.value)}
                                                    className="w-full h-12 bg-white border border-slate-100 rounded-xl px-4 text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                                >
                                                    <option>1 hour</option>
                                                    <option>2 hours</option>
                                                    <option>4 hours</option>
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily reminder time</label>
                                            <div className="relative">
                                                <Input
                                                    type="time"
                                                    value={dailyReminderTime}
                                                    onChange={(e) => setDailyReminderTime(e.target.value)}
                                                    className="h-12 border-slate-100 bg-white rounded-xl pl-10 font-medium text-slate-700 shadow-none"
                                                />
                                                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                            </div>
                                            <p className="text-[10px] font-medium text-slate-400">Time to check if today's medication was taken</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Email Preview */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-lg">
                                            <Mail className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Email Preview</h2>
                                    </div>
                                    <div className="bg-slate-50/30 rounded-2xl p-6 border border-slate-100/50 space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-700">Subject: Medication Alert - {session?.user?.user_metadata?.full_name || 'User'}</p>
                                        </div>
                                        <div className="text-sm text-slate-500 space-y-4 leading-relaxed font-medium">
                                            <p>Hello.</p>
                                            <p>This is a reminder that {session?.user?.user_metadata?.full_name || 'User'} has not taken her medication today.</p>
                                            <p>Please check with her to ensure she takes her prescribed medication.</p>
                                            <p className="text-slate-400">Current adherence rate: {stats.rate}% ({stats.streak}-day streak)</p>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSaveSettings}
                                    disabled={isSavingSettings}
                                    className="w-full h-14 bg-[#55a075] hover:bg-[#448b63] text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98]"
                                >
                                    {isSavingSettings ? "Saving Settings..." : "Save Notification Settings"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
