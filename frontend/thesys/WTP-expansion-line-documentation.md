# Documentação: WTP (Willingness to Pay) vs Conversão Saber → Executar

## 📋 Resumo Executivo

Este documento descreve a diferença entre os dois modelos de expansão de receita e como migrar do modelo atual (Conversão Saber → Executar) para o novo modelo (WTP - Willingness to Pay / Expansion Line).

---

## 🔄 Modelo ATUAL: Conversão Saber → Executar

### Conceito
O modelo atual assume que clientes que compram **Saber** (produto de consultoria/projeto) se convertem automaticamente para **Executar** (produto recorrente) após um período de 60 dias (2 meses).

### Mecânica Atual
```
Cliente compra Saber
    ↓
Após 60 dias (2 meses)
    ↓
40% dos clientes se convertem para Executar
    ↓
    ├── 40% → Executar Loyalty (contrato 7 meses)
    └── 60% → Executar No-Loyalty (contrato 2 meses)
```

### Fórmulas Atuais (em `calculations.ts`)

```typescript
// Linha 294-338 - Conversão Saber → Executar
const conversionsToProcess = pendingSaberConversions[tier].filter(c => month - c.month >= 2);

for (const conv of conversionsToProcess) {
    // Taxa de conversão fixa: 40%
    const convertingClients = Math.round(conv.clients * inputs.conversionRates.saberToExecutar);
    
    // Distribuição: 40% Loyalty, 60% No-Loyalty
    const loyaltyClients = Math.round(convertingClients * inputs.conversionRates.executarLoyaltyRatio);
    const noLoyaltyClients = convertingClients - loyaltyClients;
    
    // Receita
    const loyaltyRevenue = loyaltyClients * ticket * 7; // 7 meses
    const noLoyaltyRevenue = noLoyaltyClients * ticket * 2; // 2 meses
}
```

### Parâmetros de Configuração Atuais
| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `saberToExecutar` | 0.40 (40%) | Taxa de conversão de Saber para Executar |
| `executarLoyaltyRatio` | 0.40 (40%) | % que vai para Loyalty |
| `noLoyaltyDuration` | 2 meses | Duração contrato No-Loyalty |
| `loyaltyDuration` | 7 meses | Duração contrato Loyalty |

### Limitações do Modelo Atual
1. **Taxa fixa**: 40% sempre, independente do tier ou potencial do cliente
2. **Sem teto de receita**: Não considera capacidade de pagamento do cliente
3. **Binário**: Cliente converte ou não, sem graduação
4. **Timing fixo**: Sempre após 2 meses, sem flexibilidade

---

## 🆕 Modelo NOVO: WTP (Willingness to Pay) / Expansion Line

### Conceito
O modelo WTP baseado em **Share of Wallet** assume que cada cliente tem um **orçamento anual para marketing/consultoria** (WTP - Willingness to Pay), e a empresa captura progressivamente uma **fatia desse orçamento** ao longo do tempo.

### Mecânica Nova
```
Cliente ATIVA com receita inicial (Go Live)
    ↓
Define-se o $ Annual WTP (quanto o cliente pode gastar/ano)
    ↓
Define-se % Share of Wallet Desired (meta de captura, ex: 5%/mês)
    ↓
A cada mês: Expansion Goal = min(WTP × %, Wallet Remaining)
    ↓
Distribuição por produtos conforme % configurado
```

### Estrutura de Dados (Deduzido do MD)

Para cada **tier**, acompanhamos:

| Métrica | Descrição | Exemplo (Enterprise) |
|---------|-----------|---------------------|
| `$ Annual WTP` | Quanto o cliente pode gastar/ano em serviços | R$ 5.000.000 |
| `$ Total Share of Wallet` | Pool total de budget dos clientes do tier | R$ 5.000.000 |
| `% Share of Wallet Desired` | Meta de captura mensal | 5% |
| `$ Share of Wallet Actived` | Receita já capturada (acumulada) | R$ 26.970 → R$ 90.970 |
| `$ Expansion Goal` | Quanto deve expandir neste mês | R$ 8.598/mês |
| `$ Share of Wallet Remaining` | Quanto ainda pode capturar | R$ 4.909.030 |
| `% Index Saturation Base` | % do WTP já capturado | 3,03% |
| `% Index Monetization Potential` | % ainda disponível para captura | 98,18% |

