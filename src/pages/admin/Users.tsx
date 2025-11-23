import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, UserCheck, UserX, Eye, ZoomIn, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { formatInTimeZone } from 'date-fns-tz';

interface User {
  id: string;
  nome_completo: string;
  cpf: string;
  telefone: string;
  email?: string;
  created_at: string;
}

interface Verification {
  id?: string;
  user_id?: string;
  status: string;
  verificado_em: string | null;
  created_at?: string;
  updated_at?: string;
  documento_frente?: string | null;
  documento_verso?: string | null;
  selfie?: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<Record<string, Verification>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-users', {
        body: {
          admin_password: 'Ar102030'
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const verificationsMap: Record<string, Verification> = {};
      (data.verifications || []).forEach((v: any) => {
        verificationsMap[v.user_id] = {
          status: v.status,
          verificado_em: v.verificado_em
        };
      });

      setUsers(data.users || []);
      setVerifications(verificationsMap);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar usuários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para obter URL pública do storage
  const getStorageUrl = (path: string | null) => {
    if (!path) {
      console.log('❌ Path vazio para documento');
      return null;
    }
    
    console.log('📸 Gerando URL para:', path);
    
    // Remover prefixo 'verification-documents/' se existir
    const cleanPath = path.startsWith('verification-documents/') 
      ? path.replace('verification-documents/', '') 
      : path;
    
    const { data } = supabase.storage
      .from('verification-documents')
      .getPublicUrl(cleanPath);
    
    console.log('✅ URL gerada:', data.publicUrl);
    
    return data.publicUrl;
  };

  const viewUserDetails = async (user: User) => {
    try {
      console.log('🔍 Buscando detalhes do usuário:', user.id);
      
      // Buscar verificação dos dados já carregados pelo edge function
      const existingVerification = verifications[user.id];
      
      const [profileData, ordersData, creditAnalyses, transactions] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('orders').select('*').eq('user_id', user.id),
        supabase.from('credit_analyses').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id)
      ]);

      console.log('📄 Dados de verificação existentes:', existingVerification);

