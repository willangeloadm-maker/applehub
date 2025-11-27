import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Variant {
  id: string;
  sku: string;
  estoque: number;
  preco_ajuste: number;
  ativo: boolean;
  attributes: Record<string, string>;
}

export default function ProductVariants() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({
    sku: '',
    estoque: '',
    preco_ajuste: '0',
    attributes: {}
  });

  useEffect(() => {
    if (productId) {
      loadProduct();
      loadVariants();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Erro",
          description: "Produto não encontrado",
          variant: "destructive"
        });
        navigate('/admin/produtos');
        return;
      }
      
      setProduct(data);
      setCategory(data.categories);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      navigate('/admin/produtos');
    }
  };

  const loadVariants = async () => {
    try {
      const { data: variantsData, error } = await supabase
        .from('product_variants')
        .select('*, variant_product:variant_product_id(*, product_attributes(*))')
        .eq('parent_product_id', productId);

      if (error) throw error;

      const formattedVariants = variantsData?.map((v: any) => {
        const attrs: Record<string, string> = {};
        v.variant_product?.product_attributes?.forEach((attr: any) => {
          attrs[attr.attribute_name] = attr.attribute_value;
        });

        return {
          id: v.id,
          sku: v.sku,
          estoque: v.estoque,
          preco_ajuste: v.preco_ajuste,
          ativo: v.ativo,
          attributes: attrs
        };
      }) || [];

      setVariants(formattedVariants);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 1. Criar produto variante
      const { data: variantProduct, error: productError } = await supabase
        .from('products')
        .insert([{
          nome: `${product.nome}`,
          descricao: product.descricao,
          preco_vista: product.preco_vista + parseFloat(formData.preco_ajuste),
          estado: product.estado,
          estoque: parseInt(formData.estoque),
          category_id: product.category_id,
          imagens: product.imagens,
          parent_product_id: productId,
          ativo: true
        }])
        .select()
        .single();

      if (productError) throw productError;

      // 2. Criar atributos da variante
      const attributesArray = Object.entries(formData.attributes).map(([name, value]) => ({
        product_id: variantProduct.id,
        attribute_name: name,
        attribute_value: value as string
      }));

      if (attributesArray.length > 0) {
        const { error: attrError } = await supabase
          .from('product_attributes')
          .insert(attributesArray);

        if (attrError) throw attrError;
      }

      // 3. Criar registro de variante
      const { error: variantError } = await supabase
        .from('product_variants')
        .insert([{
          parent_product_id: productId,
          variant_product_id: variantProduct.id,
          sku: formData.sku,
          estoque: parseInt(formData.estoque),
          preco_ajuste: parseFloat(formData.preco_ajuste)
        }]);

      if (variantError) throw variantError;

      toast({ description: "Variante criada com sucesso" });
      setDialogOpen(false);
      resetForm();
      loadVariants();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (variantId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta variante?')) return;

    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId);

      if (error) throw error;
      toast({ description: "Variante excluída com sucesso" });
      loadVariants();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      estoque: '',
      preco_ajuste: '0',
      attributes: {}
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Carregando...</div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="container mx-auto p-4 text-center py-12">
          <p className="text-muted-foreground mb-4">Produto não encontrado</p>
          <Button onClick={() => navigate('/admin/produtos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Produtos
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-full">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/admin/produtos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Variantes de {product?.nome}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Categoria: {category?.nome} • Preço base: R$ {product?.preco_vista?.toFixed(2)}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Variante
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Variante</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SKU (Código)</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="ex: IP15PRO-128-BLK"
                    />
                  </div>
                  <div>
                    <Label>Estoque</Label>
                    <Input
                      type="number"
                      value={formData.estoque}
                      onChange={(e) => setFormData({ ...formData, estoque: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Ajuste de Preço (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_ajuste}
                    onChange={(e) => setFormData({ ...formData, preco_ajuste: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Preço final: R$ {(product.preco_vista + parseFloat(formData.preco_ajuste || 0)).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Atributos da Variante</Label>
                  {category?.atributos_permitidos?.map((attrName: string) => (
                    <div key={attrName}>
                      <Label className="text-sm">{attrName}</Label>
                      <Input
                        value={formData.attributes[attrName] || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          attributes: { ...formData.attributes, [attrName]: e.target.value }
                        })}
                        placeholder={`ex: ${attrName === 'Cor' ? 'Preto' : attrName === 'Capacidade' ? '128GB' : ''}`}
                      />
                    </div>
                  ))}
                  {(!category?.atributos_permitidos || category.atributos_permitidos.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum atributo definido para esta categoria. Configure na gestão de categorias.
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  Criar Variante
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Variantes Cadastradas</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Atributos</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma variante cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{variant.sku || '-'}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(variant.attributes).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        R$ {(product.preco_vista + variant.preco_ajuste).toFixed(2)}
                        {variant.preco_ajuste !== 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({variant.preco_ajuste > 0 ? '+' : ''}{variant.preco_ajuste.toFixed(2)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant.estoque > 0 ? "default" : "destructive"}>
                          {variant.estoque} un
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(variant.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
