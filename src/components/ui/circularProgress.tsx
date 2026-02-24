
interface CircularProgressProps {
    progress: number
    size?: string
};

const CircularProgress = ({ progress, size = "w-7 h-7" }: CircularProgressProps) => {
    return (
        <div className={`relative ${size}`}>
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="transparent"
                    className="text-slate-200"
                />
                <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={100}
                    strokeDashoffset={100 - (progress || 0)}
                    strokeLinecap="round"
                    className="text-emerald-500 transition-all duration-700 ease-in-out"
                />
            </svg>
        </div>
    )
};

export default CircularProgress;
