import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { branchesApi, Branch } from '../api/branches';
import { apiClient } from '../api/client';

interface DashboardStats {
  todayAppointments: number;
  todayRevenue: number;
  monthRevenue: number;
  revenueGrowth: number;
  totalClients: number;
  newClientsThisMonth: number;
  activeEmployees: number;
}

interface ChartData {
  label: string;
  revenue: number;
  appointments: number;
}

interface RecentAppointment {
  id: string;
  startAt: string;
  total: number;
  status: string;
  client?: { fullName: string };
  masterEmployee?: { fullName: string };
}

export default function DashboardPage() {
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueChart, setRevenueChart] = useState<ChartData[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadDashboardData();
    }
  }, [selectedBranch]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const data = await branchesApi.list();
      setBranches(data);
      if (data.length > 0 && !selectedBranch) {
        setSelectedBranch(data[0]);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setDataLoading(true);
      const [statsData, chartData, appointmentsData] = await Promise.all([
        apiClient.get<DashboardStats>(`/dashboard/stats?branchId=${selectedBranch?.id || ''}`),
        apiClient.get<ChartData[]>(`/dashboard/revenue-chart?branchId=${selectedBranch?.id || ''}&period=week`),
        apiClient.get<RecentAppointment[]>(`/dashboard/recent-appointments?branchId=${selectedBranch?.id || ''}&limit=5`),
      ]);
      setStats(statsData);
      setRevenueChart(chartData);
      setRecentAppointments(appointmentsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const formatCurrency = (kopeks: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(kopeks / 100);
  };

  return (
    <Layout>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 pt-3 pb-0 flex flex-col gap-3 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Date Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button className="p-1 hover:bg-white rounded shadow-sm transition-all">
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
                <button className="px-3 text-xs font-bold uppercase tracking-wider">Сегодня</button>
                <button className="p-1 hover:bg-white rounded shadow-sm transition-all">
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>
              <span className="text-lg font-bold ml-2">10 февраля 2026</span>
            </div>

            {/* Branch Selector */}
            <div className="relative">
              <button 
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium hover:border-primary transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">storefront</span>
                <span>{selectedBranch?.name || 'Выберите филиал'}</span>
                <span className="material-symbols-outlined text-lg">expand_more</span>
              </button>

              {/* Dropdown */}
              {isBranchDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsBranchDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-20">
                    <div className="p-2">
                      {branches.map((branch) => (
                        <button
                          key={branch.id}
                          onClick={() => {
                            setSelectedBranch(branch);
                            setIsBranchDropdownOpen(false);
                          }}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            selectedBranch?.id === branch.id
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xl mt-0.5">
                            {selectedBranch?.id === branch.id ? 'check_circle' : 'storefront'}
                          </span>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{branch.name}</div>
                            {branch.address && (
                              <div className="text-xs text-gray-500">{branch.address}</div>
                            )}
                          </div>
                        </button>
                      ))}
                      {branches.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          Нет филиалов
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden mr-3">
              <button className="px-4 py-1.5 text-xs font-bold bg-white border-r border-gray-200">ДЕНЬ</button>
              <button className="px-4 py-1.5 text-xs font-bold bg-gray-50 text-gray-500">НЕДЕЛЯ</button>
            </div>

            {/* Notifications */}
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1 right-1 bg-red-500 size-2 rounded-full"></span>
            </button>

            {/* New Booking Button */}
            <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
              <span className="material-symbols-outlined text-lg">add_circle</span>
              <span>Новая бронь</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Дашборд</h2>
          
          {dataLoading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка данных...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stats Cards */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="material-symbols-outlined text-primary text-3xl">calendar_month</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      (stats?.todayAppointments || 0) > 0 ? 'text-green-600 bg-green-50' : 'text-gray-500 bg-gray-100'
                    }`}>
                      {stats?.todayAppointments || 0}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{stats?.todayAppointments || 0}</h3>
                  <p className="text-sm text-gray-500">Записей сегодня</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="material-symbols-outlined text-purple-600 text-3xl">group</span>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      +{stats?.newClientsThisMonth || 0}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{stats?.totalClients || 0}</h3>
                  <p className="text-sm text-gray-500">Всего клиентов</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="material-symbols-outlined text-amber-600 text-3xl">payments</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      (stats?.revenueGrowth || 0) >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                    }`}>
                      {(stats?.revenueGrowth || 0) >= 0 ? '+' : ''}{stats?.revenueGrowth || 0}%
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{formatCurrency(stats?.todayRevenue || 0)}</h3>
                  <p className="text-sm text-gray-500">Выручка за день</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      {stats?.activeEmployees || 0}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{formatCurrency(stats?.monthRevenue || 0)}</h3>
                  <p className="text-sm text-gray-500">Выручка за месяц</p>
                </div>
              </div>

              {/* Revenue Chart */}
              {revenueChart.length > 0 && (
                <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Выручка за неделю</h3>
                  <div className="flex items-end gap-4 h-48">
                    {revenueChart.map((item, index) => {
                      const maxRevenue = Math.max(...revenueChart.map(d => d.revenue), 1);
                      const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full flex flex-col items-center">
                            <span className="text-xs text-gray-500 mb-1">
                              {formatCurrency(item.revenue)}
                            </span>
                            <div 
                              className="w-full bg-primary/20 rounded-t-lg relative group cursor-pointer"
                              style={{ height: `${Math.max(height * 0.8, 4)}px` }}
                            >
                              <div 
                                className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-lg transition-all"
                                style={{ height: '100%' }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 capitalize">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Appointments */}
              {recentAppointments.length > 0 && (
                <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Последние записи</h3>
                  <div className="space-y-3">
                    {recentAppointments.map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">event</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{apt.client?.fullName || 'Неизвестный клиент'}</p>
                            <p className="text-xs text-gray-500">
                              {apt.masterEmployee?.fullName || 'Неизвестный мастер'} • {new Date(apt.startAt).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(apt.total)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            apt.status === 'done' ? 'bg-green-100 text-green-700' :
                            apt.status === 'canceled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {apt.status === 'done' ? 'Выполнено' :
                             apt.status === 'canceled' ? 'Отменено' :
                             apt.status === 'confirmed' ? 'Подтверждено' :
                             apt.status === 'new' ? 'Новое' : apt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">Быстрые действия</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="bg-white border border-gray-200 rounded-xl p-6 hover:border-primary hover:shadow-md transition-all text-left">
                <span className="material-symbols-outlined text-primary text-3xl mb-3">person_add</span>
                <h4 className="font-semibold mb-1">Добавить клиента</h4>
                <p className="text-sm text-gray-500">Создать карточку нового клиента</p>
              </button>

              <button className="bg-white border border-gray-200 rounded-xl p-6 hover:border-primary hover:shadow-md transition-all text-left">
                <span className="material-symbols-outlined text-primary text-3xl mb-3">event_available</span>
                <h4 className="font-semibold mb-1">Новая запись</h4>
                <p className="text-sm text-gray-500">Создать бронирование на услугу</p>
              </button>

              <button className="bg-white border border-gray-200 rounded-xl p-6 hover:border-primary hover:shadow-md transition-all text-left">
                <span className="material-symbols-outlined text-primary text-3xl mb-3">inventory_2</span>
                <h4 className="font-semibold mb-1">Склад</h4>
                <p className="text-sm text-gray-500">Управление товарами</p>
              </button>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
