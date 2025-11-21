import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, Smartphone, Tablet, Watch, Headphones, Cable, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

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
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFeaturedProducts();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

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
    { icon: Smartphone, label: "iPhone", slug: "iphone", gradient: "from-blue-500 to-blue-600" },
    { icon: Tablet, label: "iPad", slug: "ipad", gradient: "from-purple-500 to-purple-600" },
    { icon: Watch, label: "Watch", slug: "apple-watch", gradient: "from-pink-500 to-pink-600" },
    { icon: Headphones, label: "AirPods", slug: "airpods", gradient: "from-green-500 to-green-600" },
    { icon: Cable, label: "Acessórios", slug: "acessorios", gradient: "from-orange-500 to-orange-600" },
  ];

  const banners = [
    {
      title: "iPhone 15 Pro",
      subtitle: "Titânio. Tão forte. Tão leve. Tão Pro.",
      gradient: "from-slate-900 to-slate-700",
    },
    {
      title: "Parcele em 24x",
      subtitle: "Com análise de crédito facilitada",
      gradient: "from-primary to-blue-600",
    },
    {
      title: "AirPods Pro",
      subtitle: "Som imersivo de nova geração",
      gradient: "from-purple-600 to-pink-600",
    },
  ];

  return (
    <AppLayout cartItemsCount={0}>
      <div className="min-h-screen bg-background">
        {/* Hero Carousel */}
        <section className="px-4 pt-6 pb-4">
          <Carousel className="w-full">
            <CarouselContent>
              {banners.map((banner, index) => (
                <CarouselItem key={index}>
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <CardContent className={`flex aspect-[2/1] items-center justify-center p-8 bg-gradient-to-br ${banner.gradient} text-white`}>
                      <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                          {banner.title}
                        </h2>
                        <p className="text-sm opacity-90 sm:text-base">{banner.subtitle}</p>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </section>

        {/* Quick Actions - Login/Signup */}
        {!user && (
          <section className="px-4 pb-6">
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Bem-vindo à AppleHub!</h3>
                <p className="text-sm text-muted-foreground">
                  Faça login ou crie sua conta para aproveitar todas as vantagens
                </p>
                <div className="flex gap-2">
                  <Link to="/auth" className="flex-1">
                    <Button className="w-full" size="lg">Entrar</Button>
                  </Link>
                  <Link to="/auth" className="flex-1">
                    <Button variant="outline" className="w-full" size="lg">Criar conta</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Categories */}
        <section className="px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Categorias</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/produtos?categoria=${category.slug}`}
                className="group"
              >
                <Card className="border-0 shadow-sm overflow-hidden transition-all hover:shadow-md active:scale-95">
                  <CardContent className={`p-4 bg-gradient-to-br ${category.gradient} text-white`}>
                    <div className="flex flex-col items-center gap-2 text-center">
                      <category.icon className="h-8 w-8" />
                      <span className="text-xs font-medium">{category.label}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Destaques</h2>
              <p className="text-xs text-muted-foreground">Produtos em destaque</p>
            </div>
            <Link to="/produtos">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Ver todos
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum produto em destaque
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {featuredProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          )}
        </section>

        {/* CTA Parcelamento */}
        <section className="px-4 pb-6">
          <Card className="bg-gradient-to-br from-primary to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-6 text-center space-y-3">
              <h3 className="text-lg font-bold">Parcele em até 24x</h3>
              <p className="text-sm opacity-90">
                Com análise de crédito facilitada
              </p>
              <Link to="/auth">
                <Button variant="secondary" size="lg" className="w-full">
                  Começar agora
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
};

export default Home;