# PLANO: Reestruturação de Despesas Marketing e Vendas (DRE)

## 📋 OBJETIVO
Tornar as despesas de Marketing e Vendas dinâmicas e calculadas automaticamente com base nas receitas e métricas do BP.

---

## 🔍 ANÁLISE DOS DADOS ATUAIS

### Dados de Referência (despesas mkt e vendas.md):
```
Janeiro: R$ 565.805
- Investimento Marketing: R$ 400.000 (vem do BP)
- Folha Gestão Comercial: R$ 32.500 (fixo)
- Despesa Comercial Activation: R$ 107.845
  - Bônus e Campanhas: R$ 8.000
  - Comissão Vendas: R$ 37.345
  - Estrutura Suporte: R$ 3.500
  - Remuneração Closer: R$ 41.000
  - Remuneração SDR: R$ 13.000
  - Despesas com Visitas: R$ 5.000
- Despesa Comercial Expansion: R$ 25.460
  - Remuneração Farmer: R$ 7.000
  - Comissão Farmer: R$ 6.960
  - Comissão Operação: R$ 8.000
  - Bônus e Campanhas: R$ 1.500
  - Despesas com Visitas: R$ 2.000
```

### Receitas Janeiro (DRE):
```
Activation: R$ 750.000 (Saber + Ter + Executar)
Expansion: R$ 32.000 (base nova)
Expansion Legado: R$ 84.000
Total Expansion: R$ 116.000
```

---

## 📊 RACIONAL PROPOSTO

### 1. **DESPESAS FIXAS** (sem alteração)
| Métrica | Valor | Tipo | Fonte |
|---------|-------|------|-------|
| Folha Gestão Comercial | R$ 32.500/mês | Fixo | Manual |
| Bônus e Campanhas (Activation) | R$ 8.000/mês | Fixo | Manual |
| Estrutura Suporte | Variável por mês | Fixo/Manual | Manual |
| Despesas com Visitas (Activation) | R$ 5.000/mês | Fixo | Manual |
| Bônus e Campanhas (Expansion) | R$ 1.500/mês | Fixo | Manual |
| Comissão Operação | R$ 8.000/mês | Fixo | Manual |
| Despesas com Visitas (Expansion) | R$ 2.000/mês | Fixo | Manual |

---

### 2. **INVESTIMENTO MARKETING** (dinâmico)
✅ **Já está correto** - vem de `topline.investmentMonthly[mês]`

**Fórmula:**
```typescript
investimentoMarketing = inputs.topline.investmentMonthly[monthIndex]
```

---

### 3. **COMISSÃO VENDAS (ACTIVATION)** - Dinâmico

**Análise Reversa (Janeiro):**
```
Comissão Vendas: R$ 37.345
Receita Activation: R$ 750.000
Taxa Comissão: 37.345 / 750.000 = 4,979% (~5%)
```

**Verificação (Fevereiro):**
```
Comissão: R$ 58.025
Receita: R$ 1.267.500
Taxa: 58.025 / 1.267.500 = 4,578% (~4,5-5%)
```

**Verificação (Março):**
```
Comissão: R$ 88.852,50
Receita: R$ 1.851.000
Taxa: 88.852,50 / 1.851.000 = 4,8% (~5%)
```

✅ **Taxa proposta:** 5% sobre Receita de Activation

**Fórmula:**
```typescript
comissaoVendasActivation = receitaActivationMes × inputs.salesConfig.comissaoActivationRate
```

**Fonte Receita Activation:**
```typescript
receitaActivationMes = monthlyData.totalNewRevenue
```

---

### 4. **COMISSÃO FARMER (EXPANSION)** - Dinâmico

**Análise Reversa (Janeiro):**
```
Comissão Farmer: R$ 6.960
Receita Expansion Total: R$ 116.000 (32k nova + 84k legado)
Taxa Comissão: 6.960 / 116.000 = 6% 
```

