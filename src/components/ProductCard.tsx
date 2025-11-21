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
    <Card className="group overflow-hidden transition-all hover:shadow-lg active:scale-[0.98] border-0 shadow-sm">
      <Link to={`/produto/${id}`}>
        <div className="aspect-square overflow-hidden bg-muted rounded-t-xl">
          <img
            src={imagens[0] || "/placeholder.svg"}
            alt={nome}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
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
        <Button className="w-full h-8 text-xs" size="sm">
          <ShoppingCart className="mr-1.5 h-3 w-3" />
          Adicionar
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;