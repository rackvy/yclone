import { ReactNode, useState, useEffect } from 'react';
import Link from './Link';
import { branchesApi, Branch } from '../api/branches';
import { employeesApi, Employee } from '../api/employees';
import { tasksApi, Task, TaskPriority, getPriorityColor, getStatusLabel } from '../api/tasks';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isTasksPanelOpen, setIsTasksPanelOpen] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return localStorage.getItem('selectedBranchId') || '';
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isEmployeesMenuOpen, setIsEmployeesMenuOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  
  // Task modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    hasDateTime: false,
    date: '',
    startTime: '',
  });
  const [taskFormError, setTaskFormError] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Load branches and employees
  useEffect(() => {
    loadBranches();
    loadEmployees();
  }, []);
  
  // Reload employees when branch changes
  useEffect(() => {
    loadEmployees();
  }, [selectedBranchId]);

  const loadBranches = async () => {
    try {
      const data = await branchesApi.list();
      setBranches(data);
      // If no branch selected, select first one
      if (!selectedBranchId && data.length > 0) {
        const firstBranchId = data[0].id;
        setSelectedBranchId(firstBranchId);
        localStorage.setItem('selectedBranchId', firstBranchId);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    localStorage.setItem('selectedBranchId', branchId);
    // Reload page to apply branch filter
    window.location.reload();
  };
  
  const loadEmployees = async () => {
    try {
      const data = await employeesApi.list();
      // Filter by selected branch and only masters
      const filtered = data.filter(e => 
        e.status === 'active' && 
        e.role === 'master' &&
        (!selectedBranchId || e.branchId === selectedBranchId)
      );
      setEmployees(filtered);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  // Navigate to calendar with selected date
  const navigateToCalendar = (date: Date) => {
    // Format as YYYY-MM-DD using local date components to avoid timezone shift
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    localStorage.setItem('calendarDate', dateStr);
    setSelectedCalendarDate(date);
    if (currentPath !== '/calendar') {
      window.location.href = '/calendar';
    } else {
      window.location.reload();
    }
  };

  const isActive = (path: string) => currentPath === path;

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  // Load tasks when panel opens or branch changes
  useEffect(() => {
    if (isTasksPanelOpen && selectedBranchId) {
      loadTasks();
    }
  }, [isTasksPanelOpen, selectedBranchId]);

  const loadTasks = async () => {
    try {
      setTasksLoading(true);
      // Load all tasks (with and without date)
      const data = await tasksApi.list(selectedBranchId);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  };

  const openTaskModal = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      hasDateTime: false,
      date: '',
      startTime: '',
    });
    setTaskFormError('');
    setIsTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setTaskFormError('');
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError('');

    if (!taskForm.title.trim()) {
      setTaskFormError('Укажите название задачи');
      return;
    }

    setSavingTask(true);
    try {
      await tasksApi.create({
        branchId: selectedBranchId,
        title: taskForm.title,
        description: taskForm.description || undefined,
        priority: taskForm.priority,
        hasDateTime: taskForm.hasDateTime,
        date: taskForm.hasDateTime ? taskForm.date : undefined,
        startTime: taskForm.hasDateTime ? taskForm.startTime : undefined,
      });
      await loadTasks();
      closeTaskModal();
    } catch (err) {
      setTaskFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingTask(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      if (task.status === 'done') {
        await tasksApi.update(taskId, { status: 'new' });
      } else {
        await tasksApi.complete(taskId);
      }
      await loadTasks();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const incompleteTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'canceled').length;

  // Calendar functions
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get day of week (0 = Sunday, 1 = Monday, etc)
    let firstDayOfWeek = firstDay.getDay();
    // Convert to Monday = 0, Sunday = 6
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      prevMonthDays.push({ day: prevMonthLastDay - i, isCurrentMonth: false });
    }
    
    // Current month days
    const currentMonthDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      currentMonthDays.push({ day, isCurrentMonth: true });
    }
    
    // Next month days to fill the grid
    const totalDays = prevMonthDays.length + currentMonthDays.length;
    const remainingDays = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
    const nextMonthDays = [];
    for (let day = 1; day <= remainingDays; day++) {
      nextMonthDays.push({ day, isCurrentMonth: false });
    }
    
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return false;
    const today = new Date();
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  // Get selected date from localStorage for highlighting
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(() => {
    const saved = localStorage.getItem('calendarDate');
    if (saved) {
      // Parse YYYY-MM-DD directly to avoid timezone shift
      const [y, m, d] = saved.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });

  // Listen for storage changes to sync with CalendarPage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('calendarDate');
      if (saved) {
        const [y, m, d] = saved.split('-').map(Number);
        setSelectedCalendarDate(new Date(y, m - 1, d));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    // Also check periodically for changes in same window
    const interval = setInterval(handleStorageChange, 500);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const isSelectedDate = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return false;
    // Compare with current displayed month/year, not today's month/year
    return day === selectedCalendarDate.getDate() &&
           currentDate.getMonth() === selectedCalendarDate.getMonth() &&
           currentDate.getFullYear() === selectedCalendarDate.getFullYear();
  };

  const monthDays = getMonthDays(currentDate);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 flex flex-col gap-6 h-full overflow-y-auto no-scrollbar">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="size-9 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">spa</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold leading-tight uppercase tracking-wider">YClone CRM</h1>
              <p className="text-[10px] text-gray-500">Управление салоном</p>
            </div>
          </div>

          {/* Branch Selector */}
          {branches.length > 0 && (
            <div className="px-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Филиал</label>
              <select
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Mini Calendar */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
              <div className="flex gap-1">
                <button 
                  onClick={goToPrevMonth}
                  className="material-symbols-outlined text-sm cursor-pointer hover:text-primary"
                >
                  chevron_left
                </button>
                <button 
                  onClick={goToNextMonth}
                  className="material-symbols-outlined text-sm cursor-pointer hover:text-primary"
                >
                  chevron_right
                </button>
              </div>
            </div>
            <div className="mini-cal-grid text-[9px] text-gray-400 font-bold mb-1 text-center">
              <div>ПН</div><div>ВТ</div><div>СР</div><div>ЧТ</div><div>ПТ</div><div>СБ</div><div>ВС</div>
            </div>
            <div className="mini-cal-grid">
              {monthDays.map((dayInfo, index) => {
                const isCurrentDay = isToday(dayInfo.day, dayInfo.isCurrentMonth);
                const isSelected = isSelectedDate(dayInfo.day, dayInfo.isCurrentMonth);
                const clickDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayInfo.day);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => dayInfo.isCurrentMonth && navigateToCalendar(clickDate)}
                    disabled={!dayInfo.isCurrentMonth}
                    className={`mini-cal-day cursor-pointer hover:bg-gray-200 transition-colors ${
                      !dayInfo.isCurrentMonth ? 'text-gray-400 cursor-default hover:bg-transparent' : ''
                    } ${
                      isCurrentDay ? 'bg-primary text-white font-bold hover:bg-primary' : ''
                    } ${
                      isSelected && !isCurrentDay ? 'bg-primary/20 text-primary font-bold' : ''
                    }`}
                  >
                    {dayInfo.day}
                    {isCurrentDay && dayInfo.isCurrentMonth && (
                      <div className="flex gap-0.5 mt-0.5">
                        <div className="size-1 rounded-full bg-white"></div>
                        <div className="size-1 rounded-full bg-white"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex flex-col gap-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">Меню</p>
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/dashboard') 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-xl">dashboard</span>
              <span className={`text-sm ${isActive('/dashboard') ? 'font-semibold' : 'font-medium'}`}>Дашборд</span>
            </Link>
            <Link 
              href="/calendar" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/calendar') 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-xl">calendar_today</span>
              <span className={`text-sm ${isActive('/calendar') ? 'font-semibold' : 'font-medium'}`}>Календарь</span>
            </Link>
            <Link 
              href="/clients" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/clients') 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-xl">group</span>
              <span className={`text-sm ${isActive('/clients') ? 'font-semibold' : 'font-medium'}`}>Клиенты</span>
            </Link>
            {/* Employees Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setIsEmployeesMenuOpen(!isEmployeesMenuOpen)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/employees') || currentPath.startsWith('/employee/')
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="material-symbols-outlined text-xl">badge</span>
                <span className={`text-sm flex-1 text-left ${isActive('/employees') || currentPath.startsWith('/employee/') ? 'font-semibold' : 'font-medium'}`}>
                  Сотрудники
                </span>
                <span className={`material-symbols-outlined text-sm transition-transform ${isEmployeesMenuOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              
              {isEmployeesMenuOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {/* All Employees Link */}
                  <Link 
                    href="/employees" 
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/employees') 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">groups</span>
                    <span className="text-sm">Все сотрудники</span>
                  </Link>
                  
                  {/* Individual Master Links */}
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-1">
                      <Link 
                        href={`/employee/${emp.id}/schedule`}
                        className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          currentPath === `/employee/${emp.id}/schedule`
                            ? 'bg-primary/10 text-primary' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {emp.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm truncate">{emp.fullName}</span>
                      </Link>
                      <button
                        onClick={() => {
                          window.location.href = `/employee/${emp.id}/schedule?openModal=true`;
                        }}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                        title="Редактировать расписание"
                      >
                        <span className="material-symbols-outlined text-base">calendar_add_on</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Link 
              href="/schedule" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/schedule') 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-xl">schedule</span>
              <span className={`text-sm ${isActive('/schedule') ? 'font-semibold' : 'font-medium'}`}>Расписание</span>
            </Link>
            <Link 
              href="/services" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/services') 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-xl">content_cut</span>
              <span className={`text-sm ${isActive('/services') ? 'font-semibold' : 'font-medium'}`}>Услуги</span>
            </Link>
            <Link 
              href="/products" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/products') 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-xl">inventory_2</span>
              <span className={`text-sm ${isActive('/products') ? 'font-semibold' : 'font-medium'}`}>Товары</span>
            </Link>
            <Link 
              href="/reports" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/reports') 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-xl">bar_chart</span>
              <span className={`text-sm ${isActive('/reports') ? 'font-semibold' : 'font-medium'}`}>Отчёты</span>
            </Link>
          </nav>

          {/* Settings at bottom */}
          <div className="mt-auto border-t border-gray-100 pt-4 space-y-2">
            <Link 
              href="/profile" 
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/profile') 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-xl">person</span>
              <span className="text-sm font-medium">Профиль</span>
            </Link>
            <Link 
              href="/settings" 
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/settings') 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-xl">settings</span>
              <span className="text-sm font-medium">Настройки</span>
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              <span className="text-sm font-medium">Выйти</span>
            </button>
            
            {/* Footer */}
            <div className="border-t border-gray-100 pt-3 text-[11px] text-center text-gray-500">
              <div className="mb-1">Powered by e-RMA</div>
              <a 
                href="https://e-rma.ru/" 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-600 hover:text-blue-700 no-underline"
              >
                https://e-rma.ru/
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {children}
      </div>

      {/* Tasks Panel Toggle Button */}
      <button
        onClick={() => setIsTasksPanelOpen(!isTasksPanelOpen)}
        className={`fixed top-6 z-50 size-10 bg-primary rounded-full shadow-lg flex items-center justify-center text-white ring-4 ring-white group transition-all duration-300 ${
          isTasksPanelOpen ? 'right-[25rem]' : 'right-6'
        }`}
      >
        <span className="material-symbols-outlined text-xl">playlist_add_check</span>
        <span className="absolute -right-1 -top-1 bg-red-500 text-white text-[9px] font-bold size-5 rounded-full flex items-center justify-center ring-2 ring-white">
          {incompleteTasks}
        </span>
        <div className="absolute right-12 bg-gray-900 text-white text-[11px] px-3 py-1.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-bold">
          {incompleteTasks} {incompleteTasks === 1 ? 'задача' : incompleteTasks < 5 ? 'задачи' : 'задач'} сегодня
        </div>
      </button>

      {/* Tasks Side Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 z-40 ${
          isTasksPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Panel Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">assignment</span>
              <h2 className="text-lg font-bold">Задачи</h2>
            </div>
            <button
              onClick={() => setIsTasksPanelOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tasksLoading ? (
              <div className="text-center text-gray-400 py-8">Загрузка...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center text-gray-400 py-8">Нет задач</div>
            ) : (
              tasks.map((task) => (
                <div 
                  key={task.id}
                  className={`group flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-transparent hover:border-primary/30 transition-all cursor-pointer ${
                    task.status === 'done' ? 'opacity-50' : ''
                  }`}
                  onClick={() => toggleTask(task.id)}
                >
                  <div className="mt-0.5">
                    <input 
                      type="checkbox" 
                      checked={task.status === 'done'}
                      onChange={() => toggleTask(task.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary size-4 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-gray-400">{getStatusLabel(task.status)}</span>
                      {task.hasDateTime && task.date && (
                        <span className="text-xs text-primary font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]">event</span>
                          {new Date(task.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          {task.startTime && ` ${task.startTime.slice(0, 5)}`}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold text-gray-900 leading-tight truncate ${
                      task.status === 'done' ? 'line-through' : ''
                    }`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-4 border-t border-gray-200">
            <button 
              onClick={openTaskModal}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm font-bold text-gray-400 hover:border-primary hover:text-primary transition-all"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              <span>Добавить задачу</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isTasksPanelOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsTasksPanelOpen(false)}
        />
      )}

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold">Новая задача</h3>
              <button onClick={closeTaskModal} className="p-1 hover:bg-gray-100 rounded">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
              {taskFormError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {taskFormError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="Например: Заказать расходники"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  rows={3}
                  placeholder="Дополнительные детали..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="hasDateTime"
                  checked={taskForm.hasDateTime}
                  onChange={(e) => setTaskForm({ ...taskForm, hasDateTime: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="hasDateTime" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Указать дату и время
                </label>
              </div>

              {taskForm.hasDateTime && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                    <input
                      type="date"
                      value={taskForm.date}
                      onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                    <input
                      type="time"
                      value={taskForm.startTime}
                      onChange={(e) => setTaskForm({ ...taskForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeTaskModal}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {savingTask ? 'Сохранение...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
