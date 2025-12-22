import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Minus, Plus, Trash2, LogIn, User, CreditCard, AlertCircle } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useCartAnimation } from "@/hooks/useCartAnimation";
import OptimizedImage from "@/components/OptimizedImage";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const CartSheet = () => {
  const { cartItems, loading, updateQuantity, removeFromCart, getTotal, getItemCount } = useCart();
  const navigate = useNavigate();
  const isPulsing = useCartAnimation();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleCheckout = () => {
    setSheetOpen(false);
    navigate("/checkout");
  };

  const handleGuestCheckout = () => {
    setSheetOpen(false);
    navigate("/checkout?guest=true");
  };

  const handleLogin = () => {
    setSheetOpen(false);
    navigate("/auth?redirect=/checkout");
  };

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className={`w-5 h-5 transition-transform ${isPulsing ? 'animate-pulse scale-125' : ''}`} />
          {getItemCount() > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {getItemCount()}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Carrinho ({getItemCount()} {getItemCount() === 1 ? 'item' : 'itens'})</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col flex-1 mt-6 min-h-0">
          {loading ? (
            <div className="flex-1 space-y-4 pr-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 border rounded-lg p-3 animate-pulse">
                  <div className="w-20 h-20 bg-secondary rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-secondary rounded w-3/4"></div>
                    <div className="h-4 bg-secondary rounded w-1/2"></div>
                    <div className="h-7 bg-secondary rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-fade-in">
              <ShoppingCart className="w-16 h-16 text-muted-foreground animate-bounce-subtle" />
              <p className="text-muted-foreground">Seu carrinho está vazio</p>
              <Button onClick={() => { setSheetOpen(false); navigate("/produtos"); }} className="hover:scale-105 active:scale-95 transition-transform">
                Ver produtos
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scroll-smooth">
                {cartItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="flex gap-4 border rounded-lg p-3 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-20 h-20 rounded overflow-hidden shrink-0">
                      <OptimizedImage
                        src={item.products.imagens[0] || "/placeholder.svg"}
                        alt={item.products.nome}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <h3 className="font-semibold text-sm line-clamp-2">{item.products.nome}</h3>
                      <p className="text-sm font-bold text-primary">
                        R$ {Number(item.products.preco_vista).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 transition-all duration-200 hover:scale-110 active:scale-90"
                          onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center transition-all duration-200">{item.quantidade}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 transition-all duration-200 hover:scale-110 active:scale-90"
                          onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                          disabled={item.quantidade >= item.products.estoque}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-auto transition-all duration-200 hover:scale-110 hover:text-destructive active:scale-90"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex-shrink-0 space-y-3 pt-4 border-t mt-auto bg-muted/30 -mx-6 px-6 pb-6 animate-fade-in-up">
                <div className="flex justify-between items-center">
                  <span className="text-base font-medium text-muted-foreground">Subtotal</span>
                  <span className="text-lg font-semibold transition-all duration-300">
                    R$ {getTotal().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary transition-all duration-300 animate-pulse-glow">
                    R$ {getTotal().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Aviso para usuários não logados */}
                {isLoggedIn === false && (
                  <div className="space-y-3 pt-2">
                    <Alert className="bg-amber-500/10 border-amber-500/30">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-sm">
                        <strong>Faça login</strong> para parcelar em até 24x com análise de crédito, 
                        acompanhar pedidos e ter acesso a ofertas exclusivas.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="default"
                        className="bg-gradient-to-r from-[#ff6b35] to-[#ff4757] hover:from-[#ff5722] hover:to-[#ff3545] text-white font-semibold"
                        onClick={handleLogin}
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Fazer Login
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleGuestCheckout}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Visitante
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      Como visitante você pode pagar via <strong>PIX</strong> ou <strong>cartão</strong>.
                      <br />
                      O <strong>parcelamento AppleHub</strong> requer login.
                    </p>
                  </div>
                )}

                {/* Botão de checkout para usuários logados */}
                {isLoggedIn === true && (
                  <Button 
                    className="w-full bg-gradient-to-r from-[#ff6b35] to-[#ff4757] hover:from-[#ff5722] hover:to-[#ff3545] text-white font-bold shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95 relative overflow-hidden group" 
                    size="lg" 
                    onClick={handleCheckout}
                  >
                    <span className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-md" />
                    <CreditCard className="w-5 h-5 mr-2 relative z-10" />
                    <span className="relative z-10">Continuar para Pagamento</span>
                  </Button>
                )}

                {/* Loading state */}
                {isLoggedIn === null && (
                  <Button 
                    className="w-full" 
                    size="lg" 
                    disabled
                  >
                    Carregando...
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