### Fórmulas do Modelo WTP

#### 1. Inicialização (Go Live)
```
$ Share of Wallet Actived[mês_1] = $ Revenue Live (receita da ativação)
$ Share of Wallet Remaining[mês_1] = $ Total Share of Wallet - $ Revenue Live
```

#### 2. Meta de Expansão Mensal
```
$ Expansion Goal[mês] = ($ Annual WTP × % Share of Wallet Desired[mês]) / 12

Ou, quando acumulativo:
$ Expansion Goal[mês] = $ Share of Wallet Desired Total - $ Share of Wallet Actived[mês-1]
```

#### 3. Progressão Mensal
```
$ Share of Wallet Actived[mês] = $ Share of Wallet Actived[mês-1] + $ Revenue Expansion[mês]

$ Share of Wallet Remaining[mês] = $ Total Share of Wallet - $ Share of Wallet Actived[mês]
```

#### 4. Índices de Saturação
```
% Index Saturation Base = $ Share of Wallet Actived / $ Total Share of Wallet

% Index Monetization Potential = 1 - % Index Saturation Base
                              = $ Share of Wallet Remaining / $ Total Share of Wallet
```

#### 5. Número de Expansões
```
# Expansions[mês] = floor($ Expansion Goal[mês] / $ Average Ticket[tier])

// Se Expansion Goal < Average Ticket, expansion = 0 (ex: Junho sem expansão)
```

#### 6. Receita de Expansão
```
$ Revenue Expansion[mês] = # Expansions[mês] × $ Average Ticket[tier]
```

#### 7. Distribuição por Produto
```
Para cada produto:
  # [Produto] = floor(# Expansions × % [Produto])
  $ [Produto] Revenue = # [Produto] × $ [Produto] Average Ticket
```

### Tabela de WTP por Tier (do MD)

| Tier | $ Annual WTP | $ Total Share of Wallet | % SoW Desired Base |
|------|-------------|------------------------|-------------------|
| Enterprise | R$ 5.000.000 | R$ 5.000.000 | 4-5% |
| Large | R$ 3.000.000 | R$ 3.000.000 | 5-6% |
| Medium | R$ 500.000 | R$ 3.000.000 (6 clientes) | 5% |
| Small | R$ 90.000 | R$ 1.440.000 (16 clientes) | 5-30% |
| Tiny | R$ 50.000 | R$ 400.000 (8 clientes) | 0-40% |

### Distribuição de Produtos por Tier (Expansão WTP)

| Tier | Saber | Ter | Executar No-Loyalty | Executar Loyalty | Potencializar |
|------|-------|-----|---------------------|------------------|---------------|
| Enterprise | 25% | 35% | 20% | 20% | 0% |
| Large | 5% | 25% | 70% | 0% | 0% |
| Medium | 5% | 40% | 55% | 0% | 0% |
| Small | 20% | 80% | 0% | 0% | 0% |
| Tiny | 20% | 80% | 0% | 0% | 0% |

---

## 📊 Comparativo: Modelo Atual vs WTP

| Aspecto | Conversão Saber→Executar | WTP / Expansion Line |
|---------|--------------------------|----------------------|
| **Base de cálculo** | Clientes Saber ativados | WTP (budget) do cliente |
| **Trigger** | Tempo (60 dias) | Meta de Share of Wallet |
| **Taxa** | Fixa (40%) | Variável por tier e mês |
| **Teto** | Sem limite | Limitado ao $ Total Share of Wallet |
| **Produtos** | Apenas Executar (L/NL) | Qualquer produto (Saber, Ter, Executar) |
| **Tracking** | `pendingSaberConversions[]` | `Share of Wallet Actived/Remaining` |
| **Visibilidade** | Invisível (interna) | Métricas explícitas (Saturation, Potential) |

---

## 🛠️ Impacto no Código Atual

### 1. O que será **ELIMINADO**

