import { useAuth } from "@/context/AuthContext"
import PatientDashboard from "@/pages/patientDashboard"
import CaretakerDashboard from "@/pages/caretakerDashboard"
import ChooseYourRole from "@/pages/chooseYourRole"

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
