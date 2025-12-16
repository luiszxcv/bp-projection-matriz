# WTP - Análise Corrigida e Validada (Múltiplas Safras)

## ✅ Veredito: O Modelo Multi-Safras está CORRETO!

A análise dos dados fornecidos ("Consolidado total de WTP" vs "Jan/Fev blocks") confirma definitivamente que o sistema opera com **safras independentes** para cada mês de Go Live.

### 🧾 Prova da Consolidação
Conseguimos provar isso somando as expansões das safras individuais para chegar ao total consolidado:

**Exemplo: Mês de Março (Coluna 3)**
- **Safra Janeiro** (no seu 3º mês): Expansão de **R$ 2.386.000**
- **Safra Fevereiro** (no seu 2º mês): Expansão de **R$ 3.572.000** (valor da Coluna 2 do bloco Fev)
- **Soma**: 2.386.000 + 3.572.000 = **R$ 5.958.000**
- **Consolidado (Março)**: **R$ 5.958.000** ✅

---

## 🧩 Novas Descobertas (Refinamento da Lógica)

Além da confirmação das safras, deduzimos as fórmulas exatas que governam os "Expansion Goals" e o timing, que possuem nuances importantes não identificadas anteriormente:

### 1. Fatores Multiplicadores por Tier
A meta de expansão não é apenas `Revenue Live * % Desired`. Existe um multiplicador fixo por Tier aplicado à receita base:

| Tier | Revenue Live (Jan) | Expansion Goal (Mês 1) | Relação (Goal / Rev) | Multiplicador |
|------|--------------------|------------------------|----------------------|---------------|
| **Enterprise** | R$ 1.455.264 | R$ 1.455.264 | 100% | **1.0x** |
| **Large** | R$ 1.540.080 | R$ 3.080.160 | 200% | **2.0x** |
| **Medium** | R$ 5.636.730 | R$ 5.636.730 | 100% | **1.0x** |
| **Small** | R$ 8.661.090 | R$ 4.330.545 | 50% | **0.5x** |
| **Tiny** | R$ 3.013.200 | R$ 1.506.600 | 50% | **0.5x** |

Este multiplicador (`TierMultiplier`) se mantém consistente nos meses subsequentes:
* *Exemplo Small (Mês 3)*: Rev 8.66M * 32% Desired * 0.5 = 1.38M (Bate com Goal 1.385M)
* *Exemplo Large (Mês 4)*: Rev 1.54M * 10% Desired * 2.0 = 308k (Bate com Goal 308k)

### 2. A Regra do "Lag" (Antecipação) de 1 Mês
A expansão de receita (Revenue Expansion) acontece no mês **ANTERIOR** ao mês onde aparece o "Expansion Goal".
Ou seja, a receita é capturada no mês `M` para atingir a meta definida para o mês `M+1`.

* **Enterprise (Safra Jan):**
    * Goal aparece em **Abril** (10%): R$ 145.526
    * Revenue Expansion ocorre em **Março**: R$ 160.000
* **Medium (Safra Jan):**
    * Goal aparece em **Março** (32%): R$ 1.8M
    * Revenue Expansion ocorre em **Fevereiro**: R$ 1.81M

### 3. Fórmulas Finais

#### 🎯 Expansion Goal (Meta)
Para um mês `m` (onde m=1 é Jan):

*   **Se m = 1 (Mês do Go Live):**
    ```typescript
    Goal[1] = RevenueLive * TierMultiplier
    ```
    *(Nota: Embora a meta exista no mês 1, a expansão de receita no mês 1 é sempre ZERO nos dados)*

*   **Se m > 1:**
    ```typescript
    Goal[m] = RevenueLive * PercentDesired[m] * TierMultiplier
    ```

#### 💸 Revenue Expansion (Realizado)
A receita de expansão no mês `m` visa atingir o Goal do mês `m+1`.

```typescript
// Calculando expansão para o mês atual (currentMonth)
TargetGoal = Goal[currentMonth + 1] // Olha para a meta do próximo mês
NumExpansions = floor(TargetGoal / AverageTicket) // Quantos tickets cabem
RevenueExpansion = NumExpansions * AverageTicket
```

---

## 🛠️ Próximos Passos de Implementação

1.  **Refatorar Engine de WTP**: Implementar loop de múltiplas safras (`cohorts`).
2.  **Aplicar TierMultipliers**: Adicionar configurações: `{ Enterprise: 1.0, Large: 2.0, Medium: 1.0, Small: 0.5, Tiny: 0.5 }`.
3.  **Implementar Lag de Expansão**: O cálculo de expansão do mês `i` deve olhar para `Goal[i+1]`.

## **Validação com CSV (Jan/Fev)**

- **Status geral:** As fórmulas centrais descritas no documento estão corretas para os dados de benchmark (2026-01_export.csv / 2026-02_export.csv): `TierMultiplier` e a regra de `Lag` de 1 mês batem com os valores do CSV.
- **Goal (mês 1):** Confirmado. `Goal[1] = RevenueLive * TierMultiplier` — os valores iniciais nos CSVs (Enterprise, Large, Medium, Small, Tiny) coincidem exatamente com essa fórmula.
- **Goal (m>1):** Confirmado. `Goal[m] = RevenueLive * PercentDesired[m] * TierMultiplier` — os percentuais por mês presentes nas planilhas produzem os `Expansion Goal` mostrados.
- **Revenue Expansion (observação importante):** A implementação real nos CSVs distribui a expansão por *sub-produtos* (ex.: `Saber`, `Ter`, `Executar-no loyalty`, `Executar-loyalty`, `Potencializar`) com `Average Ticket` específicos e contagens por sub-produto. Ou seja, o valor total de `Revenue Expansion` é a soma das expansões por bucket de produto, não somente `floor(TargetGoal / AverageTicket_total) * AverageTicket_total`.

    - Exemplo (Enterprise, bench Jan/Fev):
        - `Goal[4]` (meta mostrada em abril) = R$ 145.526,40 (calculado por `RevenueLive * 0.1 * 1.0`).
        - No CSV, a expansão realizada em Março (`Revenue Expansion`, mês 3) aparece como R$ 160.000, que é a soma de: `2 x R$70.000 (Saber) = R$140.000` + `2 x R$10.000 (Ter) = R$20.000` = R$160.000.
        - Conclusão: o motor aloca expansões por produto (quantidades inteiras por ticket produto) — portanto o valor final pode exceder ligeiramente a meta arredondada devido à granularidade dos tickets por produto.

