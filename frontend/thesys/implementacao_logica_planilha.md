# Proposta de Implementação: Alinhamento da Lógica com a Planilha

Para garantir que os cálculos do sistema (`calculations.ts`) e os inputs (`defaultInputs.ts`) produzam exatamente os mesmos resultados da planilha "BP Plan Completo.xlsx", identificamos a necessidade de ajustar a lógica de composição de receita.

## Diagnóstico: Divergências Lógicas

### 1. Definição de "Ticket"
*   **Planilha:** O "Ticket Médio" e os preços dos produtos (ex: R$ 145.000 para Executar Loyalty Enterprise) representam o **Valor Total do Contrato (TCV)** ou o valor reconhecido como "Revenue Won" no momento da venda. Nenhuma taxa de ativação ou duração é aplicada sobre este valor para chegar ao "Revenue Won".
*   **Código Atual (`calculations.ts`):** O código trata os inputs de ticket como "Mensalidade" e tenta calcular o valor do contrato multiplicando pela duração (ex: `ticket * duração`) e aplicando uma taxa de sucesso (`revenueActivationRate` ~93%).
*   **Impacto:** Isso gera valores distorcidos. Por exemplo, R$ 145k * 7 meses = ~R$ 1M, quando deveria ser apenas R$ 145k.

### 2. Taxa de Ativação (`revenueActivationRate`)
*   **Planilha:** A métrica "Revenue Won" é a soma bruta de (Contratos x Valor do Contrato). A "quebra" de ativação não desconta do "Revenue Won" mostrado no topo do funil.
*   **Código Atual:** Aplica `revenueActivationRate` (ex: 93%) reduzindo o "Revenue Won".

---

## Plano de Ajuste

Para utilizar a **mesma lógica da planilha**, devemos realizar as seguintes alterações:

### A. Ajustes em `frontend/src/lib/calculations.ts`

Alterar o cálculo da receita dentro do loop de produtos para utilizar o Ticket como **Valor Absoluto da Venda**, removendo multiplicadores de duração e taxas de desconto nessa etapa.

**Como é hoje (Simplificado):**
```typescript
if (product === 'executarLoyalty') {
  revenue = activatedClients * ticket * duration * revenueActivationRate;
}
```

**Como deve ficar (Lógica Planilha):**
```typescript
// O ticket já representa o valor cheio da venda (ex: 145k)
revenue = activatedClients * ticket;
```

### B. Ajustes em `frontend/src/data/defaultInputs.ts`

Garantir que os valores em `productTickets` reflitam o preço cheio (TCV - Total Contract Value) de cada produto para cada Tier, conforme a planilha.

**Valores Verificados (Jan/Fev 2026):**

| Tier | Produto | Preço Planilha (TCV) | Ação no Código |
| :--- | :--- | :--- | :--- |
| **Enterprise** | Saber | R$ 30.000 | Manter/Ajustar array |
| **Enterprise** | Ter | R$ 31.600 | Confirmar `fill12(31600)` |
| **Enterprise** | Executar (Loyalty) | R$ 145.000 | Confirmar `fill12(145000)` |
| **Medium** | Executar (Loyalty) | R$ 49.000 | Ajustar caso input seja mensal |

### Resumo Lógico
Ao adotar essa abordagem, o sistema passará a se comportar como uma calculadora de **Bookings (Vendas Totais)** no campo "Revenue Won", exatamente como a planilha opera nas abas "2026-01" e "2026-02".

---
### Próximos Passos
Se aprovado, eu posso aplicar essas correções diretamente nos arquivos citados.
