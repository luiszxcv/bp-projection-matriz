# Plano de Alteração: Visão DFC (Demonstrativo de Fluxo de Caixa)

## 📋 Objetivo

Implementar uma visão de **DFC (recebimento por competência mensal)** no DRE que, quando o checkbox **"Usar Linhas Gerenciais"** estiver marcado, distribui a receita de ativação dos produtos **Executar Loyalty** e **Executar No-Loyalty** (tanto aquisição direta quanto conversão Saber→Executar) ao longo dos meses de acordo com o período de contrato.

---

## 🎯 Conceito

### Visão Atual (Competência - checkbox desmarcado)
- **Executar Loyalty**: Receita total registrada no mês de venda (7 meses × ticket)
- **Executar No-Loyalty**: Receita total registrada no mês de venda (2 meses × ticket)
- **Conversão Saber→Executar**: Receita total registrada no mês de conversão

### Nova Visão (DFC - checkbox marcado)
- **Executar Loyalty**: Receita distribuída ao longo de **7 meses** (ticket mensal)
- **Executar No-Loyalty**: Receita distribuída ao longo de **2 meses** (ticket mensal / 2 por mês)
- **Conversão Saber→Executar**: Mesma lógica aplicada (7 ou 2 meses dependendo do tipo)

### Exemplo Prático (Janeiro):
**Competência:**
- Executar Loyalty: R$ 59.520 (cliente × ticket × 7 meses) - tudo em Janeiro

**DFC:**
- Janeiro: R$ 8.503 (59.520 / 7)
- Fevereiro: R$ 8.503
- Março: R$ 8.503
- ... até Julho: R$ 8.503
- **Total**: R$ 59.520 distribuído ao longo de 7 meses

---

## 📦 Alterações Necessárias

### 1. **Types (`src/types/simulation.ts`)**

#### 1.1 Adicionar campos no `DREData`:
```typescript
export interface DREData {
  // ... campos existentes ...
  
  // ACTIVATION (existente)
  activationRevenue: number;
  
  // NOVOS CAMPOS - Detalhamento DFC
  activationRevenueDFC: number;                    // Receita DFC total do mês
  activationExecutarLoyaltyDFC: number;            // Executar Loyalty DFC
  activationExecutarNoLoyaltyDFC: number;          // Executar No-Loyalty DFC
  activationSaberConvLoyaltyDFC: number;           // Conversão Saber→Executar Loyalty DFC
  activationSaberConvNoLoyaltyDFC: number;         // Conversão Saber→Executar No-Loyalty DFC
  activationOutrosProdutos: number;                // Saber, Ter, Potencializar (sem mudança)
}
```

#### 1.2 Adicionar tracking de receita futura:
```typescript
export interface PendingRevenueTracking {
  tier: Tier;
  product: 'executarLoyalty' | 'executarNoLoyalty';
  source: 'acquisition' | 'conversion';           // Aquisição direta ou conversão Saber
  monthlyAmount: number;                          // Valor mensal a receber
  startMonth: number;                             // Mês inicial
  remainingMonths: number;                        // Meses restantes
  totalAmount: number;                            // Valor total
}
```

---

### 2. **Calculations (`src/lib/calculations.ts`)**

#### 2.1 Adicionar tracking global de receitas futuras
**Localização**: Início da função `calculateMonthlyData` (após linha 175)

```typescript
// Track pending revenue for DFC view
let pendingDFCRevenue: PendingRevenueTracking[] = [];
```

#### 2.2 Modificar registro de receita de Executar (Aquisição Direta)
**Localização**: Linhas 320-340 (loop de ativações)

**ONDE**: Após calcular `revenue` para `executarLoyalty` e `executarNoLoyalty`

**ADICIONAR**:
```typescript
// Se produto for Executar Loyalty ou No-Loyalty, registrar para DFC
if (product === 'executarLoyalty' && activatedClients > 0) {
  const monthlyTicket = metrics.productTickets.executarLoyalty[idx];
  const duration = inputs.conversionRates.loyaltyDuration; // 7 meses
  
  pendingDFCRevenue.push({
    tier,
    product: 'executarLoyalty',
    source: 'acquisition',
    monthlyAmount: activatedClients * monthlyTicket,
    startMonth: month,
    remainingMonths: duration,
    totalAmount: revenue
  });
  
  activeExecutarLoyalty[tier].push({ clients: activatedClients, month, renewals: 0 });
}

if (product === 'executarNoLoyalty' && activatedClients > 0) {
  const monthlyTicket = metrics.productTickets.executarNoLoyalty[idx];
  const duration = inputs.conversionRates.noLoyaltyDuration; // 2 meses
  
  pendingDFCRevenue.push({
    tier,
    product: 'executarNoLoyalty',
    source: 'acquisition',
    monthlyAmount: activatedClients * monthlyTicket,
    startMonth: month,
    remainingMonths: duration,
    totalAmount: revenue
  });
  
  activeExecutarNoLoyalty[tier].push({ clients: activatedClients, month, renewals: 0 });
}
```