```typescript
// Em calculations.ts - Linhas 101-107
let pendingSaberConversions: Record<Tier, { clients: number; month: number }[]> = {...};

// Em calculations.ts - Linhas 275-276
if (product === 'saber' && activatedClients > 0) {
    pendingSaberConversions[tier].push({ clients: activatedClients, month });
}

// Em calculations.ts - Linhas 294-338 (todo o bloco)
// Process Saber → Executar conversions
for (const tier of TIERS) {
    const conversionsToProcess = pendingSaberConversions[tier].filter(...);
    // ... todo este bloco será removido
}
```

### 2. O que será **CRIADO**

#### 2.1 Novos Types (`simulation.ts`)

```typescript
export interface WTPConfig {
    annualWTP: Record<Tier, number>;           // WTP anual por tier
    totalShareOfWallet: Record<Tier, number>;  // Total WTP × clientes
    shareOfWalletDesired: Record<Tier, number[]>; // 12 valores % por tier
    productDistribution: Record<Tier, ProductDistribution>; // % por produto
}

export interface WTPTracking {
    tier: Tier;
    goLiveMonth: number;
    revenueAtGoLive: number;
    annualWTP: number;
    shareOfWalletActived: number;
    shareOfWalletRemaining: number;
}

export interface MonthlyData {
    // ... campos existentes ...
    
    // NOVOS campos WTP
    wtpExpansions: Record<Tier, number>;              // # expansões WTP
    wtpExpansionRevenue: Record<Tier, number>;        // $ revenue expansão WTP
    wtpExpansionByProduct: Record<Tier, ProductDistribution>; // $ por produto
    wtpSaturationIndex: Record<Tier, number>;         // % saturação
    wtpMonetizationPotential: Record<Tier, number>;   // % potencial restante
}
```

#### 2.2 Novos Inputs (`SimulationInputs`)

```typescript
export interface SimulationInputs {
    // ... existentes ...
    
    wtp: {
        // WTP anual por tier (quanto cada cliente pode gastar)
        annualWTP: Record<Tier, number>;
        
        // Meta de Share of Wallet por mês (12 valores por tier)
        shareOfWalletDesired: Record<Tier, number[]>;
        
        // Distribuição de produtos para expansão WTP
        productDistribution: Record<Tier, ProductDistribution>;
    };
}
```

#### 2.3 Nova Lógica de Cálculo

```typescript
// Tracking de WTP por cliente (substituindo pendingSaberConversions)
let wtpTracking: Record<Tier, WTPTracking[]> = {
    enterprise: [],
    large: [],
    medium: [],
    small: [],
    tiny: [],
};

// Ao ativar clientes, registrar WTP tracking
for (const tier of TIERS) {
    const activatedClients = monthData.activations[tier];
    if (activatedClients > 0) {
        const revenueAtGoLive = sumAllProductRevenue(monthData.revenueByTierProduct[tier]);
        
        wtpTracking[tier].push({
            tier,
            goLiveMonth: month,
            revenueAtGoLive,
            annualWTP: inputs.wtp.annualWTP[tier],
            shareOfWalletActived: revenueAtGoLive,
            shareOfWalletRemaining: inputs.wtp.annualWTP[tier] - revenueAtGoLive,
        });
    }
}

// Calcular expansões WTP
for (const tier of TIERS) {
    for (const tracking of wtpTracking[tier]) {
        // Meta de expansão do mês
        const sowDesired = inputs.wtp.shareOfWalletDesired[tier][idx];
        const expansionGoal = tracking.annualWTP * sowDesired;
        
        // Limitar ao remaining
        const actualExpansion = Math.min(expansionGoal, tracking.shareOfWalletRemaining);
        
        // Calcular número de expansões
        const avgTicket = calculateWeightedAverageTicket(tier, inputs);
        const numExpansions = Math.floor(actualExpansion / avgTicket);
        
        // Distribuir por produtos
        for (const product of PRODUCTS) {
            const productDist = inputs.wtp.productDistribution[tier][product];
            const productExpansions = Math.floor(numExpansions * productDist);
            const productTicket = inputs.tierMetrics[tier].productTickets[product][idx];
            const productRevenue = productExpansions * productTicket;
            
            monthData.wtpExpansionByProduct[tier][product] += productRevenue;
        }
        
        // Atualizar tracking
        const totalExpansionRevenue = sumProductRevenue(monthData.wtpExpansionByProduct[tier]);
        tracking.shareOfWalletActived += totalExpansionRevenue;
        tracking.shareOfWalletRemaining -= totalExpansionRevenue;
        
        // Índices
        monthData.wtpSaturationIndex[tier] = tracking.shareOfWalletActived / tracking.annualWTP;
        monthData.wtpMonetizationPotential[tier] = tracking.shareOfWalletRemaining / tracking.annualWTP;
    }
}
```