**Verificação (Fevereiro):**
```
Comissão: R$ 7.260
Receita Expansion: R$ 113.000 (49k + 64k)
Taxa: 7.260 / 113.000 = 6,425% (~6%)
```

**Verificação (Maio - maior expansão):**
```
Comissão: R$ 28.920
Receita Expansion: R$ 459.000 (395k + 64k)
Taxa: 28.920 / 459.000 = 6,3% (~6%)
```

✅ **Taxa proposta:** 6% sobre Receita de Expansion Total

**Fórmula:**
```typescript
comissaoFarmerExpansion = receitaExpansionMes × inputs.salesConfig.comissaoExpansionRate
```

**Fonte Receita Expansion:**
```typescript
receitaExpansionMes = monthlyData.totalExpansionRevenue + monthlyData.totalLegacyExpansionRevenue
```

**⚠️ IMPORTANTE:** Separar no DRE:
- `***Expansion***` (base nova)
- `***Expansion - Legado***` (base legada)
- Para facilitar visibilidade e cálculos

---

### 5. **REMUNERAÇÃO CLOSER** - Dinâmico baseado em quantidade

**Análise Reversa (Janeiro):**
```
Remuneração: R$ 41.000
Qty Closers estimada: ~3-4 closers
Salário unitário: 41.000 / 3 = R$ 13.666 por closer
```

**Verificação (Março - pico):**
```
Remuneração: R$ 54.000
Qty Closers: 54.000 / 13.666 = ~4 closers
```

**Cálculo de Closers Necessários:**
```
Janeiro: 37 WONs / 10 WONs por closer/mês = 3,7 closers ≈ 4 closers
Fevereiro: 51 WONs / 10 = 5,1 ≈ 5 closers
Março: 76 WONs / 10 = 7,6 ≈ 8 closers
```

**🔍 Análise mais precisa (usando dados BP):**
```typescript
// Productivity por closer: 10-12 WONs/mês
const closersRequired = Math.ceil(totalWons / inputs.salesConfig.closerProductivity)
const remuneracaoCloser = closersRequired × inputs.salesConfig.closerSalary
```

✅ **Proposta:**
- `closerProductivity`: 10 WONs/mês/closer (default)
- `closerSalary`: R$ 13.500/mês/closer (default)

---

### 6. **REMUNERAÇÃO SDR** - Dinâmico baseado em quantidade

**Análise Reversa (Janeiro):**
```
Remuneração: R$ 13.000
Qty SDRs: 13.000 / 3.250 = ~4 SDRs
Salário unitário: R$ 3.250 por SDR
```

**Verificação (Junho - mais SDRs):**
```
Remuneração: R$ 22.000
Qty SDRs: 22.000 / 3.250 = ~6-7 SDRs
```

**Cálculo de SDRs Necessários:**
```
Janeiro: 324 SQLs / 80 SQLs por SDR/mês = 4,05 ≈ 4 SDRs
```

**🔍 Análise mais precisa (usando dados BP):**
```typescript
// Productivity por SDR: 80 SQLs/mês
const totalSQLs = TIERS.reduce((sum, tier) => sum + monthData.sqls[tier], 0)
const sdrsRequired = Math.ceil(totalSQLs / inputs.salesConfig.sdrProductivity)
const remuneracaoSDR = sdrsRequired × inputs.salesConfig.sdrSalary
```

✅ **Proposta:**
- `sdrProductivity`: 80 SQLs/mês/SDR (default)
- `sdrSalary`: R$ 3.250/mês/SDR (default)

---

### 7. **REMUNERAÇÃO FARMER** - Dinâmico baseado em quantidade

**Análise Reversa (Janeiro):**
```
Remuneração: R$ 7.000
Qty Farmers: 1 farmer
Salário unitário: R$ 7.000 por farmer
```

**Verificação (Março - aumenta):**
```
Remuneração: R$ 14.000
Qty Farmers: 2 farmers
```

