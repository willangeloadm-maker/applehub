import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

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

const ProductCard = ({
  id,
  nome,
  preco_vista,
  imagens,
  estado,
  tags = [],
  capacidade,
  cor,
}: ProductCardProps) => {
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
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <Link to={`/produto/${id}`}>
        <div className="aspect-square overflow-hidden bg-muted">
          <img
            src={imagens[0] || "/placeholder.svg"}
            alt={nome}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      </Link>
      
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <Link to={`/produto/${id}`} className="flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold transition-colors hover:text-primary">
              {nome}
            </h3>
          </Link>
          <Badge variant={getEstadoBadgeVariant(estado)} className="shrink-0 text-xs">
            {estado === "novo" ? "Novo" : estado === "seminovo" ? "Seminovo" : "Usado"}
          </Badge>
        </div>

        {(capacidade || cor) && (
          <p className="mb-2 text-xs text-muted-foreground">
            {[capacidade, cor].filter(Boolean).join(" • ")}
          </p>
        )}

        {tags.length > 0 && tags.includes("promocao") && (
          <Badge variant="destructive" className="mb-2 text-xs">
            Promoção
          </Badge>
        )}

        <div className="space-y-1">
          <p className="text-lg font-bold">{formatPrice(preco_vista)}</p>
          <p className="text-xs text-muted-foreground">
            ou em até 24x no crédito*
          </p>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button className="w-full" size="sm">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Adicionar ao carrinho
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;