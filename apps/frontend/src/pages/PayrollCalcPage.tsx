import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { payrollApi } from '../api/payroll';
import { employeesApi, Employee } from '../api/employees';
import { branchesApi, Branch } from '../api/branches';
import { formatRubles } from '../api/products';

interface PayrollSummary {
  employeeId: string;
  fullName: string;
  workDaysCount?: number;
  servicesKopeks: number;
  productsKopeks: number;
  bonusKopeks: number;
  minimumTopUpKopeks: number;
  totalKopeks: number;
}

interface ServiceDetail {
  appointmentId: string;
  date: string;
  serviceName: string;
  baseKopeks: number;
  ruleApplied: string;
  earnedKopeks: number;
}

interface ProductDetail {
  saleIdOrAppointmentId: string;
  date: string;
  productName: string;
  qty: number;
  revenueKopeks: number;
  ruleApplied: string;
  earnedKopeks: number;
}

interface EmployeeDetails {
  services: ServiceDetail[];
  products: ProductDetail[];
  refunds: any[];
}

export default function PayrollCalcPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [summary, setSummary] = useState<PayrollSummary[]>([]);
  const [details, setDetails] = useState<Record<string, EmployeeDetails>>({});
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  
  // Notification state
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Form state
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [branchId, setBranchId] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const [emps, brs] = await Promise.all([
        employeesApi.list(),
        branchesApi.list(),
      ]);
      setEmployees(emps.filter(e => e.role === 'master'));
      setBranches(brs);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  const handleCalculate = async () => {
    try {
      setLoading(true);
      const result = await payrollApi.calculate({
        from: fromDate,
        to: toDate,
        ...(branchId && { branchId }),
        ...(employeeId && { employeeId }),
      });
      setSummary(result.summaryRows);
      setDetails(result.detailsByEmployee);
    } catch (err: any) {
      alert(err.message || 'Ошибка расчёта');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRun = async () => {
    try {
      setLoading(true);
      const run: any = await payrollApi.createRun({
        fromDate,
        toDate,
        ...(branchId && { branchId }),
      });
      setNotification({ type: 'success', message: `Расчёт сформирован! ID: ${run.id}` });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Ошибка формирования расчёта' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const selectedDetails = selectedEmployee ? details[selectedEmployee] : null;
  const selectedEmployeeData = summary.find(s => s.employeeId === selectedEmployee);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Расчёт зарплаты</h1>

        {/* Notification */}
        {notification && (
          <div className={`mb-4 p-4 rounded-lg ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">С</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">По</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Филиал</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Все</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Мастер</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Все</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.fullName || 'Без имени'}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Расчёт...' : 'Рассчитать'}
              </button>
              <button
                onClick={handleCreateRun}
                disabled={loading || summary.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Сформировать расчёт
              </button>
            </div>
          </div>
        </div>

        {/* Summary Table */}
        {summary.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Мастер</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Смен</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Услуги</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Товары</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Бонус</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Доплата до мин.</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Итого</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Детали</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {summary.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.fullName}</td>
                    <td className="px-4 py-3 text-center">{row.workDaysCount || 0}</td>
                    <td className="px-4 py-3 text-right">{formatRubles(row.servicesKopeks)}</td>
                    <td className="px-4 py-3 text-right">{formatRubles(row.productsKopeks)}</td>
                    <td className="px-4 py-3 text-right">{formatRubles(row.bonusKopeks)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">
                      {row.minimumTopUpKopeks > 0 ? formatRubles(row.minimumTopUpKopeks) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{formatRubles(row.totalKopeks)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedEmployee(row.employeeId)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Подробнее
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Details Drawer */}
        {selectedEmployee && selectedDetails && selectedEmployeeData && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
            <div className="bg-white w-full max-w-2xl h-full overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{selectedEmployeeData.fullName} - Детали</h2>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Services */}
              {selectedDetails.services.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Услуги ({selectedDetails.services.length})</h3>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Дата</th>
                          <th className="px-3 py-2 text-left">Услуга</th>
                          <th className="px-3 py-2 text-right">База</th>
                          <th className="px-3 py-2 text-center">Правило</th>
                          <th className="px-3 py-2 text-right">Зарплата</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedDetails.services.map((s, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{s.date}</td>
                            <td className="px-3 py-2">{s.serviceName}</td>
                            <td className="px-3 py-2 text-right">{formatRubles(s.baseKopeks)}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{s.ruleApplied}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatRubles(s.earnedKopeks)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Products */}
              {selectedDetails.products.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Товары ({selectedDetails.products.length})</h3>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Дата</th>
                          <th className="px-3 py-2 text-left">Товар</th>
                          <th className="px-3 py-2 text-center">Кол-во</th>
                          <th className="px-3 py-2 text-right">Выручка</th>
                          <th className="px-3 py-2 text-center">Правило</th>
                          <th className="px-3 py-2 text-right">Зарплата</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedDetails.products.map((p, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{p.date}</td>
                            <td className="px-3 py-2">{p.productName}</td>
                            <td className="px-3 py-2 text-center">{p.qty}</td>
                            <td className="px-3 py-2 text-right">{formatRubles(p.revenueKopeks)}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{p.ruleApplied}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatRubles(p.earnedKopeks)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium mb-3">Итоги</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Услуги:</span>
                    <span>{formatRubles(selectedEmployeeData.servicesKopeks)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Товары:</span>
                    <span>{formatRubles(selectedEmployeeData.productsKopeks)}</span>
                  </div>
                  {selectedEmployeeData.minimumTopUpKopeks > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Доплата до минимума:</span>
                      <span>{formatRubles(selectedEmployeeData.minimumTopUpKopeks)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Итого к выплате:</span>
                    <span>{formatRubles(selectedEmployeeData.totalKopeks)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
