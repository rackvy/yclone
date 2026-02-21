import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { cashShiftsApi, CashShift, getToday, formatDateForApi } from '../api/cashShifts';
import { branchesApi, Branch } from '../api/branches';
import { formatRubles } from '../api/products';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<CashShift[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Для закрытия смены
  const [actualCash, setActualCash] = useState<string>('');
  const [closeComment, setCloseComment] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingShiftId, setClosingShiftId] = useState<string>('');

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      loadShifts();
    }
  }, [selectedBranchId, selectedDate]);

  const loadBranches = async () => {
    try {
      const data = await branchesApi.list();
      setBranches(data);
      if (data.length > 0) {
        const savedBranchId = localStorage.getItem('selectedBranchId');
        if (savedBranchId && data.find(b => b.id === savedBranchId)) {
          setSelectedBranchId(savedBranchId);
        } else {
          setSelectedBranchId(data[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки филиалов');
    }
  };

  const loadShifts = async () => {
    try {
      setLoading(true);
      const data = await cashShiftsApi.list({
        branchId: selectedBranchId,
        date: selectedDate,
      });
      setShifts(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки смен');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async () => {
    try {
      setLoading(true);
      await cashShiftsApi.open({
        date: selectedDate,
        branchId: selectedBranchId,
      });
      await loadShifts();
    } catch (err: any) {
      alert(err.message || 'Ошибка открытия смены');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseClick = (shiftId: string) => {
    setClosingShiftId(shiftId);
    setActualCash('');
    setCloseComment('');
    setShowCloseModal(true);
  };

  const handleCloseShift = async () => {
    if (!actualCash) {
      alert('Введите фактическую сумму');
      return;
    }

    try {
      setLoading(true);
      await cashShiftsApi.close(closingShiftId, {
        actualCash: parseInt(actualCash),
        comment: closeComment,
      });
      setShowCloseModal(false);
      await loadShifts();
    } catch (err: any) {
      alert(err.message || 'Ошибка закрытия смены');
    } finally {
      setLoading(false);
    }
  };

  // Сравниваем даты без учёта времени (s.date может быть ISO строкой с временем)
  const currentShift = shifts.find(s => {
    const shiftDate = s.date.split('T')[0];
    return shiftDate === selectedDate;
  });

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Смены / Закрытие дня</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Фильтры */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Филиал</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Дата</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <button
              onClick={loadShifts}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Обновить
            </button>
          </div>
        </div>

        {/* Текущая смена */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                Смена на {selectedDate.split('-').reverse().join('.')}
              </h2>
              <p className="text-gray-500">
                {branches.find(b => b.id === selectedBranchId)?.name}
              </p>
            </div>
            {currentShift ? (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentShift.status === 'open' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {currentShift.status === 'open' ? 'Открыта' : 'Закрыта'}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                Не открыта
              </span>
            )}
          </div>

          {currentShift ? (
            <div className="space-y-4">
              {/* Информация о смене */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Открыта</p>
                  <p className="font-medium">{new Date(currentShift.openedAt).toLocaleString('ru-RU')}</p>
                  {currentShift.openedByEmployee && (
                    <p className="text-sm text-gray-500">{currentShift.openedByEmployee.fullName}</p>
                  )}
                </div>
                {currentShift.status === 'closed' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Закрыта</p>
                    <p className="font-medium">{currentShift.closedAt && new Date(currentShift.closedAt).toLocaleString('ru-RU')}</p>
                    {currentShift.closedByEmployee && (
                      <p className="text-sm text-gray-500">{currentShift.closedByEmployee.fullName}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Суммы */}
              {currentShift.status === 'closed' && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Ожидаемая сумма</p>
                    <p className="text-xl font-bold text-blue-600">{formatRubles(currentShift.expectedCash)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Фактическая сумма</p>
                    <p className="text-xl font-bold text-green-600">{formatRubles(currentShift.actualCash || 0)}</p>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${
                    (currentShift.diffCash || 0) === 0 
                      ? 'bg-gray-50' 
                      : (currentShift.diffCash || 0) > 0 
                        ? 'bg-green-50' 
                        : 'bg-red-50'
                  }`}>
                    <p className="text-sm text-gray-500">Разница</p>
                    <p className={`text-xl font-bold ${
                      (currentShift.diffCash || 0) === 0 
                        ? 'text-gray-600' 
                        : (currentShift.diffCash || 0) > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                    }`}>
                      {formatRubles(currentShift.diffCash || 0)}
                    </p>
                  </div>
                </div>
              )}

              {/* Комментарий */}
              {currentShift.comment && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Комментарий</p>
                  <p>{currentShift.comment}</p>
                </div>
              )}

              {/* Кнопки */}
              {currentShift.status === 'open' && (
                <button
                  onClick={() => handleCloseClick(currentShift.id)}
                  disabled={loading}
                  className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
                >
                  Закрыть смену
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Смена на выбранную дату не открыта</p>
              <button
                onClick={handleOpenShift}
                disabled={loading}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
              >
                Открыть смену
              </button>
            </div>
          )}
        </div>

        {/* История смен */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold">История смен</h3>
          </div>
          <div className="divide-y">
            {shifts.filter(s => s.date.split('T')[0] !== selectedDate).map(shift => (
              <div key={shift.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{shift.date.split('T')[0].split('-').reverse().join('.')}</p>
                  <p className="text-sm text-gray-500">{shift.branch?.name}</p>
                </div>
                <div className="flex items-center gap-4">
                  {shift.status === 'closed' && (
                    <div className="text-right">
                      <p className="text-sm">Ожидалось: {formatRubles(shift.expectedCash)}</p>
                      <p className="text-sm">Факт: {formatRubles(shift.actualCash || 0)}</p>
                    </div>
                  )}
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    shift.status === 'open' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {shift.status === 'open' ? 'Открыта' : 'Закрыта'}
                  </span>
                </div>
              </div>
            ))}
            {shifts.filter(s => s.date.split('T')[0] !== selectedDate).length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Нет истории смен
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модал закрытия смены */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Закрыть смену</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Фактическая сумма в кассе</label>
                <input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Введите сумму"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Комментарий</label>
                <textarea
                  value={closeComment}
                  onChange={(e) => setCloseComment(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Необязательно"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCloseShift}
                  disabled={loading}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
