import { useAuth } from "@/context/AuthContext"
import PatientDashboard from "./PatientDashboard"
import CaretakerDashboard from "./CaretakerDashboard"
import ChooseYourRole from "./ChooseYourRole"

export default function Dashboard() {
    const { userRole, updateRole } = useAuth()

    if (!userRole) {
        return <ChooseYourRole onRoleSelect={updateRole} />
    }

    if (userRole === 'caretaker') {
        return <CaretakerDashboard />
    }

    return <PatientDashboard />
}
