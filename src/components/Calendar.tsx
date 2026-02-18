
import { useState, useMemo } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, subMonths, addMonths, subWeeks, addWeeks, startOfWeek, endOfWeek, isFuture, isToday, isPast } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface MedicationLog {
    medication_id: string
    taken: boolean
    date: string
}

interface CalendarProps {
    selectedDate: Date
    onDateSelect: (date: Date) => void
    logs?: MedicationLog[]
    medications?: any[]
    className?: string
}

export default function Calendar({ selectedDate, onDateSelect, logs, medications, className }: CalendarProps) {
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly')
    const [currentDate, setCurrentDate] = useState(new Date())

    const handlePrevious = () => {
        if (viewMode === 'weekly') {
            setCurrentDate(prev => subWeeks(prev, 1))
        } else {
            setCurrentDate(prev => subMonths(prev, 1))
        }
    }

    const handleNext = () => {
        if (viewMode === 'weekly') {
            setCurrentDate(prev => addWeeks(prev, 1))
        } else {
            setCurrentDate(prev => addMonths(prev, 1))
        }
    }

    const calendarDays = useMemo(() => {
        if (viewMode === 'weekly') {
            const start = startOfWeek(currentDate)
            const end = endOfWeek(currentDate)
            return eachDayOfInterval({ start, end })
        }
        const start = startOfMonth(currentDate)
        const end = endOfMonth(currentDate)
        return eachDayOfInterval({ start, end })
    }, [currentDate, viewMode])

    const getDayStatus = (date: Date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const isPastDay = isPast(date) && !isToday(date);

        // 1. Find medications scheduled for this day
        const medsForDay = (medications || []).filter(med => {
            if (!med.target_date) return true; // Daily routine
            return med.target_date === dateStr; // Specific date
        });

        // 2. Check logs for this day
        const dayLogs = (logs || []).filter(l => l.date === dateStr && l.taken);

        // 3. Logic: All taken = Green (Only if there ARE medications)
        if (medsForDay.length > 0 && dayLogs.length >= medsForDay.length) {
            return 'taken';
        }

        // 4. User request: Mark all past days as Red if not 'taken'
        // If it's a past day and we don't have a 'taken' status, it's 'missed' (Red)
        if (isPastDay) {
            return 'missed';
        }

        // 5. Today's logic: Show red only if some are missed
        if (isToday(date) && medsForDay.length > 0 && dayLogs.length < medsForDay.length) {
            return 'missed';
        }

        return 'neutral';
    }

    return (
        <div className={cn("bg-white rounded-[32px] p-8 shadow-sm hover:shadow-md border border-slate-100 w-full h-full font-sans transition-all duration-300", className)}>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Calendar View</h2>

                {/* View Mode Toggle - Subtle and Compact */}
                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                    <button
                        onClick={() => setViewMode('weekly')}
                        className={cn(
                            "px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all",
                            viewMode === 'weekly' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >Week</button>
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={cn(
                            "px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all",
                            viewMode === 'monthly' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >Month</button>
                </div>
            </div>

            {/* Navigation Header - Centered Month */}
            <div className="flex items-center justify-between mb-6 px-1">
                <button
                    onClick={handlePrevious}
                    className="h-8 w-8 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-800 border border-slate-100 shadow-sm"
                >
                    <ChevronLeft className="w-4 h-4 stroke-[3]" />
                </button>
                <div className="text-sm font-bold text-slate-700 tracking-tight">
                    {format(currentDate, "MMMM yyyy")}
                </div>
                <button
                    onClick={handleNext}
                    className="h-8 w-8 flex items-center justify-center hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-800 border border-slate-100 shadow-sm"
                >
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-2 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">{day}</div>
                ))}

                {viewMode === 'monthly' && Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => (
                    <div key={`offset-${i}`} />
                ))}

                {calendarDays.map((date, i) => {
                    const isSelected = isSameDay(date, selectedDate)
                    const isTodayDate = isToday(date)
                    const status = getDayStatus(date)
                    const isFutureDate = isFuture(date)

                    let bgClass = ""

                    if (isSelected) {
                        bgClass = "bg-blue-50 ring-1 ring-blue-200" // Premium selection
                    }

                    return (
                        <div key={i} className="flex flex-col items-center justify-center">
                            <button
                                onClick={() => onDateSelect(date)}
                                className={cn(
                                    "h-9 w-9 rounded-full flex items-center justify-center text-sm transition-all relative group",
                                    bgClass,
                                    !isSelected && "hover:bg-slate-50"
                                )}
                            >
                                <span className={cn(
                                    "relative z-10 transition-all duration-300",
                                    isTodayDate ? "text-white font-black" : isSelected ? "text-blue-600 font-bold scale-110" : "text-slate-600"
                                )}>
                                    {date.getDate()}
                                </span>

                                {/* Status Badge (Top-Right Subtle & Clean) */}
                                {!isFutureDate && (status === 'taken' || status === 'missed') && (
                                    <div className={cn(
                                        "absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full z-30 border-2 border-white shadow-sm",
                                        status === 'taken' ? "bg-emerald-500" : "bg-rose-500"
                                    )} />
                                )}

                                {/* Today Indicator */}
                                {isTodayDate && (
                                    <div className="absolute inset-0 bg-blue-600 rounded-full z-0 shadow-lg shadow-blue-200" />
                                )}

                                {/* Selected Background */}
                                {isSelected && !isTodayDate && (
                                    <div className="absolute inset-0 bg-blue-50/80 rounded-full z-0 border border-blue-100/50" />
                                )}
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-6 border-t border-slate-100 mt-2">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taken</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Missed</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</span>
                </div>
            </div>
        </div>
    )
}
