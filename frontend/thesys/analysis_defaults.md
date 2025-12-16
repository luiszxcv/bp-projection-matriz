# Análise de Novos Valores Padrões

Esta análise compara os valores presentes em `frontend/src/data/defaultInputs.ts` com a documentação em `frontend/thesys/novos valores padrões.md`.

## 1. Topline (Awareness)

| Variável | Valor Antigo (Código) | Valor Novo (Doc) | Medida | Observação |
|---|---|---|---|---|
| **CPL (Cost Per Lead)** | `900` | `350` | Reais (R$) | O código utiliza `cplMonthly` como 900. O doc especifica R$ 350. Nota: O doc também lista CPL real de 350 e CPMQL de 438. |
| **Budget Média Mensal** | ~R$ 400k - 1.1M/mês | Total ~R$ 4.8M | Reais (R$) | O código tem um investimento total anual muito maior (~10.8M) que o sugerido no doc (~4.8M). A distribuição mensal no código é progressiva. |

## 2. Taxas de Conversão (Funnel Rates)

### MQL → SQL (`mqlToSqlRate`)

| Tier | Valor Antigo | Valor Novo | Mudança Necessária |
|---|---|---|---|
| Enterprise | `0.25` (25%) | `0.20` (20%) | **Sim** |
| Large | `0.30` (30%) | `0.25` (25%) | **Sim** |
| Medium | `0.30` (30%) | `0.30` (30%) | Não |
| Small | `0.35` (35%) | `0.30` (30%) | **Sim** |
| Tiny | `0.35` (35%) | `0.30` (30%) | **Sim** |

### SAL → WON (`salToWonRate`)

| Tier | Valor Antigo | Valor Novo | Mudança Necessária |
|---|---|---|---|
| Enterprise | `0.25` (25%) | `0.30` (30%) | **Sim** |
| Large | `0.25` (25%) | `0.30` (30%) | **Sim** |
| Medium | `0.30` (30%) | `0.30` (30%) | Não |
| Small | `0.30` (30%) | `0.30` (30%) | Não |
| Tiny | `0.30` (30%) | `0.30` (30%) | Não |

### WON → Activation (`activationRate`)

| Tier | Valor Antigo | Valor Novo | Mudança Necessária |
|---|---|---|---|
| Enterprise | `0.93` (93%) | `0.88` (88%) | **Sim** |
| Large | `0.93` (93%) | `0.84` (84%) | **Sim** |
| Medium | `0.93` (93%) | `0.93` (93%) | Não |
| Small | `0.93` (93%) | `0.93` (93%) | Não |
| Tiny | `0.93` (93%) | `0.93` (93%) | Não |

Note que no código atual, `activationRate` é 93% para todos. O documento especifica taxas menores para Enterprise e Large.

## 3. Distribuição de Produtos (`productDistribution`)

Valores representam a % de Wons que compram cada produto.

### Enterprise
| Produto | Valor Antigo | Valor Novo | Mudança |
|---|---|---|---|
| Saber | `0.30` | `0.60` | **Adjust** |
| Ter | `0.20` | `0.10` | **Adjust** |
| Executar (No Loyalty) | `0.20` | `0.00` | **Adjust** |
| Executar (Loyalty) | `0.20` | `0.20` | Mantém |
| Potencializar | `0.10` | `0.10` | Mantém |

### Large
| Produto | Valor Antigo | Valor Novo | Mudança |
|---|---|---|---|
| Saber | `0.30` | `0.60` | **Adjust** |
| Ter | `0.00` | `0.10` | **Adjust** |
| Executar (No Loyalty) | `0.30` | `0.00` | **Adjust** |
| Executar (Loyalty) | `0.30` | `0.20` | **Adjust** |
| Potencializar | `0.10` | `0.10` | Mantém |

### Medium
| Produto | Valor Antigo | Valor Novo | Mudança |
|---|---|---|---|
| Executar (No Loyalty) | `0.15` | `0.00` | **Adjust** |
| Executar (Loyalty) | `0.15` | `0.30` | **Adjust** |

### Small e Tiny
Os valores parecem estar alinhados ou muito próximos (Saber 80%, Ter 20%).

## 4. Ticket Médio (`productTickets`)

**Atenção Crítica**: Existe uma discrepância significativa nos valores de ticket para produtos recorrentes (Executar) entre o código e a documentação. O código usa valores mensais crescentes (ex: 15k a 35k), enquanto a documentação lista valores fixos que parecem ser anuais ou totais de contrato (ex: 145k).

| Tier | Produto | Valor Antigo (Array Mensal) | Valor Novo (Doc) | Obs |
|---|---|---|---|---|
| **Enterprise** | Saber | `50k` | `30k` | Doc é menor. |
| | Executar Loyalty | `15k` a `35k` (Mensal) | `145k` | Se 145k for anual, mensal seria ~12k. Se for mensal, a discrepância é enorme. |
| **Large** | Executar Loyalty | `11k` a `20k` (Mensal) | `99k` | Mesmo caso acima. |
| **Medium** | Executar Loyalty | `7k` a `10k` (Mensal) | `49k` | Mesmo caso acima. |

Recomendação: Confirmar se os valores no Doc para Executar são Anuais (TVC) ou Mensais (MRR). Se forem anuais, o valor antigo (mensal) pode estar correto ou até superestimado. Se forem mensais, o valor antigo está drasticamente subestimado. Assumindo que "Saber" é um one-off e o valor no Doc é 30k (próximo dos 25k-50k do código), é provável que o Doc mostre LTV/Contrato Total para Executar.

## 5. Resumo de Ação

Para atualizar `defaultInputs.ts` com segurança:

1.  **Atualizar CPL** para `350`.
2.  **Ajustar `mqlToSqlRate`** para Enterprise (0.20), Large (0.25), Small (0.30), Tiny (0.30).
3.  **Ajustar `salToWonRate`** para Enterprise (0.30), Large (0.30).
4.  **Ajustar `activationRate`** para Enterprise (0.88) e Large (0.84).
5.  **Atualizar `productDistribution`** conforme tabelas acima (focando em zerar Executar No Loyalty para Enterprise/Large/Medium e ajustar os pesos de Saber/Ter).
6.  **Discrepância de Ticket**: Atualizar "Saber" Enterprise para `30k`. Manter tickets de Executar como estão até confirmação sobre ser Valor Mensal vs Anual, pois 145k mensal difere muito da realidade de 15k, mas 145k anual (~12k mês) seria próximo.
