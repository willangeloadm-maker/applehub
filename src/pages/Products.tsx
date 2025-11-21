import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Product {
  id: string;
  nome: string;
  preco_vista: number;
  imagens: string[];
  estado: "novo" | "seminovo" | "usado";
  tags: string[];
  capacidade: string | null;
  cor: string | null;
}

const Products = () => {
  const [searchParams] = useSearchParams();
  const categoria = searchParams.get("categoria");
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recentes");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, [categoria, sortBy, filterEstado]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("products")
        .select("*, categories(slug)")
        .eq("ativo", true);

      if (categoria) {
        query = query.eq("categories.slug", categoria);
      }

      if (filterEstado !== "todos") {
        query = query.eq("estado", filterEstado as "novo" | "seminovo" | "usado");
      }

      switch (sortBy) {
        case "menor-preco":
          query = query.order("preco_vista", { ascending: true });
          break;
        case "maior-preco":
          query = query.order("preco_vista", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryTitle = () => {
    if (!categoria) return "Todos os Produtos";
    return categoria
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <AppLayout cartItemsCount={0}>
      <div className="min-h-screen bg-background">
        {/* Search Header */}
        <div className="sticky top-14 z-30 bg-background border-b">
          <div className="px-4 py-3 space-y-3">
            <div>
              <h1 className="text-xl font-bold">{getCategoryTitle()}</h1>
              <p className="text-xs text-muted-foreground">
                {filteredProducts.length} {filteredProducts.length === 1 ? "produto" : "produtos"}
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh]">
                  <SheetHeader>
                    <SheetTitle>Filtros e Ordenação</SheetTitle>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-6">
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Ordenar por</Label>
                      <RadioGroup value={sortBy} onValueChange={setSortBy}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="recentes" id="recentes" />
                          <Label htmlFor="recentes" className="font-normal">Mais recentes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="menor-preco" id="menor-preco" />
                          <Label htmlFor="menor-preco" className="font-normal">Menor preço</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="maior-preco" id="maior-preco" />
                          <Label htmlFor="maior-preco" className="font-normal">Maior preço</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Estado do produto</Label>
                      <RadioGroup value={filterEstado} onValueChange={setFilterEstado}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="todos" id="todos" />
                          <Label htmlFor="todos" className="font-normal">Todos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="novo" id="novo" />
                          <Label htmlFor="novo" className="font-normal">Novo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="seminovo" id="seminovo" />
                          <Label htmlFor="seminovo" className="font-normal">Seminovo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="usado" id="usado" />
                          <Label htmlFor="usado" className="font-normal">Usado</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="px-4 py-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum produto encontrado
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Products;