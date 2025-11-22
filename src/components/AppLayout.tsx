import { ReactNode } from "react";
import { Home, Search, ShoppingCart, User, Package, Apple } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CartSheet } from "@/components/CartSheet";
import { useCart } from "@/hooks/useCart";

interface AppLayoutProps {
  children: ReactNode;
  cartItemsCount?: number;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const { getItemCount } = useCart();

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { icon: Home, label: "Início", path: "/" },
    { icon: Search, label: "Buscar", path: "/produtos" },
    { icon: ShoppingCart, label: "Carrinho", path: "/carrinho", badge: getItemCount() },
    { icon: Package, label: "Pedidos", path: "/pedidos" },
    { icon: User, label: "Perfil", path: "/perfil" },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col">
        {/* Header com Menu */}
        <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4">
          <SidebarTrigger className="-ml-2 text-foreground" />
          <div className="flex-1 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff6b35] to-[#ff4757]">
                <Apple className="h-4 w-4 text-white" fill="currentColor" />
              </div>
              <span className="text-lg font-bold text-foreground">AppleHub</span>
            </Link>
          </div>
          <CartSheet />
        </header>

        <div className="flex flex-1 w-full">
          <AppSidebar />
          
          {/* Main Content */}
          <main className="flex-1 pb-20 lg:pb-0">
            {children}
          </main>
        </div>

        {/* Bottom Navigation - Mobile Only */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 lg:hidden safe-area-pb">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                    active 
                      ? "text-primary" 
                      : "text-muted-foreground"
                  }`}
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
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;