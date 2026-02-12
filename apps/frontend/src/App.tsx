import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import SchedulePage from './pages/SchedulePage'
import ClientsPage from './pages/ClientsPage'
import EmployeesPage from './pages/EmployeesPage'
import ServicesPage from './pages/ServicesPage'
import ProductsPage from './pages/ProductsPage'
import { CalendarPage } from './pages/CalendarPage'

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  // Простой роутинг
  if (currentPath === '/register') {
    return <RegisterPage />
  }

  if (currentPath === '/login' || currentPath === '/') {
    return <LoginPage />
  }

  // Заглушка для dashboard
  if (currentPath === '/dashboard') {
    return <DashboardPage />
  }

  // Settings
  if (currentPath === '/settings') {
    return <SettingsPage />
  }

  // Profile
  if (currentPath === '/profile') {
    return <ProfilePage />
  }

  // Schedule
  if (currentPath === '/schedule') {
    return <SchedulePage />
  }

  // Calendar
  if (currentPath === '/calendar') {
    return <CalendarPage />
  }

  // Clients
  if (currentPath === '/clients') {
    return <ClientsPage />
  }

  // Employees
  if (currentPath === '/employees') {
    return <EmployeesPage />
  }

  // Services
  if (currentPath === '/services') {
    return <ServicesPage />
  }

  // Products
  if (currentPath === '/products') {
    return <ProductsPage />
  }

  return <LoginPage />
}

export default App
