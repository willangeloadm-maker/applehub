import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, Smartphone, Tablet, Watch, Headphones, Cable } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("ativo", true)
        .eq("destaque", true)
        .limit(6);

      if (error) throw error;
      setFeaturedProducts(data || []);
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

  const categories = [
    { icon: Smartphone, label: "iPhone", slug: "iphone" },
    { icon: Tablet, label: "iPad", slug: "ipad" },
    { icon: Watch, label: "Apple Watch", slug: "apple-watch" },
    { icon: Headphones, label: "AirPods", slug: "airpods" },
    { icon: Cable, label: "Acessórios", slug: "acessorios" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header cartItemsCount={0} />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Bem-vindo à{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                AppleHub
              </span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Sua loja especializada em iPhones e produtos Apple. Parcele em até 24x com análise de crédito.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/produtos">
                <Button size="lg" className="gap-2">
                  Ver todos os produtos
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Criar conta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b py-12">
        <div className="container px-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/produtos?categoria=${category.slug}`}
                className="group"
              >
                <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 transition-all hover:border-primary hover:shadow-md">
                  <category.icon className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
                  <span className="text-sm font-medium">{category.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Destaques da Semana</h2>
              <p className="text-muted-foreground">
                Os produtos mais procurados pelos nossos clientes
              </p>
            </div>
            <Link to="/produtos">
              <Button variant="ghost" className="gap-2">
                Ver todos
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-96 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">
                Nenhum produto em destaque no momento
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/50 py-16">
        <div className="container px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Parcele em até 24x
            </h2>
            <p className="mb-6 text-lg text-muted-foreground">
              Com análise de crédito facilitada. Realize seu sonho de ter um iPhone novo!
            </p>
            <Link to="/auth">
              <Button size="lg">Criar minha conta</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 AppleHub. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;