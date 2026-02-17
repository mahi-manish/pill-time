import { createContext, useContext, useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
    session: Session | null
    user: User | null
    loading: boolean
    signOut: () => Promise<void>
    userRole: string | null
    updateRole: (role: string) => void
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    signOut: async () => { },
    userRole: null,
    updateRole: () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(() => localStorage.getItem('user_role'));

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        })

        return () => subscription.unsubscribe();
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('user_role');
        setUserRole(null);
    }

    const updateRole = (role: string) => {
        localStorage.setItem('user_role', role);
        setUserRole(role);
    }

    return (
        <AuthContext.Provider value={{ session, user, loading, signOut, userRole, updateRole }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