      setSelectedUser(user);
      setUserDetails({
        profile: profileData.data,
        orders: ordersData.data || [],
        verification: existingVerification || null,
        creditAnalyses: creditAnalyses.data || [],
        transactions: transactions.data || []
      });
    } catch (error) {
      console.error('❌ Erro ao carregar detalhes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do usuário",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.cpf.includes(searchTerm) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular paginação
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset para primeira página quando filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getVerificationBadge = (userId: string) => {
    const verification = verifications[userId];
    if (!verification) {
      return <Badge variant="outline">Não verificado</Badge>;
    }
    
    switch (verification.status) {
      case 'verificado':
        return <Badge className="bg-green-500"><UserCheck className="w-3 h-3 mr-1" />Verificado</Badge>;
      case 'pendente':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive"><UserX className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">Não verificado</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Gestão de Usuários</h1>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Usuários Cadastrados</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Total: {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.nome_completo}</TableCell>
                        <TableCell>{user.email || 'N/A'}</TableCell>
                        <TableCell>{user.cpf}</TableCell>
                        <TableCell>{user.telefone}</TableCell>
                        <TableCell>{getVerificationBadge(user.id)}</TableCell>
                        <TableCell>{formatInTimeZone(new Date(user.created_at), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewUserDetails(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Paginação */}
              {filteredUsers.length > itemsPerPage && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredUsers.length)} de {filteredUsers.length}
                  </div>
                  
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Anterior
                        </Button>
                      </PaginationItem>

                      <PaginationItem>
                        <div className="flex items-center gap-2 px-3">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                              // Mostrar primeira, última, atual e páginas adjacentes
                              if (page === 1 || page === totalPages) return true;
                              if (Math.abs(page - currentPage) <= 1) return true;
                              return false;
                            })
                            .map((page, index, array) => {
                              // Adicionar ellipsis se houver gap
                              const prevPage = array[index - 1];
                              const showEllipsis = prevPage && page - prevPage > 1;
                              
                              return (
                                <div key={page} className="flex items-center gap-2">
                                  {showEllipsis && <span className="text-muted-foreground">...</span>}
                                  <Button
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className="min-w-[40px]"
                                  >
                                    {page}
                                  </Button>
                                </div>
                              );
                            })}
                        </div>
                      </PaginationItem>

                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Próximo
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Usuário</DialogTitle>
            </DialogHeader>
            {userDetails && (
              <div className="space-y-6">
                {/* Informações Pessoais */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Nome:</span> {userDetails.profile?.nome_completo}
                      </div>
                      <div>
                        <span className="font-semibold">CPF:</span> {userDetails.profile?.cpf}
                      </div>
                      <div>
                        <span className="font-semibold">Telefone:</span> {userDetails.profile?.telefone}
                      </div>
                      <div>
                        <span className="font-semibold">Email:</span> {selectedUser?.email}
                      </div>
                      <div>
                        <span className="font-semibold">Data Nascimento:</span> {userDetails.profile?.data_nascimento}
                      </div>
                      <div className="col-span-2">
                        <span className="font-semibold">Endereço:</span> {userDetails.profile?.rua}, {userDetails.profile?.numero} - {userDetails.profile?.bairro}, {userDetails.profile?.cidade}/{userDetails.profile?.estado}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Verificação e Fotos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Verificação de Conta
                      {selectedUser && getVerificationBadge(selectedUser.id)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!userDetails.verification ? (
                      <p className="text-center text-muted-foreground py-4">
                        Usuário ainda não iniciou o processo de verificação
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-semibold">Status:</span> {userDetails.verification.status}
                          </div>
                          {userDetails.verification.verificado_em && (
                            <div>
                              <span className="font-semibold">Verificado em:</span>{" "}
                              {formatInTimeZone(new Date(userDetails.verification.verificado_em), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss')}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold">Criado em:</span>{" "}
                            {formatInTimeZone(new Date(userDetails.verification.created_at), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss')}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-3">Documentos Enviados</h4>
                          {!userDetails.verification.documento_frente && 
                           !userDetails.verification.documento_verso && 
                           !userDetails.verification.selfie ? (
                            <p className="text-center text-muted-foreground py-4 bg-secondary/30 rounded">
                              Nenhum documento enviado ainda
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {userDetails.verification.documento_frente && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground">Documento (Frente)</p>
                                  <div className="relative group">
                                    <img 
                                      src={getStorageUrl(userDetails.verification.documento_frente) || userDetails.verification.documento_frente} 
                                      alt="Documento Frente"
                                      className="w-full h-48 object-cover rounded-lg border-2 border-border hover:border-primary transition-colors cursor-pointer"
                                      onClick={() => setFullscreenImage(getStorageUrl(userDetails.verification.documento_frente) || userDetails.verification.documento_frente)}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                      <ZoomIn className="w-8 h-8 text-white" />
                                    </div>
                                  </div>
                                </div>
                              )}
                              {userDetails.verification.documento_verso && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground">Documento (Verso)</p>
                                  <div className="relative group">
                                    <img 
                                      src={getStorageUrl(userDetails.verification.documento_verso) || userDetails.verification.documento_verso} 
                                      alt="Documento Verso"
                                      className="w-full h-48 object-cover rounded-lg border-2 border-border hover:border-primary transition-colors cursor-pointer"
                                      onClick={() => setFullscreenImage(getStorageUrl(userDetails.verification.documento_verso) || userDetails.verification.documento_verso)}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                      <ZoomIn className="w-8 h-8 text-white" />
                                    </div>
                                  </div>
                                </div>
                              )}
                              {userDetails.verification.selfie && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground">Selfie</p>
                                  <div className="relative group">
                                    <img 
                                      src={getStorageUrl(userDetails.verification.selfie) || userDetails.verification.selfie} 
                                      alt="Selfie"
                                      className="w-full h-48 object-cover rounded-lg border-2 border-border hover:border-primary transition-colors cursor-pointer"
                                      onClick={() => setFullscreenImage(getStorageUrl(userDetails.verification.selfie) || userDetails.verification.selfie)}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                      <ZoomIn className="w-8 h-8 text-white" />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Análises de Crédito */}
                {userDetails.creditAnalyses && userDetails.creditAnalyses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Análises de Crédito</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {userDetails.creditAnalyses.map((analysis: any) => (
                          <div key={analysis.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded">
                            <div className="text-sm">
                              <div><span className="font-semibold">Solicitado:</span> R$ {analysis.valor_solicitado.toFixed(2)}</div>
                              <div><span className="font-semibold">Aprovado:</span> R$ {analysis.valor_aprovado.toFixed(2)} ({analysis.percentual_aprovado}%)</div>
                            </div>
                            <Badge variant={analysis.status === 'aprovado' ? 'default' : 'destructive'}>
                              {analysis.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pedidos */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pedidos ({userDetails.orders.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userDetails.orders.length > 0 ? (
                      <div className="space-y-2">
                        {userDetails.orders.map((order: any) => (
                          <div key={order.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded text-sm">
                            <div>
                              <div className="font-semibold">{order.numero_pedido}</div>
                              <div className="text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-primary">R$ {order.total.toFixed(2)}</div>
                              <Badge variant="outline">{order.payment_type}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">Nenhum pedido realizado</p>
                    )}
                  </CardContent>
                </Card>

                {/* Transações */}
                {userDetails.transactions && userDetails.transactions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Transações ({userDetails.transactions.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {userDetails.transactions.map((transaction: any) => (
                          <div key={transaction.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded text-sm">
                            <div>
                              <div className="font-semibold">{transaction.tipo}</div>
                              <div className="text-muted-foreground text-xs">
                                {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">R$ {transaction.valor.toFixed(2)}</div>
                              <Badge variant={transaction.status === 'pago' ? 'default' : 'secondary'}>
                                {transaction.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de visualização em tela cheia */}
        {fullscreenImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setFullscreenImage(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img 
              src={fullscreenImage} 
              alt="Visualização em tela cheia"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}