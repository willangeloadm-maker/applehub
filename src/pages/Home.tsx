import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, Smartphone, Tablet, Watch, Headphones, Cable, Sparkles, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import iphone17Hero from "@/assets/iphone-17-pro-max-colors.png";

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
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [iphone17ProMaxId, setIphone17ProMaxId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("recentes");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadAllProducts();
    loadIphone17ProMax();
  }, [sortBy]);

  const loadAllProducts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("products")
        .select("id, nome, preco_vista, imagens, estado, tags, capacidade, cor")
        .eq("ativo", true)
        .is("parent_product_id", null);

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
      setAllProducts(data || []);
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

  const loadIphone17ProMax = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id")
        .ilike("nome", "%iPhone 17 Pro Max%")
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) setIphone17ProMaxId(data.id);
    } catch (error) {
      console.error("Erro ao carregar iPhone 17 Pro Max:", error);
    }
  };

  const handleParcelamentoClick = async () => {
    try {
      // Verificar se usuário está logado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Se não estiver logado, redirecionar para login
        navigate('/auth');
        return;
      }

      // Verificar se a conta está verificada
      const { data: verification } = await supabase
        .from('account_verifications')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!verification || verification.status !== 'verificado') {
        // Se não estiver verificado, redirecionar para verificação
        navigate('/verificacao');
        return;
      }

      // Se já estiver verificado, redirecionar para produtos
      navigate('/produtos');
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      navigate('/auth');
    }
  };

  const categories = [
    { icon: Sparkles, label: "Todos", slug: "", gradient: "from-[#8b5cf6] to-[#a855f7]" },
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
      image: iphone17Hero,
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
                        {(banner as any).highlight && iphone17ProMaxId && (
                          <Link to={`/produtos/${iphone17ProMaxId}`}>
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
        <section className="px-4 pb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Categorias</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((category, index) => (
              <Link
                key={category.slug || 'todos'}
                to={category.slug ? `/produtos?categoria=${category.slug}` : '/produtos'}
                className="group animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card className="border-0 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95">
                  <CardContent className={`p-4 bg-gradient-to-br ${category.gradient} text-white relative overflow-hidden`}>
                    {/* Shine effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shine_1.5s_ease-in-out]" />
                    </div>
                    <div className="flex flex-col items-center gap-2 text-center relative z-10">
                      <category.icon className="h-8 w-8 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                      <span className="text-xs font-medium">{category.label}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* All Products */}
        <section className="px-4 pb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Todos os Produtos</h2>
              <p className="text-xs text-muted-foreground">Confira nosso catálogo completo</p>
            </div>
            <Link to="/produtos" className="group">
              <Button variant="ghost" size="sm" className="gap-1 text-xs hover:scale-105 transition-transform">
                Ver mais
                <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
          
          {/* Sort Filter */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Ordenar:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="menor-preco">Menor preço</SelectItem>
                <SelectItem value="maior-preco">Maior preço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : allProducts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum produto cadastrado
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {allProducts.map((product) => (
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
              <Button 
                variant="secondary" 
                size="lg" 
                className="w-full"
                onClick={handleParcelamentoClick}
              >
                Começar agora
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
};

export default Home;