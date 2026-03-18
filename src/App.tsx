import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthWrapper } from "./components/AuthWrapper";
import { DashboardLayout } from "./components/DashboardLayout";
import Overview from "./pages/Overview";
import Revenue from "./pages/Revenue";
import Expenses from "./pages/Expenses";
import Profitability from "./pages/Profitability";
import CashFlow from "./pages/CashFlow";
import Receivables from "./pages/Receivables";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthWrapper>
          <Routes>
            <Route path="/" element={
              <DashboardLayout>
                <Overview />
              </DashboardLayout>
            } />
            <Route path="/revenue" element={
              <DashboardLayout>
                <Revenue />
              </DashboardLayout>
            } />
            <Route path="/expenses" element={
              <DashboardLayout>
                <Expenses />
              </DashboardLayout>
            } />
            <Route path="/profitability" element={
              <DashboardLayout>
                <Profitability />
              </DashboardLayout>
            } />
            <Route path="/cash-flow" element={
              <DashboardLayout>
                <CashFlow />
              </DashboardLayout>
            } />
            <Route path="/receivables" element={
              <DashboardLayout>
                <Receivables />
              </DashboardLayout>
            } />
            <Route path="/reports" element={
              <DashboardLayout>
                <Reports />
              </DashboardLayout>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthWrapper>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
