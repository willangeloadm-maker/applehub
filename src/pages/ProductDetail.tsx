import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { ProductReviews } from "@/components/ProductReviews";
import VariantSelector from "@/components/VariantSelector";
import { ArrowLeft, Minus, Plus, ShoppingCart, Shield, Truck, CreditCard, Heart } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import OptimizedImage from "@/components/OptimizedImage";

type Product = Tables<"products">;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantidade, setQuantidade] = useState(1);
  const [adding, setAdding] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState(0);
  const [availableStock, setAvailableStock] = useState(0);

  const isFavorite = product ? isInWishlist(product.id) : false;

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar produto",
        description: error.message,
        variant: "destructive",
      });
      navigate("/produtos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    // Se tem variante selecionada, adiciona a variante, senão adiciona o produto pai
    const productIdToAdd = selectedVariantId || product.id;
    await addToCart(productIdToAdd, quantidade);
    setAdding(false);
  };

  const handleVariantSelect = (variantId: string | null, price: number, stock: number) => {
    setSelectedVariantId(variantId);
    setFinalPrice(price);
    setAvailableStock(stock);
    setQuantidade(1); // Reset quantidade quando mudar variante
  };

  // Determinar qual estoque usar (variante ou produto pai)
  const displayStock = selectedVariantId ? availableStock : product?.estoque || 0;
  const displayPrice = selectedVariantId ? finalPrice : (product?.preco_vista || 0);

  const handleToggleFavorite = async () => {
    if (!product) return;
    if (isFavorite) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product.id);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Produto não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-14 z-30 bg-card/95 backdrop-blur border-b border-border/40 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <div className="max-w-6xl mx-auto p-4 lg:p-6">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Galeria de Imagens */}
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl bg-secondary border">
                <OptimizedImage
                  src={product.imagens[selectedImage] || "/placeholder.svg"}
                  alt={product.nome}
                  aspectRatio="square"
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              {product.imagens.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.imagens.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === idx
                          ? "border-primary"
                          : "border-transparent hover:border-border"
                      }`}
                    >
                      <OptimizedImage
                        src={img}
                        alt={`${product.nome} ${idx + 1}`}
                        aspectRatio="square"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Informações do Produto */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={product.estado === "novo" ? "default" : "secondary"}>
                    {product.estado === "novo" ? "Novo" : product.estado === "seminovo" ? "Seminovo" : "Usado"}
                  </Badge>
                  {product.estoque > 0 ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Em estoque
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Esgotado</Badge>
                  )}
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">{product.nome}</h1>
                <p className="text-muted-foreground text-sm lg:text-base">{product.descricao}</p>
              </div>

              <Separator />

              {/* Especificações */}
              <div>
                <h2 className="text-lg font-semibold mb-3">Especificações</h2>
                <div className="grid grid-cols-2 gap-3">
                  {product.capacidade && (
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Capacidade</p>
                      <p className="font-semibold">{product.capacidade}</p>
                    </div>
                  )}
                  {product.cor && (
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Cor</p>
                      <p className="font-semibold">{product.cor}</p>
                    </div>
                  )}
                  {product.garantia_meses && (
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Garantia</p>
                      <p className="font-semibold">{product.garantia_meses} meses</p>
                    </div>
                  )}
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <p className="font-semibold capitalize">{product.estado}</p>
                  </div>
                </div>

                {product.especificacoes && typeof product.especificacoes === 'object' && (
                  <div className="mt-3 space-y-2">
                    {Object.entries(product.especificacoes).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Seletor de Variantes */}
              <VariantSelector
                productId={product.id}
                basePrice={product.preco_vista}
                onVariantSelect={handleVariantSelect}
              />

              <Separator />

              {/* Preço e Compra */}
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-primary">{formatPrice(displayPrice)}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ou parcele em até 24x com análise de crédito*
                  </p>
                </div>

                {/* Quantidade */}
                <div>
                  <p className="text-sm font-medium mb-2">Quantidade</p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                      disabled={quantidade <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-lg font-semibold w-12 text-center">{quantidade}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantidade(Math.min(displayStock, quantidade + 1))}
                      disabled={quantidade >= displayStock}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({displayStock} disponíveis)
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={product.estoque === 0 || adding}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {adding ? "Adicionando..." : "Adicionar ao Carrinho"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={handleToggleFavorite}
                >
                  <Heart className={`w-5 h-5 mr-2 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
                  {isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                </Button>
              </div>

              <Separator />

              {/* Benefícios */}
              <div className="grid gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>Garantia de {product.garantia_meses || 12} meses</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Truck className="w-5 h-5 text-primary" />
                  <span>Entrega em todo o Brasil</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span>Parcele em até 24x com análise</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Avaliações */}
      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        <ProductReviews productId={id!} />
      </div>
    </AppLayout>
  );
};

export default ProductDetail;
