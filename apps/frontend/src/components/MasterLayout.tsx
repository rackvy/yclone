import { ReactNode, useState, useEffect } from 'react';
import Link from './Link';
import { branchesApi, Branch } from '../api/branches';
import { employeesApi, Employee } from '../api/employees';
import { tasksApi, Task, TaskPriority, getPriorityColor, getPriorityLabel } from '../api/tasks';
import { usersApi, UserProfile } from '../api/users';

interface MasterLayoutProps {
  children: ReactNode;
}

export default function MasterLayout({ children }: MasterLayoutProps) {
  const [isTasksPanelOpen, setIsTasksPanelOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
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

  // Listen for openTaskModal event
  useEffect(() => {
    const handleOpenTaskModal = () => {
      openTaskModal();
    };
    window.addEventListener('openTaskModal', handleOpenTaskModal);
    return () => window.removeEventListener('openTaskModal', handleOpenTaskModal);
  }, []);

  useEffect(() => {
    loadUser();
    loadBranches();
  }, []);

  useEffect(() => {
    if (isTasksPanelOpen) {
      loadTasks();
    }
  }, [isTasksPanelOpen]);

  const loadUser = async () => {
    try {
      const profile = await usersApi.getProfile();
      setUser(profile);
      if (profile.employee) {
        const emp = await employeesApi.get(profile.employee.id);
        setEmployee(emp);
      }
    } catch (err) {
      console.error('Failed to load user:', err);
    }
  };

  const loadBranches = async () => {
    try {
      const data = await branchesApi.list();
      setBranches(data);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadTasks = async () => {
    if (!employee?.branchId) return;
    try {
      setTasksLoading(true);
      const data = await tasksApi.listSimple(employee.branchId);
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

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      if (completed) {
        await tasksApi.complete(taskId);
      }
      await loadTasks();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const saveTask = async () => {
    if (!taskForm.title.trim()) {
      setTaskFormError('Введите название задачи');
      return;
    }

    try {
      setSavingTask(true);
      if (!employee?.branchId) return;
      await tasksApi.create({
        branchId: employee.branchId,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        priority: taskForm.priority,
        hasDateTime: taskForm.hasDateTime,
        date: taskForm.hasDateTime ? taskForm.date : undefined,
        startTime: taskForm.hasDateTime ? taskForm.startTime : undefined,
        durationMin: 30,
      });
      setIsTaskModalOpen(false);
      await loadTasks();
    } catch (err) {
      setTaskFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingTask(false);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/' || currentPath === '/calendar';
    }
    return currentPath === path;
  };

  const handleLogout = () => {
    // Clear all app-related localStorage items
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('selectedBranchId');
    localStorage.removeItem('calendarDate');
    window.location.href = '/login';
  };

  const currentBranch = branches.find(b => b.id === employee?.branchId);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-30">
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Y</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Yclone</span>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              {employee?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{employee?.fullName || user?.email}</p>
              <p className="text-xs text-gray-500">Мастер</p>
            </div>
          </div>
          {currentBranch && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {currentBranch.name}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            <li>
              <Link
                href="/"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-primary text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="material-symbols-outlined">calendar_today</span>
                Мой календарь
              </Link>
            </li>
            <li>
              <Link
                href="/clients"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/clients') 
                    ? 'bg-primary text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="material-symbols-outlined">people</span>
                Клиенты
              </Link>
            </li>
            <li>
              <Link
                href="/services"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/services') 
                    ? 'bg-primary text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="material-symbols-outlined">spa</span>
                Услуги
              </Link>
            </li>
          </ul>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={() => setIsTasksPanelOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined">assignment</span>
            Задачи
            {tasks.filter(t => t.status !== 'done').length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {tasks.filter(t => t.status !== 'done').length}
              </span>
            )}
          </button>
          <Link
            href="/profile"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/profile') 
                ? 'bg-primary text-white' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="material-symbols-outlined">person</span>
            Профиль
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            Выйти
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {children}
      </main>

      {/* Tasks Panel */}
      {isTasksPanelOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsTasksPanelOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-lg">Задачи</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={openTaskModal}
                  className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
                <button
                  onClick={() => setIsTasksPanelOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {tasksLoading ? (
                <div className="text-center py-8 text-gray-500">Загрузка...</div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="material-symbols-outlined text-4xl mb-2">task_alt</span>
                  <p>Нет задач</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border ${
                        task.status === 'done' 
                          ? 'bg-gray-50 border-gray-200 opacity-60' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.status === 'done'}
                          onChange={(e) => toggleTask(task.id, e.target.checked)}
                          className="mt-1 w-4 h-4 text-primary rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${
                            task.status === 'done' ? 'line-through text-gray-500' : ''
                          }`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                            {task.hasDateTime && task.date && (
                              <span className="text-xs text-gray-500">
                                {new Date(task.date).toLocaleDateString('ru-RU')} {task.startTime}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Новая задача</h2>
            
            {taskFormError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {taskFormError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Введите название задачи"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  rows={3}
                  placeholder="Дополнительные детали"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Приоритет
                </label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasDateTime"
                  checked={taskForm.hasDateTime}
                  onChange={(e) => setTaskForm({ ...taskForm, hasDateTime: e.target.checked })}
                  className="w-4 h-4 text-primary rounded border-gray-300"
                />
                <label htmlFor="hasDateTime" className="text-sm text-gray-700">
                  Указать дату и время
                </label>
              </div>

              {taskForm.hasDateTime && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Дата
                    </label>
                    <input
                      type="date"
                      value={taskForm.date}
                      onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Время
                    </label>
                    <input
                      type="time"
                      value={taskForm.startTime}
                      onChange={(e) => setTaskForm({ ...taskForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={saveTask}
                disabled={savingTask}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {savingTask ? 'Сохранение...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
