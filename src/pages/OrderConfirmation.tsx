import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, Truck, Home, Clock, Sparkles, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";

const orderSteps = [
  { 
    id: 1, 
    title: "Pedido Faturado", 
    description: "Pagamento confirmado",
    icon: CheckCircle2,
    status: "completed"
  },
  { 
    id: 2, 
    title: "Em Separação", 
    description: "Preparando seus produtos",
    icon: Package,
    status: "current"
  },
  { 
    id: 3, 
    title: "Enviado p/ Transportadora", 
    description: "Saiu do nosso centro",
    icon: Truck,
    status: "pending"
  },
  { 
    id: 4, 
    title: "Saiu para Entrega", 
    description: "A caminho do destino",
    icon: Clock,
    status: "pending"
  },
  { 
    id: 5, 
    title: "Pedido Entregue", 
    description: "Chegou no endereço",
    icon: Home,
    status: "pending"
  },
];

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order");
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error || !data) {
        navigate("/");
        return;
      }

      setOrderData(data);
      setLoading(false);
    };

    loadOrder();
  }, [orderId, navigate]);

  useEffect(() => {
    if (!loading && orderData) {
      // Trigger confetti celebration
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#ff6b35', '#ff4757', '#ffa502', '#2ed573']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#ff6b35', '#ff4757', '#ffa502', '#2ed573']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [loading, orderData]);

  const copyTrackingCode = () => {
    if (orderData?.codigo_rastreio) {
      navigator.clipboard.writeText(orderData.codigo_rastreio);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
        <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
          
          {/* Success Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-4"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative inline-flex"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-destructive blur-xl opacity-40 animate-pulse" />
              <div className="relative rounded-full bg-gradient-to-br from-primary/20 to-destructive/20 p-6 border-2 border-primary/30">
                <CheckCircle2 className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Parabéns!</span>
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-destructive to-primary bg-clip-text text-transparent">
                Pedido Confirmado!
              </h1>
              <p className="text-muted-foreground mt-2 text-lg">
                Seu pedido foi recebido e já está sendo preparado
              </p>
            </motion.div>
          </motion.div>

          {/* Order Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground block mb-1">Pedido</span>
                <span className="font-mono font-bold text-lg">{orderData?.numero_pedido}</span>
              </div>
              
              <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                <span className="text-sm text-muted-foreground block mb-1">Código de Rastreio</span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono font-bold text-lg text-primary">{orderData?.codigo_rastreio}</span>
                  <button 
                    onClick={copyTrackingCode}
                    className="p-1 hover:bg-primary/20 rounded transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-center p-4 rounded-xl bg-muted/50">
                <span className="text-sm text-muted-foreground block mb-1">Valor Total</span>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderData?.total || 0)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Timeline Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Acompanhe seu pedido
            </h2>

            {/* Desktop Timeline */}
            <div className="hidden md:block">
              <div className="relative">
                {/* Progress Line Background */}
                <div className="absolute top-8 left-0 right-0 h-1 bg-muted rounded-full" />
                
                {/* Progress Line Active */}
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "25%" }}
                  transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                  className="absolute top-8 left-0 h-1 bg-gradient-to-r from-primary to-destructive rounded-full"
                />

                {/* Steps */}
                <div className="relative flex justify-between">
                  {orderSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = step.status === "completed";
                    const isCurrent = step.status === "current";
                    const isPending = step.status === "pending";

                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + index * 0.15 }}
                        className="flex flex-col items-center text-center"
                      >
                        <div className={`
                          relative z-10 w-16 h-16 rounded-full flex items-center justify-center
                          transition-all duration-500
                          ${isCompleted ? 'bg-gradient-to-br from-primary to-destructive text-white shadow-lg shadow-primary/30' : ''}
                          ${isCurrent ? 'bg-gradient-to-br from-primary/20 to-destructive/20 border-2 border-primary text-primary animate-pulse' : ''}
                          ${isPending ? 'bg-muted text-muted-foreground' : ''}
                        `}>
                          <Icon className={`w-7 h-7 ${isCurrent ? 'animate-bounce' : ''}`} />
                          {isCurrent && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-ping" />
                          )}
                        </div>
                        <h3 className={`mt-3 font-semibold text-sm ${isPending ? 'text-muted-foreground' : ''}`}>
                          {step.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[100px]">
                          {step.description}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Timeline */}
            <div className="md:hidden space-y-4">
              {orderSteps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = step.status === "completed";
                const isCurrent = step.status === "current";
                const isPending = step.status === "pending";
                const isLast = index === orderSteps.length - 1;

                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.15 }}
                    className="flex gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        ${isCompleted ? 'bg-gradient-to-br from-primary to-destructive text-white shadow-lg shadow-primary/30' : ''}
                        ${isCurrent ? 'bg-gradient-to-br from-primary/20 to-destructive/20 border-2 border-primary text-primary' : ''}
                        ${isPending ? 'bg-muted text-muted-foreground' : ''}
                      `}>
                        <Icon className={`w-5 h-5 ${isCurrent ? 'animate-bounce' : ''}`} />
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-8 mt-2 ${isCompleted ? 'bg-gradient-to-b from-primary to-destructive' : 'bg-muted'}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <h3 className={`font-semibold ${isPending ? 'text-muted-foreground' : ''}`}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-primary font-medium">
                          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          Etapa atual
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Info Message */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-gradient-to-r from-primary/10 via-destructive/10 to-primary/10 rounded-2xl p-6 border border-primary/20"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Estamos preparando tudo com carinho!</h3>
                <p className="text-muted-foreground">
                  Dentro de algumas horas seu pedido sairá para envio. Você receberá atualizações 
                  por e-mail em cada etapa. Também pode acompanhar em tempo real na seção "Meus Pedidos".
                </p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button 
              variant="outline" 
              size="lg"
              className="flex-1 h-14 text-base"
              onClick={() => navigate("/")}
            >
              <Home className="w-5 h-5 mr-2" />
              Voltar para Home
            </Button>
            <Button 
              size="lg"
              className="flex-1 h-14 text-base bg-gradient-to-r from-primary to-destructive hover:opacity-90"
              onClick={() => navigate("/pedidos")}
            >
              <Package className="w-5 h-5 mr-2" />
              Ver Meus Pedidos
            </Button>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
