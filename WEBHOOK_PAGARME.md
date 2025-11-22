# Configuração do Webhook Pagar.me

Este documento explica como configurar o webhook da Pagar.me para receber notificações automáticas de pagamento.

## Passo 1: Obter URL do Webhook

A URL do webhook da sua aplicação é:
```
https://slwpupadtakrnaqzluqc.supabase.co/functions/v1/pagarme-webhook
```

## Passo 2: Configurar no Dashboard da Pagar.me

1. Acesse o [Dashboard da Pagar.me](https://dashboard.pagar.me/)
2. Vá em **Configurações** → **Webhooks**
3. Clique em **Novo Webhook**
4. Configure os seguintes dados:
   - **URL**: Cole a URL do webhook acima
   - **Eventos**: Selecione os seguintes eventos:
     - `order.paid` - Quando um pedido é pago
     - `charge.paid` - Quando uma cobrança é paga
   - **Versão da API**: v5
   - **Status**: Ativo

5. Salve a configuração

## Passo 3: Testar o Webhook

Após configurar, você pode testar o webhook:

1. No Dashboard da Pagar.me, vá até o webhook criado
2. Clique em **Testar Webhook**
3. Selecione o evento `order.paid`
4. Clique em **Enviar Teste**

## Como Funciona

Quando um cliente paga um PIX:

1. A Pagar.me envia uma notificação para o webhook
2. O webhook valida a assinatura para garantir segurança
3. Busca a transação correspondente no banco de dados pelo código PIX
4. Atualiza o status da transação para "pago"
5. Se for uma entrada:
   - Cria as parcelas futuras automaticamente (30 em 30 dias)
   - Atualiza o status do pedido para "pagamento_confirmado"
   - Adiciona registro no histórico do pedido

## Segurança

O webhook valida a assinatura `x-hub-signature` enviada pela Pagar.me usando sua Secret Key. Isso garante que apenas requisições legítimas da Pagar.me sejam processadas.

## Monitoramento

Você pode monitorar os webhooks recebidos:

1. No Dashboard da Pagar.me, vá em **Webhooks** → **Histórico**
2. Veja todos os eventos enviados e seus status
3. Em caso de erro, você pode reenviar manualmente

## Troubleshooting

### Webhook não está sendo recebido
- Verifique se a URL está correta
- Confirme que o webhook está ativo no Dashboard
- Verifique os logs da edge function `pagarme-webhook`

### Transação não está sendo atualizada
- Verifique se o código PIX corresponde ao salvo no banco
- Confirme que a Secret Key está configurada corretamente
- Veja os logs para identificar erros específicos

## Logs

Para ver os logs do webhook:
```bash
# No painel admin, vá em Cloud → Functions → pagarme-webhook → Logs
```

## Estrutura do Webhook

O webhook recebe um payload JSON no seguinte formato:

```json
{
  "type": "order.paid",
  "data": {
    "id": "or_abc123",
    "charges": [
      {
        "last_transaction": {
          "qr_code": "00020126...",
          "qr_code_url": "https://..."
        }
      }
    ]
  }
}
```