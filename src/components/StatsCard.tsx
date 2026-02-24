import { Check, Flame } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CircularProgress from "./ui/circularProgress";

interface StatsCardProps {
    variant: "patient" | "caretaker";
    progress: {
        taken: number;
        total: number;
    };
    nextMedication?: {
        time: string;
        name: string;
    } | null;
    adherenceRate?: number;
    streak?: number;
    missedDoses?: number;
}

const StatsCard = ({ variant, progress, streak, nextMedication, adherenceRate, missedDoses }: StatsCardProps) => {
    const bgColor = variant === "patient" ? "bg-[#e6e6fa]" : "bg-[#b0e0e6cc]"

    return (
        <div className={`${bgColor} rounded-[24px] p-6 shadow-sm border border-slate-100 w-full lg:w-auto min-w-[320px] flex flex-col justify-between h-auto gap-4`}>
            <div className="flex items-start justify-between gap-8">
                {/* Today's Progress */}
                <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">Today's Progress:</p>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-slate-700">{progress.taken}/{progress.total}</p>
                        {progress.taken > 0 && progress.taken === progress.total && (
                            <div className="h-4 w-4 ml-2 flex items-center justify-center rounded-full transition-all shadow-sm bg-emerald-500 text-white">
                                <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                        )}
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-none pt-none ml-1">Doses taken</p>
                </div>

                {/* Middle Section: Next Medicine OR Adherence Rate */}
                {nextMedication !== undefined ? (
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-400">Up Next:</p>
                        <div className="flex flex-col">
                            {nextMedication ? (
                                <>
                                    <p className="text-2xl font-bold text-blue-500">
                                        {format(new Date(`2000-01-01T${nextMedication.time}`), "h:mm")}
                                        <span className="text-sm ml-1 select-none">{format(new Date(`2000-01-01T${nextMedication.time}`), "a")}</span>
                                    </p>
                                    <p className="text-xs font-semibold text-slate-500 truncate max-w-[120px]">
                                        {nextMedication.name}
                                    </p>
                                </>
                            ) : (
                                <p className="text-2xl font-bold text-slate-300">--</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-400">Adherence Rate:</p>
                        <div className="flex items-center gap-3">
                            <p className="text-2xl font-bold text-slate-700">{adherenceRate}%</p>
                            <CircularProgress progress={adherenceRate || 0} />
                        </div>
                        <p className="text-xs font-semibold text-slate-500 mt-none pt-none ml-1">This week</p>
                    </div>
                )}


                {/* Last Section: Streak OR Missed Doses */}
                {streak !== undefined ? (
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-400">Streak:</p>
                        <div className="text-2xl font-bold text-slate-700">{streak} <span className="text-sm font-semibold text-slate-600">Day(s)</span></div>
                        {streak > 2 && <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />}
                    </div>
                ) : (
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-400">Missed Doses:</p>
                        <div className={cn("text-2xl font-bold ", !!missedDoses ? "text-red-500" : "text-slate-700")}>{missedDoses}</div>
                        <p className="text-xs font-semibold text-slate-500 mt-none pt-none ml-1">In last 48hr</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default StatsCard;
