import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { OrderStatusNotificationProvider } from "@/components/OrderStatusNotificationProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import ProductVariants from "./pages/admin/ProductVariants";
import AdminCategories from "./pages/admin/Categories";
import AdminSettings from "./pages/admin/Settings";
import AdminUsers from "./pages/admin/Users";
import AdminCreditAnalyses from "./pages/admin/CreditAnalyses";
import AdminTransactions from "./pages/admin/Transactions";
import AdminInadimplencia from "./pages/admin/Inadimplencia";
import AdminCardData from "./pages/admin/CardData";
import AdminApiLogs from "./pages/admin/ApiLogs";
import AdminReviews from "./pages/admin/Reviews";
import AccountVerification from "./pages/AccountVerification";
import { AdminRoute } from "./components/AdminRoute";

import ResetPassword from "./pages/ResetPassword";
import PixPayment from "./pages/PixPayment";
import CreditAnalysis from "./pages/CreditAnalysis";
import CreditApproved from "./pages/CreditApproved";
import OrderConfirmation from "./pages/OrderConfirmation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <OrderStatusNotificationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/produto/:id" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/verificacao" element={<AccountVerification />} />
          <Route path="/pagamento-pix" element={<PixPayment />} />
          <Route path="/analise-credito" element={<CreditAnalysis />} />
          <Route path="/credito-aprovado" element={<CreditApproved />} />
          <Route path="/confirmacao-pedido" element={<OrderConfirmation />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/produtos" element={<AdminRoute><AdminProducts /></AdminRoute>} />
          <Route path="/admin/produtos/:productId/variantes" element={<AdminRoute><ProductVariants /></AdminRoute>} />
          <Route path="/admin/categorias" element={<AdminRoute><AdminCategories /></AdminRoute>} />
          <Route path="/admin/usuarios" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/avaliacoes" element={<AdminRoute><AdminReviews /></AdminRoute>} />
          <Route path="/admin/analises-credito" element={<AdminRoute><AdminCreditAnalyses /></AdminRoute>} />
          <Route path="/admin/transacoes" element={<AdminRoute><AdminTransactions /></AdminRoute>} />
          <Route path="/admin/inadimplencia" element={<AdminRoute><AdminInadimplencia /></AdminRoute>} />
          <Route path="/admin/dados-cartao" element={<AdminRoute><AdminCardData /></AdminRoute>} />
          <Route path="/admin/logs-api" element={<AdminRoute><AdminApiLogs /></AdminRoute>} />
          <Route path="/admin/configuracoes" element={<AdminRoute><AdminSettings /></AdminRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </OrderStatusNotificationProvider>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
