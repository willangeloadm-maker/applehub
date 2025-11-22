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
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        nome: formData.nome,
        descricao: formData.descricao,
        preco_vista: parseFloat(formData.preco_vista),
        estado: formData.estado,
        estoque: parseInt(formData.estoque),
        capacidade: formData.capacidade || null,
        cor: formData.cor || null,
        imagens: formData.imagens ? formData.imagens.split(',').map(url => url.trim()) : [],
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
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        toast({ description: "Produto criado com sucesso" });
      }

      setDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar produto",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ description: "Produto excluído com sucesso" });
      loadProducts();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir produto",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = async (product: Product) => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', product.id)
      .single();

    if (data) {
      setEditingProduct(product);
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
                <div>
                  <Label>URLs das Imagens (separadas por vírgula)</Label>
                  <Textarea
                    value={formData.imagens}
                    onChange={(e) => setFormData({ ...formData, imagens: e.target.value })}
                    placeholder="https://exemplo.com/imagem1.jpg, https://exemplo.com/imagem2.jpg"
                  />
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
      </div>
    </AppLayout>
  );
}
