import { Home, Search, ShoppingCart, User, Package, Settings, HelpCircle, LogOut, LayoutDashboard, ShoppingBag, ClipboardList, Wrench, BarChart3, AlertTriangle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const mainItems = [
  { title: "Início", url: "/", icon: Home },
  { title: "Produtos", url: "/produtos", icon: Search },
  { title: "Carrinho", url: "/carrinho", icon: ShoppingCart },
  { title: "Meus Pedidos", url: "/pedidos", icon: Package },
  { title: "Perfil", url: "/perfil", icon: User },
];

const adminMainItems = [
  { title: "Loja", url: "/", icon: Home },
];

const secondaryItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Ajuda", url: "/ajuda", icon: HelpCircle },
];

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Produtos", url: "/admin/produtos", icon: ShoppingBag },
  { title: "Pedidos", url: "/admin/pedidos", icon: ClipboardList },
  { title: "Usuários", url: "/admin/usuarios", icon: User },
  { title: "Análises Crédito", url: "/admin/analises-credito", icon: BarChart3 },
  { title: "Transações", url: "/admin/transacoes", icon: Package },
  { title: "Inadimplência", url: "/admin/inadimplencia", icon: AlertTriangle },
  { title: "Configurações", url: "/admin/configuracoes", icon: Wrench },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Verificar se está na área admin pelo caminho
    const isAdminArea = location.pathname.startsWith('/admin');
    const isAdminAuth = localStorage.getItem("admin_authenticated") === "true";
    setIsAdmin(isAdminArea && isAdminAuth);
  }, [location.pathname]);

  const currentPath = location.pathname;
  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  const isAdminPage = currentPath.startsWith('/admin') && currentPath !== '/admin/login';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("admin_authenticated");
    toast({
      title: "Sessão encerrada",
      description: "Você saiu do painel administrativo",
    });
    navigate("/admin/login");
  };

  return (
    <Sidebar className={`${collapsed ? "w-14" : "w-64"} lg:hidden`} collapsible="icon">
      <SidebarContent>
        {isAdmin && isAdminPage ? (
          // Menu Administrativo
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Administração</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/admin"}
                          className="hover:bg-accent"
                          activeClassName="bg-accent text-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Voltar</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminMainItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className="hover:bg-accent"
                          activeClassName="bg-accent text-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleAdminLogout}>
                      <LogOut className="h-4 w-4" />
                      {!collapsed && <span>Sair</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          // Menu Normal
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className="hover:bg-accent"
                          activeClassName="bg-accent text-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Outros</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {secondaryItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className="hover:bg-accent"
                          activeClassName="bg-accent text-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      {!collapsed && <span>Sair</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}