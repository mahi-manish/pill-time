
const DashboardHeader = ({ fullName, role }: { fullName: string; role: "Patient" | "Caretaker" }) => {
    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    }

    const roleBadgeColor = role === "Patient" 
        ? "bg-green-100 text-green-600" 
        : "bg-blue-100 text-blue-600";

    return (
        <div className="space-y-1 pt-8">
            <p className="text-sm font-medium text-slate-500">{getGreeting()},</p>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                {fullName || 'User'}
            </h1>
            <div className="flex items-center gap-2 pt-1">
                <span className={`${roleBadgeColor} px-3 py-1 rounded-full text-xs font-bold tracking-wider`}>
                    {role}
                </span>
            </div>
        </div>
    )
}

export default DashboardHeader;
