# Capacity Plan - Lógica de Cálculo

## Resumo

O Capacity Plan calcula quantas coordenações (squads) são necessárias para atender a base de clientes, dividido em dois tipos:

1. **Coordenação SABER + TER** - Atende clientes dos produtos Saber e Ter
2. **Coordenação EXECUTAR** - Atende clientes dos produtos Executar (Loyalty e No-Loyalty)

---

## 1. Coordenação SABER + TER

### 1.1 Composição da Squad (9 pessoas)
| Qty | Cargo |
|-----|-------|
| 1 | Coordenador |
| 1 | Account Sr. |
| 1 | Account Jr. |
| 1 | Gestor de Tráfego Pl |
| 1 | Copywriter Sr. |
| 1 | Designer Sr. |
| 1 | Tech |
| 1 | Account Pl. |
| 1 | Sales Enablement Jr. |
| **9** | **Total** |

### 1.2 Capacidade por Squad (Clientes)
| Qty Clientes | Tier | Receita Mês |
|--------------|------|-------------|
| 4 | Tiny | R$ 80.000 |
| 4 | Small | R$ 120.000 |
| 5 | Medium | R$ 200.000 |
| 2 | Large | R$ 100.000 |
| **15** | **Total** | **R$ 500.000** |

### 1.3 Métricas Derivadas
- **Receita Total por Squad:** R$ 500.000/mês
- **Receita por Headcount (HC):** R$ 500.000 / 9 = **R$ 55.556/HC**
- **Clientes Totais por Squad:** 15 clientes

### 1.4 Ticket Médio por Tier (derivado)
| Tier | Receita | Clientes | Ticket Médio |
|------|---------|----------|--------------|
| Tiny | R$ 80.000 | 4 | R$ 20.000 |
| Small | R$ 120.000 | 4 | R$ 30.000 |
| Medium | R$ 200.000 | 5 | R$ 40.000 |
| Large | R$ 100.000 | 2 | R$ 50.000 |

### 1.5 Peso de Capacidade por Tier
Para calcular quantas squads precisamos, usamos um sistema de "pesos" baseado na complexidade/ticket de cada tier.

**Base de referência:** Tiny = 1.0 (menor complexidade)

| Tier | Ticket Médio | Peso (relativo ao Tiny) |
|------|--------------|-------------------------|
| Tiny | R$ 20.000 | 1.0 |
| Small | R$ 30.000 | 1.5 |
| Medium | R$ 40.000 | 2.0 |
| Large | R$ 50.000 | 2.5 |
| Enterprise | R$ 60.000* | 3.0 |

*Enterprise não estava na tabela, estimado proporcionalmente.

### 1.6 Capacidade em "Unidades de Capacidade" (UC)
Uma squad SABER tem capacidade de:
- 4 × 1.0 (Tiny) = 4.0 UC
- 4 × 1.5 (Small) = 6.0 UC
- 5 × 2.0 (Medium) = 10.0 UC
- 2 × 2.5 (Large) = 5.0 UC
- **Total: 25 UC por squad**

### 1.7 Fórmula de Cálculo de Squads SABER
```
Total UC Necessário = Σ (Clientes_Tier × Peso_Tier) para Saber + Ter

Squads SABER Necessárias = ceil(Total UC Necessário / 25)
```

---

## 2. Coordenação EXECUTAR

### 2.1 Composição da Squad (15 pessoas)
| Qty | Cargo |
|-----|-------|
| 1 | Coordenador |
| 3 | Account (01, 02, 03) |
| 3 | Gestor de Tráfego (01, 02, 03) |
| 1 | Copywriter |
| 1 | Designer Sr |
| 2 | Designer Pl |
| 1 | Social |
| **15** | **Total** |

*Nota: O documento menciona 15 pessoas mas lista 12. Vou usar 15 conforme indicado.*

### 2.2 Capacidade por Squad
| Métrica | Valor |
|---------|-------|
| Clientes por Squad | 20 |
| Ticket Médio | R$ 10.500 |
| Receita por Squad | R$ 210.000 |
| Receita por HC | R$ 14.000 (210k/15) |

*Nota: Documento diz R$ 19.000/HC mas 210k/15 = R$ 14.000. Vou usar 210k/15.*

### 2.3 Fórmula de Cálculo de Squads EXECUTAR
```
Total Clientes Executar = Clientes_ExecutarLoyalty + Clientes_ExecutarNoLoyalty

Squads EXECUTAR Necessárias = ceil(Total Clientes Executar / 20)
```

---

## 3. Taxas e Parâmetros Configuráveis

Para permitir ajustes, os seguintes parâmetros serão editáveis:

### 3.1 Squad SABER + TER
```typescript
saberSquadConfig: {
  headcount: 9,                    // Total de pessoas na squad
  capacityUC: 25,                  // Unidades de capacidade por squad
  tierWeights: {
    tiny: 1.0,
    small: 1.5,
    medium: 2.0,
    large: 2.5,
    enterprise: 3.0,
  },
  // Receita esperada por squad (para validação)
  expectedRevenuePerSquad: 500000,
}
```

### 3.2 Squad EXECUTAR
```typescript
executarSquadConfig: {
  headcount: 15,                   // Total de pessoas na squad
  clientsPerSquad: 20,             // Clientes por squad
  expectedRevenuePerSquad: 210000, // Receita esperada
}
```

---

## 4. Cálculo Mês a Mês

Para cada mês, calcularemos:

### 4.1 Base de Clientes
```
Clientes Saber = Base Legada Saber + Novos Saber (acumulado)
Clientes Ter = Base Legada Ter + Novos Ter (acumulado)
Clientes Executar = Base Legada Executar + Novos Executar (acumulado)
```

### 4.2 Squads Necessárias
```
UC_Saber_Ter = Σ (Clientes_Saber_Ter[tier] × Peso[tier])
Squads_Saber = ceil(UC_Saber_Ter / 25)

Squads_Executar = ceil(Clientes_Executar / 20)
```

### 4.3 Headcount Total
```
HC_Saber = Squads_Saber × 9
HC_Executar = Squads_Executar × 15
HC_Total = HC_Saber + HC_Executar
```

### 4.4 Custo de Pessoal (opcional - para DRE futura)
Podemos adicionar custo médio por cargo para calcular folha de pagamento.

---

## 5. Exemplo de Cálculo

### Dados de Exemplo (Mês 6)
| Tier | Saber+Ter Clientes |
|------|-------------------|
| Tiny | 12 |
| Small | 15 |
| Medium | 8 |
| Large | 3 |
| Enterprise | 1 |

| Produto | Clientes |
|---------|----------|
| Executar Loyalty | 10 |
| Executar No-Loyalty | 25 |

### Cálculo Squads SABER
```
UC = (12 × 1.0) + (15 × 1.5) + (8 × 2.0) + (3 × 2.5) + (1 × 3.0)
UC = 12 + 22.5 + 16 + 7.5 + 3 = 61 UC

Squads SABER = ceil(61 / 25) = 3 squads
HC SABER = 3 × 9 = 27 pessoas
```

### Cálculo Squads EXECUTAR
```
Clientes Executar = 10 + 25 = 35

Squads EXECUTAR = ceil(35 / 20) = 2 squads
HC EXECUTAR = 2 × 15 = 30 pessoas
```

### Total
```
Total Squads = 3 + 2 = 5 squads
Total HC = 27 + 30 = 57 pessoas
```

---

## 6. Estrutura de Dados para Implementação

```typescript
interface CapacityPlanInputs {
  saberSquad: {
    headcount: number;
    capacityUC: number;
    tierWeights: Record<Tier, number>;
  };
  executarSquad: {
    headcount: number;
    clientsPerSquad: number;
  };
}

interface CapacityPlanOutput {
  month: number;
  // Clientes acumulados por tier/produto
  clientsSaberTer: Record<Tier, number>;
  clientsExecutar: number;
  // Unidades de capacidade
  totalUC: number;
  // Squads
  squadsSaber: number;
  squadsExecutar: number;
  totalSquads: number;
  // Headcount
  hcSaber: number;
  hcExecutar: number;
  totalHC: number;
  // Métricas
  revenuePerHC: number;
  utilizationRate: number; // % de capacidade usada
}
```

---

## 7. Seção na Planilha

A nova seção "CAPACITY PLAN" será adicionada após TOTAIS com:

1. **Parâmetros de Squad** (editáveis)
   - HC por Squad Saber
   - Capacidade UC por Squad Saber
   - Pesos por Tier
   - HC por Squad Executar
   - Clientes por Squad Executar

2. **Clientes Acumulados** (calculados)
   - Clientes Saber + Ter por Tier
   - Clientes Executar Total

3. **Resultado Capacity** (calculados)
   - Squads Saber necessárias
   - Squads Executar necessárias
   - Total Headcount
   - Receita por HC

4. **Gráfico** (expansível)
   - Evolução de Headcount no tempo
   - Evolução de Squads no tempo

---

## 8. Próximos Passos

1. ✅ Documentar lógica (este documento)
2. ⏳ Adicionar tipos no `simulation.ts`
3. ⏳ Adicionar inputs padrão em `defaultInputs.ts`
4. ⏳ Calcular capacity em `calculations.ts`
5. ⏳ Adicionar seção na planilha `SpreadsheetView.tsx`
6. ⏳ Adicionar gráfico de capacity
7. ⏳ Deploy

---

**Confirme se a lógica está correta antes de prosseguir com a implementação.**
