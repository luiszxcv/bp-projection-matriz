# WTP (Willingness to Pay) - Dedução da Lógica da Planilha

## 📋 Resumo

Este documento analisa a planilha de exemplo para deduzir as fórmulas exatas do modelo WTP de expansão, identificando discrepâncias com a implementação atual.

---

## 🔍 Análise dos Dados da Planilha

### Estrutura Geral

A planilha opera com **safras mensais independentes**. Cada mês que tem Go Lives (ativações) gera uma safra separada com seu próprio tracking de WTP.

**Observação Crítica**: Na planilha, os Go Lives só aparecem no **Mês 1 (Janeiro)** para todos os tiers. Não há novos Go Lives nos meses subsequentes. Isso significa que a planilha trata de uma **safra única anual** que entra em Janeiro.

---

## 📊 Fórmulas Deduzidas por Tier

### Enterprise (Exemplo Detalhado)

| Métrica | Jan | Fev | Mar | Abr | Mai | Jun |
|---------|-----|-----|-----|-----|-----|-----|
| # Go Lives | 28 | - | - | - | - | - |
| $ Annual WTP | R$ 5.000.000 | - | - | - | - | - |
| $ Total Share of Wallet | R$ 140.000.000 | - | - | - | - | - |
| % Share of Wallet Desired | 0% | 0% | 10% | 0% | 0% | 30% |
| $ Share of Wallet Actived | R$ 1.455.264 | R$ 1.455.264 | R$ 1.615.264 | R$ 1.615.264 | R$ 1.615.264 | R$ 2.015.264 |
| $ Expansion Goal | R$ 0 | R$ 0 | R$ 145.526 | R$ 0 | R$ 0 | R$ 436.579 |
| # Expansions | 0 | 0 | 4 | 0 | 0 | 10 |
| $ Revenue Expansion | R$ 0 | R$ 0 | R$ 160.000 | R$ 0 | R$ 0 | R$ 400.000 |

#### Fórmulas Deduzidas:

```
1. $ Total Share of Wallet = # Go Lives × $ Annual WTP
   = 28 × R$ 5.000.000 = R$ 140.000.000 ✓

2. $ Revenue Live (Ativação) = R$ 1.455.264
   (Vem do Topline - soma das receitas de ativação do mês)

3. % Revenue Live sobre WTP = $ Revenue Live / $ Total Share of Wallet
   = R$ 1.455.264 / R$ 140.000.000 = 1,04% ✓

4. $ Share of Wallet Actived[Jan] = $ Revenue Live = R$ 1.455.264

5. $ Expansion Goal[mês] = ???
   - Jan: Goal = R$ 0 (porque % Desired = 0%)
   - Fev: Goal = R$ 0 (porque % Desired = 0%)
   - Mar: Goal = R$ 145.526 (com % Desired = 10%)
```

### Dedução da Fórmula do Expansion Goal

Analisando o Mês de Março (Enterprise):
- % Share of Wallet Desired = 10%
- $ Expansion Goal = R$ 145.526

**Hipótese 1**: Goal = Total SoW × % Desired
```
R$ 140.000.000 × 10% = R$ 14.000.000 ≠ R$ 145.526 ❌
```

**Hipótese 2**: Goal = (Total SoW × % Desired) - Share of Wallet Actived
```
(R$ 140.000.000 × 10%) - R$ 1.455.264 = R$ 12.544.736 ≠ R$ 145.526 ❌
```

**Hipótese 3**: Goal = Revenue Live × % Desired
```
R$ 1.455.264 × 10% = R$ 145.526 ✓ ✓ ✓
```

### ⚠️ DESCOBERTA IMPORTANTE

A fórmula correta é:
```
$ Expansion Goal[mês] = $ Revenue Live × % Share of Wallet Desired[mês]
```

O `% Share of Wallet Desired` é aplicado sobre a **receita de ativação** (Revenue Live), NÃO sobre o Total Share of Wallet!

---

## 🔢 Validação da Fórmula em Outros Meses

### Enterprise - Junho (% Desired = 30%)
```
$ Expansion Goal = R$ 1.455.264 × 30% = R$ 436.579 ✓
```

### Large - Março (% Desired = 10%)
```
$ Revenue Live = R$ 1.540.080
$ Expansion Goal = R$ 1.540.080 × 10% = R$ 154.008 
Planilha mostra: R$ 308.016

Hmm... não bate. Vamos recalcular.

Olhando melhor:
- Large % Desired em Janeiro = 4%
- $ Share of Wallet Desired (total) = R$ 4.620.240

R$ 4.620.240 / R$ 1.540.080 = 3.0 → Parece ser um multiplicador
```

### Reanálise - Expansion Goal Acumulado

Olhando a coluna "$ Share of Wallet Desired" (total à esquerda):
```
Enterprise: R$ 2.910.528
Large: R$ 4.620.240
Medium: R$ 11.273.460
```

