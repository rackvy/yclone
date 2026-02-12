import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { employeesApi, Employee } from '../api/employees';
import { branchesApi, Branch } from '../api/branches';
import { servicesApi } from '../api/services';
import { masterRanksApi, MasterRank } from '../api/masterRanks';

interface ServiceInfo {
  id: string;
  name: string;
  durationMin?: number;
  pricesByRank?: { masterRankId: string; price: number }[];
  category?: { id: string; name: string };
}

interface EmployeeFormData {
  fullName: string;
  phone: string;
  email: string;
  role: 'admin' | 'manager' | 'master';
  branchId: string;
  masterRankId: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  master: 'Мастер',
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [masterRanks, setMasterRanks] = useState<MasterRank[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeServices, setEmployeeServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    fullName: '',
    phone: '',
    email: '',
    role: 'master',
    branchId: '',
    masterRankId: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    
    // Poll for branch changes
    let lastBranchId = localStorage.getItem('selectedBranchId');
    const interval = setInterval(() => {
      const currentBranchId = localStorage.getItem('selectedBranchId');
      if (currentBranchId !== lastBranchId) {
        lastBranchId = currentBranchId;
        loadData();
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [empsData, branchesData, servicesData, ranksData] = await Promise.all([
        employeesApi.list(),
        branchesApi.list(),
        servicesApi.list(),
        masterRanksApi.list(),
      ]);
      
      // Filter by selected branch
      const savedBranchId = localStorage.getItem('selectedBranchId');
      const filteredEmps = empsData.filter(e => {
        if (e.status !== 'active') return false;
        if (savedBranchId && e.branchId !== savedBranchId) return false;
        return true;
      });
      
      setEmployees(filteredEmps);
      setBranches(branchesData);
      setServices(servicesData.map(s => ({ 
        id: s.id, 
        name: s.name,
        durationMin: s.durationMin,
        pricesByRank: s.pricesByRank.map(p => ({ masterRankId: p.masterRankId, price: p.price }))
      })));
      setMasterRanks(ranksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }

  async function selectEmployee(employee: Employee) {
    setSelectedEmployee(employee);
    try {
      const svcs = await employeesApi.getServices(employee.id);
      setEmployeeServices(svcs);
    } catch (err) {
      console.error('Failed to load employee services:', err);
      setEmployeeServices([]);
    }
  }

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.phone?.includes(searchQuery) ||
    emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = () => {
    const savedBranchId = localStorage.getItem('selectedBranchId');
    setEditingEmployee(null);
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      role: 'master',
      branchId: savedBranchId || (branches[0]?.id ?? ''),
      masterRankId: masterRanks[0]?.id ?? '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      fullName: employee.fullName,
      phone: employee.phone || '',
      email: employee.email || '',
      role: employee.role as 'admin' | 'manager' | 'master',
      branchId: employee.branchId || branches[0]?.id || '',
      masterRankId: employee.masterRankId || masterRanks[0]?.id || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullName.trim()) {
      setFormError('Укажите имя сотрудника');
      return;
    }

    try {
      setSaving(true);
      if (editingEmployee) {
        await employeesApi.update(editingEmployee.id, {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          role: formData.role,
          branchId: formData.branchId,
          masterRankId: formData.role === 'master' ? formData.masterRankId : undefined,
        });
        if (selectedEmployee?.id === editingEmployee.id) {
          const updated = await employeesApi.get(editingEmployee.id);
          setSelectedEmployee(updated);
        }
      } else {
        await employeesApi.create({
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          role: formData.role,
          branchId: formData.branchId,
          masterRankId: formData.role === 'master' ? formData.masterRankId : undefined,
        });
      }
      await loadData();
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Удалить сотрудника "${employee.fullName}"?`)) return;
    try {
      await employeesApi.delete(employee.id);
      if (selectedEmployee?.id === employee.id) {
        setSelectedEmployee(null);
      }
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const handleToggleService = async (serviceId: string) => {
    if (!selectedEmployee) return;
    try {
      const hasService = employeeServices.some(s => s.id === serviceId);
      if (hasService) {
        await employeesApi.removeService(selectedEmployee.id, serviceId);
      } else {
        await employeesApi.addService(selectedEmployee.id, serviceId);
      }
      // Refresh services
      const svcs = await employeesApi.getServices(selectedEmployee.id);
      setEmployeeServices(svcs);
    } catch (err) {
      console.error('Failed to toggle service:', err);
    }
  };

  const getBranchName = (branchId: string | undefined) => {
    if (!branchId) return 'Не назначен';
    return branches.find(b => b.id === branchId)?.name || 'Неизвестно';
  };

  return (
    <Layout>
      <div className="h-full flex">
        {/* Left side - Employees list */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Сотрудники</h1>
              <button 
                onClick={openModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Добавить
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Поиск по имени, телефону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Employees list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Загрузка...</div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">{error}</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Сотрудники не найдены</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredEmployees.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => selectEmployee(employee)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedEmployee?.id === employee.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {employee.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{employee.fullName}</p>
                        <p className="text-xs text-gray-500">
                          {ROLE_LABELS[employee.role]} • {getBranchName(employee.branchId)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Employee details */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          {selectedEmployee ? (
            <div className="p-6 max-w-5xl">
              {/* Employee header */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                      {selectedEmployee.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedEmployee.fullName}</h2>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">badge</span>
                          {ROLE_LABELS[selectedEmployee.role]}
                        </span>
                        {selectedEmployee.role === 'master' && selectedEmployee.masterRank && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">stars</span>
                            {selectedEmployee.masterRank.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">storefront</span>
                          {getBranchName(selectedEmployee.branchId)}
                        </span>
                        {selectedEmployee.phone && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">phone</span>
                            {selectedEmployee.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(selectedEmployee)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined">edit</span>
                      Редактировать
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedEmployee)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-bold text-lg">Услуги мастера</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Выберите услуги, которые может оказывать сотрудник
                  </p>
                </div>

                <div className="p-4">
                  {services.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      Нет доступных услуг
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {services.map((service) => {
                        const isSelected = employeeServices.some(s => s.id === service.id);
                        // Get price for employee's rank
                        let price: number | null = null;
                        if (isSelected && service.pricesByRank && selectedEmployee.masterRankId) {
                          const priceByRank = service.pricesByRank.find(
                            p => p.masterRankId === selectedEmployee.masterRankId
                          );
                          price = priceByRank?.price ?? null;
                        }
                        return (
                          <button
                            key={service.id}
                            onClick={() => handleToggleService(service.id)}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              isSelected 
                                ? 'border-primary bg-primary/5' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                              }`}>
                                {isSelected && <span className="material-symbols-outlined text-white text-sm">check</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-sm block">{service.name}</span>
                                {isSelected && price !== null && (
                                  <span className="text-sm text-primary font-semibold">
                                    {price.toLocaleString('ru-RU')} ₽
                                  </span>
                                )}
                                {isSelected && service.durationMin && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    {service.durationMin} мин
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl mb-4">badge</span>
                <p>Выберите сотрудника для просмотра деталей</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Employee Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeModal} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold">
                  {editingEmployee ? 'Редактировать сотрудника' : 'Новый сотрудник'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-800">{formError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    ФИО <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Иванов Иван Иванович"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="employee@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Роль</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'master' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="master">Мастер</option>
                    <option value="manager">Менеджер</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Филиал</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>

                {formData.role === 'master' && masterRanks.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Грейд</label>
                    <select
                      value={formData.masterRankId}
                      onChange={(e) => setFormData({ ...formData, masterRankId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      {masterRanks.map(rank => (
                        <option key={rank.id} value={rank.id}>{rank.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
