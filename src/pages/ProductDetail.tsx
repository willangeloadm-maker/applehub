import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import ProductCard from "@/components/ProductCard";
import { ArrowLeft, Minus, Plus, ShoppingCart, Shield, Truck, CreditCard, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

interface RelatedProduct {
  id: string;
  nome: string;
  preco_vista: number;
  imagens: string[];
  estado: "novo" | "seminovo" | "usado";
  tags: string[] | null;
  capacidade: string | null;
  cor: string | null;
}

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
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [siblingProducts, setSiblingProducts] = useState<RelatedProduct[]>([]);
  const [imageKey, setImageKey] = useState(0);

  const isFavorite = product ? isInWishlist(product.id) : false;

  useEffect(() => {
    if (id) {
      loadProduct();
      setSelectedImage(0);
      setImageKey(prev => prev + 1);
    }
  }, [id]);

  useEffect(() => {
    if (product) {
      loadRelatedProducts();
      loadSiblingProducts();
    }
  }, [product]);

  const loadProduct = async () => {
    try {
      setLoading(true);
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

  const loadRelatedProducts = async () => {
    if (!product) return;
    
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, nome, preco_vista, imagens, estado, tags, capacidade, cor")
        .eq("ativo", true)
        .eq("category_id", product.category_id)
        .neq("id", product.id)
        .is("parent_product_id", null)
        .limit(4);

      if (error) throw error;
      setRelatedProducts(data || []);
    } catch (error) {
      console.error("Erro ao carregar produtos relacionados:", error);
    }
  };

  const loadSiblingProducts = async () => {
    if (!product) return;
    
    try {
      // Buscar produtos "irmãos" - mesmo produto base com diferentes cores/capacidades
      let siblingQuery = supabase
        .from("products")
        .select("id, nome, preco_vista, imagens, estado, tags, capacidade, cor")
        .eq("ativo", true)
        .neq("id", product.id);

      // Se o produto tem parent_product_id, buscar outros filhos do mesmo pai
      if (product.parent_product_id) {
        siblingQuery = siblingQuery.eq("parent_product_id", product.parent_product_id);
      } else {
        // Se é um produto pai, buscar seus filhos
        siblingQuery = siblingQuery.eq("parent_product_id", product.id);
      }

      const { data, error } = await siblingQuery.limit(6);

      if (error) throw error;
      setSiblingProducts(data || []);
    } catch (error) {
      console.error("Erro ao carregar variações:", error);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    const productIdToAdd = selectedVariantId || product.id;
    await addToCart(productIdToAdd, quantidade);
    setAdding(false);
  };

  const handleVariantSelect = (variantId: string | null, price: number, stock: number) => {
    setSelectedVariantId(variantId);
    setFinalPrice(price);
    setAvailableStock(stock);
    setQuantidade(1);
  };

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

  const truncateDescription = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
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

  const descriptionText = product.descricao || "";
  const shouldTruncate = descriptionText.length > 150;

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
                <img
                  key={`main-${imageKey}-${selectedImage}`}
                  src={product.imagens[selectedImage] || "/placeholder.svg"}
                  alt={product.nome}
                  className="w-full aspect-square object-cover"
                  loading="eager"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
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
                      <img
                        src={img}
                        alt={`${product.nome} ${idx + 1}`}
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
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
                
                {/* Descrição com truncamento */}
                <div className="text-muted-foreground text-sm lg:text-base">
                  <p>
                    {showFullDescription ? descriptionText : truncateDescription(descriptionText)}
                  </p>
                  {shouldTruncate && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-primary"
                      onClick={() => setShowFullDescription(!showFullDescription)}
                    >
                      {showFullDescription ? (
                        <>Ver menos <ChevronUp className="w-4 h-4 ml-1" /></>
                      ) : (
                        <>Ver mais <ChevronDown className="w-4 h-4 ml-1" /></>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Outras Cores/Modelos disponíveis */}
              {siblingProducts.length > 0 && (
                <>
                  <div>
                    <h2 className="text-lg font-semibold mb-3">Outras opções disponíveis</h2>
                    <div className="flex flex-wrap gap-2">
                      {siblingProducts.map((sibling) => (
                        <Link
                          key={sibling.id}
                          to={`/produtos/${sibling.id}`}
                          className="border rounded-lg p-2 hover:border-primary transition-all flex items-center gap-2"
                        >
                          <img
                            src={sibling.imagens[0] || "/placeholder.svg"}
                            alt={sibling.nome}
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                          <div className="text-xs">
                            {sibling.cor && <p className="font-medium">{sibling.cor}</p>}
                            {sibling.capacidade && <p className="text-muted-foreground">{sibling.capacidade}</p>}
                            <p className="text-primary font-semibold">{formatPrice(sibling.preco_vista)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

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

        {/* Seção de Avaliações */}
        <div className="max-w-6xl mx-auto p-4 lg:p-6">
          <ProductReviews productId={id!} />
        </div>

        {/* Produtos Relacionados */}
        {relatedProducts.length > 0 && (
          <div className="max-w-6xl mx-auto p-4 lg:p-6">
            <h2 className="text-xl font-bold mb-4">Produtos Relacionados</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {relatedProducts.map((relProduct) => (
                <ProductCard
                  key={relProduct.id}
                  id={relProduct.id}
                  nome={relProduct.nome}
                  preco_vista={relProduct.preco_vista}
                  imagens={relProduct.imagens}
                  estado={relProduct.estado}
                  tags={relProduct.tags || []}
                  capacidade={relProduct.capacidade}
                  cor={relProduct.cor}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProductDetail;