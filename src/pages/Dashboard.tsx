import { useState, useEffect } from "react"
import PatientDashboard from "./PatientDashboard"
import CaretakerDashboard from "./CaretakerDashboard"
import ChooseYourRole from "./ChooseYourRole"

export default function Dashboard() {
    const [role, setRole] = useState<string | null>(null)

    useEffect(() => {
        const savedRole = localStorage.getItem('user_role');
        if (savedRole) {
            setRole(savedRole);
        }
    }, [])

    const handleSetRole = (selectedRole: string) => {
        localStorage.setItem('user_role', selectedRole);
        setRole(selectedRole);
    }

    if (!role) {
        return <ChooseYourRole onRoleSelect={handleSetRole} />
    }

    if (role === 'caretaker') {
        return <CaretakerDashboard />
    }

    return <PatientDashboard />
}
