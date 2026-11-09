import StatCard from '../components/StatCard';
import { useAuthStore } from '../store/authStore';

export default function AdminDashboard() {
  const s = useAuthStore((st) => st.stats) || {};
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Admin dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total users" value={s.totalUsers} />
        <StatCard label="Teachers" value={s.teachers} />
        <StatCard label="Students" value={s.students} />
      </div>
    </>
  );
}
