import { useState, useEffect, FormEvent } from 'react';
import Layout from '../components/Layout';
import { branchesApi, Branch } from '../api/branches';
import { masterRanksApi, MasterRank } from '../api/masterRanks';
import { employeesApi, Employee, EmployeeRole, getRoleLabel, getRoleColor } from '../api/employees';
import { usersApi } from '../api/users';
import { servicesApi, serviceCategoriesApi, Service, ServiceCategory } from '../api/services';
import { productsApi, productCategoriesApi, stockMovementsApi, Product, ProductCategory, formatRubles as formatProductRubles } from '../api/products';
import { Cashbox, CashboxType, getCashboxTypeText, getCashboxTypeIcon, getCashboxes, createCashbox, updateCashbox, deleteCashbox, toggleCashboxActive } from '../api/cashboxes';

type TabType = 'branches' | 'masterRanks' | 'employees' | 'services' | 'products' | 'cashboxes';

// Branch Tab Component
function BranchesTab() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await branchesApi.list();
      setBranches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки филиалов');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Укажите название филиала');
      return;
    }

    try {
      setFormLoading(true);
      if (editingBranch) {
        await branchesApi.update(editingBranch.id, { name: formData.name, address: formData.address });
      } else {
        await branchesApi.create({ name: formData.name, address: formData.address });
      }
      await loadBranches();
      setIsModalOpen(false);
      setEditingBranch(null);
      setFormData({ name: '', address: '' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`Удалить филиал "${branch.name}"?`)) return;
    try {
      await branchesApi.delete(branch.id);
      await loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Управление филиалами</h2>
        <button
          onClick={() => {
            setEditingBranch(null);
            setFormData({ name: '', address: '' });
            setFormError('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Добавить филиал
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">storefront</span>
          <p className="text-gray-500">Нет филиалов</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">storefront</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{branch.name}</h3>
                    {branch.address && <p className="text-sm text-gray-500">{branch.address}</p>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingBranch(branch);
                    setFormData({ name: branch.name, address: branch.address || '' });
                    setFormError('');
                    setIsModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(branch)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold">{editingBranch ? 'Редактировать' : 'Новый филиал'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                {formError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200"><p className="text-sm text-red-800">{formError}</p></div>}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Название *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Адрес</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Отмена</button>
                  <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50">
                    {formLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Master Ranks Tab Component
function MasterRanksTab() {
  const [ranks, setRanks] = useState<MasterRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<MasterRank | null>(null);
  const [formData, setFormData] = useState({ name: '', sort: 100, isActive: true });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadRanks();
  }, []);

  const loadRanks = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await masterRanksApi.list();
      setRanks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Укажите название грейда');
      return;
    }

    try {
      setFormLoading(true);
      if (editingRank) {
        await masterRanksApi.update(editingRank.id, formData);
      } else {
        await masterRanksApi.create(formData);
      }
      await loadRanks();
      setIsModalOpen(false);
      setEditingRank(null);
      setFormData({ name: '', sort: 100, isActive: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (rank: MasterRank) => {
    if (!confirm(`Удалить грейд "${rank.name}"?`)) return;
    try {
      await masterRanksApi.delete(rank.id);
      await loadRanks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Грейды мастеров</h2>
          <p className="text-sm text-gray-500 mt-1">Настройте категории мастеров для вашей компании</p>
        </div>
        <button
          onClick={() => {
            setEditingRank(null);
            setFormData({ name: '', sort: 100, isActive: true });
            setFormError('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Добавить грейд
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : ranks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">stars</span>
          <p className="text-gray-500">Нет грейдов</p>
          <p className="text-sm text-gray-400 mt-1">Добавьте первый грейд (например: Junior, Middle, Top)</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Порядок</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ranks.map((rank) => (
                <tr key={rank.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{rank.name}</td>
                  <td className="px-6 py-4 text-gray-500">{rank.sort}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${rank.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {rank.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setEditingRank(rank);
                        setFormData({ name: rank.name, sort: rank.sort, isActive: rank.isActive });
                        setFormError('');
                        setIsModalOpen(true);
                      }}
                      className="text-primary hover:text-primary/80 font-medium text-sm mr-4"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(rank)}
                      className="text-red-600 hover:text-red-800 font-medium text-sm"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold">{editingRank ? 'Редактировать' : 'Новый грейд'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                {formError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200"><p className="text-sm text-red-800">{formError}</p></div>}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Название *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="Например: Top Master"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Порядок сортировки</label>
                    <input
                      type="number"
                      value={formData.sort}
                      onChange={(e) => setFormData({ ...formData, sort: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">Активен</label>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Отмена</button>
                  <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50">
                    {formLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Employees Tab Component
function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [ranks, setRanks] = useState<MasterRank[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterBranchId, setFilterBranchId] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    branchId: '',
    role: 'master' as EmployeeRole,
    phone: '',
    email: '',
    masterRankId: '',
    // Для создания User (опционально)
    loginEmail: '',
    password: '',
    createLogin: false,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Services modal states
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [servicesModalEmployee, setServicesModalEmployee] = useState<Employee | null>(null);
  const [employeeServices, setEmployeeServices] = useState<string[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [filterBranchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [employeesData, branchesData, ranksData] = await Promise.all([
        employeesApi.list(),
        branchesApi.list(),
        masterRanksApi.list(),
      ]);
      // Фильтруем по филиалу если нужно
      const filteredEmployees = filterBranchId 
        ? employeesData.filter(e => e.branchId === filterBranchId)
        : employeesData;
      setEmployees(filteredEmployees);
      setBranches(branchesData);
      setRanks(ranksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullName.trim()) {
      setFormError('Укажите ФИО сотрудника');
      return;
    }
    if (!formData.branchId) {
      setFormError('Выберите филиал');
      return;
    }
    if (formData.createLogin) {
      if (!formData.loginEmail.trim()) {
        setFormError('Укажите email для входа');
        return;
      }
      if (formData.password.length < 6) {
        setFormError('Пароль должен быть минимум 6 символов');
        return;
      }
    }

    try {
      setFormLoading(true);
      
      let createdUserId: string | null = null;
      
      // Создаем пользователя если нужно
      if (formData.createLogin && !editingEmployee) {
        try {
          const newUser = await usersApi.create({
            email: formData.loginEmail,
            password: formData.password,
            phone: formData.phone,
          });
          createdUserId = newUser.id;
        } catch (userErr) {
          setFormError(userErr instanceof Error ? userErr.message : 'Ошибка создания пользователя');
          setFormLoading(false);
          return;
        }
      }
      
      const submitData = {
        fullName: formData.fullName,
        branchId: formData.branchId,
        role: formData.role,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        masterRankId: formData.role === 'master' ? formData.masterRankId || undefined : undefined,
      };

      if (editingEmployee) {
        await employeesApi.update(editingEmployee.id, submitData);
      } else {
        const newEmployee = await employeesApi.create(submitData);
        // Если создали пользователя - связываем его с сотрудником
        if (createdUserId) {
          await employeesApi.update(newEmployee.id, { userId: createdUserId });
        }
      }
      await loadData();
      setIsModalOpen(false);
      setEditingEmployee(null);
      setFormData({ fullName: '', branchId: '', role: 'master', phone: '', email: '', masterRankId: '', loginEmail: '', password: '', createLogin: false });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Удалить сотрудника "${employee.fullName}"?`)) return;
    try {
      await employeesApi.delete(employee.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const openCreate = () => {
    setEditingEmployee(null);
    setFormData({ fullName: '', branchId: branches[0]?.id || '', role: 'master', phone: '', email: '', masterRankId: '', loginEmail: '', password: '', createLogin: false });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      fullName: employee.fullName,
      branchId: employee.branchId || '',
      role: employee.role,
      phone: employee.phone || '',
      email: employee.email || '',
      masterRankId: '',
      loginEmail: '',
      password: '',
      createLogin: false,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openServicesModal = async (employee: Employee) => {
    setServicesModalEmployee(employee);
    setIsServicesModalOpen(true);
    setServicesLoading(true);
    try {
      // Загружаем все услуги и услуги сотрудника
      const [allServices, empServices] = await Promise.all([
        servicesApi.list(),
        employeesApi.getServices(employee.id),
      ]);
      setServices(allServices);
      setEmployeeServices(empServices.map(s => s.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки услуг');
    } finally {
      setServicesLoading(false);
    }
  };

  const toggleService = async (serviceId: string) => {
    if (!servicesModalEmployee) return;
    
    try {
      setServicesLoading(true);
      const hasService = employeeServices.includes(serviceId);
      
      if (hasService) {
        await employeesApi.removeService(servicesModalEmployee.id, serviceId);
        setEmployeeServices(prev => prev.filter(id => id !== serviceId));
      } else {
        await employeesApi.addService(servicesModalEmployee.id, serviceId);
        setEmployeeServices(prev => [...prev, serviceId]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления услуг');
    } finally {
      setServicesLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Сотрудники</h2>
          <p className="text-sm text-gray-500 mt-1">Управление персоналом и их ролями</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Добавить сотрудника
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-gray-500">Филиал:</span>
        <select
          value={filterBranchId}
          onChange={(e) => setFilterBranchId(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        >
          <option value="">Все филиалы</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">badge</span>
          <p className="text-gray-500">Нет сотрудников</p>
          <button onClick={openCreate} className="mt-4 text-primary hover:text-primary/80 font-semibold">
            Добавить первого сотрудника
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сотрудник</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Филиал</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-400">person</span>
                      </div>
                      <div>
                        <div className="font-medium">{emp.fullName}</div>
                        {emp.phone && <div className="text-xs text-gray-500">{emp.phone}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(emp.role)}`}>
                      {getRoleLabel(emp.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{branches.find(b => b.id === emp.branchId)?.name || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openServicesModal(emp)} className="text-green-600 hover:text-green-800 font-medium text-sm mr-4">
                      Услуги
                    </button>
                    <button onClick={() => openEdit(emp)} className="text-primary hover:text-primary/80 font-medium text-sm mr-4">
                      Изменить
                    </button>
                    <button onClick={() => handleDelete(emp)} className="text-red-600 hover:text-red-800 font-medium text-sm">
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold">{editingEmployee ? 'Редактировать' : 'Новый сотрудник'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                {formError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200"><p className="text-sm text-red-800">{formError}</p></div>}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ФИО *</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="Иванов Иван Иванович"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Филиал *</label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      <option value="">Выберите филиал</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Роль *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      <option value="admin">Администратор</option>
                      <option value="manager">Менеджер</option>
                      <option value="master">Мастер</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.role === 'admin' && 'Полный доступ к управлению'}
                      {formData.role === 'manager' && 'Управление записями и клиентами'}
                      {formData.role === 'master' && 'Только свои записи и расписание'}
                    </p>
                  </div>

                  {formData.role === 'master' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Грейд</label>
                      <select
                        value={formData.masterRankId}
                        onChange={(e) => setFormData({ ...formData, masterRankId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      >
                        <option value="">Без грейда</option>
                        {ranks.filter(r => r.isActive).map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="employee@company.ru"
                    />
                  </div>

                  {/* Создание логина для входа (только при создании) */}
                  {!editingEmployee && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <input
                          type="checkbox"
                          id="createLogin"
                          checked={formData.createLogin}
                          onChange={(e) => setFormData({ ...formData, createLogin: e.target.checked })}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="createLogin" className="text-sm font-medium text-gray-700">
                          Создать логин для входа в систему
                        </label>
                      </div>

                      {formData.createLogin && (
                        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email для входа *</label>
                            <input
                              type="email"
                              value={formData.loginEmail}
                              onChange={(e) => setFormData({ ...formData, loginEmail: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                              placeholder="login@company.ru"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Пароль *</label>
                            <input
                              type="password"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                              placeholder="Минимум 6 символов"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Отмена</button>
                  <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50">
                    {formLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Services Modal */}
      {isServicesModalOpen && servicesModalEmployee && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsServicesModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-bold">Услуги мастера</h3>
                  <p className="text-sm text-gray-500">{servicesModalEmployee.fullName}</p>
                </div>
                <button onClick={() => setIsServicesModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {servicesLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>Нет доступных услуг</p>
                    <p className="text-sm">Сначала создайте услуги во вкладке "Услуги"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {services.map((service) => {
                      const isSelected = employeeServices.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          onClick={() => toggleService(service.id)}
                          disabled={servicesLoading}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-primary'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined ${isSelected ? 'text-primary' : 'text-gray-400'}`}>
                              {isSelected ? 'check_circle' : 'circle'}
                            </span>
                            <div className="text-left">
                              <div className="font-medium">{service.name}</div>
                              <div className="text-xs text-gray-500">{service.durationMin} мин</div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-xs font-medium bg-primary text-white px-2 py-1 rounded">Выбрано</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={() => setIsServicesModalOpen(false)}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Services Tab Component
function ServicesTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [ranks, setRanks] = useState<MasterRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    durationMin: 60,
    categoryId: '',
    sort: 100,
    isActive: true,
    pricesByRank: [] as { masterRankId: string; price: number }[],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Для управления категориями
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', sort: 100 });
  const [categoryFormLoading, setCategoryFormLoading] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState('');

  useEffect(() => {
    loadData();
  }, [filterCategoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [servicesData, categoriesData, ranksData] = await Promise.all([
        servicesApi.list(filterCategoryId || undefined),
        serviceCategoriesApi.list(),
        masterRanksApi.list(),
      ]);
      setServices(servicesData);
      setCategories(categoriesData);
      setRanks(ranksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Укажите название услуги');
      return;
    }
    if (formData.durationMin < 15 || formData.durationMin % 15 !== 0) {
      setFormError('Длительность должна быть кратна 15 минутам');
      return;
    }

    try {
      setFormLoading(true);
      const submitData = {
        name: formData.name,
        durationMin: formData.durationMin,
        categoryId: formData.categoryId || undefined,
        sort: formData.sort,
        isActive: formData.isActive,
        pricesByRank: formData.pricesByRank.filter(p => p.price > 0),
      };

      if (editingService) {
        await servicesApi.update(editingService.id, submitData);
      } else {
        await servicesApi.create(submitData);
      }
      await loadData();
      setIsModalOpen(false);
      setEditingService(null);
      setFormData({ name: '', durationMin: 60, categoryId: '', sort: 100, isActive: true, pricesByRank: [] });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Удалить услугу "${service.name}"?`)) return;
    try {
      await servicesApi.delete(service.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const openCreate = () => {
    setEditingService(null);
    const defaultPrices = ranks.filter(r => r.isActive).map(r => ({ masterRankId: r.id, price: 0 }));
    setFormData({ name: '', durationMin: 60, categoryId: '', sort: 100, isActive: true, pricesByRank: defaultPrices });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    const existingPrices = service.pricesByRank || [];
    const allRanksPrices = ranks.filter(r => r.isActive).map(r => {
      const existing = existingPrices.find(p => p.masterRankId === r.id);
      return { masterRankId: r.id, price: existing?.price || 0 };
    });
    setFormData({
      name: service.name,
      durationMin: service.durationMin,
      categoryId: service.categoryId || '',
      sort: service.sort,
      isActive: service.isActive,
      pricesByRank: allRanksPrices,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const updatePrice = (rankId: string, price: number) => {
    setFormData(prev => ({
      ...prev,
      pricesByRank: prev.pricesByRank.map(p => 
        p.masterRankId === rankId ? { ...p, price } : p
      ),
    }));
  };

  const formatDuration = (min: number) => {
    const hours = Math.floor(min / 60);
    const mins = min % 60;
    if (hours > 0 && mins > 0) return `${hours} ч ${mins} мин`;
    if (hours > 0) return `${hours} ч`;
    return `${mins} мин`;
  };

  // Category management functions
  const openCategoryModal = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', sort: 100 });
    setCategoryFormError('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (category: ServiceCategory) => {
    setEditingCategory(category);
    setCategoryFormData({ name: category.name, sort: category.sort });
    setCategoryFormError('');
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCategoryFormError('');

    if (!categoryFormData.name.trim()) {
      setCategoryFormError('Укажите название категории');
      return;
    }

    try {
      setCategoryFormLoading(true);
      if (editingCategory) {
        await serviceCategoriesApi.update(editingCategory.id, categoryFormData);
      } else {
        await serviceCategoriesApi.create(categoryFormData);
      }
      await loadData();
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryFormData({ name: '', sort: 100 });
    } catch (err) {
      setCategoryFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setCategoryFormLoading(false);
    }
  };

  const handleDeleteCategory = async (category: ServiceCategory) => {
    if (!confirm(`Удалить категорию "${category.name}"?`)) return;
    try {
      await serviceCategoriesApi.delete(category.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Услуги</h2>
          <p className="text-sm text-gray-500 mt-1">Настройка услуг и цен по грейдам</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Добавить услугу
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Категория:</span>
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={openCategoryModal}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
        >
          <span className="material-symbols-outlined text-lg">folder</span>
          Управление категориями
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">content_cut</span>
          <p className="text-gray-500">Нет услуг</p>
          <button onClick={openCreate} className="mt-4 text-primary hover:text-primary/80 font-semibold">
            Добавить первую услугу
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Услуга</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Длительность</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цены по грейдам</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{service.name}</div>
                    {service.category && <div className="text-xs text-gray-500">{service.category.name}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDuration(service.durationMin)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {service.pricesByRank?.map((p) => (
                        <span key={p.id} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {p.masterRank?.name || '?'}: {p.price}₽
                        </span>
                      ))}
                      {!service.pricesByRank?.length && <span className="text-xs text-gray-400">Нет цен</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${service.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {service.isActive ? 'Активна' : 'Неактивна'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(service)} className="text-primary hover:text-primary/80 font-medium text-sm mr-4">
                      Изменить
                    </button>
                    <button onClick={() => handleDelete(service)} className="text-red-600 hover:text-red-800 font-medium text-sm">
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold">{editingService ? 'Редактировать' : 'Новая услуга'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                {formError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200"><p className="text-sm text-red-800">{formError}</p></div>}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Название услуги *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="Например: Стрижка женская"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Длительность (мин) *</label>
                      <select
                        value={formData.durationMin}
                        onChange={(e) => setFormData({ ...formData, durationMin: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      >
                        {[15, 30, 45, 60, 75, 90, 105, 120, 150, 180].map(m => (
                          <option key={m} value={m}>{m} мин</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Категория</label>
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      >
                        <option value="">Без категории</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Активна</label>
                  </div>

                  {/* Prices by Rank */}
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Цены по грейдам</label>
                    <div className="space-y-3">
                      {ranks.filter(r => r.isActive).map((rank) => {
                        const priceData = formData.pricesByRank.find(p => p.masterRankId === rank.id);
                        return (
                          <div key={rank.id} className="flex items-center gap-3">
                            <span className="flex-1 text-sm">{rank.name}</span>
                            <input
                              type="number"
                              min="0"
                              value={priceData?.price || 0}
                              onChange={(e) => updatePrice(rank.id, parseInt(e.target.value) || 0)}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-right"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-500">₽</span>
                          </div>
                        );
                      })}
                      {ranks.filter(r => r.isActive).length === 0 && (
                        <p className="text-sm text-gray-500">Сначала создайте грейды мастеров</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Отмена</button>
                  <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50">
                    {formLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold">Категории услуг</h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              {/* Category Form */}
              <form onSubmit={handleCategorySubmit} className="p-6 border-b border-gray-200">
                {categoryFormError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-800">{categoryFormError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Название категории"
                  />
                  <input
                    type="number"
                    value={categoryFormData.sort}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, sort: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-center"
                    placeholder="Сорт"
                  />
                  <button
                    type="submit"
                    disabled={categoryFormLoading}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                  >
                    {editingCategory ? 'Сохранить' : 'Добавить'}
                  </button>
                </div>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => { setEditingCategory(null); setCategoryFormData({ name: '', sort: 100 }); }}
                    className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Отменить редактирование
                  </button>
                )}
              </form>

              {/* Category List */}
              <div className="p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Существующие категории</h4>
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-400">Нет категорий</p>
                ) : (
                  <div className="space-y-2">
                    {categories.sort((a, b) => a.sort - b.sort).map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{cat.name}</span>
                          <span className="text-xs text-gray-400 ml-2">(сорт: {cat.sort})</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditCategory(cat)}
                            className="text-primary hover:text-primary/80 text-sm"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Products Tab Component
function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Product modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    price: 0,
    stockQty: 0,
    categoryId: '',
    isActive: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', sort: 100 });
  const [categoryFormLoading, setCategoryFormLoading] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState('');

  // Stock movement modal
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockMovementType, setStockMovementType] = useState<'in' | 'out' | 'transfer'>('in');
  const [stockFormData, setStockFormData] = useState({ qty: 1, note: '', toBranchId: '' });
  const [stockFormLoading, setStockFormLoading] = useState(false);
  const [stockFormError, setStockFormError] = useState('');

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadData();
    }
  }, [selectedBranchId, filterCategoryId]);

  const loadBranches = async () => {
    try {
      const branchesData = await branchesApi.list();
      setBranches(branchesData);
      if (branchesData.length > 0) {
        setSelectedBranchId(branchesData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки филиалов');
    }
  };

  const loadData = async () => {
    if (!selectedBranchId) return;
    try {
      setLoading(true);
      setError('');
      const [productsData, categoriesData] = await Promise.all([
        productsApi.list(selectedBranchId, filterCategoryId || undefined, searchQuery || undefined),
        productCategoriesApi.list(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Укажите название товара');
      return;
    }
    if (formData.price < 0) {
      setFormError('Цена не может быть отрицательной');
      return;
    }

    try {
      setFormLoading(true);
      const submitData = {
        ...formData,
        branchId: selectedBranchId,
        categoryId: formData.categoryId || undefined,
      };

      if (editingProduct) {
        await productsApi.update(editingProduct.id, submitData);
      } else {
        await productsApi.create(submitData);
      }
      await loadData();
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', sku: '', barcode: '', price: 0, stockQty: 0, categoryId: '', isActive: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Удалить товар "${product.name}"?`)) return;
    try {
      await productsApi.delete(product.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', barcode: '', price: 0, stockQty: 0, categoryId: '', isActive: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      price: product.price,
      stockQty: product.stockQty,
      categoryId: product.categoryId || '',
      isActive: product.isActive,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Stock movement handlers
  const openStockModal = (product: Product, type: 'in' | 'out' | 'transfer') => {
    setSelectedProduct(product);
    setStockMovementType(type);
    setStockFormData({ qty: 1, note: '', toBranchId: '' });
    setStockFormError('');
    setIsStockModalOpen(true);
  };

  const handleStockSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStockFormError('');

    if (!selectedProduct) return;
    if (stockFormData.qty < 1) {
      setStockFormError('Количество должно быть больше 0');
      return;
    }

    try {
      setStockFormLoading(true);

      if (stockMovementType === 'transfer') {
        if (!stockFormData.toBranchId) {
          setStockFormError('Выберите целевой филиал');
          setStockFormLoading(false);
          return;
        }
        await stockMovementsApi.transfer({
          fromBranchId: selectedBranchId,
          toBranchId: stockFormData.toBranchId,
          productId: selectedProduct.id,
          qty: stockFormData.qty,
          note: stockFormData.note,
        });
      } else {
        await stockMovementsApi[stockMovementType]({
          branchId: selectedBranchId,
          productId: selectedProduct.id,
          qty: stockFormData.qty,
          note: stockFormData.note,
        });
      }

      await loadData();
      setIsStockModalOpen(false);
      setSelectedProduct(null);
    } catch (err) {
      setStockFormError(err instanceof Error ? err.message : 'Ошибка операции');
    } finally {
      setStockFormLoading(false);
    }
  };

  // Category handlers
  const openCategoryModal = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', sort: 100 });
    setCategoryFormError('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (category: ProductCategory) => {
    setEditingCategory(category);
    setCategoryFormData({ name: category.name, sort: category.sort });
    setCategoryFormError('');
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCategoryFormError('');

    if (!categoryFormData.name.trim()) {
      setCategoryFormError('Укажите название категории');
      return;
    }

    try {
      setCategoryFormLoading(true);
      if (editingCategory) {
        await productCategoriesApi.update(editingCategory.id, categoryFormData);
      } else {
        await productCategoriesApi.create(categoryFormData);
      }
      await loadData();
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryFormData({ name: '', sort: 100 });
    } catch (err) {
      setCategoryFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setCategoryFormLoading(false);
    }
  };

  const handleDeleteCategory = async (category: ProductCategory) => {
    if (!confirm(`Удалить категорию "${category.name}"?`)) return;
    try {
      await productCategoriesApi.delete(category.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Товары</h2>
          <p className="text-sm text-gray-500 mt-1">Управление товарами и остатками</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Добавить товар
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="Поиск по названию, артикулу, штрихкоду"
          />
          <button type="submit" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
            <span className="material-symbols-outlined">search</span>
          </button>
        </form>

        <button
          onClick={openCategoryModal}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium ml-auto"
        >
          <span className="material-symbols-outlined text-lg">folder</span>
          Категории
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">inventory_2</span>
          <p className="text-gray-500">Нет товаров</p>
          <button onClick={openCreate} className="mt-4 text-primary hover:text-primary/80 font-semibold">
            Добавить первый товар
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Товар</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Артикул/Штрихкод</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цена</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Остаток</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{product.name}</div>
                    {product.category && <div className="text-xs text-gray-500">{product.category.name}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {product.sku && <div>Арт: {product.sku}</div>}
                    {product.barcode && <div>ШК: {product.barcode}</div>}
                    {!product.sku && !product.barcode && <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{formatProductRubles(product.price)}</td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${product.stockQty <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {product.stockQty}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {product.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openStockModal(product, 'in')} className="text-green-600 hover:text-green-800 text-sm" title="Приход">
                        <span className="material-symbols-outlined">add_circle</span>
                      </button>
                      <button onClick={() => openStockModal(product, 'out')} className="text-orange-600 hover:text-orange-800 text-sm" title="Расход">
                        <span className="material-symbols-outlined">remove_circle</span>
                      </button>
                      <button onClick={() => openStockModal(product, 'transfer')} className="text-blue-600 hover:text-blue-800 text-sm" title="Перемещение">
                        <span className="material-symbols-outlined">swap_horiz</span>
                      </button>
                      <button onClick={() => openEdit(product)} className="text-primary hover:text-primary/80 text-sm ml-2">
                        Изменить
                      </button>
                      <button onClick={() => handleDelete(product)} className="text-red-600 hover:text-red-800 text-sm">
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold">{editingProduct ? 'Редактировать' : 'Новый товар'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                {formError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200"><p className="text-sm text-red-800">{formError}</p></div>}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Название товара *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="Например: Шампунь для волос"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Артикул</label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        placeholder="SKU-123"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Штрихкод</label>
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        placeholder="4601234567890"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Цена (₽) *</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Начальный остаток</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stockQty}
                        onChange={(e) => setFormData({ ...formData, stockQty: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Категория</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      <option value="">Без категории</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Активен</label>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Отмена</button>
                  <button type="submit" disabled={formLoading} className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50">
                    {formLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Stock Movement Modal */}
      {isStockModalOpen && selectedProduct && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsStockModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold">
                  {stockMovementType === 'in' && 'Приход товара'}
                  {stockMovementType === 'out' && 'Расход товара'}
                  {stockMovementType === 'transfer' && 'Перемещение товара'}
                </h3>
                <button onClick={() => setIsStockModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleStockSubmit} className="p-6">
                {stockFormError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200"><p className="text-sm text-red-800">{stockFormError}</p></div>}
                
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Товар</p>
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-500">Текущий остаток: <span className="font-medium">{selectedProduct.stockQty}</span></p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Количество *</label>
                    <input
                      type="number"
                      min="1"
                      value={stockFormData.qty}
                      onChange={(e) => setStockFormData({ ...stockFormData, qty: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  {stockMovementType === 'transfer' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">В филиал *</label>
                      <select
                        value={stockFormData.toBranchId}
                        onChange={(e) => setStockFormData({ ...stockFormData, toBranchId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      >
                        <option value="">Выберите филиал</option>
                        {branches.filter(b => b.id !== selectedBranchId).map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Примечание</label>
                    <input
                      type="text"
                      value={stockFormData.note}
                      onChange={(e) => setStockFormData({ ...stockFormData, note: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      placeholder="Опционально"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">Отмена</button>
                  <button type="submit" disabled={stockFormLoading} className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50">
                    {stockFormLoading ? 'Выполнение...' : 'Выполнить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold">Категории товаров</h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <form onSubmit={handleCategorySubmit} className="p-6 border-b border-gray-200">
                {categoryFormError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-800">{categoryFormError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Название категории"
                  />
                  <input
                    type="number"
                    value={categoryFormData.sort}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, sort: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-center"
                    placeholder="Сорт"
                  />
                  <button
                    type="submit"
                    disabled={categoryFormLoading}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                  >
                    {editingCategory ? 'Сохранить' : 'Добавить'}
                  </button>
                </div>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => { setEditingCategory(null); setCategoryFormData({ name: '', sort: 100 }); }}
                    className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Отменить редактирование
                  </button>
                )}
              </form>

              <div className="p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Существующие категории</h4>
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-400">Нет категорий</p>
                ) : (
                  <div className="space-y-2">
                    {categories.sort((a, b) => a.sort - b.sort).map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{cat.name}</span>
                          <span className="text-xs text-gray-400 ml-2">(сорт: {cat.sort})</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditCategory(cat)}
                            className="text-primary hover:text-primary/80 text-sm"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Cashboxes Tab Component
function CashboxesTab() {
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCashbox, setEditingCashbox] = useState<Cashbox | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<CashboxType>('cash');
  const [currency, setCurrency] = useState('RUB');
  const [sortOrder, setSortOrder] = useState(100);

  const loadCashboxes = async () => {
    try {
      setLoading(true);
      const data = await getCashboxes();
      setCashboxes(data);
    } catch (err) {
      console.error('Failed to load cashboxes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashboxes();
  }, []);

  const handleCreate = () => {
    setEditingCashbox(null);
    setName('');
    setType('cash');
    setCurrency('RUB');
    setSortOrder(100);
    setShowModal(true);
  };

  const handleEdit = (cashbox: Cashbox) => {
    setEditingCashbox(cashbox);
    setName(cashbox.name);
    setType(cashbox.type);
    setCurrency(cashbox.currency);
    setSortOrder(cashbox.sortOrder);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCashbox) {
        await updateCashbox(editingCashbox.id, {
          name,
          type,
          currency,
          sortOrder,
        });
      } else {
        await createCashbox({
          name,
          type,
          currency,
          sortOrder,
        });
      }
      await loadCashboxes();
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save cashbox:', err);
      alert('Ошибка при сохранении кассы');
    }
  };

  const handleToggleActive = async (cashbox: Cashbox) => {
    try {
      await toggleCashboxActive(cashbox.id);
      await loadCashboxes();
    } catch (err) {
      console.error('Failed to toggle cashbox:', err);
    }
  };

  const handleDelete = async (cashbox: Cashbox) => {
    if (!confirm(`Удалить кассу "${cashbox.name}"?`)) return;
    try {
      await deleteCashbox(cashbox.id);
      await loadCashboxes();
    } catch (err) {
      console.error('Failed to delete cashbox:', err);
      alert('Ошибка при удалении кассы');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Управление кассами</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Добавить кассу
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Название</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Тип</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Валюта</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Статус</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Порядок</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cashboxes.map((cashbox) => (
                <tr key={cashbox.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400">
                        {getCashboxTypeIcon(cashbox.type)}
                      </span>
                      <span className="font-medium text-gray-900">{cashbox.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {getCashboxTypeText(cashbox.type)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cashbox.currency}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(cashbox)}
                      className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        cashbox.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {cashbox.isActive ? 'Активна' : 'Неактивна'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{cashbox.sortOrder}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(cashbox)}
                        className="p-1 text-primary hover:bg-primary/10 rounded"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(cashbox)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {cashboxes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Нет касс. Создайте первую кассу.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingCashbox ? 'Редактировать кассу' : 'Новая касса'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CashboxType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="cash">Наличные</option>
                  <option value="bank">Банк</option>
                  <option value="other">Другое</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Валюта
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Порядок сортировки
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Settings Page
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('branches');

  return (
    <Layout>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold">Настройки</h1>
      </header>

      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('branches')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'branches' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">storefront</span>
              Филиалы
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('masterRanks')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'masterRanks' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">stars</span>
              Грейды
            </span>
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'employees' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">badge</span>
              Сотрудники
            </span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">content_cut</span>
              Услуги
            </span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">inventory_2</span>
              Товары
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cashboxes')}
            className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'cashboxes' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
              Кассы
            </span>
          </button>
        </nav>
      </div>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'branches' && <BranchesTab />}
          {activeTab === 'masterRanks' && <MasterRanksTab />}
          {activeTab === 'employees' && <EmployeesTab />}
          {activeTab === 'services' && <ServicesTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'cashboxes' && <CashboxesTab />}
        </div>
      </main>
    </Layout>
  );
}
