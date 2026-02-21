import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import SchedulePage from './pages/SchedulePage'
import ClientsPage from './pages/ClientsPage'
import EmployeesPage from './pages/EmployeesPage'
import EmployeeWeekSchedulePage from './pages/EmployeeWeekSchedulePage'
import ServicesPage from './pages/ServicesPage'
import ProductsPage from './pages/ProductsPage'
import { CalendarPage } from './pages/CalendarPage'
import { MasterCalendarPage } from './pages/MasterCalendarPage'
import { MasterClientsPage } from './pages/MasterClientsPage'
import { MasterServicesPage } from './pages/MasterServicesPage'
import { MasterProductsPage } from './pages/MasterProductsPage'
import { MasterProfilePage } from './pages/MasterProfilePage'
import { CashboxReportPage } from './pages/CashboxReportPage'
import { SalesPage } from './pages/SalesPage'
import ShiftsPage from './pages/ShiftsPage'
import ReportsPage from './pages/ReportsPage'
import ForbiddenPage from './pages/ForbiddenPage'
import RequireFinanceAccess from './components/RequireFinanceAccess'
import { usersApi, UserProfile } from './api/users'

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  // Load user profile on mount and when token changes
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setUser(null)
        setIsLoading(false)
        return
      }
      try {
        const profile = await usersApi.getProfile()
        setUser(profile)
      } catch (err) {
        console.error('Failed to load user:', err)
        localStorage.removeItem('accessToken')
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [currentPath])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  // Простой роутинг
  if (currentPath === '/register') {
    return <RegisterPage />
  }

  if (currentPath === '/login') {
    return <LoginPage />
  }

  // Root path - redirect based on auth
  if (currentPath === '/') {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      return <LoginPage />
    }
    // If authenticated but user not loaded yet, wait
    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка...</p>
          </div>
        </div>
      )
    }
    // If authenticated, show calendar (master or admin)
    const isMaster = user?.role === 'master'
    return isMaster ? <MasterCalendarPage /> : <CalendarPage />
  }

  // dashboard
  if (currentPath === '/dashboard') {
    return <DashboardPage />
  }

  // Settings
  if (currentPath === '/settings') {
    return <SettingsPage />
  }

  // Cashbox Report (finance only)
  if (currentPath === '/reports/cashbox') {
    return (
      <RequireFinanceAccess>
        <CashboxReportPage />
      </RequireFinanceAccess>
    )
  }

  // Sales (finance only)
  if (currentPath === '/sales') {
    return (
      <RequireFinanceAccess>
        <SalesPage />
      </RequireFinanceAccess>
    )
  }

  // Shifts (finance only)
  if (currentPath === '/shifts') {
    return (
      <RequireFinanceAccess>
        <ShiftsPage />
      </RequireFinanceAccess>
    )
  }

  // Reports (finance only)
  if (currentPath === '/reports') {
    return (
      <RequireFinanceAccess>
        <ReportsPage />
      </RequireFinanceAccess>
    )
  }

  // Forbidden page
  if (currentPath === '/forbidden') {
    return <ForbiddenPage />
  }

  // Profile
  if (currentPath === '/profile') {
    const isMaster = user?.role === 'master'
    return isMaster ? <MasterProfilePage /> : <ProfilePage />
  }

  // Schedule
  if (currentPath === '/schedule') {
    return <SchedulePage />
  }

  // Calendar - show different view for master vs admin/owner
  if (currentPath === '/calendar') {
    const isMaster = user?.role === 'master'
    return isMaster ? <MasterCalendarPage /> : <CalendarPage />
  }

  // Clients
  if (currentPath === '/clients') {
    const isMaster = user?.role === 'master'
    return isMaster ? <MasterClientsPage /> : <ClientsPage />
  }

  // Employees list
  if (currentPath === '/employees') {
    return <EmployeesPage />
  }
  
  // Handle /employees/:id (redirect to schedule)
  if (currentPath.startsWith('/employees/') && !currentPath.includes('/schedule')) {
    const employeeId = currentPath.split('/')[2];
    if (employeeId) {
      window.location.replace(`/employee/${employeeId}/schedule`);
      return null;
    }
  }
  
  // Employee week schedule (both /employee/:id/schedule and /employees/:id/schedule)
  if ((currentPath.startsWith('/employee/') || currentPath.startsWith('/employees/')) && currentPath.endsWith('/schedule')) {
    return <EmployeeWeekSchedulePage />
  }

  // Services
  if (currentPath === '/services') {
    const isMaster = user?.role === 'master'
    return isMaster ? <MasterServicesPage /> : <ServicesPage />
  }

  // Products
  if (currentPath === '/products') {
    const isMaster = user?.role === 'master'
    return isMaster ? <MasterProductsPage /> : <ProductsPage />
  }

  return <LoginPage />
}

export default App