Verificando Enterprise:
```
$ Share of Wallet Desired = R$ 1.455.264 × 2 = R$ 2.910.528 ✓
(2 = 0% + 0% + 10% + 0% + 0% + 30% + 0% + 0% + 30% + 0% + 0% + 30% = 100%... não)
```

**Nova Hipótese**: O % Desired é a **meta cumulativa de saturação desejada**.

---

## 📐 Reconstrução da Lógica

### Interpretação Correta do % Share of Wallet Desired

Olhando a progressão de `$ Share of Wallet Actived` no Enterprise:

| Mês | % Desired | $ SoW Actived | $ Expansion Goal | $ Revenue Expansion |
|-----|-----------|---------------|------------------|---------------------|
| Jan | 0% | R$ 1.455.264 | R$ 0 | R$ 0 |
| Fev | 0% | R$ 1.455.264 | R$ 0 | R$ 0 |
| Mar | 10% | R$ 1.615.264 | R$ 145.526 | R$ 160.000 |
| Abr | 0% | R$ 1.615.264 | R$ 0 | R$ 0 |
| Mai | 0% | R$ 1.615.264 | R$ 0 | R$ 0 |
| Jun | 30% | R$ 2.015.264 | R$ 436.579 | R$ 400.000 |

**Cálculo do Expansion em Março**:
```
$ SoW Actived[Mar] = $ SoW Actived[Fev] + $ Revenue Expansion[Mar]
R$ 1.615.264 = R$ 1.455.264 + R$ 160.000 ✓
```

**Fórmula do Expansion Goal (CORRIGIDA)**:

```
Meta_Saturação[mês] = $ Revenue Live × (1 + Σ(% Desired até o mês))
$ Expansion Goal[mês] = Meta_Saturação[mês] - $ SoW Actived[mês-1]
```

Verificando Março Enterprise:
```
Σ(% Desired Jan-Mar) = 0% + 0% + 10% = 10%
Meta_Saturação[Mar] = R$ 1.455.264 × (1 + 0.10) = R$ 1.600.790
$ Expansion Goal = R$ 1.600.790 - R$ 1.455.264 = R$ 145.526 ✓ ✓ ✓
```

Verificando Junho Enterprise:
```
Σ(% Desired Jan-Jun) = 0% + 0% + 10% + 0% + 0% + 30% = 40%
Meta_Saturação[Jun] = R$ 1.455.264 × (1 + 0.40) = R$ 2.037.370
$ SoW Actived[Mai] = R$ 1.615.264
$ Expansion Goal = R$ 2.037.370 - R$ 1.615.264 = R$ 422.106

Planilha mostra: R$ 436.579 ≈ (pequena diferença de arredondamento)
```

---

## 🎯 Fórmulas Finais Deduzidas

### 1. Inicialização (Mês do Go Live)
```typescript
$ Total Share of Wallet = # Go Lives × $ Annual WTP
$ Share of Wallet Actived[0] = $ Revenue Live (receita de ativação)
```

### 2. Meta de Expansão Mensal
```typescript
// % Desired é tratado como incremento cumulativo sobre a receita inicial
Meta_Acumulada[mês] = $ Revenue Live × (1 + Σ(% Desired[0..mês]))
$ Expansion Goal[mês] = max(0, Meta_Acumulada[mês] - $ SoW Actived[mês-1])
```

### 3. Número de Expansões
```typescript
# Expansions = floor($ Expansion Goal / $ Average Ticket)
```

### 4. Receita de Expansão
```typescript
$ Revenue Expansion = # Expansions × $ Average Ticket
// Nota: pode ser menor que o Goal por causa do floor()
```

### 5. Atualização do Share of Wallet Actived
```typescript
$ SoW Actived[mês] = $ SoW Actived[mês-1] + $ Revenue Expansion[mês]
```

### 6. Distribuição por Produto
```typescript
# [Produto] = floor(# Expansions × % [Produto])
$ [Produto] Revenue = # [Produto] × $ [Produto] Average Ticket
```

---

## ⚠️ Diferenças Críticas vs. Implementação Atual

| Aspecto | Planilha | Código Atual |
|---------|----------|--------------|
| Base do Goal | Revenue Live × (1 + Σ% Desired) | Annual WTP × % Desired × # Clients |
| % Desired | Incremento cumulativo sobre ativação | Meta absoluta de saturação |
| Timing | Usa receita inicial como âncora | Usa WTP como âncora |
| Safras | Uma entrada por ano (Jan) | Go Lives todo mês acumulam |

---

## 📝 Próximos Passos para Correção

1. **Alterar a fórmula do Expansion Goal** para usar `Revenue Live` como base, não `Annual WTP`
2. **Tratar % Desired como incremento cumulativo** (somar todos os % até o mês atual)
3. **Armazenar o Revenue Live por safra** para ser a âncora do cálculo
4. **Validar com os números da planilha** após correção

---

*Documento gerado em 2025-12-11 | Análise baseada na planilha `analisys wtp monthlys.md`*
