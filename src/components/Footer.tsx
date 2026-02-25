import packageJson from "../../package.json";

export default function Footer() {
    return (
        <footer className="w-full py-2 mt-2">
            <div className="flex flex-col items-center justify-center gap-1 text-center">
                <p className="text-sm font-medium text-gray-700">
                    Pill Time • v{packageJson.version}
                </p>
                <p className="text-xs text-gray-500">
                    Crafted to empower patients & reassure caregivers.
                </p>
            </div>
        </footer>
    )
}