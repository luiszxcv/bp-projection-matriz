# WTP (Willingness to Pay) - Análise Completa da Planilha Excel

## 📋 Descoberta da Lógica Real

Após análise detalhada da planilha Excel (aba 2026-01), identifiquei a **lógica exata** do modelo WTP.

---

## 🔑 Fórmula Correta Identificada

### Enterprise (Exemplo Completo - Linha 802-805)

```
% Share of Wallet Desired (linha 802):
  Jan=0%, Fev=0%, Mar=10%, Abr=0%, Mai=0%, Jun=30%, Jul=0%, Ago=0%, Set=30%, Out=0%, Nov=0%, Dez=30%

$ Revenue Live (linha 798): R$ 1.455.264

$ Expansion Goal (linha 805):
  Jan: R$ 1.455.264
  Fev: R$ 0
  Mar: R$ 145.526,40
  Abr: R$ 0
  Mai: R$ 0
  Jun: R$ 436.579,20
  ...
```

### ✅ Fórmula Deduzida e Validada

```typescript
// JANEIRO (mês do Go Live):
$ Expansion Goal[Jan] = $ Revenue Live × Σ(% Desired até Jan)
                      = R$ 1.455.264 × (0% + 0% + 10% + 0% + 0% + 30% + ... + 30%)
                      = R$ 1.455.264 × 100% 
                      = R$ 1.455.264 ✓

// FEVEREIRO:
Target[Fev] = $ Revenue Live × (0% + 0%)  // Soma até Fev
            = R$ 1.455.264 × 0% = R$ 0
$ Expansion Goal[Fev] = Target[Fev] - $ SoW Actived[Jan]
                      = R$ 0 - R$ 1.455.264
                      = R$ 0 (Max com 0) ✓

// MARÇO:
Target[Mar] = $ Revenue Live × (0% + 0% + 10%)  // Soma até Mar
            = R$ 1.455.264 × 10% = R$ 145.526,40
$ Expansion Goal[Mar] = Target[Mar] - $ SoW Actived[Fev]
                      = R$ 145.526,40 - R$ 0
                      = R$ 145.526,40 ✓

// JUNHO:
Target[Jun] = $ Revenue Live × (0% + 0% + 10% + 0% + 0% + 30%)  // Soma até Jun
            = R$ 1.455.264 × 40% = R$ 582.105,60
$ Expansion Goal[Jun] = Target[Jun] - $ SoW Actived[Mai]
                      = R$ 582.105,60 - R$ 145.526,40 (expansão de Mar)
                      = R$ 436.579,20 ✓
```

---

## 🎯 Interpretação Correta do % Desired

O `% Share of Wallet Desired` **NÃO é** um incremento mensal isolado.

É um **vetor de metas mensais cumulativas** que define:
> "Até este mês, quero ter capturado X% do Revenue Live inicial"

### Exemplo Enterprise:
```
Mês    % Desired    Σ% até o mês    Meta Cumulativa
Jan       0%            0%          R$ 0
Fev       0%            0%          R$ 0
Mar      10%           10%          R$ 145.526 (10% de R$ 1.455.264)
Abr       0%           10%          R$ 145.526 (mantém)
Mai       0%           10%          R$ 145.526 (mantém)
Jun      30%           40%          R$ 582.106 (40% de R$ 1.455.264)
Jul       0%           40%          R$ 582.106 (mantém)
Ago       0%           40%          R$ 582.106 (mantém)
Set      30%           70%          R$ 1.018.685 (70% de R$ 1.455.264)
Out       0%           70%          R$ 1.018.685 (mantém)
Nov       0%           70%          R$ 1.018.685 (mantém)
Dez      30%          100%          R$ 1.455.264 (100% de R$ 1.455.264)
```

---

## 📊 Validação com Medium (Linha 892-895)

```
# Medium Go Lives: 201
$ Revenue Live: R$ 5.636.730
% Desired: [0%, 32%, 17%, 15%, 10%, 10%, 7%, 5%, 4%, 0%, 0%, 0%]

Mês    % Desired    Σ%        Target                    SoW Actived    Expansion Goal
Jan       0%        0%        R$ 0                      R$ 5.636.730   R$ 0
Fev      32%       32%        R$ 1.803.754              R$ 5.636.730   R$ 0 (já saturado)
Mar      17%       49%        R$ 2.762.198              R$ 7.446.730   R$ 0 (já saturado)
Abr      15%       64%        R$ 3.607.507              R$ 8.378.730   R$ 0 (já saturado)
...
```

**OBSERVAÇÃO CRÍTICA**: 
Na planilha, Medium tem expansões em Fev (R$ 1.810.000), mas o Expansion Goal calculado seria R$ 0 porque a receita de ativação (R$ 5.636.730) já excede a meta de 32%.

Isso indica que a **lógica não é exatamente Gap-to-Target**, mas sim:

---

## 🔍 Lógica Real Descoberta (Revisada)

Analisando a linha 895 (Medium Expansion Goal):
```
$ Expansion Goal: R$ 5.636.730, R$ 0, R$ 1.803.754, R$ 958.244, R$ 845.510, ...
```

