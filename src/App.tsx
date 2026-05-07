import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Eager: only the first-paint Login route. Everything else is code-split
// so a fresh visitor downloads ~1/3 of the JS instead of the whole app.
import Login from "./pages/Login";

const AdminLogin    = lazy(() => import("./pages/AdminLogin"));
const Portal        = lazy(() => import("./pages/Portal"));
const AdminPanel    = lazy(() => import("./pages/AdminPanel"));
const MasterLogin   = lazy(() => import("./pages/MasterLogin"));
const MasterPanel   = lazy(() => import("./pages/MasterPanel"));
const PanelLanding  = lazy(() => import("./pages/PanelLanding"));
const PanelPortal   = lazy(() => import("./pages/PanelPortal"));
const SubAdminPanel = lazy(() => import("./pages/SubAdminPanel"));
const PanelDisabled = lazy(() => import("./pages/PanelDisabled"));
const NotFound      = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/master-login" element={<MasterLogin />} />
            <Route path="/master" element={<MasterPanel />} />
            <Route path="/panel-disabled" element={<PanelDisabled />} />
            {/* Slug-based panel routes */}
            <Route path="/:slug" element={<PanelLanding />} />
            <Route path="/:slug/portal" element={<PanelPortal />} />
            <Route path="/:slug/admin" element={<SubAdminPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
