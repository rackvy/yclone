import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { payrollApi } from '../api/payroll';
import { formatRubles } from '../api/products';

interface PayrollRun {
  id: string;
  fromDate: string;
  toDate: string;
  status: 'draft' | 'approved';
  createdAt: string;
  approvedAt?: string;
  branch?: { id: string; name: string };
  _count: { lines: number };
}

export default function PayrollRunsPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [runToApprove, setRunToApprove] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const data = await payrollApi.listRuns();
      setRuns(data);
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id: string) => {
    try {
      setLoading(true);
      const run = await payrollApi.getRun(id);
      setSelectedRun(run);
    } catch (err) {
      setNotification({ type: 'error', message: 'Ошибка загрузки расчёта' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setRunToApprove(id);
  };

  const confirmApprove = async () => {
    if (!runToApprove) return;
    try {
      setLoading(true);
      await payrollApi.approveRun(runToApprove);
      setNotification({ type: 'success', message: 'Расчёт утверждён!' });
      setTimeout(() => setNotification(null), 3000);
      loadRuns();
      if (selectedRun?.id === runToApprove) {
        setSelectedRun(null);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Ошибка утверждения' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
      setRunToApprove(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU');
  };

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Ведомости зарплаты</h1>

        {/* Notification */}
        {notification && (
          <div className={`mb-4 p-4 rounded-lg ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {notification.message}
          </div>
        )}

        {loading && <div className="text-gray-500 mb-4">Загрузка...</div>}

        {/* Runs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Период</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Филиал</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Сотрудников</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Статус</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Создан</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {formatDate(run.fromDate)} - {formatDate(run.toDate)}
                  </td>
                  <td className="px-4 py-3">{run.branch?.name || 'Все филиалы'}</td>
                  <td className="px-4 py-3 text-center">{run._count.lines}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-sm ${
                      run.status === 'approved' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {run.status === 'approved' ? 'Утверждён' : 'Черновик'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(run.createdAt).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleView(run.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                    >
                      Просмотр
                    </button>
                    {run.status === 'draft' && (
                      <button
                        onClick={() => handleApprove(run.id)}
                        disabled={loading}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Утвердить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {runs.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Нет сформированных расчётов
            </div>
          )}
        </div>

        {/* Run Details Modal */}
        {selectedRun && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">
                    Расчёт {formatDate(selectedRun.fromDate)} - {formatDate(selectedRun.toDate)}
                  </h2>
                  <button
                    onClick={() => setSelectedRun(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex gap-4 text-sm">
                  <span>Филиал: {selectedRun.branch?.name || 'Все'}</span>
                  <span className={`px-2 py-0.5 rounded ${
                    selectedRun.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedRun.status === 'approved' ? 'Утверждён' : 'Черновик'}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Сотрудник</th>
                      <th className="px-4 py-2 text-center">Смен</th>
                      <th className="px-4 py-2 text-right">Услуги</th>
                      <th className="px-4 py-2 text-right">Товары</th>
                      <th className="px-4 py-2 text-right">Бонус</th>
                      <th className="px-4 py-2 text-right">Доплата</th>
                      <th className="px-4 py-2 text-right">Итого</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedRun.lines?.map((line: any) => (
                      <tr key={line.id}>
                        <td className="px-4 py-2">{line.employee?.fullName}</td>
                        <td className="px-4 py-2 text-center">{line.workDaysCount}</td>
                        <td className="px-4 py-2 text-right">{formatRubles(line.servicesKopeks)}</td>
                        <td className="px-4 py-2 text-right">{formatRubles(line.productsKopeks)}</td>
                        <td className="px-4 py-2 text-right">{formatRubles(line.bonusKopeks)}</td>
                        <td className="px-4 py-2 text-right text-orange-600">
                          {line.minimumTopUpKopeks > 0 ? formatRubles(line.minimumTopUpKopeks) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-bold">{formatRubles(line.totalKopeks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedRun.status === 'draft' && (
                <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedRun(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Закрыть
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRun.id)}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Утверждение...' : 'Утвердить расчёт'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirm Approve Modal */}
        {runToApprove && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">Подтверждение</h3>
              <p className="text-gray-600 mb-6">
                Утвердить расчёт? Это действие нельзя отменить.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setRunToApprove(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmApprove}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Утверждение...' : 'Утвердить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