**Cálculo de Farmers Necessários:**
```
Base para cálculo: Total de clientes ativos em expansão
Janeiro: ~50-100 clientes ativos
Productivity: 50-100 clientes por farmer
```

**🔍 Análise mais precisa:**
```typescript
// Usar base de clientes ativos total
const clientesAtivos = capacityPlan.totalClientsSaber + capacityPlan.totalClientsExecutar
const farmersRequired = Math.ceil(clientesAtivos / inputs.salesConfig.farmerProductivity)
const remuneracaoFarmer = farmersRequired × inputs.salesConfig.farmerSalary
```

✅ **Proposta:**
- `farmerProductivity`: 100 clientes ativos/farmer (default)
- `farmerSalary`: R$ 7.000/mês/farmer (default)

---

## 🎯 NOVA ESTRUTURA DE DADOS

### Adicionar em `simulation.ts`:

```typescript
interface SalesConfig {
  // Comissões (%)
  comissaoActivationRate: number;      // Default: 5% (0.05)
  comissaoExpansionRate: number;       // Default: 6% (0.06)
  
  // Remuneração Closers
  closerProductivity: number;          // Default: 10 WONs/mês/closer
  closerSalary: number;                // Default: R$ 13.500/mês
  
  // Remuneração SDRs
  sdrProductivity: number;             // Default: 80 SQLs/mês/SDR
  sdrSalary: number;                   // Default: R$ 3.250/mês
  
  // Remuneração Farmers
  farmerProductivity: number;          // Default: 100 clientes/farmer
  farmerSalary: number;                // Default: R$ 7.000/mês
  
  // Despesas Fixas
  folhaGestaoComercial: number;        // Default: R$ 32.500/mês
  bonusCampanhasActivation: number;    // Default: R$ 8.000/mês
  estruturaSuporte: number[];          // Array de 12 meses
  despesasVisitasActivation: number;   // Default: R$ 5.000/mês
  bonusCampanhasExpansion: number;     // Default: R$ 1.500/mês
  comissaoOperacao: number;            // Default: R$ 8.000/mês
  despesasVisitasExpansion: number;    // Default: R$ 2.000/mês
}

interface SimulationInputs {
  // ... campos existentes
  salesConfig: SalesConfig;
}
```

### Adicionar em `MonthlyData`:

```typescript
interface SalesMetrics {
  // Quantities
  closersRequired: number;
  sdrsRequired: number;
  farmersRequired: number;
  
  // Remuneração
  remuneracaoCloser: number;
  remuneracaoSDR: number;
  remuneracaoFarmer: number;
  
  // Comissões
  comissaoVendasActivation: number;
  comissaoFarmerExpansion: number;
  
  // Despesas Fixas
  folhaGestaoComercial: number;
  bonusCampanhasActivation: number;
  estruturaSuporte: number;
  despesasVisitasActivation: number;
  bonusCampanhasExpansion: number;
  comissaoOperacao: number;
  despesasVisitasExpansion: number;
  
  // Totals
  despesaComercialActivation: number;
  despesaComercialExpansion: number;
  totalDespesasMarketingVendas: number;
}

interface MonthlyData {
  // ... campos existentes
  salesMetrics: SalesMetrics;
}
```

### Separar receitas no DRE:

```typescript
interface MonthlyData {
  // ... campos existentes
  
  // Separar renewal de expansion na base legada
  totalLegacyRenewalRevenue: number;  // Receita de renewal da base legada
  totalLegacyExpansionRevenue: number; // Receita de expansão da base legada (já existe)
  
  // Para facilitar DRE
  totalExpansionRevenue: number;       // Expansão base nova (já existe)
}
```

---

## 📐 FÓRMULAS DE CÁLCULO

### calculations.ts - Seção Sales Metrics:

```typescript
// 1. Calcular quantidades necessárias
const totalWons = TIERS.reduce((sum, tier) => sum + monthData.wons[tier], 0);
const totalSQLs = TIERS.reduce((sum, tier) => sum + monthData.sqls[tier], 0);
const clientesAtivos = monthData.capacityPlan.totalClientsSaber + monthData.capacityPlan.totalClientsExecutar;

monthData.salesMetrics.closersRequired = Math.ceil(totalWons / inputs.salesConfig.closerProductivity);
monthData.salesMetrics.sdrsRequired = Math.ceil(totalSQLs / inputs.salesConfig.sdrProductivity);
monthData.salesMetrics.farmersRequired = Math.ceil(clientesAtivos / inputs.salesConfig.farmerProductivity);

// 2. Calcular remunerações
monthData.salesMetrics.remuneracaoCloser = monthData.salesMetrics.closersRequired * inputs.salesConfig.closerSalary;
monthData.salesMetrics.remuneracaoSDR = monthData.salesMetrics.sdrsRequired * inputs.salesConfig.sdrSalary;
monthData.salesMetrics.remuneracaoFarmer = monthData.salesMetrics.farmersRequired * inputs.salesConfig.farmerSalary;

// 3. Calcular comissões
monthData.salesMetrics.comissaoVendasActivation = monthData.totalNewRevenue * inputs.salesConfig.comissaoActivationRate;
const receitaExpansionTotal = monthData.totalExpansionRevenue + monthData.totalLegacyExpansionRevenue;
monthData.salesMetrics.comissaoFarmerExpansion = receitaExpansionTotal * inputs.salesConfig.comissaoExpansionRate;

// 4. Despesas fixas
monthData.salesMetrics.folhaGestaoComercial = inputs.salesConfig.folhaGestaoComercial;
monthData.salesMetrics.bonusCampanhasActivation = inputs.salesConfig.bonusCampanhasActivation;
monthData.salesMetrics.estruturaSuporte = inputs.salesConfig.estruturaSuporte[idx];
monthData.salesMetrics.despesasVisitasActivation = inputs.salesConfig.despesasVisitasActivation;
monthData.salesMetrics.bonusCampanhasExpansion = inputs.salesConfig.bonusCampanhasExpansion;
monthData.salesMetrics.comissaoOperacao = inputs.salesConfig.comissaoOperacao;
monthData.salesMetrics.despesasVisitasExpansion = inputs.salesConfig.despesasVisitasExpansion;

// 5. Totais
monthData.salesMetrics.despesaComercialActivation = 
  monthData.salesMetrics.bonusCampanhasActivation +
  monthData.salesMetrics.comissaoVendasActivation +
  monthData.salesMetrics.estruturaSuporte +
  monthData.salesMetrics.remuneracaoCloser +
  monthData.salesMetrics.remuneracaoSDR +
  monthData.salesMetrics.despesasVisitasActivation;

monthData.salesMetrics.despesaComercialExpansion = 
  monthData.salesMetrics.remuneracaoFarmer +
  monthData.salesMetrics.comissaoFarmerExpansion +
  monthData.salesMetrics.comissaoOperacao +
  monthData.salesMetrics.bonusCampanhasExpansion +
  monthData.salesMetrics.despesasVisitasExpansion;

monthData.salesMetrics.totalDespesasMarketingVendas = 
  inputs.topline.investmentMonthly[idx] +
  monthData.salesMetrics.folhaGestaoComercial +
  monthData.salesMetrics.despesaComercialActivation +
  monthData.salesMetrics.despesaComercialExpansion;
```

---

## 🎨 UI - SpreadsheetView (Seção DRE)

### Estrutura Visual Proposta:

