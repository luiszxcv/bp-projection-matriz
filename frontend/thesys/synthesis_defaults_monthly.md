# Síntese dos Novos Defaults Mensais

Extraído de `moredefaults.md` para atualização de `defaultInputs.ts`.

## Novo Funnel: Leads → MQL

O novo modelo adiciona um estágio **Leads** antes de MQL.

- **Taxa de Conversão Lead → MQL**: 80% (constante em todos os meses)
- Leads é calculado a partir de: `Budget Mensal / CPL`
- MQL = Leads × 80%

---

## 1. Topline Mensal

| Mês | Budget (R$) | CPL (R$) | # Leads | % Lead→MQL | # MQLs |
|-----|-------------|----------|---------|------------|--------|
| Jan | 4.838.976 | 350 | 13.826 | 80% | 11.058 |
| Fev | 4.838.976 | 359 | 13.488 | 80% | 10.788 |
| Mar | 5.080.925 | 368 | 13.817 | 80% | 11.051 |
| Abr | 5.589.017 | 386 | 14.475 | 80% | 11.577 |
| Mai | 6.147.919 | 405 | 15.165 | 80% | 12.129 |
| Jun | 6.455.315 | 426 | 15.165 | 80% | 12.129 |
| Jul | 6.778.081 | 436 | 15.535 | 80% | 12.426 |
| Ago | 6.778.081 | 436 | 15.535 | 80% | 12.426 |
| Set | 6.778.081 | 436 | 15.535 | 80% | 12.426 |
| Out | 6.100.273 | 445 | 13.708 | 80% | 10.965 |
| Nov | 5.422.464 | 454 | 11.945 | 80% | 9.555 |
| Dez | 4.744.656 | 463 | 10.247 | 80% | 8.196 |

### Arrays para o TypeScript

```typescript
// Budget mensal (investmentMonthly)
investmentMonthly: [
  4838976,   // Jan
  4838976,   // Fev
  5080925,   // Mar
  5589017,   // Abr
  6147919,   // Mai
  6455315,   // Jun
  6778081,   // Jul
  6778081,   // Ago
  6778081,   // Set
  6100273,   // Out
  5422464,   // Nov
  4744656,   // Dez
]

// CPL mensal
cplMonthly: [350, 359, 368, 386, 405, 426, 436, 436, 436, 445, 454, 463]

// Taxa Lead → MQL (NOVO - constante 80%)
leadToMqlRate: fill12(0.80)
```

---

## 2. Tickets por Produto por Tier

Os tickets variam por semestre/trimestre. Valores em REAIS.

### Enterprise

| Produto | Jan-Mar | Abr-Jun | Jul-Set | Out-Dez |
|---------|---------|---------|---------|---------|
| Saber | 30.000 | 50.000 | 100.000 | 150.000 |
| Ter | 31.600 | 31.600 | 31.600 | 31.600 |
| Executar Loyalty | 145.000 | 145.000 | 145.000 | 145.000 |
| Executar No Loyalty | 0 | 0 | 0 | 0 |
| Potencializar | 0 | 0 | 0 | 0 |

### Large

| Produto | Jan-Mar | Abr-Jun | Jul-Set | Out-Dez |
|---------|---------|---------|---------|---------|
| Saber | 25.000 | 40.000 | 80.000 | 120.000 |
| Ter | 18.000 | 18.000 | 18.000 | 18.000 |
| Executar Loyalty | 99.000 | 99.000 | 99.000 | 99.000 |
| Executar No Loyalty | 0 | 0 | 0 | 0 |
| Potencializar | 0 | 0 | 0 | 0 |

### Medium

| Produto | Jan-Mar | Abr-Jun | Jul-Set | Out-Dez |
|---------|---------|---------|---------|---------|
| Saber | 20.000 | 40.000 | 80.000 | 100.000 |
| Ter | 15.000 | 15.000 | 15.000 | 15.000 |
| Executar Loyalty | 49.000 | 49.000 | 49.000 | 49.000 |
| Executar No Loyalty | 0 | 0 | 0 | 0 |
| Potencializar | 0 | 0 | 0 | 0 |

### Small

| Produto | Jan-Mar | Abr-Jun | Jul-Set | Out-Dez |
|---------|---------|---------|---------|---------|
| Saber | 20.000 | 30.000 | 40.000 | 50.000 |
| Ter | 11.500 | 11.500 | 11.500 | 11.500 |
| Executar Loyalty | 0 | 0 | 0 | 0 |
| Executar No Loyalty | 0 | 0 | 0 | 0 |
| Potencializar | 0 | 0 | 0 | 0 |

### Tiny

| Produto | Jan-Mar | Abr-Jun | Jul-Set | Out-Dez |
|---------|---------|---------|---------|---------|
| Saber | 15.000 | 20.000 | 30.000 | 40.000 |
| Ter | 7.500 | 7.500 | 7.500 | 7.500 |
| Executar Loyalty | 0 | 0 | 0 | 0 |
| Executar No Loyalty | 0 | 0 | 0 | 0 |
| Potencializar | 0 | 0 | 0 | 0 |

---

## 3. Distribuição de Produtos (% WON por produto)

### Por Tier (constante o ano todo)

| Tier | Saber | Ter | Executar Loyalty | Executar No Loyalty | Potencializar |
|------|-------|-----|------------------|---------------------|---------------|
| Enterprise | 60% | 10% | 20% | 0% | 10% |
| Large | 60% | 10% | 20% | 0% | 10% |
| Medium | 60% | 10% | 30% | 0% | 0% |
| Small | 80% | 20% | 0% | 0% | 0% |
| Tiny | 80% | 20% | 0% | 0% | 0% |

---

## 4. Taxas de Conversão

| Taxa | Enterprise | Large | Medium | Small | Tiny |
|------|------------|-------|--------|-------|------|
| MQL → SQL | 20% | 25% | 30% | 30% | 30% |
| SQL → SAL | 86% | 86% | 86% | 86% | 86% |
| SAL → WON | 30% | 30% | 30% | 30% | 30% |
| WON → Activation | 88% | 84% | 93% | 93% | 93% |

---

## 5. Ações Pendentes

1. ✅ Atualizar `cplMonthly` com array mensal
2. ✅ Atualizar `investmentMonthly` com novo array
3. ⏳ **NOVO**: Adicionar `leadToMqlRate` ao modelo
4. ⏳ **NOVO**: Adicionar `leads` ao cálculo/display
5. ⏳ Atualizar `productTickets` com valores trimestrais corretos
6. ⏳ Verificar/ajustar taxas de conversão conforme tabela