#### 2.3 Modificar registro de receita de Conversão Saber→Executar
**Localização**: Linhas 345-375 (conversões Saber)

**ONDE**: Após calcular `loyaltyRevenue` e `noLoyaltyRevenue`

**ADICIONAR**:
```typescript
// Registrar conversão Loyalty para DFC
if (loyaltyClients > 0) {
  const monthlyTicket = metrics.productTickets.executarLoyalty[idx];
  const duration = inputs.conversionRates.loyaltyDuration;
  
  pendingDFCRevenue.push({
    tier,
    product: 'executarLoyalty',
    source: 'conversion',
    monthlyAmount: loyaltyClients * monthlyTicket,
    startMonth: month,
    remainingMonths: duration,
    totalAmount: loyaltyRevenue
  });
  
  activeExecutarLoyalty[tier].push({ clients: loyaltyClients, month, renewals: 0 });
}

// Registrar conversão No-Loyalty para DFC
if (noLoyaltyClients > 0) {
  const monthlyTicket = metrics.productTickets.executarNoLoyalty[idx];
  const duration = inputs.conversionRates.noLoyaltyDuration;
  
  pendingDFCRevenue.push({
    tier,
    product: 'executarNoLoyalty',
    source: 'conversion',
    monthlyAmount: noLoyaltyClients * monthlyTicket,
    startMonth: month,
    remainingMonths: duration,
    totalAmount: noLoyaltyRevenue
  });
  
  activeExecutarNoLoyalty[tier].push({ clients: noLoyaltyClients, month, renewals: 0 });
}
```

#### 2.4 Função auxiliar para calcular receita DFC do mês
**Localização**: Antes da função `calculateDRE` (linha ~745)

```typescript
/**
 * Calcula a receita DFC (recebimento mensal) para um mês específico
 * baseado no tracking de receitas futuras
 */
function calculateDFCRevenueForMonth(
  month: number,
  pendingRevenues: PendingRevenueTracking[],
  monthData: MonthlyData
): {
  dfcTotal: number;
  executarLoyaltyAcq: number;
  executarNoLoyaltyAcq: number;
  executarLoyaltyConv: number;
  executarNoLoyaltyConv: number;
} {
  let executarLoyaltyAcq = 0;
  let executarNoLoyaltyAcq = 0;
  let executarLoyaltyConv = 0;
  let executarNoLoyaltyConv = 0;
  
  // Percorrer todas as receitas pendentes
  for (const pending of pendingRevenues) {
    const monthsElapsed = month - pending.startMonth;
    
    // Se este mês está dentro do período de recebimento
    if (monthsElapsed >= 0 && monthsElapsed < pending.remainingMonths) {
      if (pending.product === 'executarLoyalty' && pending.source === 'acquisition') {
        executarLoyaltyAcq += pending.monthlyAmount;
      } else if (pending.product === 'executarNoLoyalty' && pending.source === 'acquisition') {
        executarNoLoyaltyAcq += pending.monthlyAmount;
      } else if (pending.product === 'executarLoyalty' && pending.source === 'conversion') {
        executarLoyaltyConv += pending.monthlyAmount;
      } else if (pending.product === 'executarNoLoyalty' && pending.source === 'conversion') {
        executarNoLoyaltyConv += pending.monthlyAmount;
      }
    }
  }
  
  const dfcTotal = executarLoyaltyAcq + executarNoLoyaltyAcq + 
                   executarLoyaltyConv + executarNoLoyaltyConv;
  
  return {
    dfcTotal,
    executarLoyaltyAcq,
    executarNoLoyaltyAcq,
    executarLoyaltyConv,
    executarNoLoyaltyConv
  };
}
```

#### 2.5 Modificar função `calculateDRE`
**Localização**: Linhas 760-770 (cálculo de receita)

**SUBSTITUIR**:
```typescript
// ========== RECEITA ==========
dre.revenue = monthData.totalRevenue;
dre.activationRevenue = monthData.totalNewRevenue;
```