```
DRE
├── Receita Líquida
├── (-) CSP
├── (=) Margem Operacional
├── (-) DESPESAS MARKETING E VENDAS [EXPANDÍVEL]
│   ├── (-) Investimento Marketing [DINÂMICO - do BP]
│   ├── (-) Folha Gestão Comercial [EDITÁVEL]
│   ├── (-) Despesa Comercial Activation [CALCULADO]
│   │   ├── Bônus e Campanhas [EDITÁVEL]
│   │   ├── Comissão Vendas [DINÂMICO - 5% activation]
│   │   ├── Estrutura Suporte [EDITÁVEL por mês]
│   │   ├── # Closers Required [CALCULADO]
│   │   ├── Remuneração Closer [DINÂMICO]
│   │   ├── $ Salário por Closer [EDITÁVEL]
│   │   ├── # SDRs Required [CALCULADO]
│   │   ├── Remuneração SDR [DINÂMICO]
│   │   ├── $ Salário por SDR [EDITÁVEL]
│   │   └── Despesas com Visitas [EDITÁVEL]
│   └── (-) Despesa Comercial Expansion [CALCULADO]
│       ├── # Farmers Required [CALCULADO]
│       ├── Remuneração Farmer [DINÂMICO]
│       ├── $ Salário por Farmer [EDITÁVEL]
│       ├── Comissão Farmer [DINÂMICO - 6% expansion]
│       ├── Comissão Operação [EDITÁVEL]
│       ├── Bônus e Campanhas [EDITÁVEL]
│       └── Despesas com Visitas [EDITÁVEL]
├── (=) Margem de Contribuição
```

### Linhas de Configuração Editáveis:

```tsx
{/* Taxas de Comissão */}
<div className="flex row-hover">
  <RowHeader label="% Taxa Comissão Activation" className="pl-6" />
  {MONTHS.map((_, i) => (
    <SpreadsheetCell
      key={i}
      value={inputs.salesConfig.comissaoActivationRate}
      onChange={(v) => updateSalesConfig('comissaoActivationRate', v)}
      editable
      format="percentage"
    />
  ))}
</div>

<div className="flex row-hover">
  <RowHeader label="% Taxa Comissão Expansion" className="pl-6" />
  {MONTHS.map((_, i) => (
    <SpreadsheetCell
      key={i}
      value={inputs.salesConfig.comissaoExpansionRate}
      onChange={(v) => updateSalesConfig('comissaoExpansionRate', v)}
      editable
      format="percentage"
    />
  ))}
</div>

{/* Productivity & Salaries */}
<div className="flex row-hover">
  <RowHeader label="# Productivity Closer (WONs/mês)" className="pl-6" />
  {MONTHS.map((_, i) => (
    <SpreadsheetCell
      key={i}
      value={inputs.salesConfig.closerProductivity}
      onChange={(v) => updateSalesConfig('closerProductivity', v)}
      editable
      format="number"
    />
  ))}
</div>

<div className="flex row-hover">
  <RowHeader label="$ Salário Closer" className="pl-6" />
  {MONTHS.map((_, i) => (
    <SpreadsheetCell
      key={i}
      value={inputs.salesConfig.closerSalary}
      onChange={(v) => updateSalesConfig('closerSalary', v)}
      editable
      format="currency"
    />
  ))}
</div>

{/* Repetir para SDR e Farmer */}
```

---

## ✅ VALIDAÇÃO DOS VALORES

### Comparação Janeiro (Dados Referência vs Proposta):

| Métrica | Referência | Proposta | Match? |
|---------|-----------|----------|--------|
| Investimento Marketing | R$ 400.000 | R$ 400.000 | ✅ |
| Folha Gestão Comercial | R$ 32.500 | R$ 32.500 | ✅ |
| Comissão Vendas | R$ 37.345 | R$ 37.500 (5% × 750k) | ✅ ~99% |
| Remuneração Closer | R$ 41.000 | R$ 40.500 (3 × 13.5k) | ✅ ~99% |
| Remuneração SDR | R$ 13.000 | R$ 13.000 (4 × 3.25k) | ✅ |
| Remuneração Farmer | R$ 7.000 | R$ 7.000 | ✅ |
| Comissão Farmer | R$ 6.960 | R$ 6.960 (6% × 116k) | ✅ |

