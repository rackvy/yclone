import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { payrollApi, SalaryRule, SalaryRuleAssignment, CreateSalaryRuleDto, ServiceOverride, ProductOverride } from '../api/payroll';
import { employeesApi, Employee } from '../api/employees';
import { branchesApi, Branch } from '../api/branches';
import { servicesApi, Service, serviceCategoriesApi, ServiceCategory } from '../api/services';
import { productsApi, Product, productCategoriesApi, ProductCategory } from '../api/products';
import { formatRubles } from '../api/products';

export default function PayrollRulesPage() {
  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [assignments, setAssignments] = useState<SalaryRuleAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SalaryRule | null>(null);

  // Form states
  const [ruleForm, setRuleForm] = useState<CreateSalaryRuleDto>({
    name: '',
    servicesMode: 'percent',
    servicesValue: 30,
    productsMode: 'percent',
    productsValue: 10,
    minMode: 'none',
    minValue: 0,
  });

  // Overrides state
  const [serviceOverrides, setServiceOverrides] = useState<ServiceOverride[]>([]);
  const [productOverrides, setProductOverrides] = useState<ProductOverride[]>([]);

  const [assignForm, setAssignForm] = useState({
    ruleId: '',
    employeeId: '',
    branchId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Сначала загружаем филиалы
      const branchesRes = await branchesApi.list();
      setBranches(branchesRes);
      
      // Затем параллельно загружаем остальное
      const [rulesData, assignmentsData, employeesData, servicesData, serviceCatsData, productsData, productCatsData] = await Promise.all([
        payrollApi.listRules(),
        payrollApi.listAssignments(),
        employeesApi.list(),
        servicesApi.list(),
        serviceCategoriesApi.list(),
        productsApi.list(branchesRes[0]?.id || ''),
        productCategoriesApi.list(),
      ]);
      setRules(rulesData);
      setAssignments(assignmentsData);
      setEmployees(employeesData.filter(e => e.role === 'master'));
      setServices(servicesData);
      setServiceCategories(serviceCatsData);
      setProducts(productsData);
      setProductCategories(productCatsData);
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    try {
      await payrollApi.createRule(ruleForm);
      setIsRuleModalOpen(false);
      resetRuleForm();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания правила');
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;
    try {
      // Подготавливаем overrides без лишних полей
      const cleanServiceOverrides = serviceOverrides.map(o => ({
        id: o.id,
        serviceId: o.serviceId,
        categoryId: o.categoryId,
        mode: o.mode,
        value: o.value,
      }));
      const cleanProductOverrides = productOverrides.map(o => ({
        id: o.id,
        productId: o.productId,
        categoryId: o.categoryId,
        mode: o.mode,
        value: o.value,
      }));
      await payrollApi.updateRule(editingRule.id, {
        ...ruleForm,
        serviceOverrides: cleanServiceOverrides,
        productOverrides: cleanProductOverrides,
      });
      setIsRuleModalOpen(false);
      setEditingRule(null);
      resetRuleForm();
      setServiceOverrides([]);
      setProductOverrides([]);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления правила');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Деактивировать правило?')) return;
    try {
      await payrollApi.deleteRule(id);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления правила');
    }
  };

  const handleCreateAssignment = async () => {
    try {
      await payrollApi.createAssignment({
        ruleId: assignForm.ruleId,
        employeeId: assignForm.employeeId,
        branchId: assignForm.branchId || undefined,
      });
      setIsAssignModalOpen(false);
      resetAssignForm();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Ошибка назначения правила');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Удалить назначение?')) return;
    try {
      await payrollApi.deleteAssignment(id);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления назначения');
    }
  };

  const openCreateRuleModal = () => {
    setEditingRule(null);
    resetRuleForm();
    setServiceOverrides([]);
    setProductOverrides([]);
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = async (rule: SalaryRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      isActive: rule.isActive,
      servicesMode: rule.servicesMode,
      servicesValue: rule.servicesValue,
      productsMode: rule.productsMode,
      productsValue: rule.productsValue,
      minMode: rule.minMode,
      minValue: rule.minValue,
    });
    // Загружаем детали правила с overrides
    try {
      const ruleDetail = await payrollApi.getRule(rule.id);
      setServiceOverrides(ruleDetail.serviceOverrides);
      setProductOverrides(ruleDetail.productOverrides);
    } catch (err) {
      console.error('Failed to load rule details:', err);
      setServiceOverrides([]);
      setProductOverrides([]);
    }
    setIsRuleModalOpen(true);
  };

  const openAssignModal = (ruleId?: string) => {
    setAssignForm({
      ruleId: ruleId || '',
      employeeId: '',
      branchId: '',
    });
    setIsAssignModalOpen(true);
  };

  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      servicesMode: 'percent',
      servicesValue: 30,
      productsMode: 'percent',
      productsValue: 10,
      minMode: 'none',
      minValue: 0,
    });
  };

  const resetAssignForm = () => {
    setAssignForm({ ruleId: '', employeeId: '', branchId: '' });
  };

  const formatModeValue = (mode: string, value: number) => {
    if (mode === 'percent') return `${value}%`;
    return formatRubles(value); // value в рублях
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Правила расчёта зарплаты</h1>
          <button
            onClick={openCreateRuleModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Новое правило
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {/* Rules List */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Название</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Услуги</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Товары</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Минимум</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Назначено</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Статус</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-xs text-gray-500">
                      {rule.calcByPayments ? 'По оплатам' : 'По выручке'}
                      {rule.includeRefunds && ', с возвратами'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatModeValue(rule.servicesMode, rule.servicesValue)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatModeValue(rule.productsMode, rule.productsValue)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {rule.minMode === 'none' ? 'Нет' : (
                      <>
                        {rule.minMode === 'daily' ? 'День: ' : 'Месяц: '}
                        {formatRubles(rule.minValue)}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                      {rule._count?.assignments || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rule.isActive ? 'Активно' : 'Архив'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openAssignModal(rule.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                    >
                      Назначить
                    </button>
                    <button
                      onClick={() => openEditRuleModal(rule)}
                      className="text-gray-600 hover:text-gray-800 text-sm mr-3"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Архив
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rules.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Нет правил. Создайте первое правило расчёта зарплаты.
            </div>
          )}
        </div>

        {/* Assignments List */}
        <h2 className="text-xl font-bold mb-4">Назначения</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Правило</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Сотрудник</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Филиал</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">С</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{assignment.rule.name}</td>
                  <td className="px-4 py-3">{assignment.employee.fullName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {assignment.branch?.name || 'Все филиалы'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(assignment.startsAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assignments.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Нет назначений. Назначьте правило сотруднику.
            </div>
          )}
        </div>

        {/* Rule Modal */}
        {isRuleModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingRule ? 'Изменить правило' : 'Новое правило'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                  <input
                    type="text"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Например: Стандартное 30%"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Услуги</label>
                    <select
                      value={ruleForm.servicesMode}
                      onChange={(e) => setRuleForm({ ...ruleForm, servicesMode: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="percent">Процент</option>
                      <option value="fixed">Фикс</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Значение</label>
                    <input
                      type="number"
                      value={ruleForm.servicesValue}
                      onChange={(e) => setRuleForm({ ...ruleForm, servicesValue: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg"
                      min={0}
                      max={ruleForm.servicesMode === 'percent' ? 100 : undefined}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Товары</label>
                    <select
                      value={ruleForm.productsMode}
                      onChange={(e) => setRuleForm({ ...ruleForm, productsMode: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="percent">Процент</option>
                      <option value="fixed">Фикс</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Значение</label>
                    <input
                      type="number"
                      value={ruleForm.productsValue}
                      onChange={(e) => setRuleForm({ ...ruleForm, productsValue: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg"
                      min={0}
                      max={ruleForm.productsMode === 'percent' ? 100 : undefined}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Минимум</label>
                    <select
                      value={ruleForm.minMode}
                      onChange={(e) => setRuleForm({ ...ruleForm, minMode: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="none">Нет</option>
                      <option value="daily">В день</option>
                      <option value="monthly">В месяц</option>
                    </select>
                  </div>
                  {ruleForm.minMode !== 'none' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
                      <input
                        type="number"
                        value={ruleForm.minValue}
                        onChange={(e) => setRuleForm({ ...ruleForm, minValue: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border rounded-lg"
                        min={0}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ruleForm.calcByPayments}
                      onChange={(e) => setRuleForm({ ...ruleForm, calcByPayments: e.target.checked })}
                    />
                    <span className="text-sm">По оплатам</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ruleForm.includeRefunds}
                      onChange={(e) => setRuleForm({ ...ruleForm, includeRefunds: e.target.checked })}
                    />
                    <span className="text-sm">Учитывать возвраты</span>
                  </label>
                </div>
              </div>

                {/* Overrides - только при редактировании */}
              {editingRule && (
                <>
                  {/* Service Overrides */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Уточнить по услугам/категориям</h3>
                      <button
                        onClick={() => setServiceOverrides([...serviceOverrides, { id: '', mode: 'percent', value: 0 }])}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Добавить
                      </button>
                    </div>
                    {serviceOverrides.map((override, index) => (
                      <div key={index} className="flex gap-2 mb-2 items-center">
                        <select
                          value={override.categoryId ? 'cat:' + override.categoryId : override.serviceId ? 'svc:' + override.serviceId : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newOverrides = [...serviceOverrides];
                            if (val.startsWith('cat:')) {
                              newOverrides[index] = { ...override, categoryId: val.slice(4), serviceId: undefined };
                            } else if (val.startsWith('svc:')) {
                              newOverrides[index] = { ...override, serviceId: val.slice(4), categoryId: undefined };
                            }
                            setServiceOverrides(newOverrides);
                          }}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        >
                          <option value="">Выберите...</option>
                          <optgroup label="Категории">
                            {serviceCategories.map(c => <option key={c.id} value={`cat:${c.id}`}>{c.name}</option>)}
                          </optgroup>
                          <optgroup label="Услуги">
                            {services.map(s => <option key={s.id} value={`svc:${s.id}`}>{s.name}</option>)}
                          </optgroup>
                        </select>
                        <select
                          value={override.mode}
                          onChange={(e) => {
                            const newOverrides = [...serviceOverrides];
                            newOverrides[index] = { ...override, mode: e.target.value as any };
                            setServiceOverrides(newOverrides);
                          }}
                          className="w-24 px-2 py-1 border rounded text-sm"
                        >
                          <option value="percent">%</option>
                          <option value="fixed">₽</option>
                        </select>
                        <input
                          type="number"
                          value={override.value}
                          onChange={(e) => {
                            const newOverrides = [...serviceOverrides];
                            newOverrides[index] = { ...override, value: parseInt(e.target.value) || 0 };
                            setServiceOverrides(newOverrides);
                          }}
                          className="w-20 px-2 py-1 border rounded text-sm"
                          min={0}
                        />
                        <button
                          onClick={() => setServiceOverrides(serviceOverrides.filter((_, i) => i !== index))}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Product Overrides */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Уточнить по товарам/категориям</h3>
                      <button
                        onClick={() => setProductOverrides([...productOverrides, { id: '', mode: 'percent', value: 0 }])}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Добавить
                      </button>
                    </div>
                    {productOverrides.map((override, index) => (
                      <div key={index} className="flex gap-2 mb-2 items-center">
                        <select
                          value={override.categoryId ? 'cat:' + override.categoryId : override.productId ? 'prod:' + override.productId : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newOverrides = [...productOverrides];
                            if (val.startsWith('cat:')) {
                              newOverrides[index] = { ...override, categoryId: val.slice(4), productId: undefined };
                            } else if (val.startsWith('prod:')) {
                              newOverrides[index] = { ...override, productId: val.slice(5), categoryId: undefined };
                            }
                            setProductOverrides(newOverrides);
                          }}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        >
                          <option value="">Выберите...</option>
                          <optgroup label="Категории">
                            {productCategories.map(c => <option key={c.id} value={`cat:${c.id}`}>{c.name}</option>)}
                          </optgroup>
                          <optgroup label="Товары">
                            {products.map(p => <option key={p.id} value={`prod:${p.id}`}>{p.name}</option>)}
                          </optgroup>
                        </select>
                        <select
                          value={override.mode}
                          onChange={(e) => {
                            const newOverrides = [...productOverrides];
                            newOverrides[index] = { ...override, mode: e.target.value as any };
                            setProductOverrides(newOverrides);
                          }}
                          className="w-24 px-2 py-1 border rounded text-sm"
                        >
                          <option value="percent">%</option>
                          <option value="fixed">₽</option>
                        </select>
                        <input
                          type="number"
                          value={override.value}
                          onChange={(e) => {
                            const newOverrides = [...productOverrides];
                            newOverrides[index] = { ...override, value: parseInt(e.target.value) || 0 };
                            setProductOverrides(newOverrides);
                          }}
                          className="w-20 px-2 py-1 border rounded text-sm"
                          min={0}
                        />
                        <button
                          onClick={() => setProductOverrides(productOverrides.filter((_, i) => i !== index))}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={editingRule ? handleUpdateRule : handleCreateRule}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingRule ? 'Сохранить' : 'Создать'}
                </button>
                <button
                  onClick={() => setIsRuleModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assignment Modal */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Назначить правило</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Правило</label>
                  <select
                    value={assignForm.ruleId}
                    onChange={(e) => setAssignForm({ ...assignForm, ruleId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Выберите правило</option>
                    {rules.filter(r => r.isActive).map((rule) => (
                      <option key={rule.id} value={rule.id}>{rule.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Сотрудник</label>
                  <select
                    value={assignForm.employeeId}
                    onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Выберите сотрудника</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Филиал (опционально)</label>
                  <select
                    value={assignForm.branchId}
                    onChange={(e) => setAssignForm({ ...assignForm, branchId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Все филиалы</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateAssignment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Назначить
                </button>
                <button
                  onClick={() => setIsAssignModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
