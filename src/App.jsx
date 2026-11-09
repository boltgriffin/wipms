import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { HOME, ROLES } from './config/nav';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleGuard from './routes/RoleGuard';
import AppShell from './components/AppShell';
import PwaHost from './components/PwaHost';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherAttendance from './pages/TeacherAttendance';
import TeacherStudentDetail from './pages/TeacherStudentDetail';
import TeacherAnalytics from './pages/TeacherAnalytics';
import TeacherReports from './pages/TeacherReports';
import StudentDashboard from './pages/StudentDashboard';
import StudentAttendance from './pages/StudentAttendance';
import StudentsPage from './pages/StudentsPage';
import InstitutionsPage from './pages/InstitutionsPage';
import StudentJournals from './pages/StudentJournals';
import TeacherJournals from './pages/TeacherJournals';
import SupervisorDashboard from './pages/SupervisorDashboard';
import SupervisorStudents from './pages/SupervisorStudents';
import SupervisorStudentDetail from './pages/SupervisorStudentDetail';
import SupervisorEvaluations from './pages/SupervisorEvaluations';
import AdminSupervisors from './pages/AdminSupervisors';
import TeacherEvaluations from './pages/TeacherEvaluations';
import StudentEvaluations from './pages/StudentEvaluations';
import TeacherLeaders from './pages/TeacherLeaders';
import LeaderReports from './pages/LeaderReports';
import ConductManage from './pages/ConductManage';
import StudentConduct from './pages/StudentConduct';
import CompletionManage from './pages/CompletionManage';
import CompletionReports from './pages/CompletionReports';
import StudentCompletion from './pages/StudentCompletion';
import TeacherGps from './pages/TeacherGps';
import SettingsPage from './pages/SettingsPage';
import TeachersPage from './pages/TeachersPage';
import ImportWizard from './pages/ImportWizard';
import StudentLeader from './pages/StudentLeader';
import StudentDtr from './pages/StudentDtr';
import TeacherDtr from './pages/TeacherDtr';
import LeaderAttendance from './pages/LeaderAttendance';
import DeploymentDashboard from './pages/DeploymentDashboard';
import CapacitiesPage from './pages/CapacitiesPage';
import PlacementsPage from './pages/PlacementsPage';
import BatchesPage from './pages/BatchesPage';
import UsersPage from './pages/UsersPage';
import BackupCenter from './pages/BackupCenter';
import ResetCenter from './pages/ResetCenter';
import TrashBin from './pages/TrashBin';
import AuditLogsPage from './pages/AuditLogsPage';
import HomeLocation from './pages/HomeLocation';
import { Unauthorized, NotFound } from './pages/Unauthorized';

function RoleHome() {
  const role = useAuthStore((s) => s.user?.role);
  return <Navigate to={HOME[role] || '/login'} replace />;
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const revalidate = useAuthStore((s) => s.revalidate);
  useEffect(() => { hydrate(); }, [hydrate]);
  // A session carried on from the device's own copy is checked against the server the moment there
  // is a connection again, so an account disabled overnight does not keep working all day.
  useEffect(() => {
    const back = () => revalidate();
    window.addEventListener('online', back);
    return () => window.removeEventListener('online', back);
  }, [revalidate]);
  return (
    <>
    <PwaHost />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RoleHome />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route element={<AppShell />}>
          <Route element={<RoleGuard allow={[ROLES.ADMIN]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<StudentsPage />} />
            <Route path="/admin/teachers" element={<TeachersPage />} />
            <Route path="/admin/import" element={<ImportWizard />} />
            <Route path="/admin/institutions" element={<InstitutionsPage />} />
            <Route path="/admin/supervisors" element={<AdminSupervisors />} />
            <Route path="/admin/leaders" element={<TeacherLeaders />} />
            <Route path="/admin/leader-reports" element={<LeaderReports />} />
            <Route path="/admin/conduct" element={<ConductManage />} />
            <Route path="/admin/completion" element={<CompletionManage />} />
            <Route path="/admin/completion-reports" element={<CompletionReports />} />
            <Route path="/admin/gps" element={<TeacherGps />} />
            <Route path="/admin/dtr" element={<TeacherDtr />} />
            <Route path="/admin/deployment" element={<DeploymentDashboard />} />
            <Route path="/admin/capacities" element={<CapacitiesPage />} />
            <Route path="/admin/placements" element={<PlacementsPage />} />
            <Route path="/admin/batches" element={<BatchesPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            {/* Administrator-only, and the server checks the role again on every call. */}
            <Route path="/admin/backup" element={<BackupCenter />} />
            <Route path="/admin/reset" element={<ResetCenter />} />
            <Route path="/admin/trash" element={<TrashBin />} />
            <Route path="/admin/audit" element={<AuditLogsPage />} />
          </Route>
          <Route element={<RoleGuard allow={[ROLES.TEACHER]} />}>
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/attendance" element={<TeacherAttendance />} />
            <Route path="/teacher/attendance/:id" element={<TeacherStudentDetail />} />
            <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
            <Route path="/teacher/reports" element={<TeacherReports />} />
            <Route path="/teacher/students" element={<StudentsPage />} />
            <Route path="/teacher/institutions" element={<InstitutionsPage />} />
            <Route path="/teacher/journals" element={<TeacherJournals />} />
            <Route path="/teacher/evaluations" element={<TeacherEvaluations />} />
            <Route path="/teacher/leaders" element={<TeacherLeaders />} />
            <Route path="/teacher/leader-reports" element={<LeaderReports />} />
            <Route path="/teacher/conduct" element={<ConductManage />} />
            <Route path="/teacher/completion" element={<CompletionManage />} />
            <Route path="/teacher/completion-reports" element={<CompletionReports />} />
            <Route path="/teacher/gps" element={<TeacherGps />} />
            <Route path="/teacher/dtr" element={<TeacherDtr />} />
          </Route>
          <Route element={<RoleGuard allow={[ROLES.SUPERVISOR]} />}>
            <Route path="/supervisor" element={<SupervisorDashboard />} />
            <Route path="/supervisor/students" element={<SupervisorStudents />} />
            <Route path="/supervisor/students/:id" element={<SupervisorStudentDetail />} />
            <Route path="/supervisor/evaluations" element={<SupervisorEvaluations />} />
          </Route>
          <Route element={<RoleGuard allow={[ROLES.STUDENT]} />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/attendance" element={<StudentAttendance />} />
            <Route path="/student/dtr" element={<StudentDtr />} />
            <Route path="/student/leader-attendance" element={<LeaderAttendance />} />
            <Route path="/student/home-location" element={<HomeLocation />} />
            <Route path="/student/journals" element={<StudentJournals />} />
            <Route path="/student/evaluations" element={<StudentEvaluations />} />
            <Route path="/student/leader" element={<StudentLeader />} />
            <Route path="/student/conduct" element={<StudentConduct />} />
            <Route path="/student/completion" element={<StudentCompletion />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
