import { ShoppingCart, User, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface HeaderProps {
  cartItemsCount?: number;
  onMenuClick?: () => void;
}

const Header = ({ cartItemsCount = 0, onMenuClick }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">A</span>
            </div>
            <span className="text-xl font-bold">AppleHub</span>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-6">
          <Link to="/produtos" className="text-sm font-medium transition-colors hover:text-primary">
            iPhone
          </Link>
          <Link to="/produtos?categoria=ipad" className="text-sm font-medium transition-colors hover:text-primary">
            iPad
          </Link>
          <Link to="/produtos?categoria=apple-watch" className="text-sm font-medium transition-colors hover:text-primary">
            Apple Watch
          </Link>
          <Link to="/produtos?categoria=airpods" className="text-sm font-medium transition-colors hover:text-primary">
            AirPods
          </Link>
          <Link to="/produtos?categoria=acessorios" className="text-sm font-medium transition-colors hover:text-primary">
            Acessórios
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          
          <Link to="/perfil">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          
          <Link to="/carrinho">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {cartItemsCount}
                </Badge>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;