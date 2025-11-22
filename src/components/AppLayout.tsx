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
          <div className="shrink-0">
            <CartSheet />
          </div>
        </header>

        <div className="flex flex-1 w-full max-w-full">
          <AppSidebar />
          
          {/* Main Content */}
          <main className="flex-1 w-full max-w-full pb-20 lg:pb-0 overflow-x-hidden">
            <div className="w-full lg:px-8 lg:py-6 lg:max-w-[1400px] lg:mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* Bottom Navigation - Mobile Only */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 lg:hidden safe-area-pb">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              if (item.isCart) {
                return (
                  <div key="cart" className="flex flex-col items-center justify-center flex-1 h-full gap-1">
                    <CartSheet />
                    <span className="text-[10px] font-medium text-muted-foreground">Carrinho</span>
                  </div>
                );
              }
              
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