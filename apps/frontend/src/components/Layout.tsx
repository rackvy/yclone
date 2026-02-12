import { ReactNode, useState, useEffect } from 'react';
import Link from './Link';
import { branchesApi, Branch } from '../api/branches';

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
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Подтвердить запись на 10:00', time: '10:00', completed: false },
    { id: 2, text: 'Заказать расходники для маникюра', time: '14:30', completed: false },
    { id: 3, text: 'Утренний брифинг с персоналом', time: '08:45', completed: true },
  ]);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Load branches
  useEffect(() => {
    loadBranches();
  }, []);

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

  const toggleTask = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const incompleteTasks = tasks.filter(t => !t.completed).length;

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
            <Link 
              href="/employees" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/employees') 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-xl">badge</span>
              <span className={`text-sm ${isActive('/employees') ? 'font-semibold' : 'font-medium'}`}>Сотрудники</span>
            </Link>
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
              <h2 className="text-lg font-bold">Задачи на сегодня</h2>
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
            {tasks.map((task) => (
              <div 
                key={task.id}
                className={`group flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-transparent hover:border-primary/30 transition-all cursor-pointer ${
                  task.completed ? 'opacity-50' : ''
                }`}
                onClick={() => toggleTask(task.id)}
              >
                <div className="mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary size-4 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold text-gray-900 leading-tight ${
                    task.completed ? 'line-through' : ''
                  }`}>
                    {task.text}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    {task.completed ? (
                      <span>Завершено в {task.time}</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        До {task.time}
                      </>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Panel Footer */}
          <div className="p-4 border-t border-gray-200">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm font-bold text-gray-400 hover:border-primary hover:text-primary transition-all">
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
    </div>
  );
}
