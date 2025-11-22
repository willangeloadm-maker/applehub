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
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session) {
        throw new Error('Não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('get-users', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (error) throw error;

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
      const [profileData, ordersData, verificationsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('orders').select('*').eq('user_id', user.id),
        supabase.from('account_verifications').select('*').eq('user_id', user.id).single()
      ]);

      setSelectedUser(user);
      setUserDetails({
        profile: profileData.data,
        orders: ordersData.data || [],
        verification: verificationsData.data
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Usuário</DialogTitle>
            </DialogHeader>
            {userDetails && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Informações Pessoais</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Nome: {userDetails.profile?.nome_completo}</div>
                    <div>CPF: {userDetails.profile?.cpf}</div>
                    <div>Telefone: {userDetails.profile?.telefone}</div>
                    <div>Email: {selectedUser?.email}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Pedidos: {userDetails.orders.length}</h3>
                </div>
                {userDetails.verification && (
                  <div>
                    <h3 className="font-semibold mb-2">Verificação</h3>
                    <div className="text-sm">
                      Status: {getVerificationBadge(selectedUser!.id)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}