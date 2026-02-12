import { useState, useEffect, FormEvent } from 'react';
import Layout from '../components/Layout';
import { employeesApi, Employee, getRoleLabel } from '../api/employees';
import { usersApi, UserProfile } from '../api/users';
import { scheduleApi, WorkScheduleRule, WorkScheduleException, WorkScheduleBlock, dayNames, formatTime } from '../api/schedule';
import { getWeekDates, formatDateYYYYMMDD, formatDateDDMM, addDays } from '../utils/date';

interface ScheduleCell {
  rule: WorkScheduleRule | null;
  exception: WorkScheduleException | null;
  blocks: WorkScheduleBlock[];
  date: Date;
  dayOfWeek: number;
}

interface EmployeeSchedule {
  employee: Employee;
  rules: WorkScheduleRule[];
  exceptions: WorkScheduleException[];
  blocks: WorkScheduleBlock[];
}

export default function SchedulePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [schedules, setSchedules] = useState<Map<string, EmployeeSchedule>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<ScheduleCell | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    isWorkingDay: true,
    startTime: '10:00',
    endTime: '20:00',
  });
  const [isException, setIsException] = useState(false);

  // Block modal states
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockFormData, setBlockFormData] = useState({
    startTime: '13:00',
    endTime: '15:00',
    reason: 'Перерыв',
  });
  const [blockCell, setBlockCell] = useState<ScheduleCell | null>(null);
  const [blockEmployee, setBlockEmployee] = useState<Employee | null>(null);

  const weekDates = getWeekDates(currentWeekStart);
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadEmployees();
    }
  }, [user]);

  useEffect(() => {
    if (employees.length > 0) {
      loadSchedulesForEmployees(employees);
    }
  }, [currentWeekStart]);

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  async function loadUser() {
    try {
      const profile = await usersApi.getProfile();
      setUser(profile);
    } catch (err) {
      setError('Ошибка загрузки профиля');
    }
  }

  async function loadEmployees() {
    try {
      setLoading(true);
      const data = await employeesApi.list();
      // Фильтруем только активных сотрудников выбранного филиала
      const selectedBranchId = localStorage.getItem('selectedBranchId');
      const activeEmployees = data.filter(e => 
        e.status === 'active' && (!selectedBranchId || e.branchId === selectedBranchId)
      );
      setEmployees(activeEmployees);
      // По умолчанию выбираем всех
      setSelectedEmployeeIds(activeEmployees.map(e => e.id));
      // Сразу загружаем расписание
      await loadSchedulesForEmployees(activeEmployees);
    } catch (err) {
      setError('Ошибка загрузки сотрудников');
    } finally {
      setLoading(false);
    }
  }

  async function loadSchedulesForEmployees(employeeList: Employee[]) {
    if (employeeList.length === 0) return;
    
    try {
      setLoading(true);
      setError('');

      const from = formatDateYYYYMMDD(weekDates[0]);
      const to = formatDateYYYYMMDD(weekDates[6]);
      const newSchedules = new Map<string, EmployeeSchedule>();

      await Promise.all(
        employeeList.map(async (employee) => {
          try {
            const [rulesData, exceptionsData, blocksData] = await Promise.all([
              scheduleApi.getRules(employee.id),
              scheduleApi.getExceptions(employee.id, from, to),
              scheduleApi.getBlocks(employee.id, from, to),
            ]);

            newSchedules.set(employee.id, {
              employee,
              rules: rulesData.days,
              exceptions: exceptionsData.items,
              blocks: blocksData.blocks,
            });
          } catch (err) {
            console.error(`Failed to load schedule for ${employee.id}`, err);
          }
        })
      );

      setSchedules(newSchedules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки расписания');
    } finally {
      setLoading(false);
    }
  }



  function normalizeDate(dateStr: string): string {
    // Преобразуем ISO формат (2026-02-09T00:00:00.000Z) в YYYY-MM-DD
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  }

  function getCellData(employeeId: string, date: Date, dayOfWeek: number): ScheduleCell {
    const schedule = schedules.get(employeeId);
    const dateStr = formatDateYYYYMMDD(date);
    const exception = schedule?.exceptions.find(e => normalizeDate(e.date) === dateStr) || null;
    const rule = schedule?.rules.find(r => r.dayOfWeek === dayOfWeek) || null;
    const blocks = schedule?.blocks.filter(b => normalizeDate(b.date) === dateStr) || [];
    return { date, dayOfWeek, rule, exception, blocks };
  }

  function canEditEmployee(employee: Employee): boolean {
    if (isAdmin) return true;
    return user?.employee?.id === employee.id;
  }

  function openEditModal(employee: Employee, cell: ScheduleCell) {
    if (!canEditEmployee(employee)) {
      setError('У вас нет прав на редактирование этого расписания');
      return;
    }
    setEditingEmployee(employee);
    setEditingCell(cell);
    // По умолчанию создаем исключение только если уже есть исключение на этот день
    // Иначе редактируем правило
    setIsException(false);

    const source = cell.exception || cell.rule;
    if (source) {
      setFormData({
        isWorkingDay: source.isWorkingDay,
        startTime: source.startTime?.substring(0, 5) || '10:00',
        endTime: source.endTime?.substring(0, 5) || '20:00',
      });
    } else {
      setFormData({
        isWorkingDay: true,
        startTime: '10:00',
        endTime: '20:00',
      });
    }
    setIsModalOpen(true);
  }

  function openBlockModal(employee: Employee, cell: ScheduleCell) {
    if (!canEditEmployee(employee)) {
      setError('У вас нет прав на редактирование этого расписания');
      return;
    }
    setBlockEmployee(employee);
    setBlockCell(cell);
    setBlockFormData({
      startTime: '13:00',
      endTime: '15:00',
      reason: 'Перерыв',
    });
    setIsBlockModalOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!editingCell || !editingEmployee) return;

    try {
      setLoading(true);
      const dateStr = formatDateYYYYMMDD(editingCell.date);

      if (isException) {
        await scheduleApi.saveException({
          employeeId: editingEmployee.id,
          date: dateStr,
          isWorkingDay: formData.isWorkingDay,
          ...(formData.isWorkingDay ? {
            startTime: formData.startTime,
            endTime: formData.endTime,
          } : {}),
        });
      } else {
        const schedule = schedules.get(editingEmployee.id);
        // Убираем поле id из существующих правил
        const existingRules = (schedule?.rules.filter(r => r.dayOfWeek !== editingCell.dayOfWeek) || [])
          .map(({ id, ...rest }) => rest);
        const newRules = [...existingRules, {
          dayOfWeek: editingCell.dayOfWeek,
          isWorkingDay: formData.isWorkingDay,
          startTime: formData.isWorkingDay ? formData.startTime : null,
          endTime: formData.isWorkingDay ? formData.endTime : null,
        }];
        await scheduleApi.saveRules(editingEmployee.id, newRules);
      }

      await loadSchedulesForEmployees(employees);
      setIsModalOpen(false);
      setSuccess('Расписание сохранено');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBlock(e: FormEvent) {
    e.preventDefault();
    if (!blockCell || !blockEmployee) return;

    try {
      setLoading(true);
      const dateStr = formatDateYYYYMMDD(blockCell.date);

      await scheduleApi.createBlock({
        employeeId: blockEmployee.id,
        date: dateStr,
        startTime: blockFormData.startTime,
        endTime: blockFormData.endTime,
        reason: blockFormData.reason,
      });

      // Перезагружаем расписание для конкретного сотрудника
      await reloadEmployeeSchedule(blockEmployee.id);
      setIsBlockModalOpen(false);
      setSuccess('Перерыв добавлен');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения перерыва');
    } finally {
      setLoading(false);
    }
  }

  async function reloadEmployeeSchedule(employeeId: string) {
    try {
      const from = formatDateYYYYMMDD(weekDates[0]);
      const to = formatDateYYYYMMDD(weekDates[6]);
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) {
        console.error('Employee not found:', employeeId);
        return;
      }

      console.log('Reloading schedule for:', employeeId, 'from:', from, 'to:', to);

      const [rulesData, exceptionsData, blocksData] = await Promise.all([
        scheduleApi.getRules(employeeId),
        scheduleApi.getExceptions(employeeId, from, to),
        scheduleApi.getBlocks(employeeId, from, to),
      ]);

      console.log('Loaded blocks:', blocksData.blocks);

      setSchedules(prev => {
        const newSchedules = new Map(prev);
        newSchedules.set(employeeId, {
          employee,
          rules: rulesData.days,
          exceptions: exceptionsData.items,
          blocks: blocksData.blocks,
        });
        console.log('Updated schedules:', newSchedules);
        return newSchedules;
      });
    } catch (err) {
      console.error('Failed to reload schedule', err);
    }
  }

  async function deleteBlock(employee: Employee, block: WorkScheduleBlock) {
    if (!canEditEmployee(employee)) {
      setError('У вас нет прав на редактирование');
      return;
    }

    try {
      setLoading(true);
      await scheduleApi.deleteBlock(block.id);
      await reloadEmployeeSchedule(employee.id);
      setSuccess('Перерыв удален');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setLoading(false);
    }
  }

  function toggleEmployeeSelection(employeeId: string) {
    setSelectedEmployeeIds(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  }

  function selectAllEmployees() {
    setSelectedEmployeeIds(employees.map(e => e.id));
  }

  function deselectAllEmployees() {
    setSelectedEmployeeIds([]);
  }

  function prevWeek() {
    setCurrentWeekStart(prev => addDays(prev, -7));
  }

  function nextWeek() {
    setCurrentWeekStart(prev => addDays(prev, 7));
  }

  function copyFromPreviousWeek() {
    setCopyMessage('Функция копирования в разработке');
    setTimeout(() => setCopyMessage(''), 3000);
  }

  const filteredEmployees = employees.filter(e => selectedEmployeeIds.includes(e.id));

  return (
    <Layout>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Расписание сотрудников</h1>
            <p className="text-gray-500 text-sm">Управление графиком работы всех мастеров</p>
          </div>
          <button
            onClick={() => loadSchedulesForEmployees(employees)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"
          >
            <span className="material-symbols-outlined">refresh</span>
            Обновить
          </button>
        </div>
      </header>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Week Navigation */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button onClick={prevWeek} className="p-1.5 hover:bg-white rounded-md transition-all">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="px-4 text-sm font-bold text-gray-700 min-w-[180px] text-center">
              {formatDateDDMM(weekDates[0])} - {formatDateDDMM(weekDates[6])}
            </span>
            <button onClick={nextWeek} className="p-1.5 hover:bg-white rounded-md transition-all">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          <button
            onClick={copyFromPreviousWeek}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
          >
            <span className="material-symbols-outlined">content_copy</span>
            Копировать с прошлой недели
          </button>
        </div>

        <div className="text-sm text-gray-500">
          Показано {filteredEmployees.length} из {employees.length} сотрудников
        </div>
      </div>

      {/* Employee Filter */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-sm font-medium text-gray-700">Фильтр сотрудников:</span>
          <button
            onClick={selectAllEmployees}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Выбрать всех
          </button>
          <button
            onClick={deselectAllEmployees}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Снять все
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => toggleEmployeeSelection(emp.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedEmployeeIds.includes(emp.id)
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'
              }`}
            >
              <span className={`size-2 rounded-full ${selectedEmployeeIds.includes(emp.id) ? 'bg-white' : 'bg-gray-300'}`} />
              {emp.fullName}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {copyMessage && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">{copyMessage}</p>
          </div>
        )}

        {/* Legend */}
        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-500">Легенда:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/10 border border-primary/20 rounded"></div>
            <span>Рабочий день</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
            <span>Выходной</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded"></div>
            <span>Перерыв</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/10 border-2 border-orange-300 rounded"></div>
            <span>Изменение на дату</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Выберите сотрудников для отображения расписания
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-4 px-6 text-left text-xs font-bold uppercase text-gray-500 border-r border-gray-200 w-64 sticky left-0 bg-gray-50 z-10">
                    Сотрудник
                  </th>
                  {weekDates.map((date, i) => (
                    <th key={i} className="px-4 py-4 text-center text-xs font-bold uppercase text-gray-500 min-w-[140px]">
                      {dayNames[date.getDay()]} <span className="block text-gray-900 text-sm mt-0.5">{formatDateDDMM(date)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="border-t border-gray-200">
                    <td className="py-4 px-6 border-r border-gray-200 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary">person</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold">{employee.fullName}</div>
                          <div className="text-xs text-primary">{getRoleLabel(employee.role)}</div>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((date, i) => {
                      const cell = getCellData(employee.id, date, date.getDay());
                      const isExc = !!cell.exception;
                      const isWorking = cell.exception?.isWorkingDay ?? cell.rule?.isWorkingDay ?? false;
                      const startTime = cell.exception?.startTime ?? cell.rule?.startTime ?? null;
                      const endTime = cell.exception?.endTime ?? cell.rule?.endTime ?? null;
                      const hasBlocks = cell.blocks.length > 0;
                      const canEdit = canEditEmployee(employee);

                      return (
                        <td key={i} className="p-2">
                          <div className="space-y-1">
                            {/* Main schedule button */}
                            <button
                              onClick={() => openEditModal(employee, cell)}
                              className={`w-full h-12 flex flex-col items-center justify-center rounded-lg border transition-all group relative ${
                                isWorking
                                  ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white'
                                  : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-primary'
                              } ${isExc ? 'ring-2 ring-orange-300' : ''}`}
                            >
                              {isWorking ? (
                                <>
                                  <span className="text-xs font-bold">{formatTime(startTime)} - {formatTime(endTime)}</span>
                                  {isExc && <span className="text-[10px]">изм.</span>}
                                </>
                              ) : (
                                <>
                                  <span className="text-xs font-bold">Выходной</span>
                                  {isExc && <span className="text-[10px]">изм.</span>}
                                </>
                              )}
                              {canEdit && (
                                <span className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100">
                                  <span className="material-symbols-outlined text-xs">edit</span>
                                </span>
                              )}
                            </button>

                            {/* Blocks/Breaks */}
                            {hasBlocks && (
                              <div className="space-y-1">
                                {cell.blocks.map((block) => (
                                  <div
                                    key={block.id}
                                    className="flex items-center justify-between px-2 py-1 bg-orange-100 border border-orange-200 rounded text-xs"
                                  >
                                    <span className="text-orange-800">
                                      {formatTime(block.startTime)}-{formatTime(block.endTime)}
                                    </span>
                                    {canEdit && (
                                      <button
                                        onClick={() => deleteBlock(employee, block)}
                                        className="text-orange-600 hover:text-orange-800"
                                      >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add block button */}
                            {canEdit && isWorking && (
                              <button
                                onClick={() => openBlockModal(employee, cell)}
                                className="w-full py-1.5 text-xs text-orange-600 hover:text-orange-700 border border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50 rounded transition-all flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">coffee</span>
                                + перерыв
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Edit Schedule Modal */}
      {isModalOpen && editingCell && editingEmployee && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-bold">
                    {editingEmployee.fullName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatDateDDMM(editingCell.date)} ({dayNames[editingCell.date.getDay()]})
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isWorkingDay"
                      checked={formData.isWorkingDay}
                      onChange={(e) => setFormData({ ...formData, isWorkingDay: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isWorkingDay" className="text-sm font-medium text-gray-700">
                      Рабочий день
                    </label>
                  </div>

                  {formData.isWorkingDay && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Начало</label>
                        <input
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Конец</label>
                        <input
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isException"
                      checked={isException}
                      onChange={(e) => setIsException(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isException" className="text-sm font-medium text-gray-700">
                      Только на эту дату (исключение)
                    </label>
                  </div>

                  {isException && (
                    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                      Это изменение применится только к {formatDateDDMM(editingCell.date)}.
                      Обычное расписание останется без изменений.
                    </p>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Add Block Modal */}
      {isBlockModalOpen && blockCell && blockEmployee && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsBlockModalOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-bold">Добавить перерыв</h3>
                  <p className="text-sm text-gray-500">
                    {blockEmployee.fullName} — {formatDateDDMM(blockCell.date)}
                  </p>
                </div>
                <button onClick={() => setIsBlockModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSaveBlock} className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Начало перерыва</label>
                      <input
                        type="time"
                        value={blockFormData.startTime}
                        onChange={(e) => setBlockFormData({ ...blockFormData, startTime: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Конец перерыва</label>
                      <input
                        type="time"
                        value={blockFormData.endTime}
                        onChange={(e) => setBlockFormData({ ...blockFormData, endTime: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Причина (необязательно)</label>
                    <input
                      type="text"
                      value={blockFormData.reason}
                      onChange={(e) => setBlockFormData({ ...blockFormData, reason: e.target.value })}
                      placeholder="Например: Обед, Личные дела"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                    Время перерыва будет заблокировано для записи клиентов.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsBlockModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Сохранение...' : 'Добавить перерыв'}
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
