import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Portal from "./pages/Portal";
import AdminPanel from "./pages/AdminPanel";
import MasterLogin from "./pages/MasterLogin";
import MasterPanel from "./pages/MasterPanel";
import PanelLanding from "./pages/PanelLanding";
import PanelPortal from "./pages/PanelPortal";
import SubAdminPanel from "./pages/SubAdminPanel";
import PanelDisabled from "./pages/PanelDisabled";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