**POR**:
```typescript
// ========== RECEITA ==========
// Se usarLinhasGerenciais = true, usar DFC para Executar
// Se false, usar competência total
if (config.usarLinhasGerenciais) {
  // Calcular DFC para este mês
  const dfcData = calculateDFCRevenueForMonth(monthData.month, pendingDFCRevenue, monthData);
  
  // Receita de outros produtos (Saber, Ter, Potencializar) - sem mudança
  dre.activationOutrosProdutos = 
    TIERS.reduce((sum, tier) => {
      return sum + 
        monthData.revenueByTierProduct[tier].saber +
        monthData.revenueByTierProduct[tier].ter +
        monthData.revenueByTierProduct[tier].potencializar;
    }, 0);
  
  // Receita DFC detalhada
  dre.activationExecutarLoyaltyDFC = dfcData.executarLoyaltyAcq;
  dre.activationExecutarNoLoyaltyDFC = dfcData.executarNoLoyaltyAcq;
  dre.activationSaberConvLoyaltyDFC = dfcData.executarLoyaltyConv;
  dre.activationSaberConvNoLoyaltyDFC = dfcData.executarNoLoyaltyConv;
  dre.activationRevenueDFC = dfcData.dfcTotal;
  
  // Activation total = DFC + outros produtos
  dre.activationRevenue = dre.activationRevenueDFC + dre.activationOutrosProdutos;
  
  // Revenue total = Activation DFC + Renewals + Expansions + Legacy
  dre.revenue = dre.activationRevenue + dre.renewalRevenue + dre.expansionRevenue + dre.legacyRevenue;
  
} else {
  // Visão de competência (atual)
  dre.activationRevenue = monthData.totalNewRevenue;
  dre.revenue = monthData.totalRevenue;
  
  // Zerar campos DFC
  dre.activationRevenueDFC = 0;
  dre.activationExecutarLoyaltyDFC = 0;
  dre.activationExecutarNoLoyaltyDFC = 0;
  dre.activationSaberConvLoyaltyDFC = 0;
  dre.activationSaberConvNoLoyaltyDFC = 0;
  dre.activationOutrosProdutos = 0;
}
```

#### 2.6 Atualizar `createEmptyDREData`
**Localização**: Linha ~63

**ADICIONAR**:
```typescript
activationRevenueDFC: 0,
activationExecutarLoyaltyDFC: 0,
activationExecutarNoLoyaltyDFC: 0,
activationSaberConvLoyaltyDFC: 0,
activationSaberConvNoLoyaltyDFC: 0,
activationOutrosProdutos: 0,
```

---

### 3. **SpreadsheetView (`src/components/SpreadsheetView.tsx`)**

#### 3.1 Modificar seção de Activation no DRE
**Localização**: Linhas 4130-4170

**SUBSTITUIR** a seção atual de Activation por:

```tsx
<div className="flex row-hover">
  <RowHeader label="Activation" className="pl-6" tooltip="Receita de novos clientes ativados" />
  {monthlyData.map((m, i) => (
    <SpreadsheetCell key={i} value={m.dre.activationRevenue} format="currency" />
  ))}
  <SpreadsheetCell
    value={monthlyData.reduce((sum, m) => sum + m.dre.activationRevenue, 0)}
    format="currency"
    className="bg-primary/10"
  />
</div>

{/* Detalhamento Activation - Condicional baseado em usarLinhasGerenciais */}
{inputs.dreConfig.usarLinhasGerenciais ? (
  <>
    {/* Visão DFC */}
    <div className="flex row-hover bg-blue-50">
      <RowHeader label="📊 Visão DFC (Recebimento Mensal)" className="pl-8 text-xs italic text-blue-600" tooltip="Receita distribuída por competência de recebimento mensal" />
      {[...Array(12)].map((_, i) => (
        <div key={i} className="spreadsheet-cell bg-blue-50" />
      ))}
      <div className="spreadsheet-cell bg-blue-100" />
    </div>
    
    <div className="flex row-hover">
      <RowHeader label="Executar Loyalty (Aquisição)" className="pl-12" tooltip="DFC: Receita mensal de Executar Loyalty - aquisição direta" />
      {monthlyData.map((m, i) => (
        <SpreadsheetCell key={i} value={m.dre.activationExecutarLoyaltyDFC} format="currency" />
      ))}
      <SpreadsheetCell
        value={monthlyData.reduce((sum, m) => sum + m.dre.activationExecutarLoyaltyDFC, 0)}
        format="currency"
        className="bg-primary/10"
      />
    </div>
    
    <div className="flex row-hover">
      <RowHeader label="Executar No-Loyalty (Aquisição)" className="pl-12" tooltip="DFC: Receita mensal de Executar No-Loyalty - aquisição direta" />
      {monthlyData.map((m, i) => (
        <SpreadsheetCell key={i} value={m.dre.activationExecutarNoLoyaltyDFC} format="currency" />
      ))}
      <SpreadsheetCell
        value={monthlyData.reduce((sum, m) => sum + m.dre.activationExecutarNoLoyaltyDFC, 0)}
        format="currency"
        className="bg-primary/10"
      />
    </div>
    
    <div className="flex row-hover">
      <RowHeader label="Saber→Executar Loyalty (Conversão)" className="pl-12" tooltip="DFC: Receita mensal de conversão Saber para Executar Loyalty" />
      {monthlyData.map((m, i) => (
        <SpreadsheetCell key={i} value={m.dre.activationSaberConvLoyaltyDFC} format="currency" />
      ))}
      <SpreadsheetCell
        value={monthlyData.reduce((sum, m) => sum + m.dre.activationSaberConvLoyaltyDFC, 0)}
        format="currency"
        className="bg-primary/10"
      />
    </div>
    
    <div className="flex row-hover">
      <RowHeader label="Saber→Executar No-Loyalty (Conversão)" className="pl-12" tooltip="DFC: Receita mensal de conversão Saber para Executar No-Loyalty" />
      {monthlyData.map((m, i) => (
        <SpreadsheetCell key={i} value={m.dre.activationSaberConvNoLoyaltyDFC} format="currency" />
      ))}
      <SpreadsheetCell
        value={monthlyData.reduce((sum, m) => sum + m.dre.activationSaberConvNoLoyaltyDFC, 0)}
        format="currency"
        className="bg-primary/10"
      />
    </div>
    
    <div className="flex row-hover">
      <RowHeader label="Outros Produtos (Saber, Ter, Potenc.)" className="pl-12" tooltip="Receita de Saber, Ter e Potencializar (sem mudança)" />
      {monthlyData.map((m, i) => (
        <SpreadsheetCell key={i} value={m.dre.activationOutrosProdutos} format="currency" />
      ))}
      <SpreadsheetCell
        value={monthlyData.reduce((sum, m) => sum + m.dre.activationOutrosProdutos, 0)}
        format="currency"
        className="bg-primary/10"
      />
    </div>
  </>
) : (
  <>
    {/* Visão de Competência (original) */}
    <div className="flex row-hover bg-green-50">
      <RowHeader label="📈 Visão Competência (Total no Mês)" className="pl-8 text-xs italic text-green-600" tooltip="Receita total bookada no mês de venda" />
      {[...Array(12)].map((_, i) => (
        <div key={i} className="spreadsheet-cell bg-green-50" />
      ))}
      <div className="spreadsheet-cell bg-green-100" />
    </div>
    
    <div className="flex row-hover">
      <RowHeader label="Executar Loyalty" className="pl-12" tooltip="Receita total Executar Loyalty (7 meses) no mês de venda" />
      {monthlyData.map((m, i) => {
        const revenue = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].executarLoyalty, 0);
        return <SpreadsheetCell key={i} value={revenue} format="currency" />;
      })}
      <SpreadsheetCell
        value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].executarLoyalty, 0), 0)}
        format="currency"
        className="bg-primary/10"
      />
    </div>
    
    <div className="flex row-hover">
      <RowHeader label="Executar No-Loyalty" className="pl-12" tooltip="Receita total Executar No-Loyalty (2 meses) no mês de venda" />
      {monthlyData.map((m, i) => {
        const revenue = TIERS.reduce((sum, tier) => sum + m.revenueByTierProduct[tier].executarNoLoyalty, 0);
        return <SpreadsheetCell key={i} value={revenue} format="currency" />;
      })}
      <SpreadsheetCell
        value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + m.revenueByTierProduct[tier].executarNoLoyalty, 0), 0)}
        format="currency"
        className="bg-primary/10"
      />
    </div>
  </>
)}
```

---

## 🔄 Fluxo de Dados

### 1. **Registro de Venda (Mês 1)**
```
Cliente compra Executar Loyalty (7 meses × R$ 8.503 = R$ 59.521)

Competência: R$ 59.521 em Janeiro
DFC: R$ 8.503 em cada mês (Jan, Fev, Mar, Abr, Mai, Jun, Jul)
```

