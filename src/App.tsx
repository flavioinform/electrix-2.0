import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
// Placeholders for now
import Workflow from './pages/Workflow';
import CashFlow from './pages/CashFlow';
import ClientView from './pages/ClientView';
import Team from './pages/Team';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-primary">Cargando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleBasedRedirect() {
  const { profile, user, loading } = useAuth();
  if (loading) return null;

  const role = profile?.role || user?.user_metadata?.role;

  if (role === 'cliente') {
    return <Navigate to="/client-view" replace />;
  }
  return <Navigate to="/workflow" replace />;
}

function SupervisorRoute({ children }: { children: React.ReactNode }) {
  const { profile, user, loading } = useAuth();
  if (loading) return null;

  const role = profile?.role || user?.user_metadata?.role;

  if (role === 'cliente') {
    return <Navigate to="/client-view" replace />;
  }

  // Strict check: if not supervisor/worker, deny access (optional, but safer)
  // For now, let's just ensure clients get kicked out.

  return <>{children}</>;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/client-view" element={
        <ProtectedRoute>
          <ClientView />
        </ProtectedRoute>
      } />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<RoleBasedRedirect />} />import Team from './pages/Team';

        // ...

        <Route path="workflow" element={
          <SupervisorRoute>
            <Workflow />
          </SupervisorRoute>
        } />
        <Route path="cashflow" element={
          <SupervisorRoute>
            <CashFlow />
          </SupervisorRoute>
        } />
        <Route path="team" element={
          <SupervisorRoute>
            <Team />
          </SupervisorRoute>
        } />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
