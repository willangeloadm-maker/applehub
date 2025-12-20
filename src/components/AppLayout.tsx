import { ReactNode, useEffect, useState } from "react";
import { Home, Search, ShoppingCart, User, Package, Apple, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CartSheet } from "@/components/CartSheet";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
interface AppLayoutProps {
  children: ReactNode;
  cartItemsCount?: number;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getItemCount } = useCart();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check localStorage for cached session to avoid async call
    const cachedSession = localStorage.getItem('sb-slwpupadtakrnaqzluqc-auth-token');
    return !!cachedSession;
  });
  
  const isAdminPage = location.pathname.startsWith('/admin');

  // Track visitor
  useVisitorTracking();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleAdminLogout = () => {
    localStorage.removeItem("admin_authenticated");
    toast({
      title: "Logout realizado",
      description: "Você saiu do painel administrativo",
    });
    navigate("/");
  };

  const handleUserLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta",
    });
    navigate("/");
  };

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { icon: Home, label: "Início", path: "/" },
    { icon: Search, label: "Buscar", path: "/produtos" },
    { icon: ShoppingCart, label: "Carrinho", path: "#", badge: getItemCount(), isCart: true },
    { icon: Package, label: "Pedidos", path: "/pedidos" },
    { icon: User, label: "Perfil", path: "/perfil" },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden flex-col">
        {/* Header com Menu */}
        <header className="sticky top-0 z-40 flex h-14 w-full items-center border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-3 sm:px-4">
          <SidebarTrigger className="-ml-1 sm:-ml-2 text-foreground shrink-0 lg:hidden" />
          <div className="flex-1 text-center lg:text-left min-w-0 px-2">
            <Link to="/" className="inline-flex items-center gap-1.5 sm:gap-2">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff6b35] to-[#ff4757] shrink-0">
                <Apple className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" fill="currentColor" />
              </div>
              <span className="text-base sm:text-lg font-bold text-foreground truncate">AppleHub</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdminPage ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAdminLogout}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            ) : (
              <>
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUserLogout}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">Sair</span>
                  </Button>
                )}
                <CartSheet />
              </>
            )}
          </div>
        </header>

        <div className="flex flex-1 w-full max-w-full">
          <AppSidebar />
          
          {/* Main Content */}
          <main className="flex-1 w-full max-w-full pb-20 lg:pb-20 overflow-x-hidden">
            <div className="w-full lg:px-8 lg:py-6 lg:max-w-[1400px] lg:mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* Bottom Navigation - Mobile Only */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-pb px-3 pb-2">
          <div className="flex items-center justify-center gap-1 h-16 rounded-2xl border border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 shadow-lg px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              if (item.isCart) {
                return (
                  <motion.div 
                    key="cart" 
                    className="flex items-center justify-center h-full"
                    initial={false}
                    animate={{
                      paddingLeft: active ? "0.75rem" : "0.5rem",
                      paddingRight: active ? "0.75rem" : "0.5rem",
                    }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  >
                    <div className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 transition-colors",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )}>
                      <CartSheet />
                      <AnimatePresence initial={false}>
                        {active && (
                          <motion.span
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "auto", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="text-xs font-medium overflow-hidden whitespace-nowrap"
                          >
                            Carrinho
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              }
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      paddingLeft: active ? "0.75rem" : "0.5rem",
                      paddingRight: active ? "0.75rem" : "0.5rem",
                    }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 transition-colors",
                      active 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5" />
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -right-2 -top-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                        >
                          {item.badge > 9 ? "9+" : item.badge}
                        </Badge>
                      )}
                    </div>
                    <AnimatePresence initial={false}>
                      {active && (
                        <motion.span
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: "auto", opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                          className="text-xs font-medium overflow-hidden whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer - Desktop Only */}
        <footer className="hidden lg:block fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 shadow-lg p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              if (item.isCart) {
                return (
                  <motion.div 
                    key="cart" 
                    initial={false}
                    animate={{
                      gap: active ? "0.5rem" : "0",
                      paddingLeft: active ? "1rem" : "0.5rem",
                      paddingRight: active ? "1rem" : "0.5rem",
                    }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className={cn(
                      "flex items-center rounded-xl px-3 py-2 transition-colors",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <CartSheet />
                    <AnimatePresence initial={false}>
                      {active && (
                        <motion.span
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: "auto", opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                          className="text-sm font-medium overflow-hidden whitespace-nowrap"
                        >
                          Carrinho
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              }
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      gap: active ? "0.5rem" : "0",
                      paddingLeft: active ? "1rem" : "0.5rem",
                      paddingRight: active ? "1rem" : "0.5rem",
                    }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className={cn(
                      "flex items-center rounded-xl px-3 py-2 transition-colors",
                      active 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5" />
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -right-2 -top-2 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                        >
                          {item.badge > 9 ? "9+" : item.badge}
                        </Badge>
                      )}
                    </div>
                    <AnimatePresence initial={false}>
                      {active && (
                        <motion.span
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: "auto", opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                          className="text-sm font-medium overflow-hidden whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </footer>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;