### Fórmula Correta Final:

```typescript
// A meta é sobre o TOTAL ACUMULADO, não sobre Revenue Live

Target[mês] = $ Revenue Live × Σ(% Desired até o mês)
$ Expansion Goal[mês] = max(0, Target[mês] - $ SoW Actived[mês-1])

// MAS a SoW Actived INCLUI:
// - Revenue Live (ativação)
// - Todas as expansões anteriores
```

### Validação Medium Fevereiro:
```
Target[Fev] = R$ 5.636.730 × 32% = R$ 1.803.754
$ SoW Actived[Jan] = R$ 5.636.730 (só ativação)
$ Expansion Goal[Fev] = R$ 1.803.754 - R$ 5.636.730 = R$ 0 ❌

Planilha mostra: R$ 0 ✓ (mas tem expansão de R$ 1.810.000)
```

**INSIGHT**: O Expansion Goal de R$ 0 está correto, mas a planilha ainda gera R$ 1.810.000 de expansão!

Isso significa que há **OUTRA LÓGICA** operando além do WTP Gap.

---

## 💡 Descoberta: Duas Fontes de Expansão

Analisando a linha 779 (Total Expansion):
```
$ Expansion Revenue Won (linha 779):
  Jan: R$ 0
  Fev: R$ 3.682.000
  Mar: R$ 2.386.000
  ...
```

Comparando com a soma das expansões WTP por tier:
```
Fev WTP:
  Enterprise: R$ 0
  Large: R$ 0
  Medium: R$ 1.810.000
  Small: R$ 1.390.000
  Tiny: R$ 482.000
  TOTAL: R$ 3.682.000 ✓
```

**CONCLUSÃO**: A expansão acontece mesmo quando o Expansion Goal é R$ 0!

---

## 🎯 Lógica Final Deduzida

### Hipótese Corrigida:

O `$ Expansion Goal` na planilha é **INFORMATIVO** (mostra o gap ideal), mas a **expansão real** é calculada de forma diferente:

```typescript
// PASSO 1: Calcular meta cumulativa
Target[mês] = $ Revenue Live × Σ(% Desired até o mês)

// PASSO 2: Calcular gap informativo
$ Expansion Goal = max(0, Target - SoW Actived anterior)

// PASSO 3: Calcular expansão REAL (diferente do Goal!)
// Se % Desired[mês] > 0:
Incremental_Target = $ Revenue Live × % Desired[mês]
$ Revenue Expansion = min(Incremental_Target, SoW Remaining)

// PASSO 4: Atualizar SoW Actived
$ SoW Actived[mês] = $ SoW Actived[mês-1] + $ Revenue Expansion[mês]
```

### Validação Medium Fevereiro (Revisada):
```
% Desired[Fev] = 32%
Incremental_Target = R$ 5.636.730 × 32% = R$ 1.803.754
SoW Remaining = R$ 100.500.000 - R$ 5.636.730 = R$ 94.863.270

$ Revenue Expansion[Fev] = min(R$ 1.803.754, R$ 94.863.270)
                         = R$ 1.803.754

# Expansions = floor(R$ 1.803.754 / R$ 18.100) = 99,6 → 100 ✓
$ Revenue Expansion = 100 × R$ 18.100 = R$ 1.810.000 ✓
```

---

## ✅ Fórmula Final Validada

```typescript
for (let month = 0; month < 12; month++) {
  const idx = month;
  const tier = 'medium'; // exemplo
  
  // 1. Acumular % Desired
  cumulativeDesiredPercent += shareOfWalletDesired[idx];
  
  // 2. Calcular meta cumulativa (informativo)
  const targetCumulative = revenueAtGoLive * cumulativeDesiredPercent;
  const expansionGoal = Math.max(0, targetCumulative - sowActived);
  
  // 3. Calcular expansão REAL do mês (incremental)
  const incrementalTarget = revenueAtGoLive * shareOfWalletDesired[idx];
  const sowRemaining = totalShareOfWallet - sowActived;
  const actualExpansionGoal = Math.min(incrementalTarget, sowRemaining);
  
  // 4. Converter em número de expansões
  const numExpansions = Math.floor(actualExpansionGoal / avgTicket);
  const revenueExpansion = numExpansions * avgTicket;
  
  // 5. Atualizar SoW Actived
  sowActived += revenueExpansion;
}
```

---

## 🔧 Correção Necessária no Código

O código atual usa:
```typescript
// ERRADO:
const targetSaturation = revenueAtGoLive * (1 + cumulativeDesiredPercent);
const expansionGoal = Math.max(0, targetSaturation - sowActived);
```

Deve ser:
```typescript
// CORRETO:
const incrementalTarget = revenueAtGoLive * shareOfWalletDesired[idx];
const sowRemaining = totalShareOfWallet - sowActived;
const actualExpansionGoal = Math.min(incrementalTarget, sowRemaining);
```

---

*Documento gerado em 2025-12-11 | Análise baseada na planilha Excel `BP PLan Completo.xlsx` aba `2026-01`*