**✅ Match: 99%+**

---

## 🔄 SEPARAÇÃO RECEITA LEGADA (BASE LEGADA)

### 📊 VISÃO GERAL DA BASE LEGADA

A base legada é um componente **separado e independente** das receitas de Activation e Expansion da base nova. Ela possui regras próprias e características distintas:

#### Composição Inicial (Janeiro):
| Tier | Receita Mensal | Qtd Clientes | Ticket Médio |
|------|---------------|--------------|--------------|
| ENTERPRISE | R$ 329.176,85 | 13 | R$ 25.321,30 |
| LARGE | R$ 351.936,00 | 23 | R$ 15.301,57 |
| MEDIUM | R$ 854.159,25 | 98 | R$ 8.715,91 |
| SMALL | R$ 242.719,38 | 40 | R$ 6.067,98 |
| TINY | R$ 211.102,04 | 42 | R$ 5.026,24 |
| (Sem tier) | R$ 86.080,42 | 12 | R$ 7.173,37 |
| **TOTAL** | **R$ 2.075.173,94** | **228** | **R$ 9.101,62** |

#### Comportamentos Específicos:
1. **Churn Mensal:** 7% de regressão mês a mês (perda de receita)
2. **Expansão Mensal:** 5% de crescimento nos clientes que permanecem
3. **Independente:** Não segue as mesmas regras de Saber/Ter/Executar

### Mudança no DRE Visual:

**ANTES:**
```
***Renewall - Legado*** | R$ 2.131.413,78
```

**DEPOIS:**
```
===== BASE LEGADA =====
***Renewal - Legado*** 
  - Qty Clientes: 228 → 212 → 197 → ...
  - Receita Base: R$ 2.075.173,94 → R$ 1.929.911,77 → R$ 1.794.817,95 → ...

***Expansion - Legado***
  - Taxa Expansão: 5%/mês
  - Receita Expansão: R$ 103.758,70 → R$ 96.495,59 → R$ 89.740,90 → ...

***Total Legado*** | R$ 2.178.932,64 → R$ 2.026.407,36 → R$ 1.884.558,85 → ...
```

### 📐 Fórmulas Base Legada:

```typescript
// Mês 1 (Janeiro) - Base Inicial
legacyBaseRevenue[0] = 2_075_173.94;
legacyClients[0] = 228;
legacyExpansionRevenue[0] = legacyBaseRevenue[0] * 0.05; // 5% expansão
legacyTotalRevenue[0] = legacyBaseRevenue[0] + legacyExpansionRevenue[0];

// Meses seguintes
for (let i = 1; i < 12; i++) {
  // Aplicar churn de 7% na base
  legacyBaseRevenue[i] = legacyBaseRevenue[i-1] * 0.93; // (1 - 0.07)
  
  // Clientes também sofrem churn
  legacyClients[i] = Math.round(legacyClients[i-1] * 0.93);
  
  // Expansão de 5% sobre a base atual (após churn)
  legacyExpansionRevenue[i] = legacyBaseRevenue[i] * 0.05;
  
  // Total = Base + Expansão
  legacyTotalRevenue[i] = legacyBaseRevenue[i] + legacyExpansionRevenue[i];
}
```

### 📊 Projeção 12 Meses (Exemplo):

