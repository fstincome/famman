import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthWrapper } from "./components/AuthWrapper";
import { DashboardLayout } from "./components/DashboardLayout";
import { LanguageProvider } from "./i18n/LanguageContext";
import Overview from "./pages/Overview";
import Income from "./pages/Income";
import Expenses from "./pages/Expenses";
import Profitability from "./pages/Profitability";
import CashFlow from "./pages/CashFlow";
import Receivables from "./pages/Receivables";
import Reports from "./pages/Reports";
import Patrimony from "./pages/Patrimony";
import Events from "./pages/Events";
import Projects from "./pages/Projects";
import Debts from "./pages/Debts";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Statistics from "./pages/Statistics";
import Contacts from "./pages/Contacts";
import BankAccounts from "./pages/BankAccounts";
import Needs from "./pages/Needs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthWrapper>
            <Routes>
              <Route path="/" element={<DashboardLayout><Overview /></DashboardLayout>} />
              <Route path="/income" element={<DashboardLayout><Income /></DashboardLayout>} />
              <Route path="/expenses" element={<DashboardLayout><Expenses /></DashboardLayout>} />
              <Route path="/statistics" element={<DashboardLayout><Statistics /></DashboardLayout>} />
              <Route path="/patrimony" element={<DashboardLayout><Patrimony /></DashboardLayout>} />
              <Route path="/events" element={<DashboardLayout><Events /></DashboardLayout>} />
              <Route path="/projects" element={<DashboardLayout><Projects /></DashboardLayout>} />
              <Route path="/debts" element={<DashboardLayout><Debts /></DashboardLayout>} />
              <Route path="/contacts" element={<DashboardLayout><Contacts /></DashboardLayout>} />
              <Route path="/bank-accounts" element={<DashboardLayout><BankAccounts /></DashboardLayout>} />
              <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
              <Route path="/admin" element={<DashboardLayout><Admin /></DashboardLayout>} />
              <Route path="/profitability" element={<DashboardLayout><Profitability /></DashboardLayout>} />
              <Route path="/cash-flow" element={<DashboardLayout><CashFlow /></DashboardLayout>} />
              <Route path="/receivables" element={<DashboardLayout><Receivables /></DashboardLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
