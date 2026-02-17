
import { useState, useMemo } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, subMonths, addMonths, subWeeks, addWeeks, startOfWeek, endOfWeek, isFuture, isToday } from "date-fns"
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
    className?: string
}

export default function Calendar({ selectedDate, onDateSelect, logs, className }: CalendarProps) {
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('monthly')
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
        if (!logs) return 'neutral'

        // If it's today, we might want to show partial/pending status?
        // But for now sticking to taken/missed logic.

        const dateStr = format(date, "yyyy-MM-dd")
        const daysLogs = logs.filter(l => l.date === dateStr)

        if (daysLogs.length === 0) return 'neutral'

        const allTaken = daysLogs.every(l => l.taken)
        if (allTaken) return 'taken'

        // If some logs exist but not all taken, it's either partial (if today) or missed (if past).
        // Simplification: if any taken false -> missed (red).
        return 'missed'
    }

    return (
        <div className={cn("bg-white rounded-3xl p-8 shadow-sm border border-slate-100 w-full max-w-md mx-auto font-sans", className)}>
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
            <div className="flex items-center justify-between mb-8 px-2">
                <button
                    onClick={handlePrevious}
                    className="h-10 w-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-slate-100"
                >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div className="text-base font-bold text-slate-800">
                    {format(currentDate, "MMMM yyyy")}
                </div>
                <button
                    onClick={handleNext}
                    className="h-10 w-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-slate-100"
                >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 gap-x-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-xs font-medium text-slate-400 text-center">{day}</div>
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
                    let textClass = "text-slate-600"

                    if (isSelected) {
                        bgClass = "bg-slate-100 ring-2 ring-slate-200" // Selection ring
                        textClass = "text-slate-900 font-bold"
                    }

                    return (
                        <div key={i} className="flex flex-col items-center justify-center">
                            <button
                                onClick={() => onDateSelect(date)}
                                className={cn(
                                    "h-9 w-9 rounded-full flex items-center justify-center text-sm transition-all relative group",
                                    textClass,
                                    bgClass,
                                    !isSelected && "hover:bg-slate-50"
                                )}
                            >
                                <span className={cn("relative z-10", isTodayDate && "text-white")}>{date.getDate()}</span>

                                {/* Background Indicators for Today/Taken/Missed */}
                                {isTodayDate && (
                                    <div className="absolute inset-0 bg-blue-600 rounded-full z-0" />
                                )}

                                {!isTodayDate && !isFutureDate && status === 'taken' && (
                                    <div className="absolute inset-0 bg-emerald-400/20 rounded-full z-0">
                                        <div className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-emerald-500 top-7" />
                                    </div>
                                )}

                                {!isTodayDate && !isFutureDate && status === 'missed' && (
                                    <div className="absolute inset-0 bg-rose-400/20 rounded-full z-0">
                                        <div className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-rose-500 top-7" />
                                    </div>
                                )}
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-slate-600">Taken</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-sm font-medium text-slate-600">Missed</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span className="text-sm font-medium text-slate-600">Today</span>
                </div>
            </div>
        </div>
    )
}