| Mês | Qty Clientes | Receita Base | Expansão 5% | Total Legado | % vs Mês Anterior |
|-----|-------------|--------------|-------------|--------------|-------------------|
| Jan | 228 | R$ 2.075.173,94 | R$ 103.758,70 | R$ 2.178.932,64 | - |
| Fev | 212 | R$ 1.929.911,77 | R$ 96.495,59 | R$ 2.026.407,36 | -7% |
| Mar | 197 | R$ 1.794.817,95 | R$ 89.740,90 | R$ 1.884.558,85 | -7% |
| Abr | 183 | R$ 1.669.180,69 | R$ 83.459,03 | R$ 1.752.639,72 | -7% |
| Mai | 170 | R$ 1.552.338,04 | R$ 77.616,90 | R$ 1.629.954,94 | -7% |
| Jun | 158 | R$ 1.443.674,38 | R$ 72.183,72 | R$ 1.515.858,10 | -7% |
| Jul | 147 | R$ 1.342.617,17 | R$ 67.130,86 | R$ 1.409.748,03 | -7% |
| Ago | 137 | R$ 1.248.633,97 | R$ 62.431,70 | R$ 1.311.065,67 | -7% |
| Set | 127 | R$ 1.161.229,59 | R$ 58.061,48 | R$ 1.219.291,07 | -7% |
| Out | 118 | R$ 1.079.943,52 | R$ 53.997,18 | R$ 1.133.940,70 | -7% |
| Nov | 110 | R$ 1.004.347,47 | R$ 50.217,37 | R$ 1.054.564,84 | -7% |
| Dez | 102 | R$ 934.043,15 | R$ 46.702,16 | R$ 980.745,31 | -7% |

### Cálculo no calculations.ts:

```typescript
// 1. Separar receita legada em renewal vs expansion
monthData.totalLegacyExpansionRevenue = TIERS.reduce((sum, tier) => 
  sum + monthData.legacyExpansionRevenue[tier], 0);

monthData.totalLegacyRenewalRevenue = TIERS.reduce((sum, tier) => 
  sum + monthData.legacyRevenue[tier], 0) - monthData.totalLegacyExpansionRevenue;

// 2. Calcular quantidade de clientes legados
monthData.legacyClientsCount = monthData.legacyClients;

// 3. Total legado
monthData.totalLegacyRevenue = monthData.totalLegacyRenewalRevenue + monthData.totalLegacyExpansionRevenue;
```

### UI - Seção BASE LEGADA no DRE:

```tsx
{/* BASE LEGADA - Seção separada e destacada */}
<div className="border-t-2 border-red-600 mt-4 pt-4">
  <div className="flex row-header bg-red-900/20">
    <RowHeader label="===== BASE LEGADA =====" className="font-bold text-red-500" />
  </div>
  
  {/* Quantidade de Clientes */}
  <div className="flex row-hover">
    <RowHeader label="# Clientes Legados" className="pl-4 text-red-400" />
    {MONTHS.map((_, i) => (
      <SpreadsheetCell
        key={i}
        value={data[i].legacyClientsCount}
        format="number"
        className="bg-red-950/10"
      />
    ))}
  </div>
  
  {/* Receita Base (Renewal) */}
  <div className="flex row-hover">
    <RowHeader 
      label="***Renewal - Legado***" 
      className="pl-4 font-semibold"
      tooltip="Receita recorrente da base legada após churn de 7%/mês"
    />
    {MONTHS.map((_, i) => (
      <SpreadsheetCell
        key={i}
        value={data[i].totalLegacyRenewalRevenue}
        format="currency"
        className="bg-red-950/10"
      />
    ))}
  </div>
  
  {/* Expansão */}
  <div className="flex row-hover">
    <RowHeader 
      label="***Expansion - Legado***" 
      className="pl-4 font-semibold"
      tooltip="Expansão de 5%/mês sobre a base legada atual"
    />
    {MONTHS.map((_, i) => (
      <SpreadsheetCell
        key={i}
        value={data[i].totalLegacyExpansionRevenue}
        format="currency"
        className="bg-green-950/20"
      />
    ))}
  </div>
  
  {/* Total Legado */}
  <div className="flex row-hover">
    <RowHeader 
      label="***Total Legado***" 
      className="pl-4 font-bold text-red-400"
      tooltip="Receita total da base legada (Renewal + Expansion)"
    />
    {MONTHS.map((_, i) => (
      <SpreadsheetCell
        key={i}
        value={data[i].totalLegacyRevenue}
        format="currency"
        className="bg-red-900/30 font-bold"
      />
    ))}
  </div>
  
  {/* Variação % mês a mês */}
  <div className="flex row-hover">
    <RowHeader label="% Var. vs Mês Anterior" className="pl-6 text-sm italic" />
    {MONTHS.map((_, i) => (
      <SpreadsheetCell
        key={i}
        value={i === 0 ? 0 : ((data[i].totalLegacyRevenue / data[i-1].totalLegacyRevenue) - 1)}
        format="percentage"
        className="text-sm"
      />
    ))}
  </div>
</div>
```