### 3. O que será **AJUSTADO**

#### 3.1 Expansão de Carteira (Base Ativa)
A expansão atual baseada em `expansionRate` (5% da base ativa) será **substituída** ou **complementada** pelo modelo WTP.

**Opção A - Substituição Total:**
```typescript
// Remover linhas 384-425 (expansão baseada em % da base)
// Usar apenas WTP
```

**Opção B - Híbrido:**
```typescript
// Manter expansão baseada em % como fallback
// Usar WTP como teto/limitador
const expansionFromBase = totalActiveExecutar * expansionRate;
const expansionFromWTP = calculateWTPExpansion(tracking);
const actualExpansion = Math.min(expansionFromBase, expansionFromWTP);
```

#### 3.2 Conversões (Eliminar)
```typescript
// Em MonthlyData
conversions: {
    [tier]: { loyalty: 0, noLoyalty: 0 } // Manter estrutura mas valores sempre 0
}
// Ou remover completamente se não usado em UI
```

---

## 📝 Checklist de Implementação

### Fase 1: Types e Estruturas
- [ ] Adicionar `WTPConfig` em `simulation.ts`
- [ ] Adicionar `WTPTracking` em `simulation.ts`
- [ ] Extender `MonthlyData` com campos WTP
- [ ] Extender `SimulationInputs` com configuração WTP

### Fase 2: Defaults e Migração
- [ ] Criar valores default de WTP por tier
- [ ] Migrar `expansionDistribution` existente para `wtp.productDistribution`
- [ ] Criar `shareOfWalletDesired` default (5% para todos os meses/tiers)

### Fase 3: Cálculos
- [ ] Criar tracking de WTP ao ativar clientes
- [ ] Implementar cálculo de Expansion Goal
- [ ] Implementar distribuição por produtos
- [ ] Calcular índices de Saturation e Monetization Potential
- [ ] **REMOVER** lógica de Saber → Executar

### Fase 4: UI
- [ ] Adicionar campos de configuração WTP na UI
- [ ] Mostrar métricas WTP na planilha (Saturation, Potential)
- [ ] Ajustar tooltips e descrições

### Fase 5: Cleanup
- [ ] Remover `pendingSaberConversions`
- [ ] Remover parâmetros obsoletos (`saberToExecutar`, etc.)
- [ ] Atualizar documentação

---

## ⚠️ Considerações Importantes

1. **Retrocompatibilidade**: Simulações existentes podem perder dados se removidos campos abruptamente. Considerar migração gradual.

2. **Valores Default**: O modelo WTP requer mais inputs. Garantir que defaults façam sentido para evitar resultados zerados.

3. **Validação**: WTP não pode ser menor que a receita de ativação, senão Share of Wallet Remaining seria negativo.

4. **Sazonalidade**: `shareOfWalletDesired` pode variar por mês (ver Tiny no MD: 0% Jan, 32% Fev, etc.). Manter flexibilidade.

5. **Múltiplos Clientes por Tier**: O tracking precisa agregar ou individualizar por cliente. No MD, parece agregar por tier.

---

## 📌 Resumo Final

| De (Atual) | Para (Novo) |
|------------|-------------|
| `saberToExecutar: 0.40` | `wtp.annualWTP: { enterprise: 5000000, ... }` |
| `pendingSaberConversions[]` | `wtpTracking[]` |
| Conversão após 60 dias | Expansão baseada em Share of Wallet meta |
| Taxa fixa 40% | Meta % configurável por tier/mês |
| Produtos apenas Executar | Qualquer produto (Saber, Ter, Executar) |
| Sem teto | Limitado ao WTP total |

---

*Documento gerado em 2025-12-11 | Versão 1.0*
