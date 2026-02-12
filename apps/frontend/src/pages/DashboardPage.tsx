import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { branchesApi, Branch } from '../api/branches';

export default function DashboardPage() {
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stats Cards */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">calendar_month</span>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">24</h3>
              <p className="text-sm text-gray-500">Записей сегодня</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-purple-600 text-3xl">group</span>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+8%</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">156</h3>
              <p className="text-sm text-gray-500">Клиентов</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-amber-600 text-3xl">payments</span>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+15%</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">₽45,230</h3>
              <p className="text-sm text-gray-500">Выручка за день</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">0%</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">18</h3>
              <p className="text-sm text-gray-500">Завершено</p>
            </div>
          </div>

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
