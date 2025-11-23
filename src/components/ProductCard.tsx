import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useState, memo } from "react";

interface ProductCardProps {
  id: string;
  nome: string;
  preco_vista: number;
  imagens: string[];
  estado: "novo" | "seminovo" | "usado";
  tags?: string[];
  capacidade?: string;
  cor?: string;
}

const ProductCard = memo(({
  id,
  nome,
  preco_vista,
  imagens,
  estado,
  tags = [],
  capacidade,
  cor,
}: ProductCardProps) => {
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [adding, setAdding] = useState(false);
  const isFavorite = isInWishlist(id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (adding) return;
    
    setAdding(true);
    
    // Chama addToCart sem await para não travar a UI
    addToCart(id, 1).finally(() => {
      setTimeout(() => setAdding(false), 500);
    });
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFavorite) {
      await removeFromWishlist(id);
    } else {
      await addToWishlist(id);
    }
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case "novo":
        return "default";
      case "seminovo":
        return "secondary";
      case "usado":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg active:scale-[0.98] border-0 shadow-sm bg-card">
      <Link to={`/produto/${id}`}>
        <div className="aspect-square overflow-hidden bg-secondary rounded-t-xl relative">
          <img
            src={imagens[0] || "/placeholder.svg"}
            alt={nome}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={handleToggleFavorite}
          >
            <Heart 
              className={`h-4 w-4 ${isFavorite ? 'fill-primary text-primary' : 'text-foreground'}`} 
            />
          </Button>
        </div>
      </Link>
      
      <CardContent className="p-3">
        <div className="mb-2 flex items-start gap-2">
          {tags.length > 0 && tags.includes("promocao") && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Oferta
            </Badge>
          )}
          <Badge variant={getEstadoBadgeVariant(estado)} className="text-[10px] px-1.5 py-0">
            {estado === "novo" ? "Novo" : estado === "seminovo" ? "Seminovo" : "Usado"}
          </Badge>
        </div>

        <Link to={`/produto/${id}`}>
          <h3 className="line-clamp-2 text-xs font-semibold mb-1 min-h-[2rem] transition-colors hover:text-primary">
            {nome}
          </h3>
        </Link>

        {(capacidade || cor) && (
          <p className="mb-2 text-[10px] text-muted-foreground">
            {[capacidade, cor].filter(Boolean).join(" • ")}
          </p>
        )}

        <div className="space-y-0.5">
          <p className="text-sm font-bold">{formatPrice(preco_vista)}</p>
          <p className="text-[10px] text-muted-foreground">
            ou 24x no crédito*
          </p>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0">
        <Button 
          className="w-full h-8 text-xs" 
          size="sm"
          onClick={handleAddToCart}
          disabled={adding}
        >
          <ShoppingCart className="mr-1.5 h-3 w-3" />
          {adding ? "Adicionando..." : "Adicionar"}
        </Button>
      </CardFooter>
    </Card>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
