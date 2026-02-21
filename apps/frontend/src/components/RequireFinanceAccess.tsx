import { ReactNode, useEffect, useState } from 'react';
import { authApi, UserInfo } from '../api/auth';
import { canAccessFinance } from '../hooks/usePermissions';
import ForbiddenPage from '../pages/ForbiddenPage';

interface RequireFinanceAccessProps {
  children: ReactNode;
}

export default function RequireFinanceAccess({ children }: RequireFinanceAccessProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authApi.me();
      setUser(userData);
    } catch (err) {
      console.error('Failed to load user:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canAccessFinance(user?.role)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
