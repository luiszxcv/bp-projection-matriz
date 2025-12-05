# Capacity Plan - Racional de Conversão

## Resumo
O Capacity Plan converte **quantidade de clientes** em **squads e headcount** necessários para atendê-los.

---

## Duas Coordenações

### 1. Squad Saber + Ter (Projetos Pontuais)
**Métrica base:** Unidades de Capacidade (UC)

| Parâmetro | Valor Padrão |
|-----------|--------------|
| HC por Squad | 9 pessoas |
| Capacidade por Squad | 25 UC |

**Pesos por Tier** (complexidade do cliente):
| Tier | Peso UC | Racional |
|------|---------|----------|
| Enterprise | 3.0 | Cliente mais complexo, exige mais tempo |
| Large | 2.5 | - |
| Medium | 2.0 | - |
| Small | 1.5 | - |
| Tiny | 1.0 | Cliente mais simples (baseline) |

**Fórmula:**
```
UC Necessário = Σ (Clientes por Tier × Peso do Tier)
Squads Saber = ⌈UC Necessário ÷ 25⌉  (arredonda pra cima)
HC Saber = Squads Saber × 9
```

**Exemplo:** 10 clientes Medium + 5 Large = (10×2.0) + (5×2.5) = 32.5 UC → 2 Squads → 18 pessoas

---

### 2. Squad Executar (Recorrente)
**Métrica base:** Quantidade de Clientes

| Parâmetro | Valor Padrão |
|-----------|--------------|
| HC por Squad | 15 pessoas |
| Clientes por Squad | 20 clientes |

**Fórmula:**
```
Total Clientes Executar = Clientes Legados + Clientes Novos Acumulados
Squads Executar = ⌈Total Clientes ÷ 20⌉  (arredonda pra cima)
HC Executar = Squads Executar × 15
```

**Exemplo:** 228 clientes legados + 12 novos = 240 → 12 Squads → 180 pessoas

---

## Diferença Chave

| Aspecto | Saber + Ter | Executar |
|---------|-------------|----------|
| Natureza | Projeto pontual | Recorrente |
| Acumula? | **Não** - só conta novos do mês | **Sim** - clientes empilham |
| Métrica | UC (pondera complexidade) | Quantidade bruta |
| Base inicial | Vem da aquisição | Inclui legados |

---

## Métricas de Eficiência

```
Receita/HC Saber = Receita(Saber+Ter) ÷ HC Saber
Receita/HC Executar = Receita(Executar+Legada+Renovações+Expansões) ÷ HC Executar
Receita/HC Total = Receita Total ÷ HC Total

% Utilização Saber = UC Real ÷ (Squads × 25)
% Utilização Executar = Clientes Real ÷ (Squads × 20)
```

---

## Totais

```
Total Squads = Squads Saber + Squads Executar
Total HC = HC Saber + HC Executar
```
