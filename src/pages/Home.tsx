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
import iphone17Banner from "@/assets/iphone-17-pro-max-banner.jpg";
import iphone17Orange from "@/assets/iphone-17-orange.png";

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
    { icon: Smartphone, label: "iPhone", slug: "iphone", gradient: "from-[#ff6b35] to-[#ff5722]" },
    { icon: Tablet, label: "iPad", slug: "ipad", gradient: "from-[#ff4757] to-[#ff3545]" },
    { icon: Watch, label: "Watch", slug: "apple-watch", gradient: "from-[#6b3d3d] to-[#8b4d4d]" },
    { icon: Headphones, label: "AirPods", slug: "airpods", gradient: "from-[#1e3a52] to-[#2d4a5f]" },
    { icon: Cable, label: "Acessórios", slug: "acessorios", gradient: "from-[#ff6b35] to-[#6b3d3d]" },
  ];

  const banners = [
    {
      title: "iPhone 17 Pro Max",
      subtitle: "Lançamento! Preço imperdível e parcele em até 24x*",
      gradient: "from-orange-600 via-orange-500 to-amber-600",
      footnote: "*Sujeito a análise de crédito",
      image: iphone17Orange,
      highlight: true
    },
    {
      title: "Parcele em 24x",
      subtitle: "Com análise de crédito facilitada",
      gradient: "from-[#ff6b35] to-[#ff4757]",
    },
    {
      title: "AirPods Pro",
      subtitle: "Som imersivo de nova geração",
      gradient: "from-[#6b3d3d] via-[#8b4d4d] to-[#ab5d5d]",
    },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Hero Carousel */}
        <section className="px-4 pt-6 pb-4">
          <Carousel className="w-full">
            <CarouselContent>
              {banners.map((banner, index) => (
                <CarouselItem key={index}>
                  <Card className="border-0 shadow-xl overflow-hidden">
                    <CardContent className={`flex ${(banner as any).highlight ? 'aspect-[16/9] lg:aspect-[21/9]' : 'aspect-[2/1]'} items-center justify-center p-8 lg:p-12 bg-gradient-to-br ${banner.gradient} text-white relative`}>
                      {(banner as any).image && (
                        <div 
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ 
                            backgroundImage: `url(${(banner as any).image})`,
                            opacity: (banner as any).highlight ? '0.85' : '0.40'
                          }}
                        />
                      )}
                      <div className={`${(banner as any).highlight ? 'text-left max-w-xl' : 'text-center'} space-y-3 lg:space-y-4 relative z-10`}>
                        <Sparkles className={`${(banner as any).highlight ? 'h-8 w-8 lg:h-10 lg:w-10 mb-2' : 'hidden'} animate-pulse`} />
                        <h2 className={`${(banner as any).highlight ? 'text-4xl lg:text-6xl' : 'text-2xl sm:text-3xl'} font-bold tracking-tight drop-shadow-2xl`}>
                          {banner.title}
                        </h2>
                        <p className={`${(banner as any).highlight ? 'text-base lg:text-xl' : 'text-sm sm:text-base'} opacity-95 drop-shadow-lg`}>
                          {banner.subtitle}
                        </p>
                        {(banner as any).footnote && (
                          <p className="text-xs lg:text-sm opacity-80 italic drop-shadow-md">{(banner as any).footnote}</p>
                        )}
                        {(banner as any).highlight && (
                          <Link to="/produtos">
                            <Button size="lg" className="mt-4 bg-white text-orange-600 hover:bg-gray-100 font-bold shadow-lg">
                              Ver agora
                            </Button>
                          </Link>
                        )}
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
          <Card className="bg-gradient-to-br from-[#ff6b35] to-[#ff4757] text-white border-0 shadow-lg">
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