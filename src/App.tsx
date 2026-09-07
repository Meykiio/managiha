import { useState, lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { FullScreenSpinner } from "./components/ui/Spinner";
import { AppLayout } from "./components/layout/AppLayout";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import NotFoundPage from "./pages/NotFoundPage";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import { t } from "./i18n";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProductsPage = lazy(() => import("./pages/products/ProductsPage"));
const ProductDetailPage = lazy(() => import("./pages/products/ProductDetailPage"));
const InventoryPage = lazy(() => import("./pages/inventory/InventoryPage"));
const CarnetPage = lazy(() => import("./pages/carnet/CarnetPage"));
const CustomerDetailPage = lazy(() => import("./pages/carnet/CustomerDetailPage"));
const SuppliersPage = lazy(() => import("./pages/suppliers/SuppliersPage"));
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));

function ConfigErrorScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50 p-6 text-center">
      <h1 className="text-lg font-semibold text-neutral-900">{t("configError.title")}</h1>
      <p className="max-w-md text-sm leading-relaxed text-neutral-500">
        {t("configError.body")}
      </p>
    </div>
  );
}

function StoreMissingScreen() {
  const { refreshStore, signOut, userDataError } = useAuth();
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    await refreshStore();
    setRetrying(false);
  };

  const logout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6 text-center">
      <h1 className="text-lg font-semibold text-neutral-900">{t("storeMissing.title")}</h1>
      <p className="max-w-md text-sm leading-relaxed text-neutral-500">{t("storeMissing.body")}</p>
      {userDataError && (
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-3 text-start">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            {t("storeMissing.errorLabel")}
          </p>
          <p className="mt-1 break-words font-mono text-xs text-red-700">{userDataError}</p>
        </div>
      )}
      <p className="max-w-md text-xs text-neutral-400">{t("storeMissing.hint")}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="h-11 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {t("common.retry")}
        </button>
        <button
          type="button"
          onClick={logout}
          className="h-11 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, session, storeMissing } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (storeMissing) {
    return <StoreMissingScreen />;
  }
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<FullScreenSpinner />}>{children}</Suspense>;
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigErrorScreen />;
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <LoginPage />
                </PublicOnly>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicOnly>
                  <SignupPage />
                </PublicOnly>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicOnly>
                  <ForgotPasswordPage />
                </PublicOnly>
              }
            />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<LazyPage><DashboardPage /></LazyPage>} />
              <Route path="/products" element={<LazyPage><ProductsPage /></LazyPage>} />
              <Route path="/products/:productId" element={<LazyPage><ProductDetailPage /></LazyPage>} />
              <Route path="/inventory" element={<LazyPage><InventoryPage /></LazyPage>} />
              <Route path="/carnet" element={<LazyPage><CarnetPage /></LazyPage>} />
              <Route path="/carnet/:customerId" element={<LazyPage><CustomerDetailPage /></LazyPage>} />
              <Route path="/suppliers" element={<LazyPage><SuppliersPage /></LazyPage>} />
              <Route path="/reports" element={<LazyPage><ReportsPage /></LazyPage>} />
              <Route path="/settings" element={<LazyPage><SettingsPage /></LazyPage>} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
