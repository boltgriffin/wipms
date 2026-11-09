import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'idle' || status === 'loading') return <div className="grid min-h-screen place-items-center text-forest-700">Loading...</div>;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
