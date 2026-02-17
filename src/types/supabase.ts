export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            medication_logs: {
                Row: {
                    id: string
                    medication_id: string
                    user_id: string
                    date: string
                    taken: boolean
                    marked_at: string
                }
                Insert: {
                    id?: string
                    medication_id: string
                    user_id: string
                    date: string
                    taken?: boolean
                    marked_at?: string
                }
                Update: {
                    id?: string
                    medication_id?: string
                    user_id?: string
                    date?: string
                    taken?: boolean
                    marked_at?: string
                }
            }
            medications: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    dosage: string | null
                    reminder_time: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    dosage?: string | null
                    reminder_time: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    dosage?: string | null
                    reminder_time?: string
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    name: string
                    email: string | null
                    role: 'patient' | 'caretaker' | null
                    created_at: string
                }
                Insert: {
                    id: string
                    name?: string
                    email?: string | null
                    role?: 'patient' | 'caretaker' | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string | null
                    role?: 'patient' | 'caretaker' | null
                    created_at?: string
                }
            }
        }
    }
}
