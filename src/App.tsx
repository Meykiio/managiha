import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { FullScreenSpinner } from "./components/ui/Spinner";
import { AppLayout } from "./components/layout/AppLayout";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/products/ProductsPage";
import ProductDetailPage from "./pages/products/ProductDetailPage";
import InventoryPage from "./pages/inventory/InventoryPage";
import CarnetPage from "./pages/carnet/CarnetPage";
import CustomerDetailPage from "./pages/carnet/CustomerDetailPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import ReportsPage from "./pages/reports/ReportsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import { t } from "./i18n";

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

export default function App() {
  if (!isSupabaseConfigured) return <ConfigErrorScreen />;
  return (
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
              <Route path="/" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:productId" element={<ProductDetailPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/carnet" element={<CarnetPage />} />
              <Route path="/carnet/:customerId" element={<CustomerDetailPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
