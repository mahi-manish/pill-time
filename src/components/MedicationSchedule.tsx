
import { Check, X, Trash2, Sun, CloudIcon, Moon, Bed } from "lucide-react";
import { format, isToday, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface Medication {
    id: string;
    name: string;
    dosage: string;
    reminder_time: string;
    instructions?: string;
}

interface MedicationScheduleProps {
    medications: Medication[];
    selectedDate: Date;
    isTaken: (medId: string) => boolean;
    onToggleTaken?: (medId: string, currentStatus: boolean) => void;
    onDelete?: (medId: string) => void;
    isCaretaker?: boolean;
}

const MedicationSchedule = ({
    medications,
    selectedDate,
    isTaken,
    onToggleTaken,
    onDelete,
    isCaretaker = false
}: MedicationScheduleProps) => {

    const getMedIcon = (time: string) => {
        const hour = parseInt(time.split(':')[0]);
        if (hour < 10) return { icon: <Sun className="w-5 h-5" />, color: "text-amber-500", bg: "bg-amber-50" };
        if (hour < 15) return { icon: <CloudIcon className="w-5 h-5" />, color: "text-blue-500", bg: "bg-blue-50" };
        if (hour < 20) return { icon: <Moon className="w-5 h-5" />, color: "text-indigo-500", bg: "bg-indigo-50" };
        return { icon: <Bed className="w-5 h-5" />, color: "text-slate-500", bg: "bg-slate-50" };
    };

    const todayStr = format(new Date(), "yyyy-MM-dd");

    return (
        <div className={cn(
            "bg-white border border-slate-100 rounded-[24px] p-0 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300",
            !isCaretaker && "lg:col-span-7"
        )}>
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
                {medications?.map((med) => {
                    const taken = isTaken(med.id);
                    const style = getMedIcon(med.reminder_time);
                    // @ts-ignore
                    const isMedInPast = med.target_date && med.target_date < todayStr;

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
                                {isCaretaker && !isMedInPast && onDelete && (
                                    <button
                                        onClick={() => onDelete(med.id)}
                                        className="h-8 w-8 flex items-center justify-center rounded-xl bg-slate-50 text-rose-400 hover:bg-rose-50 hover:text-red-500 transition-all border border-slate-100 shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}

                                {!isCaretaker ? (
                                    <div
                                        onClick={() => {
                                            if (isToday(selectedDate) && onToggleTaken) {
                                                onToggleTaken(med.id, taken);
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2 py-0 rounded-full cursor-pointer transition-all border select-none h-[26px] w-fit shrink-0",
                                            taken
                                                ? "bg-emerald-50/50 border-emerald-100"
                                                : "bg-slate-50/30 border-slate-100",
                                            !isToday(selectedDate) && "opacity-40 pointer-events-none"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-[8.5px] font-black tracking-tight",
                                            taken ? "text-emerald-600" : "text-slate-400"
                                        )}>
                                            {taken ? "Done" : "Mark"}
                                        </span>
                                        <div className={cn(
                                            "w-6 h-3.5 rounded-full relative transition-all duration-300",
                                            taken ? "bg-emerald-500" : "bg-slate-200"
                                        )}>
                                            <div className={cn(
                                                "absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all duration-300 flex items-center justify-center",
                                                taken ? "translate-x-2.5" : "translate-x-0"
                                            )}>
                                                {taken && <Check className="w-1.5 h-1.5 text-emerald-500 stroke-[5]" />}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={cn(
                                        "h-6 w-6 flex items-center justify-center rounded-full transition-all shadow-sm shrink-0",
                                        taken ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300"
                                    )}>
                                        {taken ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {medications?.length === 0 && (
                    <div className="py-20 text-center text-slate-400 tracking-widest text-xs">No medications scheduled</div>
                )}
            </div>
        </div>
    );
};

export default MedicationSchedule;
