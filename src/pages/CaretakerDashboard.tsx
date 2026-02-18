
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
    Mail,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Calendar from "@/components/Calendar";
import { format, subDays } from "date-fns";
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
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState<"schedule" | "settings">("schedule");

    // Settings States
    const [caretakerEmail, setCaretakerEmail] = useState("");
    const [missedAlertsEnabled, setMissedAlertsEnabled] = useState(true);
    const [alertDelay, setAlertDelay] = useState("2 hours");
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
            if (profile.alert_delay) {
                setAlertDelay(profile.alert_delay);
            }
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
                        // If i === 0 (today) and not all meds are taken, streak doesn't break yet
                        // as the day might not be over.
                    }

                    // Adherence (Last 30 days)
                    if (i < 30) { // Changed from i <= 30 to i < 30 to get exactly 30 days (0-29)
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
                .insert(newMed)
                .select();
            
            if (error) throw error;

            // Step 2: Create initial log entry
            // This ensures it's picked up by the email alert system immediately
            if (data && data.length > 0) {
                const todayStr = format(new Date(), "yyyy-MM-dd");
                const logsToCreate: any[] = [];

                data.forEach((med: any) => {
                    // For each created medication (which corresponds to a date), create a log
                    // If target_date is set (Specific Dates), use that date
                    // If target_date is null, use today's date as the start
                    const logDate = med.target_date || todayStr;
                    
                    logsToCreate.push({
                        medication_id: med.id,
                        user_id: med.user_id,
                        date: logDate,
                        taken: false,
                        alert_sent: false
                    });
                });

                if (logsToCreate.length > 0) {
                    const { error: logError } = await supabase
                        .from("medication_logs")
                        .insert(logsToCreate);
                    
                    if (logError) {
                        console.error("Error creating initial log:", logError);
                    }
                }
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["medications", targetUserId] });
            queryClient.invalidateQueries({ queryKey: ["logs", targetUserId] }); // Also invalidate logs
            setMedName("");
            setMedDosage("");
            setMedInstructions("");
            setSelectedDates([]);
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
        const todayStr = format(new Date(), "yyyy-MM-dd");

        const newMedications = selectedDates.length > 0 
            ? selectedDates.map(date => ({
                user_id: targetUserId,
                name: medName,
                dosage: medDosage || "1 Tablet",
                reminder_time: medTime,
                instructions: medInstructions,
                target_date: date,
                frequency: "Once"
            }))
            : {
                user_id: targetUserId,
                name: medName,
                dosage: medDosage || "1 Tablet",
                reminder_time: medTime,
                instructions: medInstructions,
                target_date: todayStr,
                frequency: "Daily"
            };

        addMedicationMutation.mutate(newMedications);
    };

    const deleteMedicationMutation = useMutation({
        mutationFn: async (medId: string) => {
            const { error } = await supabase
                .from("medications")
                .delete()
                .eq("id", medId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["medications", targetUserId] });
        },
        onError: (error: any) => {
            console.error("Error deleting medication:", error);
            alert("Failed to delete medication: " + error.message);
        }
    });

    const handleDeleteMedication = (id: string) => {
        if (confirm("Are you sure you want to delete this medication?")) {
            deleteMedicationMutation.mutate(id);
        }
    };

    const updateSettingsMutation = useMutation({
        mutationFn: async () => {
            if (!session?.user?.id) throw new Error("No user logged in");
            
            const { error } = await supabase
                .from("profiles")
                .update({
                    caretaker_email: caretakerEmail,
                    alert_delay: alertDelay
                })
                .eq("id", session.user.id); // Profile ID matches Auth User ID
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
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6 pb-2">
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
                <div className="bg-[#b0e0e6] rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-100 w-full lg:w-auto min-w-[320px] flex flex-col justify-between h-auto gap-4">
                    <div className="flex items-start justify-between gap-10">
                        {/* Today's Dosage */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-500">Today's Dosage:</p>
                            <div className="text-3xl font-bold text-slate-700">{stats.taken}/{stats.today}</div>
                            {stats.taken > 0 && stats.taken === stats.today && (
                                <div className="h-6 w-6 ml-2 flex items-center justify-center rounded-full transition-all shadow-sm bg-emerald-500 text-white">
                                    <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                            )}
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
                <div className="bg-white rounded-3xl p-0 shadow-sm hover:shadow-md overflow-hidden h-fit">
                    <div className="p-8 flex items-center justify-between bg-white">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Medication Schedule</h2>
                            <p className="text-xs font-medium text-slate-400 mt-1 tracking-widest">{format(selectedDate, "EEEE, MMMM dd, yyyy")}</p>
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
                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                        <button
                                            onClick={() => handleDeleteMedication(med.id)}
                                            className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-50 text-rose-400 hover:bg-rose-50 hover:text-red-500 transition-all border border-slate-100 shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className={cn(
                                            "h-6 w-6 flex items-center justify-center rounded-full transition-all shadow-sm shrink-0",
                                            taken ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300"
                                        )}>
                                            {taken ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
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

            {/* New Medication Schedule Form Section */}
            <div className="mt-4 animate-slide-up delay-200">
                <div className="realistic-card p-0 overflow-hidden bg-white max-w-[900px]">
                    {/* Tabs */}
                    <div className="flex bg-slate-50 border-b border-slate-100 h-11">
                        <button
                            onClick={() => setActiveTab("schedule")}
                            className={cn(
                                "px-6 h-full font-bold text-xs tracking-wider transition-all",
                                activeTab === "schedule" ? "bg-[#2563eb] text-white" : "bg-transparent text-slate-400 hover:text-slate-600"
                            )}
                        >
                            Schedule
                        </button>
                        <button
                            onClick={() => setActiveTab("settings")}
                            className={cn(
                                "px-6 h-full font-bold text-xs tracking-wider transition-all border-r border-slate-100",
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
                                    Schedule patient's medication
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 mt-0.5 flex items-center gap-2">
                                        <span className="w-1 h-1 bg-blue-400 rounded-full"></span> Medicine Name
                                    </label>
                                    <Input
                                        value={medName}
                                        onChange={(e) => setMedName(e.target.value)}
                                        placeholder="e.g. Morning Pills"
                                        className="h-11 border-slate-100 bg-slate-50/50 rounded-xl focus:ring-blue-500/20 transition-all font-medium text-slate-700 shadow-none hover:border-slate-200"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 mt-0.5 flex items-center gap-2">
                                        <span className="w-1 h-1 bg-blue-400 rounded-full"></span> Target Dates
                                    </label>
                                    <div className="relative group">
                                        <div className="min-h-[44px] border-slate-300 bg-slate-50/50 rounded-xl px-3 py-2 flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-blue-500/20 transition-all font-medium text-slate-700 shadow-none hover:border-slate-400">
                                            {selectedDates.map(date => (
                                                <div key={date} className="h-7 bg-blue-100/50 text-blue-600 rounded-lg pl-2 pr-1 flex items-center gap-1 text-xs font-bold animate-in fade-in zoom-in duration-200">
                                                    {format(new Date(date), "MMM dd")}
                                                    <button
                                                        onClick={() => setSelectedDates(prev => prev.filter(d => d !== date))}
                                                        className="h-5 w-5 hover:bg-white/50 rounded-md flex items-center justify-center transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <input
                                                type="date"
                                                min={format(new Date(), "yyyy-MM-dd")}
                                                className="bg-transparent border-none outline-none text-sm h-7 w-auto min-w-[20px] p-0 text-slate-700 font-medium cursor-pointer"
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        const newDate = e.target.value;
                                                        if (!selectedDates.includes(newDate)) {
                                                            setSelectedDates(prev => [...prev, newDate].sort());
                                                        }
                                                        e.target.value = ""; // Reset input
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium pl-1">
                                        {selectedDates.length > 0 ? `${selectedDates.length} days selected` : "You can select multiple dates"}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 mt-0.5 flex items-center gap-2">
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
                                    <label className="text-xs font-medium text-slate-400 mt-0.5 flex items-center gap-2">
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
                                <label className="text-xs font-medium text-slate-400 mt-0.5 flex items-center gap-2">
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
                                            placeholder="e.g. Take after meal"
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
                                    {isSubmitting ? "Saving..." : "Add Schedule"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 md:p-8 space-y-8">

                            <div className="space-y-6">
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
                                            <label className="text-xs font-medium text-slate-400 mt-0.5">Caretaker Email Address</label>
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
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-400 mt-0.5">Alert Delay</label>
                                            <div className="relative">
                                                <select
                                                    value={alertDelay}
                                                    onChange={(e) => setAlertDelay(e.target.value)}
                                                    className="w-full h-12 bg-white border border-slate-100 rounded-xl px-4 text-sm font-medium text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                                >
                                                    <option>10 min</option>
                                                    <option>30 min</option>
                                                    <option>1 hour</option>
                                                    <option>2 hours</option>
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex pt-4">
                                        <Button
                                            onClick={handleSaveSettings}
                                            disabled={isSavingSettings || !missedAlertsEnabled}
                                            className="h-9 px-4 md:h-11 md:px-8 bg-[#55a075] hover:bg-[#448b63] text-white rounded-xl font-bold text-xs md:text-sm shadow-md shadow-emerald-500/10 transition-all active:scale-[0.98]"
                                        >
                                            {isSavingSettings ? "Saving Settings..." : "Save Notification Settings"}
                                        </Button>
                                    </div>
                                </div>

                                
                                {/* Manual Alert Test */}
                                <div className="bg-orange-50/50 rounded-2xl p-6 border border-orange-100 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 bg-orange-100/50 rounded-xl">
                                            <Bell className="w-5 h-5 text-orange-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">Automatic Alerts</h3>
                                            <p className="text-sm text-slate-500 font-medium mt-1">
                                                An automatic alert email will be sent to the caretaker email after {alertDelay} delay if medication is missed.
                                            </p>
                                            <p className="text-sm text-slate-500 font-medium mt-1">
                                                To send a reminder email, click the button below.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pl-[52px]">
                                        <Button 
                                            onClick={async () => {
                                                const { error } = await supabase.functions.invoke('check-missed-meds');
                                                if (error) {
                                                    alert('Error sending alert: ' + error.message);
                                                } else {
                                                    alert('Alert email has been sent!');
                                                }
                                            }}
                                            className="bg-[#55a075] hover:bg-[#448b63] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-transform h-9 px-4 text-xs md:h-10 md:px-6 md:text-sm"
                                        >
                                            Send Reminder Email
                                        </Button>
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
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