---

## 📝 RESUMO ACTIONS

### 1️⃣ **Types** (`simulation.ts`):
- [ ] Criar interface `SalesConfig`
- [ ] Adicionar `salesConfig: SalesConfig` em `SimulationInputs`
- [ ] Criar interface `SalesMetrics`
- [ ] Adicionar `salesMetrics: SalesMetrics` em `MonthlyData`
- [ ] Adicionar `totalLegacyRenewalRevenue: number` em `MonthlyData`

### 2️⃣ **Defaults** (`defaultInputs.ts`):
- [ ] Adicionar defaults para `salesConfig`:
  - comissaoActivationRate: 0.05 (5%)
  - comissaoExpansionRate: 0.06 (6%)
  - closerProductivity: 10
  - closerSalary: 13500
  - sdrProductivity: 80
  - sdrSalary: 3250
  - farmerProductivity: 100
  - farmerSalary: 7000
  - Despesas fixas

### 3️⃣ **Calculations** (`calculations.ts`):
- [ ] Calcular `salesMetrics` após capacity plan
- [ ] Separar `totalLegacyRenewalRevenue` de `totalLegacyExpansionRevenue`
- [ ] Implementar fórmulas de closers/SDRs/farmers required
- [ ] Calcular comissões dinâmicas

### 4️⃣ **UI** (`SpreadsheetView.tsx`):
- [ ] Adicionar seção "DESPESAS MARKETING E VENDAS" no DRE
- [ ] Criar linhas editáveis para config (taxas, salários, productivity)
- [ ] Exibir quantidades calculadas (# closers, # SDRs, # farmers)
- [ ] Exibir valores dinâmicos (remunerações, comissões)
- [ ] Separar visualmente Renewal Legado de Expansion Legado

### 5️⃣ **Export Excel**:
- [ ] Adicionar linhas de Sales Metrics no export

---

## ❓ PERGUNTAS PARA APROVAÇÃO

1. ✅ **Taxa Comissão Activation:** 5% está ok?
2. ✅ **Taxa Comissão Expansion:** 6% está ok?
3. ✅ **Productivity Closer:** 10 WONs/mês razoável?
4. ✅ **Productivity SDR:** 80 SQLs/mês razoável?
5. ✅ **Productivity Farmer:** 100 clientes ativos razoável?
6. ✅ **Salários:**
   - Closer: R$ 13.500/mês ok?
   - SDR: R$ 3.250/mês ok?
   - Farmer: R$ 7.000/mês ok?
7. ✅ **Estrutura Suporte:** Varia por mês - deixar array editável?
8. ✅ **UI:** Expandir seção de Despesas Mkt/Vendas com breakdown completo?

---

## 🎯 RESULTADO ESPERADO

Após implementação:
- ✅ Comissões calculadas automaticamente baseadas em receita
- ✅ Headcount de vendas calculado baseado em productivity
- ✅ Remunerações dinâmicas baseadas em headcount necessário
- ✅ Todas as taxas e parâmetros editáveis no UI
- ✅ Visibilidade completa no DRE de onde vêm os valores
- ✅ Separação clara entre Activation e Expansion
- ✅ Separação entre Renewal Legado e Expansion Legado
