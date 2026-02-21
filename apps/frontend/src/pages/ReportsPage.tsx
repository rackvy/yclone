import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { reportsApi, SummaryReport, MastersReport, ProductsReport } from '../api/reports';
import { branchesApi, Branch } from '../api/branches';
import { formatKopeks } from '../api/products';

type TabType = 'summary' | 'masters' | 'products';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Данные отчётов
  const [summaryData, setSummaryData] = useState<SummaryReport | null>(null);
  const [mastersData, setMastersData] = useState<MastersReport | null>(null);
  const [productsData, setProductsData] = useState<ProductsReport | null>(null);

  useEffect(() => {
    loadBranches();
    // Устанавливаем даты по умолчанию - текущий месяц
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setFromDate(formatDateForInput(firstDay));
    setToDate(formatDateForInput(today));
  }, []);

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const loadBranches = async () => {
    try {
      const data = await branchesApi.list();
      setBranches(data);
      if (data.length > 0) {
        setSelectedBranchId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки филиалов');
    }
  };

  const loadReport = async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    setError('');
    try {
      const filters = {
        from: fromDate,
        to: toDate,
        branchId: selectedBranchId || undefined,
      };
      if (activeTab === 'summary') {
        const data = await reportsApi.getSummary(filters);
        setSummaryData(data);
      } else if (activeTab === 'masters') {
        const data = await reportsApi.getMasters(filters);
        setMastersData(data);
      } else {
        const data = await reportsApi.getProducts(filters);
        setProductsData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки отчёта');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fromDate && toDate && selectedBranchId) {
      loadReport();
    }
  }, [activeTab, fromDate, toDate, selectedBranchId]);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Отчёты</h1>

        {/* Фильтры */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-600 mb-1">Филиал</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">С</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">По</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border rounded-lg px-3 py-2"
              />
            </div>
            <button
              onClick={loadReport}
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Загрузка...' : 'Обновить'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Табы */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'summary'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Сводный
          </button>
          <button
            onClick={() => setActiveTab('masters')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'masters'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Мастера
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'products'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Товары
          </button>
        </div>

        {/* Контент табов */}
        {activeTab === 'summary' && summaryData && (
          <SummaryTab data={summaryData} />
        )}
        {activeTab === 'masters' && mastersData && (
          <MastersTab data={mastersData} />
        )}
        {activeTab === 'products' && productsData && (
          <ProductsTab data={productsData} />
        )}
      </div>
    </Layout>
  );
}

// ==================== Summary Tab ====================
function SummaryTab({ data }: { data: SummaryReport }) {
  return (
    <div className="space-y-6">
      {/* Карточки выручки */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">Услуги</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatKopeks(data.revenue.servicesKopeks)}
          </p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">Товары</p>
          <p className="text-2xl font-bold text-green-600">
            {formatKopeks(data.revenue.productsKopeks)}
          </p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">Итого</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatKopeks(data.revenue.totalKopeks)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* По методам оплаты */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold">По методам оплаты</h3>
          </div>
          <div className="divide-y">
            {data.byMethod.length === 0 && (
              <div className="p-4 text-gray-500 text-center">Нет данных</div>
            )}
            {data.byMethod.map((m) => (
              <div key={m.methodId} className="p-4 flex justify-between">
                <span>{m.name}</span>
                <span className="font-medium">{formatKopeks(m.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* По кассам */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold">По кассам</h3>
          </div>
          <div className="divide-y">
            {data.byCashbox.length === 0 && (
              <div className="p-4 text-gray-500 text-center">Нет данных</div>
            )}
            {data.byCashbox.map((c) => (
              <div key={c.cashboxId} className="p-4 flex justify-between">
                <span>{c.name}</span>
                <span className="font-medium">{formatKopeks(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Masters Tab ====================
function MastersTab({ data }: { data: MastersReport }) {
  return (
    <div className="space-y-6">
      {/* Сводка */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">Всего записей</p>
          <p className="text-2xl font-bold text-blue-600">{data.summary.totalAppointments}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">Общая выручка</p>
          <p className="text-2xl font-bold text-green-600">
            {formatKopeks(data.summary.totalRevenueKopeks)}
          </p>
        </div>
      </div>

      {/* Таблица мастеров */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">По мастерам</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Мастер</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Записей</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Выручка</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Средний чек</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.masters.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-gray-500 text-center">Нет данных</td>
                </tr>
              )}
              {data.masters.map((m) => (
                <tr key={m.masterId}>
                  <td className="px-4 py-3">{m.fullName}</td>
                  <td className="px-4 py-3 text-right">{m.appointmentsDone}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatKopeks(m.revenueKopeks)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatKopeks(m.avgCheckKopeks)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== Products Tab ====================
function ProductsTab({ data }: { data: ProductsReport }) {
  return (
    <div className="space-y-6">
      {/* Сводка */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">Всего продано</p>
          <p className="text-2xl font-bold text-blue-600">{data.summary.totalItemsSold} шт</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">Общая выручка</p>
          <p className="text-2xl font-bold text-green-600">
            {formatKopeks(data.summary.totalRevenueKopeks)}
          </p>
        </div>
      </div>

      {/* Таблица товаров */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Топ товаров</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Товар</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Артикул</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Продано</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Выручка</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.products.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-gray-500 text-center">Нет данных</td>
                </tr>
              )}
              {data.products.map((p) => (
                <tr key={p.productId}>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-right">{p.qtySold} шт</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatKopeks(p.revenueKopeks)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
