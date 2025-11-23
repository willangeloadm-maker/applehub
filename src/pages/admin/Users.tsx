import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, UserCheck, UserX, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface User {
  id: string;
  nome_completo: string;
  cpf: string;
  telefone: string;
  email?: string;
  created_at: string;
}

interface Verification {
  status: string;
  verificado_em: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<Record<string, Verification>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);

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

  const viewUserDetails = async (user: User) => {
    try {
      const [profileData, ordersData, verificationsData, creditAnalyses, transactions] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('orders').select('*').eq('user_id', user.id),
        supabase.from('account_verifications').select('*').eq('user_id', user.id).single(),
        supabase.from('credit_analyses').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id)
      ]);

      setSelectedUser(user);
      setUserDetails({
        profile: profileData.data,
        orders: ordersData.data || [],
        verification: verificationsData.data,
        creditAnalyses: creditAnalyses.data || [],
        transactions: transactions.data || []
      });
    } catch (error) {
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
              <CardTitle>Usuários Cadastrados</CardTitle>
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
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.nome_completo}</TableCell>
                        <TableCell>{user.email || 'N/A'}</TableCell>
                        <TableCell>{user.cpf}</TableCell>
                        <TableCell>{user.telefone}</TableCell>
                        <TableCell>{getVerificationBadge(user.id)}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString('pt-BR')}</TableCell>
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
                {userDetails.verification && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Verificação de Conta
                        {getVerificationBadge(selectedUser!.id)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {userDetails.verification.verificado_em && (
                          <div className="text-sm">
                            <span className="font-semibold">Verificado em:</span>{" "}
                            {new Date(userDetails.verification.verificado_em).toLocaleString('pt-BR')}
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-semibold mb-3">Documentos Enviados</h4>
                          <div className="grid grid-cols-3 gap-4">
                            {userDetails.verification.documento_frente && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Documento (Frente)</p>
                                <img 
                                  src={userDetails.verification.documento_frente} 
                                  alt="Documento Frente"
                                  className="w-full h-40 object-cover rounded border"
                                />
                              </div>
                            )}
                            {userDetails.verification.documento_verso && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Documento (Verso)</p>
                                <img 
                                  src={userDetails.verification.documento_verso} 
                                  alt="Documento Verso"
                                  className="w-full h-40 object-cover rounded border"
                                />
                              </div>
                            )}
                            {userDetails.verification.selfie && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Selfie</p>
                                <img 
                                  src={userDetails.verification.selfie} 
                                  alt="Selfie"
                                  className="w-full h-40 object-cover rounded border"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
      </div>
    </AppLayout>
  );
}