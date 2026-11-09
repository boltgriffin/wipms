import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function RoleGuard({ allow }) {
  const role = useAuthStore((s) => s.user?.role);
  return allow.includes(role) ? <Outlet /> : <Navigate to="/unauthorized" replace />;
}
