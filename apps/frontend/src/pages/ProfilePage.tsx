import { useState, useEffect, FormEvent } from 'react';
import Layout from '../components/Layout';
import { companyApi } from '../api/company';
import { usersApi, UserProfile } from '../api/users';

interface LocalUserProfile {
  userId: string;
  companyId: string;
  email: string;
  companyName: string;
  role: 'owner' | 'admin' | 'manager' | 'master';
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayProfile, setDisplayProfile] = useState<LocalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    email: '',
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await usersApi.getProfile();
      const companyData = await companyApi.getMe();
      
      setProfile(profileData);
      setDisplayProfile({
        userId: profileData.id,
        companyId: companyData.id,
        email: profileData.email || '',
        companyName: companyData.name,
        role: profileData.role,
      });
      setProfileFormData({
        email: profileData.email || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!profileFormData.email.trim()) {
      setError('Укажите email');
      return;
    }

    try {
      await usersApi.updateProfile({
        email: profileFormData.email,
      });
      setSuccess('Профиль успешно обновлен');
      setIsEditingProfile(false);
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления профиля');
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordFormData.currentPassword) {
      setError('Введите текущий пароль');
      return;
    }
    if (passwordFormData.newPassword.length < 6) {
      setError('Новый пароль должен быть минимум 6 символов');
      return;
    }
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      await usersApi.changePassword({
        currentPassword: passwordFormData.currentPassword,
        newPassword: passwordFormData.newPassword,
      });
      setSuccess('Пароль успешно изменен');
      setIsEditingPassword(false);
      setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка смены пароля');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Владелец компании';
      case 'admin':
        return 'Администратор';
      case 'manager':
        return 'Менеджер';
      case 'master':
        return 'Сотрудник';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-100 text-amber-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'manager':
        return 'bg-purple-100 text-purple-800';
      case 'master':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!displayProfile) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Ошибка загрузки профиля</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold">Профиль</h1>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Profile Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-primary">person</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{displayProfile.companyName}</h2>
                <p className="text-gray-500">{displayProfile.email}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(displayProfile.role)}`}>
                  {getRoleLabel(displayProfile.role)}
                </span>
              </div>
            </div>

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

            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Информация</h3>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="text-primary hover:text-primary/80 font-medium text-sm"
                  >
                    Редактировать
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={profileFormData.email}
                      onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileFormData({ email: profile?.email || '' });
                        setError('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm transition-colors"
                    >
                      Сохранить
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium">{displayProfile.email}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Компания</span>
                    <span className="font-medium">{displayProfile.companyName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Роль</span>
                    <span className="font-medium">{getRoleLabel(displayProfile.role)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Password Change Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Безопасность</h3>
              {!isEditingPassword && (
                <button
                  onClick={() => setIsEditingPassword(true)}
                  className="text-primary hover:text-primary/80 font-medium text-sm"
                >
                  Изменить пароль
                </button>
              )}
            </div>

            {isEditingPassword ? (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Текущий пароль</label>
                  <input
                    type="password"
                    value={passwordFormData.currentPassword}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Новый пароль</label>
                  <input
                    type="password"
                    value={passwordFormData.newPassword}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Подтвердите новый пароль</label>
                  <input
                    type="password"
                    value={passwordFormData.confirmPassword}
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPassword(false);
                      setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold shadow-sm transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-gray-500">
                Для изменения пароля нажмите кнопку "Изменить пароль" выше.
              </p>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}