- **Recomendação de ajuste no documento:** Atualizar a seção "Revenue Expansion (Realizado)" para explicitar a agregação por buckets de produto. Exemplo de fórmula a incluir:

```typescript
// Para cada produto p (Saber, Ter, ...)
NumExpansions_p = floor(TargetGoal_p / AverageTicket_p)
RevenueExpansion = sum_p(NumExpansions_p * AverageTicket_p)
// Onde TargetGoal_p pode ser alocado segundo regras internas (priorização por produto)
```

- **Próximo passo sugerido:** implementar/explicitar a regra de alocação de `TargetGoal` entre os buckets (prioridade por produto, limites máximos por produto, ou usar os contadores já presentes no CSV como fonte de verdade).

_Validação realizada com os arquivos: `2026-01_export.csv` e `2026-02_export.csv` (bench dos primeiros meses)._

## **Análise Top-Down: fluxo e interconexões**

Esta seção descreve, de cima para baixo, como os blocos se conectam nos cálculos e quais campos do CSV alimentam cada etapa.

- **1) Investimento → Leads (Awareness)**
    - Fonte/CSV: `2026-01_export.csv` → `$ Media Budget`, `VM1 # Leads`, `$ Cost per Lead (CPL)`.
    - Fórmula: `#Leads = MediaBudget / CPL` (valores no CSV confirmam esse fluxo).

- **2) Leads → MQL → SQL (Education / Selection)**
    - Campos: `CR1 % Lead → MQL`, `# MQLs` (VM1/VM2), `CR2 % MQL → SQL`, `# SQLs`.
    - Observação: conversões aplicadas por tier (Enterprise/Large/Medium/Small/Tiny).

- **3) SQL → SAL → WON (Selection → Closing)**
    - Campos: `CR3 % SQL → SAL`, `# SALs` (VM3), `CR4 % SAL → WON`, `# WONs` (VM4).
    - Resultado: `#WONs` por tier → usado com `Average Ticket` para calcular `Revenue Won`.

- **4) WON → Ativação / Revenue Live (Activation → Onboarding)**
    - Campos: `CR5 % WONs → Activation`, `# Customers Activated`, `CR5 % Revenue Won → Activation`, `$ Revenue Activated`, `$ Revenue Live` (VM6).
    - Observação: CSV aplica fator (ex.: 0.93) para converter `Revenue Won` em `Revenue Activated`.

- **5) Revenue Live → Expansion Goals (WTP inputs)**
    - Campos: `$ Revenue Live` por tier (VM6), `% Share of Wallet Desired`, `TierMultiplier` (Enterprise=1.0, Large=2.0, Medium=1.0, Small=0.5, Tiny=0.5), `$ Expansion Goal`.
    - Fórmulas:
        - `Goal[1] = RevenueLive * TierMultiplier`
        - `Goal[m>1] = RevenueLive * PercentDesired[m] * TierMultiplier`

- **6) Goal → Revenue Expansion (realizado) — WTP engine**
    - Campos: `Expansion Goal`, `Average Ticket` por tier e produto (`$ [Saber] Average Ticket`, `$ [Ter] Average Ticket`, etc.), `# Expansions` por produto, `$ Revenue Expansion`, `VM8 $ Expansion Revenue Won`.
    - Observação: o motor aloca expansões por *buckets de produto*, usando `floor(TargetGoal_p / AverageTicket_p)` por produto e somando, o que gera discretização (overshoot/undershoot).

- **7) Expansão consolidada → efeitos em períodos subsequentes**
    - Cada safra gera expansões que são somadas ao consolidado multi-cohort em meses seguintes (ex.: Mar = soma das expansões de Jan(3º mês) + Feb(2º mês)).

**Observações e recomendações práticas**

- Documentar a regra de alocação entre produtos (`Saber`, `Ter`, `Executar-no loyalty`, `Executar-loyalty`, `Potencializar`) e codificá-la no motor.
- Monitorar diferença entre `TargetGoal` e `RevenueExpansion` (métrica de erro de alocação) devido à granularidade dos tickets.
- Testes sugeridos:
    - Unitários para cada etapa do funil (investimento → leads → MQL → SQL → SAL → WON → Activation → Revenue Live → Goal → NumExpansions por produto → RevenueExpansion).
    - Integração: simular duas safras (Jan + Feb) e verificar que a soma das expansões por safra reproduz o consolidado do CSV.
    - Edge cases: definir comportamento quando `AverageTicket_p > TargetGoal`.
- Instrumentar logs intermediários (contagens por produto, Goal vs Realizado, leftover) para auditoria.

Se desejar, implemento um script Node/TS para reconstruir o fluxo a partir dos CSVs e gerar relatório de diferenças (Goal vs Realizado) para os primeiros 3 meses, ou começo a implementar a alocação por buckets no engine WTP (`frontend/temp_dist` / `scripts/run_calc`).