### 2. **Tracking no Array**
```typescript
pendingDFCRevenue.push({
  tier: 'large',
  product: 'executarLoyalty',
  source: 'acquisition',
  monthlyAmount: 8503,
  startMonth: 1,
  remainingMonths: 7,
  totalAmount: 59521
});
```

### 3. **Cálculo Mensal**
```
Para cada mês (1 a 12):
  - Percorrer pendingDFCRevenue[]
  - Se mês atual está no range [startMonth, startMonth + remainingMonths)
  - Somar monthlyAmount ao DFC do mês
```

### 4. **Impacto no DRE**
```
Revenue → afeta Receita Bruta Recebida → afeta todos os cálculos downstream:
  - Tributos
  - Receita Líquida
  - Margens
  - EBITDA
  - Lucro Líquido
  - Caixa
```

---

## ✅ Checklist de Implementação

### Fase 1: Types
- [ ] Adicionar campos DFC em `DREData`
- [ ] Criar interface `PendingRevenueTracking`

### Fase 2: Calculations
- [ ] Adicionar `pendingDFCRevenue` array
- [ ] Modificar registro de Executar Loyalty (aquisição)
- [ ] Modificar registro de Executar No-Loyalty (aquisição)
- [ ] Modificar conversão Saber→Executar Loyalty
- [ ] Modificar conversão Saber→Executar No-Loyalty
- [ ] Criar função `calculateDFCRevenueForMonth`
- [ ] Atualizar lógica em `calculateDRE`
- [ ] Atualizar `createEmptyDREData`

### Fase 3: UI
- [ ] Modificar seção Activation no DRE
- [ ] Adicionar indicador visual (DFC vs Competência)
- [ ] Adicionar linhas de detalhamento DFC
- [ ] Adicionar tooltips explicativos
- [ ] Testar toggle do checkbox

### Fase 4: Validação
- [ ] Verificar que soma DFC ao longo dos meses = valor competência
- [ ] Verificar impacto em cálculos downstream
- [ ] Validar com exemplo real (Jan: R$ 486.390 → breakdown correto)
- [ ] Testar conversões Saber→Executar

---

## 🧪 Exemplo de Teste

### Cenário: Janeiro - R$ 486.390 total, sendo R$ 59.520 Loyalty

**Input:**
- 7 clientes Executar Loyalty
- Ticket: R$ 8.503/mês
- Duração: 7 meses

**Competência (checkbox OFF):**
```
Jan: R$ 59.521 (7 × 8.503 × 7)
Fev: R$ 0
Mar: R$ 0
...
```

**DFC (checkbox ON):**
```
Jan: R$ 8.503 × 7 = R$ 59.521
Fev: R$ 8.503 × 7 = R$ 59.521
Mar: R$ 8.503 × 7 = R$ 59.521
...
Jul: R$ 8.503 × 7 = R$ 59.521

TOTAL 7 meses: R$ 416.647
```

---

## ⚠️ Considerações Importantes

1. **Não afeta seção de Totals**: Os totais continuam mostrando competência completa
2. **Apenas DRE é impactado**: A visão DFC só muda o DRE, não os dados de funil
3. **Renewals não mudam**: Renewals continuam sendo competência pura (1 renovação = valor total)
4. **Legacy não muda**: Base legada continua igual
5. **Expansions não mudam**: Expansões continuam iguais
6. **Receita Saber/Ter/Potencializar**: Não são afetados (sempre competência)

---

## 📊 Resultado Visual Esperado

```
DRE - REVENUE
├─ REVENUE (total ajustado com DFC)
├─ Activation (total ajustado)
│  ├─ 📊 Visão DFC (Recebimento Mensal)
│  │   ├─ Executar Loyalty (Aquisição): R$ X
│  │   ├─ Executar No-Loyalty (Aquisição): R$ Y
│  │   ├─ Saber→Executar Loyalty (Conversão): R$ Z
│  │   ├─ Saber→Executar No-Loyalty (Conversão): R$ W
│  │   └─ Outros Produtos: R$ K
├─ Renewal (sem mudança)
├─ Expansion (sem mudança)
└─ Legacy Revenue (sem mudança)
```

---

## 🚀 Próximos Passos

1. Revisar e aprovar este plano
2. Implementar Fase 1 (Types)
3. Implementar Fase 2 (Calculations)
4. Implementar Fase 3 (UI)
5. Testar extensivamente
6. Documentar comportamento para usuário final
