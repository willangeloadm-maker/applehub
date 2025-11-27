import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Filter, Upload, X, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  nome: string;
  preco_vista: number;
  estado: 'novo' | 'seminovo' | 'usado';
  estoque: number;
  ativo: boolean;
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImages, setPreviewImages] = useState<{ file: File; preview: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Estados para criação de variações
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [newProductId, setNewProductId] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [variantData, setVariantData] = useState({
    cor: '',
    capacidade: '',
    preco_ajuste: '',
    estoque: ''
  });
  
  const [formData, setFormData] = useState<{
    nome: string;
    descricao: string;
    preco_vista: string;
    estado: 'novo' | 'seminovo' | 'usado';
    estoque: string;
    capacidade: string;
    cor: string;
    imagens: string;
    tags: string;
    destaque: boolean;
    ativo: boolean;
  }>({
    nome: '',
    descricao: '',
    preco_vista: '',
    estado: 'novo',
    estoque: '',
    capacidade: '',
    cor: '',
    imagens: '',
    tags: '',
    destaque: false,
    ativo: true
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, nome, preco_vista, estado, estoque, ativo')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (estadoFilter !== 'all') {
      filtered = filtered.filter(product => product.estado === estadoFilter);
    }

    setFilteredProducts(filtered);
  }, [searchTerm, estadoFilter, products]);

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Redimensionar se a imagem for muito grande
          let width = img.width;
          let height = img.height;
          const maxSize = 1920;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height * maxSize) / width;
              width = maxSize;
            } else {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Determinar tipo de saída baseado no arquivo original
          const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const extension = outputType === 'image/png' ? 'png' : 'jpeg';
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFileName = file.name.replace(/\.[^/.]+$/, `.${extension}`);
                const compressedFile = new File([blob], newFileName, {
                  type: outputType,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            outputType,
            0.85
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione apenas arquivos de imagem",
        variant: "destructive"
      });
      return;
    }

    // Criar previews
    const previews = await Promise.all(
      imageFiles.map(async (file) => ({
        file,
        preview: URL.createObjectURL(file)
      }))
    );

    setPreviewImages(prev => [...prev, ...previews]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await handleFilesSelected(files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFilesSelected(files);
    }
  };

  const confirmUpload = async () => {
    if (previewImages.length === 0) return;

    setUploadingImages(true);
    
    try {
      // Verificar se está autenticado como admin via localStorage
      const isAdminAuth = localStorage.getItem("admin_authenticated") === "true";
      if (!isAdminAuth) {
        throw new Error("Você precisa estar autenticado como administrador");
      }

      console.log("Iniciando upload de", previewImages.length, "imagens...");
      
      const uploadedUrls: string[] = [];
      
      // Upload sequencial para melhor controle de erros
      for (const { file } of previewImages) {
        try {
          // Comprimir imagem
          const compressedFile = await compressImage(file);
          
          const fileExt = compressedFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `products/${fileName}`;

          console.log("Enviando arquivo:", filePath);

          const { data, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, compressedFile, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Erro detalhado do upload:', uploadError);
            throw new Error(`Falha ao enviar ${file.name}: ${uploadError.message}`);
          }

          console.log("Upload bem-sucedido:", data);

          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

          uploadedUrls.push(publicUrl);
          console.log("URL pública gerada:", publicUrl);
          
        } catch (fileError: any) {
          console.error("Erro ao processar arquivo:", file.name, fileError);
          throw fileError;
        }
      }

      setUploadedImages(prev => [...prev, ...uploadedUrls]);
      
      // Limpar previews
      previewImages.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setPreviewImages([]);
      
      toast({ 
        description: `${uploadedUrls.length} imagem(ns) enviada(s) com sucesso!`,
        duration: 3000
      });
      
    } catch (error: any) {
      console.error('Erro completo ao fazer upload:', error);
      toast({
        title: "Erro ao enviar imagens",
        description: error.message || "Erro desconhecido ao fazer upload",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const removePreviewImage = (index: number) => {
    const newPreviews = [...previewImages];
    URL.revokeObjectURL(newPreviews[index].preview);
    newPreviews.splice(index, 1);
    setPreviewImages(newPreviews);
  };

  const removeUploadedImage = (url: string) => {
    setUploadedImages(prev => prev.filter(img => img !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Combinar URLs digitadas com imagens enviadas
      const manualUrls = formData.imagens ? formData.imagens.split(',').map(url => url.trim()).filter(url => url) : [];
      const allImages = [...uploadedImages, ...manualUrls];

      // Converter preço de formato BR (12.600,00) para número
      const parsedPrice = parseFloat(
        formData.preco_vista
          .replace(/\./g, '')  // Remove pontos de milhar
          .replace(',', '.')   // Troca vírgula por ponto decimal
      );
      
      const productData = {
        nome: formData.nome,
        descricao: formData.descricao,
        preco_vista: isNaN(parsedPrice) ? 0 : parsedPrice,
        estado: formData.estado,
        estoque: parseInt(formData.estoque),
        capacidade: formData.capacidade || null,
        cor: formData.cor || null,
        imagens: allImages,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
        destaque: formData.destaque,
        ativo: formData.ativo
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ description: "Produto atualizado com sucesso" });
        setDialogOpen(false);
        resetForm();
        loadProducts();
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([productData])
          .select('id, nome')
          .single();

        if (error) throw error;
        
        setDialogOpen(false);
        resetForm();
        loadProducts();
        
        // Perguntar se quer criar variações
        const wantsVariants = confirm(
          `Produto "${data.nome}" criado com sucesso!\n\nDeseja cadastrar variações deste produto? (outras cores, capacidades, etc.)`
        );
        
        if (wantsVariants) {
          setNewProductId(data.id);
          setNewProductName(data.nome);
          setVariantDialogOpen(true);
        } else {
          toast({ description: "Produto criado com sucesso" });
        }
      }
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar produto",
        variant: "destructive"
      });
    }
  };

  const handleCreateVariant = async () => {
    if (!newProductId) return;
    
    try {
      // Buscar dados do produto pai
      const { data: parentProduct, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', newProductId)
        .single();
      
      if (fetchError) throw fetchError;

      // Criar produto variante com dados do pai + variações
      const variantProductData = {
        nome: `${parentProduct.nome} ${variantData.cor || ''} ${variantData.capacidade || ''}`.trim(),
        descricao: parentProduct.descricao,
        preco_vista: parentProduct.preco_vista + parseFloat(variantData.preco_ajuste || '0'),
        estado: parentProduct.estado,
        estoque: parseInt(variantData.estoque || '0'),
        capacidade: variantData.capacidade || parentProduct.capacidade,
        cor: variantData.cor || parentProduct.cor,
        imagens: parentProduct.imagens,
        tags: parentProduct.tags,
        destaque: false,
        ativo: true,
        parent_product_id: newProductId,
        category_id: parentProduct.category_id
      };

      const { data: variantProduct, error: insertError } = await supabase
        .from('products')
        .insert([variantProductData])
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Criar registro na tabela product_variants
      const { error: variantError } = await supabase
        .from('product_variants')
        .insert([{
          parent_product_id: newProductId,
          variant_product_id: variantProduct.id,
          estoque: parseInt(variantData.estoque || '0'),
          preco_ajuste: parseFloat(variantData.preco_ajuste || '0'),
          ativo: true
        }]);

      if (variantError) throw variantError;

      toast({ description: "Variação criada com sucesso!" });
      
      // Limpar formulário de variação mas manter diálogo aberto para mais variações
      setVariantData({
        cor: '',
        capacidade: '',
        preco_ajuste: '',
        estoque: ''
      });
      
      loadProducts();
      
      // Perguntar se quer adicionar mais variações
      const addMore = confirm("Deseja adicionar mais uma variação?");
      if (!addMore) {
        setVariantDialogOpen(false);
        setNewProductId(null);
        setNewProductName('');
      }
      
    } catch (error: any) {
      console.error('Erro ao criar variação:', error);
      toast({
        title: "Erro ao criar variação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Verificar se o produto tem pedidos associados
      const { data: orderItems, error: checkError } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (orderItems && orderItems.length > 0) {
        // Produto tem pedidos - oferecer desativar ao invés de deletar
        const shouldDeactivate = confirm(
          'Este produto possui pedidos associados e não pode ser excluído permanentemente.\n\n' +
          'Deseja DESATIVAR o produto? Ele não aparecerá mais para os clientes, mas o histórico de pedidos será preservado.'
        );
        
        if (shouldDeactivate) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ ativo: false })
            .eq('id', id);
          
          if (updateError) throw updateError;
          toast({ description: "Produto desativado com sucesso" });
          loadProducts();
        }
        return;
      }

      // Produto sem pedidos - pode ser deletado
      if (!confirm('Tem certeza que deseja excluir este produto permanentemente?')) return;

      // Remover referências em outras tabelas primeiro
      await supabase.from('cart_items').delete().eq('product_id', id);
      await supabase.from('favorites').delete().eq('product_id', id);
      await supabase.from('product_attributes').delete().eq('product_id', id);
      await supabase.from('product_reviews').delete().eq('product_id', id);
      
      // Remover variantes que usam este produto como parent
      const { data: variants } = await supabase
        .from('product_variants')
        .select('variant_product_id')
        .eq('parent_product_id', id);
      
      if (variants && variants.length > 0) {
        for (const v of variants) {
          await supabase.from('cart_items').delete().eq('product_id', v.variant_product_id);
          await supabase.from('favorites').delete().eq('product_id', v.variant_product_id);
          await supabase.from('product_attributes').delete().eq('product_id', v.variant_product_id);
          await supabase.from('product_reviews').delete().eq('product_id', v.variant_product_id);
        }
        await supabase.from('product_variants').delete().eq('parent_product_id', id);
        for (const v of variants) {
          await supabase.from('products').delete().eq('id', v.variant_product_id);
        }
      }
      
      // Remover variantes onde este produto é a variante
      await supabase.from('product_variants').delete().eq('variant_product_id', id);

      // Remover produtos filhos que referenciam este como parent_product_id
      const { data: childProducts } = await supabase
        .from('products')
        .select('id')
        .eq('parent_product_id', id);

      if (childProducts && childProducts.length > 0) {
        for (const child of childProducts) {
          // Limpar referências dos produtos filhos
          await supabase.from('cart_items').delete().eq('product_id', child.id);
          await supabase.from('favorites').delete().eq('product_id', child.id);
          await supabase.from('product_attributes').delete().eq('product_id', child.id);
          await supabase.from('product_reviews').delete().eq('product_id', child.id);
          await supabase.from('product_variants').delete().eq('variant_product_id', child.id);
          await supabase.from('product_variants').delete().eq('parent_product_id', child.id);
        }
        // Deletar os produtos filhos
        await supabase.from('products').delete().eq('parent_product_id', id);
      }

      // Finalmente, deletar o produto
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ description: "Produto excluído com sucesso" });
      loadProducts();
    } catch (error: any) {
      console.error('Erro ao excluir produto:', error);
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openEditDialog = async (product: Product) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', product.id)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do produto",
        variant: "destructive"
      });
      return;
    }

    if (data) {
      setEditingProduct(data);
      setFormData({
        nome: data.nome,
        descricao: data.descricao,
        preco_vista: data.preco_vista.toString(),
        estado: data.estado,
        estoque: data.estoque.toString(),
        capacidade: data.capacidade || '',
        cor: data.cor || '',
        imagens: data.imagens.join(', '),
        tags: data.tags?.join(', ') || '',
        destaque: data.destaque,
        ativo: data.ativo
      });
      setDialogOpen(true);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setUploadedImages([]);
    previewImages.forEach(({ preview }) => URL.revokeObjectURL(preview));
    setPreviewImages([]);
    setFormData({
      nome: '',
      descricao: '',
      preco_vista: '',
      estado: 'novo',
      estoque: '',
      capacidade: '',
      cor: '',
      imagens: '',
      tags: '',
      destaque: false,
      ativo: true
    });
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Gestão de Produtos</h1>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Preço à Vista (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.preco_vista}
                      onChange={(e) => setFormData({ ...formData, preco_vista: e.target.value })}
                      required
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estado</Label>
                    <Select value={formData.estado} onValueChange={(value: 'novo' | 'seminovo' | 'usado') => setFormData({ ...formData, estado: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="seminovo">Seminovo</SelectItem>
                        <SelectItem value="usado">Usado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Capacidade</Label>
                    <Input
                      value={formData.capacidade}
                      onChange={(e) => setFormData({ ...formData, capacidade: e.target.value })}
                      placeholder="ex: 128GB"
                    />
                  </div>
                </div>
                <div>
                  <Label>Cor</Label>
                  <Input
                    value={formData.cor}
                    onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    placeholder="ex: Preto"
                  />
                </div>
                <div className="space-y-4">
                  <Label>Imagens do Produto</Label>
                  
                  {/* Upload de Imagens com Drag & Drop */}
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                      isDragging 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Upload className={`h-10 w-10 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-center">
                        <Label htmlFor="image-upload" className="cursor-pointer">
                          <Button type="button" variant="outline" asChild disabled={uploadingImages}>
                            <span>
                              {uploadingImages ? 'Enviando...' : 'Escolher Arquivos'}
                            </span>
                          </Button>
                        </Label>
                        <Input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          ou arraste e solte as imagens aqui
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          As imagens serão automaticamente comprimidas
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preview das Imagens Aguardando Confirmação */}
                  {previewImages.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">
                          Imagens para upload ({previewImages.length})
                        </Label>
                        <Button
                          type="button"
                          onClick={confirmUpload}
                          disabled={uploadingImages}
                          size="sm"
                        >
                          {uploadingImages ? 'Enviando...' : 'Confirmar Upload'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {previewImages.map(({ preview }, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded border-2 border-primary"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removePreviewImage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Imagens já Enviadas */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Imagens enviadas ({uploadedImages.length})
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {uploadedImages.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Enviada ${index + 1}`}
                              className="w-full h-24 object-cover rounded border-2 border-green-500"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeUploadedImage(url)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* URLs Manuais */}
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      Ou insira URLs (separadas por vírgula)
                    </Label>
                    <Textarea
                      value={formData.imagens}
                      onChange={(e) => setFormData({ ...formData, imagens: e.target.value })}
                      placeholder="https://exemplo.com/imagem1.jpg, https://exemplo.com/imagem2.jpg"
                      rows={2}
                    />
                  </div>
                </div>
                <div>
                  <Label>Tags (separadas por vírgula)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="iPhone, Apple, 5G"
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.destaque}
                      onChange={(e) => setFormData({ ...formData, destaque: e.target.checked })}
                    />
                    Destaque
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    />
                    Ativo
                  </label>
                </div>
                <Button type="submit" className="w-full">
                  {editingProduct ? 'Atualizar' : 'Criar'} Produto
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Produtos Cadastrados</CardTitle>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os estados</SelectItem>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="seminovo">Seminovo</SelectItem>
                    <SelectItem value="usado">Usado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum produto encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.nome}</TableCell>
                      <TableCell>R$ {product.preco_vista.toFixed(2)}</TableCell>
                      <TableCell className="capitalize">{product.estado}</TableCell>
                      <TableCell>{product.estoque}</TableCell>
                      <TableCell>{product.ativo ? 'Ativo' : 'Inativo'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/admin/produtos/${product.id}/variantes`)}
                            title="Gerenciar Variantes"
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Dialog para criar variações */}
        <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Variação</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Produto base: {newProductName}
              </p>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Cor da Variação</Label>
                <Input
                  value={variantData.cor}
                  onChange={(e) => setVariantData({ ...variantData, cor: e.target.value })}
                  placeholder="ex: Azul, Preto, Dourado"
                />
              </div>
              <div>
                <Label>Capacidade/Tamanho</Label>
                <Input
                  value={variantData.capacidade}
                  onChange={(e) => setVariantData({ ...variantData, capacidade: e.target.value })}
                  placeholder="ex: 128GB, 256GB, 512GB"
                />
              </div>
              <div>
                <Label>Ajuste de Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={variantData.preco_ajuste}
                  onChange={(e) => setVariantData({ ...variantData, preco_ajuste: e.target.value })}
                  placeholder="0 = mesmo preço, 100 = +R$100"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valor adicionado ao preço base. Use 0 para manter o mesmo preço.
                </p>
              </div>
              <div>
                <Label>Estoque desta variação</Label>
                <Input
                  type="number"
                  value={variantData.estoque}
                  onChange={(e) => setVariantData({ ...variantData, estoque: e.target.value })}
                  placeholder="Quantidade em estoque"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setVariantDialogOpen(false);
                    setNewProductId(null);
                    setNewProductName('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleCreateVariant}
                  disabled={!variantData.estoque}
                >
                  Criar Variação
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
