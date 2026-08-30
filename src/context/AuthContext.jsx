import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const IMPERSONATION_KEY = 'pb_impersonated_company'

function readStoredImpersonation() {
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [ownCompany, setOwnCompany] = useState(null)
  const [impersonatedCompany, setImpersonatedCompany] = useState(readStoredImpersonation)
  const [employeeRecord, setEmployeeRecord] = useState(null)
  const [loading, setLoading] = useState(true)

  const company = impersonatedCompany ?? ownCompany

  const enterCompany = useCallback((companyRow) => {
    setImpersonatedCompany(companyRow)
    try {
      sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(companyRow))
    } catch {
      // ignore storage failures (e.g. private browsing) -- impersonation still works for this tab
    }
  }, [])

  const exitImpersonation = useCallback(() => {
    setImpersonatedCompany(null)
    try {
      sessionStorage.removeItem(IMPERSONATION_KEY)
    } catch {
      // ignore
    }
  }, [])

  const loadProfile = useCallback(async (userId) => {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, full_name, email, company_id, is_platform_admin')
      .eq('id', userId)
      .single()

    setProfile(profileRow ?? null)

    if (profileRow?.company_id) {
      const { data: companyRow } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profileRow.company_id)
        .single()
      setOwnCompany(companyRow ?? null)
    } else {
      setOwnCompany(null)
    }

    const { data: employeeRow, error: employeeError } = await supabase
      .from('employees')
      .select('id, employee_code, full_name, gender, personal_email, phone, address, emergency_contact_name, emergency_contact_phone, bank_name, bank_account_number, bank_iban, joining_date, photo_url, department_id, designation_id, departments!employees_department_id_fkey(name), designations(name)')
      .eq('user_id', userId)
      .maybeSingle()

    if (employeeError) console.error('Failed to load employee record:', employeeError.message)
    setEmployeeRecord(employeeRow ?? null)
  }, [])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return
      setSession(initialSession)
      if (initialSession?.user) {
        loadProfile(initialSession.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        if (event === 'SIGNED_IN') {
          // A real sign-in (Login.jsx navigates to /app immediately after
          // this fires, without waiting for loadProfile) -- keep `loading`
          // true for this window too, exactly like the initial getSession()
          // load above, so ProtectedRoute/EmployeeProtectedRoute hold their
          // FullPageLoader until profile/company/employeeRecord are
          // actually populated. Without this, every page under /app or
          // /employee that reads company.id (291 call sites across 24
          // pages, none of them optional-chained -- they all trust this
          // guard) can mount with company still null and crash.
          setLoading(true)
          loadProfile(newSession.user.id).finally(() => setLoading(false))
        } else {
          // Token refresh, user-metadata update, etc. -- keep the
          // profile/company data fresh without flashing the full-page
          // loader over an already-loaded app.
          loadProfile(newSession.user.id)
        }
      } else {
        setProfile(null)
        setOwnCompany(null)
        setEmployeeRecord(null)
        exitImpersonation()
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(() => {
    if (session?.user) return loadProfile(session.user.id)
  }, [session, loadProfile])

  const signOut = useCallback(() => {
    exitImpersonation()
    return supabase.auth.signOut()
  }, [exitImpersonation])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    company,
    isImpersonating: !!impersonatedCompany,
    enterCompany,
    exitImpersonation,
    // a platform admin viewing another company isn't an employee of it
    employeeRecord: impersonatedCompany ? null : employeeRecord,
    loading,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
