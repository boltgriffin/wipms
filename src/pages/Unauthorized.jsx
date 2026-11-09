import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { HOME } from '../config/roles';

export function Unauthorized() {
  const role = useAuthStore((s) => s.user?.role);
  return (
    <div className="grid min-h-screen place-items-center p-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">You don't have access to this page</h1>
        <Link className="mt-4 inline-block font-semibold text-amber-600 underline" to={HOME[role] || '/login'}>Go to your dashboard</Link>
      </div>
    </div>
  );
}
export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <Link className="mt-4 inline-block font-semibold text-amber-600 underline" to="/">Back to start</Link>
      </div>
    </div>
  );
}
