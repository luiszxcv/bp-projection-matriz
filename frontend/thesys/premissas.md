# Missão
Contruir um business plan completo cohortizado, produtizado e projetado para 2026.
Ele deve ter a premissa de trabalhar com qty e multiplica-las pelos tíckets médios para chegar na receita.

## Premissas
Começando pelas premissas.
Usaremos prioritariamento 'número de clientes' para depoys calcular a receita.
As premissas na documentação é que:
Teremos 5 tiers, 4 produtos, 1 tícket médio por produto por tier.
Temos um topline que gera praticamente todo o resto através das métricas.

O topline é composto por:
Investimento
CPL
Taxa de distribuição de clientes em % por tier por produto.

Idealmente a nível de arredondamento faremos o seguinte, o que vier inteiro faremos a distribuição, o que vier quebrado, faremos o index para o produto de menor valor (ter).

## Dados:
Para o topline a distribuição por tier por produto será:

MQL:
| # MQLs |  |  |  | 1.000 |  |
| --- | --- | --- | --- | --- | --- |
|  | Enterprise |  |  | 46 | 4,60% |
|  | Large |  |  | 51 | 5,11% |
|  | Medium |  |  | 202 | 20,23% |
|  | Small |  |  | 476 | 47,60% |
|  | Tiny |  |  | 225 | 22,46% |

SQL:
|  | **Enterprise** |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| VM2 |  | # MQLs |  |  | 28 |
| CR2 |  | % MQL → SQL |  |  | 25% |
|  |  | # SQLs |  |  | 7 |
|  |  |  |  |  |  |
|  | **Large** |  |  |  |  |
|  |  | # MQLs |  |  | 31 |
| VM2 |  | % MQL → SQL |  |  | 30% |
|  |  | # SQLs |  |  | 9 |
|  |  |  |  |  |  |
|  | **Medium** |  |  |  |  |
| VM2 |  | # MQLs |  |  | 121 |
| CR2 |  | % MQL → SQL |  |  | 30% |
|  |  | # SQLs |  |  | 36 |
|  |  |  |  |  |  |
|  | **Small** |  |  |  |  |
| VM2 |  | # MQLs |  |  | 286 |
| CR2 |  | % MQL → SQL |  |  | 35% |
|  |  | # SQLs |  |  | 100 |
|  |  |  |  |  |  |
|  | **Tiny** |  |  |  |  |
| VM2 |  | # MQLs |  |  | 135 |
| CR2 |  | % MQL → SQL |  |  | 35% |
|  |  | # SQLs |  |  | 47 |

---
SQL para SAL:
| ***Selection*** |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |
|  | VM3 |  | # SQLs |  |  | 200 |
|  | CR3 |  | % SQL → SAL (Opportunity) |  |  | 86% |
|  |  |  | # SALs |  |  | 172 |
|  |  |  |  |  |  |  |
|  |  | **Enterprise** |  |  |  |  |
|  | VM3 |  | # SQLs |  |  | 7 |
|  | CR3 |  | % SQL → SAL (Opportunity) |  |  | 86% |
|  |  |  | # SALs |  |  | 6 |
|  |  |  |  |  |  |  |
|  |  | **Large** |  |  |  |  |
|  | VM3 |  | # SQLs |  |  | 9 |
|  | CR3 |  | % SQL → SAL (Opportunity) |  |  | 86% |
|  |  |  | # SALs |  |  | 8 |
|  |  |  |  |  |  |  |
|  |  | **Medium** |  |  |  |  |
|  | VM3 |  | # SQLs |  |  | 36 |
|  | CR3 |  | % SQL → SAL (Opportunity) |  |  | 86% |
|  |  |  | # SALs |  |  | 31 |
|  |  |  |  |  |  |  |
|  |  | **Small** |  |  |  |  |
|  | VM3 |  | # SQLs |  |  | 100 |
|  | CR3 |  | % SQL → SAL (Opportunity) |  |  | 86% |
|  |  |  | # SALs |  |  | 86 |
|  |  |  |  |  |  |  |
|  |  | **Tiny** |  |  |  |  |
|  | VM3 |  | # SQLs |  |  | 47 |
|  | CR3 |  | % SQL → SAL (Opportunity) |  |  | 86% |
|  |  |  | # SALs |  |  | 41 |

---

Fechamento (importante entender a regra de arredondamento para o produto de menor valor):
| ***Closing*** |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |
|  | VM4 |  | # SALs |  |  | 172 |
|  | CR4 |  | % SAL → WON |  |  | 29,12% |
|  |  |  | % MQL → WON |  |  | 8,33% |
|  |  |  | # WONs |  |  | 50 |
|  |  |  | $ Average Ticket |  |  | 25.350 |
|  |  |  | # Revenue Won |  |  | 1.267.500 |
|  |  |  |  |  |  |  |
|  |  | **Enterprise** |  |  |  |  |
|  | VM4 |  | # SALs |  |  | 6 |
|  | CR4 |  | % SAL → WON |  |  | 25,00% |
|  |  |  | % MQL → WON |  |  | 3,62% |
|  |  |  | # WONs |  |  | 1 |
|  |  |  | $ Average Ticket |  |  | R$ 29.000 |
|  |  |  | # Revenue Won |  |  | R$ 29.000 |
|  |  |  |  | % [Saber] |  | 30% |
|  |  |  |  | % [Ter] |  | 20% |
|  |  |  |  | % [Executar-no loyalty] |  | 20% |
|  |  |  |  | % [Executar-loyalty] |  | 20% |
|  |  |  |  | % [Potencializar] |  | 10% |
|  |  |  |  | $ [Saber] Average Ticket |  | R$ 50.000 |
|  |  |  |  | $ [Ter]  Average Ticket |  | R$ 31.600 |
|  |  |  |  | $ [Executar-no loyalty] Average Ticket |  | R$ 29.000 |
|  |  |  |  | $ [Executar-loyalty] Average Ticket |  | R$ 145.000 |
|  |  |  |  | $ [Potencializar] Average Ticket |  | R$ 0 |
|  |  |  |  | # Lowest Ticket Index |  | 3 |
|  |  |  |  | # [Saber] |  | 0 |
|  |  |  |  | # [Saber] Revenue Won |  | R$ 0 |
|  |  |  |  | # [Ter] |  | 0 |
|  |  |  |  | # [Ter] Revenue Won |  | R$ 0 |
|  |  |  |  | # [Executar-no loyalty] |  | 1 |
|  |  |  |  | # [Executar-no loyalty] Revenue Won |  | R$ 29.000 |
|  |  |  |  | # [Executar-loyalty] |  | 0 |
|  |  |  |  | # [Executar-loyalty] Revenue Won |  | R$ 0 |
|  |  |  |  | # [Potencializar] |  | 0 |
|  |  |  |  | # [Potencializar] Revenue Won |  | R$ 0 |
|  |  |  |  |  |  |  |
|  |  | **Large** |  |  |  |  |
|  | VM4 |  | # SALs |  |  | 8 |
|  | CR4 |  | % SAL → WON |  |  | 25,00% |
|  |  |  | % MQL → WON |  |  | 6,52% |
|  |  |  | # WONs |  |  | 2 |
|  |  |  | $ Average Ticket |  |  | R$ 18.000 |
|  |  |  | # Revenue Won |  |  | R$ 36.000 |
|  |  |  |  | % [Saber] |  | 30% |
|  |  |  |  | % [Ter] |  |  |
|  |  |  |  | % [Executar-no loyalty] |  | 30% |
|  |  |  |  | % [Executar-loyalty] |  | 30% |
|  |  |  |  | % [Potencializar] |  | 10% |
|  |  |  |  | $ [Saber] Average Ticket |  | R$ 30.000 |
|  |  |  |  | $ [Ter]  Average Ticket |  | R$ 18.000 |
|  |  |  |  | $ [Executar-no loyalty] Average Ticket |  | R$ 22.000 |
|  |  |  |  | $ [Executar-loyalty] Average Ticket |  | R$ 99.000 |
|  |  |  |  | $ [Potencializar] Average Ticket |  | R$ 0 |
|  |  |  |  | # Lowest Ticket Index |  | 2 |
|  |  |  |  | # [Saber] |  | 0 |
|  |  |  |  | # [Saber] Revenue Won |  | R$ 0 |
|  |  |  |  | # [Ter] |  | 2 |
|  |  |  |  | # [Ter] Revenue Won |  | R$ 36.000 |
|  |  |  |  | # [Executar-no loyalty] |  | 0 |
|  |  |  |  | # [Executar-no loyalty] Revenue Won |  | R$ 0 |
|  |  |  |  | # [Executar-loyalty] |  | 0 |
|  |  |  |  | # [Executar-loyalty] Revenue Won |  | R$ 0 |
|  |  |  |  | # [Potencializar] |  | 0 |
|  |  |  |  | # [Potencializar] Revenue Won |  | R$ 0 |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  | **Medium** |  |  |  |  |
|  | VM4 |  | # SALs |  |  | 31 |
|  | CR4 |  | % SAL → WON |  |  | 30,00% |
|  |  |  | % MQL → WON |  |  | 7,41% |
|  |  |  | # WONs |  |  | 9,00 |
|  |  |  | $ Average Ticket |  |  | R$ 26.778 |
|  |  |  | # Revenue Won |  |  | R$ 241.000 |
|  |  |  |  | % [Saber] |  | 60% |
|  |  |  |  | % [Ter] |  | 10% |
|  |  |  |  | % [Executar-no loyalty] |  | 15% |
|  |  |  |  | % [Executar-loyalty] |  | 15% |
|  |  |  |  | % [Potencializar] |  | 0% |
|  |  |  |  | $ [Saber] Average Ticket |  | R$ 30.000 |
|  |  |  |  | $ [Ter]  Average Ticket |  | R$ 15.000 |
|  |  |  |  | $ [Executar-no loyalty] Average Ticket |  | R$ 14.000 |
|  |  |  |  | $ [Executar-loyalty] Average Ticket |  | R$ 49.000 |
|  |  |  |  | $ [Potencializar] Average Ticket |  | R$ 0 |
|  |  |  |  | # Lowest Ticket Index |  | 3 |
|  |  |  |  | # [Saber] |  | 5 |
|  |  |  |  | # [Saber] Revenue Won |  | R$ 150.000 |
|  |  |  |  | # [Ter] |  | 0 |
|  |  |  |  | # [Ter] Revenue Won |  | R$ 0 |
|  |  |  |  | # [Executar-no loyalty] |  | 3 |
|  |  |  |  | # [Executar-no loyalty] Revenue Won |  | R$ 42.000 |
|  |  |  |  | # [Executar-loyalty] |  | 1 |
|  |  |  |  | # [Executar-loyalty] Revenue Won |  | R$ 49.000 |
|  |  |  |  | # [Potencializar] |  | 0 |
|  |  |  |  | # [Potencializar] Revenue Won |  | R$ 0 |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  | **Small** |  |  |  |  |
|  | VM4 |  | # SALs |  |  | 86 |
|  | CR4 |  | % SAL → WON |  |  | 30% |
|  |  |  | % MQL → WON |  |  | 9,10% |
|  |  |  | # WONs |  |  | 26 |
|  |  |  | $ Average Ticket |  |  | R$ 25.731 |
|  |  |  | # Revenue Won |  |  | R$ 669.000 |
|  |  |  |  | % [Saber] |  | 80% |
|  |  |  |  | % [Ter] |  | 20% |
|  |  |  |  | % [Executar-no loyalty] |  | 0% |
|  |  |  |  | % [Executar-loyalty] |  | 0% |
|  |  |  |  | % [Potencializar] |  | 0% |
|  |  |  |  | $ [Saber] Average Ticket |  | R$ 30.000 |
|  |  |  |  | $ [Ter]  Average Ticket |  | R$ 11.500 |
|  |  |  |  | $ [Executar-no loyalty] Average Ticket |  | R$ 0 |
|  |  |  |  | $ [Executar-loyalty] Average Ticket |  | R$ 0 |
|  |  |  |  | $ [Potencializar] Average Ticket |  | R$ 0 |
|  |  |  |  | # Lowest Ticket Index |  | 2 |
|  |  |  |  | # [Saber] |  | 20 |
|  |  |  |  | # [Saber] Revenue Won |  | R$ 600.000 |
|  |  |  |  | # [Ter] |  | 6 |
|  |  |  |  | # [Ter] Revenue Won |  | R$ 69.000 |
|  |  |  |  | # [Executar-no loyalty] |  | 0 |
|  |  |  |  | # [Executar-no loyalty] Revenue Won |  | R$ 0 |
|  |  |  |  | # [Executar-loyalty] |  | 0 |
|  |  |  |  | # [Executar-loyalty] Revenue Won |  | R$ 0 |
|  |  |  |  | # [Potencializar] |  | 0 |
|  |  |  |  | # [Potencializar] Revenue Won |  | R$ 0 |
|  |  |  |  |  |  |  |
|  |  | **Tiny** |  |  |  |  |
|  | VM4 |  | # SALs |  |  | 41 |
|  | CR4 |  | % SAL → WON |  |  | 30,00% |
|  |  |  | % MQL → WON |  |  | 8,90% |
|  |  |  | # WONs |  |  | 12 |
|  |  |  | $ Average Ticket |  |  | R$ 24.375 |
|  |  |  | # Revenue Won |  |  | R$ 292.500 |
|  |  |  |  | % [Saber] |  | 80% |
|  |  |  |  | % [Ter] |  | 20% |
|  |  |  |  | % [Executar-no loyalty] |  | 0% |
|  |  |  |  | % [Executar-loyalty] |  | 0% |
|  |  |  |  | % [Potencializar] |  | 0% |
|  |  |  |  | $ [Saber] Average Ticket |  | R$ 30.000 |
|  |  |  |  | $ [Ter]  Average Ticket |  | R$ 7.500 |
|  |  |  |  | $ [Executar-no loyalty] Average Ticket |  | R$ 0 |
|  |  |  |  | $ [Executar-loyalty] Average Ticket |  | R$ 0 |
|  |  |  |  | $ [Potencializar] Average Ticket |  | R$ 0 |
|  |  |  |  | # Lowest Ticket Index |  | 2 |
|  |  |  |  | # [Saber] |  | 9 |
|  |  |  |  | # [Saber] Revenue Won |  | R$ 270.000 |
|  |  |  |  | # [Ter] |  | 3 |
|  |  |  |  | # [Ter] Revenue Won |  | R$ 22.500 |
|  |  |  |  | # [Executar-no loyalty] |  | 0 |
|  |  |  |  | # [Executar-no loyalty] Revenue Won |  | R$ 0 |
|  |  |  |  | # [Executar-loyalty] |  | 0 |
|  |  |  |  | # [Executar-loyalty] Revenue Won |  | R$ 0 |
|  |  |  |  | # [Potencializar] |  | 0 |
|  |  |  |  | # [Potencializar] Revenue Won |  | R$ 0 |

---
E a última é a quebra da ativação:
| ***Activation*** |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
|  | VM5 |  | # WONs |  |  | 50 |
|  | CR5 |  | % WONs → Activation |  |  | 96% |
|  |  |  | **# Customers Activated** |  |  | 48,00 |
|  |  |  |  |  |  |  |
|  | VM5 |  | # Revenue Won |  |  | R$ 1.267.500 |
|  | CR5 |  | % Revenue Won → Activation |  |  | 93% |
|  |  |  | **$ Revenue Activated** |  |  | R$ 1.178.775 |
|  |  |  |  |  |  |  |
|  |  | **Enterprise** |  |  |  |  |
|  |  |  | # WONs |  |  | 1 |
|  |  |  | % Activations |  |  | 100% |
|  |  |  | # Activations |  |  | 1,00 |
|  |  |  | $ Revenue Activated |  |  | 93% |
|  |  |  | # Revenue Activations |  |  | R$ 26.970 |
|  |  |  |  | %  [Saber] |  | 93% |
|  |  |  |  | %  Revenue [Saber] |  | 93% |
|  |  |  |  | %  [Ter] |  | 93% |
|  |  |  |  | %  Revenue [Ter] |  | 93% |
|  |  |  |  | %  [Executar-no loyalty] |  | 93% |
|  |  |  |  | %  Revenue [Executar-no loyalty] |  | 93% |
|  |  |  |  | %  [Executar-loyalty] |  | 93% |
|  |  |  |  | %  Revenue [Executar-loyalty] |  | 93% |
|  |  |  |  | %  [Potencializar] |  | 93% |
|  |  |  |  | %  Revenue [Potencializar] |  | 93% |
|  |  |  |  | #   [Saber] |  | 0,00 |
|  |  |  |  | $   Revenue [Saber] |  | R$ 0 |
|  |  |  |  | #   [Ter] |  | 0,00 |
|  |  |  |  | $   Revenue [Ter] |  | R$ 0 |
|  |  |  |  | #   [Executar-no loyalty] |  | 1,00 |
|  |  |  |  | $   Revenue [Executar-no loyalty] |  | R$ 26.970 |
|  |  |  |  | #   [Executar-loyalty] |  | 0,00 |
|  |  |  |  | $   Revenue [Executar-loyalty] |  | R$ 0 |
|  |  |  |  | #   [Potencializar] |  | 0,00 |
|  |  |  |  | $   Revenue [Potencializar] |  | R$ 0 |
|  |  |  |  |  |  |  |
|  |  | **Large** |  |  |  |  |
|  |  |  | # WONs |  |  | 2 |
|  |  |  | % Activations |  |  | 100% |
|  |  |  | # Activations |  |  | 2 |
|  |  |  | $ Revenue Activated |  |  | 93% |
|  |  |  | # Revenue Activations |  |  | R$ 33.480,00 |
|  |  |  |  | %  [Saber] |  | 93% |
|  |  |  |  | %  Revenue [Saber] |  | 93% |
|  |  |  |  | %  [Ter] |  | 93% |
|  |  |  |  | %  Revenue [Ter] |  | 93% |
|  |  |  |  | %  [Executar-no loyalty] |  | 93% |
|  |  |  |  | %  Revenue [Executar-no loyalty] |  | 93% |
|  |  |  |  | %  [Executar-loyalty] |  | 93% |
|  |  |  |  | %  Revenue [Executar-loyalty] |  | 93% |
|  |  |  |  | %  [Potencializar] |  | 93% |
|  |  |  |  | %  Revenue [Potencializar] |  | 93% |
|  |  |  |  | #   [Saber] |  | 0 |
|  |  |  |  | $   Revenue [Saber] |  | R$ 0 |
|  |  |  |  | #   [Ter] |  | 2 |
|  |  |  |  | $   Revenue [Ter] |  | R$ 33.480 |
|  |  |  |  | #   [Executar-no loyalty] |  | 0 |
|  |  |  |  | $   Revenue [Executar-no loyalty] |  | R$ 0 |
|  |  |  |  | #   [Executar-loyalty] |  | 0 |
|  |  |  |  | $   Revenue [Executar-loyalty] |  | R$ 0 |
|  |  |  |  | #   [Potencializar] |  | 0,00 |
|  |  |  |  | $   Revenue [Potencializar] |  | R$ 0 |
|  |  |  |  |  |  |  |
|  |  | **Medium** |  |  |  |  |
|  |  |  | # WONs |  |  | 9 |
|  |  |  | %  Activations |  |  | 100% |
|  |  |  | #  Activations |  |  | 9 |
|  |  |  | $  Revenue Activated |  |  | 93% |
|  |  |  | #  Revenue Activations |  |  | R$ 224.130 |
|  |  |  |  | %  [Saber] |  | 93% |
|  |  |  |  | %  Revenue [Saber] |  | 93% |
|  |  |  |  | %  [Ter] |  | 93% |
|  |  |  |  | %  Revenue [Ter] |  | 93% |
|  |  |  |  | %  [Executar-no loyalty] |  | 93% |
|  |  |  |  | %  Revenue [Executar-no loyalty] |  | 93% |
|  |  |  |  | %  [Executar-loyalty] |  | 93% |
|  |  |  |  | %  Revenue [Executar-loyalty] |  | 93% |
|  |  |  |  | %  [Potencializar] |  | 0% |
|  |  |  |  | %  Revenue [Potencializar] |  | 0% |
|  |  |  |  | #   [Saber] |  | 5 |
|  |  |  |  | $   Revenue [Saber] |  | R$ 139.500 |
|  |  |  |  | #   [Ter] |  | 0 |
|  |  |  |  | $   Revenue [Ter] |  | R$ 0 |
|  |  |  |  | #   [Executar-no loyalty] |  | 3 |
|  |  |  |  | $   Revenue [Executar-no loyalty] |  | R$ 39.060 |
|  |  |  |  | #   [Executar-loyalty] |  | 1 |
|  |  |  |  | $   Revenue [Executar-loyalty] |  | R$ 45.570 |
|  |  |  |  | #   [Potencializar] |  | 0,00 |
|  |  |  |  | $   Revenue [Potencializar] |  | R$ 0 |
|  |  |  |  |  |  |  |
|  |  | **Small** |  |  |  |  |
|  |  |  | # WONs |  |  | 26 |
|  |  |  | % Small Activations |  |  | 96% |
|  |  |  | # Small Activations |  |  | 25 |
|  |  |  | $ Small Revenue Activated |  |  | 93% |
|  |  |  | # Small Revenue Activations |  |  | R$ 622.170 |
|  |  |  |  | %  [Saber] |  | 93% |
|  |  |  |  | %  Revenue [Saber] |  | 93% |
|  |  |  |  | %  [Ter] |  | 93% |
|  |  |  |  | %  Revenue [Ter] |  | 93% |
|  |  |  |  | %  [Executar-no loyalty] |  | 0% |
|  |  |  |  | %  Revenue [Executar-no loyalty] |  | 0% |
|  |  |  |  | %  [Executar-loyalty] |  | 0% |
|  |  |  |  | %  Revenue [Executar-loyalty] |  | 0% |
|  |  |  |  | %  [Potencializar] |  | 0% |
|  |  |  |  | %  Revenue [Potencializar] |  | 0% |
|  |  |  |  | #   [Saber] |  | 19 |
|  |  |  |  | $   Revenue [Saber] |  | R$ 558.000 |
|  |  |  |  | #   [Ter] |  | 6 |
|  |  |  |  | $   Revenue [Ter] |  | R$ 64.170 |
|  |  |  |  | #   [Executar-no loyalty] |  | 0 |
|  |  |  |  | $   Revenue [Executar-no loyalty] |  | R$ 0 |
|  |  |  |  | #   [Executar-loyalty] |  | 0 |
|  |  |  |  | $   Revenue [Executar-loyalty] |  | R$ 0 |
|  |  |  |  | #   [Potencializar] |  | 0,00 |
|  |  |  |  | $   Revenue [Potencializar] |  | R$ 0 |
|  |  |  |  |  |  |  |
|  |  | **Tiny** |  |  |  |  |
|  |  |  | # WONs |  |  | 12 |
|  |  |  | % Tiny Activations |  |  | 92% |
|  |  |  | # Tiny Activations |  |  | 11 |
|  |  |  | $ Tiny Revenue Activated |  |  | 93% |
|  |  |  | # Tiny Revenue Activations |  |  | R$ 272.025 |

---

## regras topline e conversão:
O topline será distribuído por tier e por produto
E isso inciará a segunda peça desse tabuleiro, que são o processo de renovação.
Cada cliente que entrar poderá ser conforme as taxas acima:
Produtos do tipo Saber, que se converte em 40% para executar, sendo 60% no-loyalty e 40 loyalty após 60 dias de conversão
AS conversões do para loyalty e no loyalty começam a fazer parte da base de expansão de carteira (falarei mais pra frente)
Clientes executar loyalty ficam por 7 meses e renovam em 30% da base total em até 2 renovações máximas a cada 7 meses
Clientes executar no-loyalty ficam por 2 meses e renovam em 80% da base total em até 5 renovações máximas a cada 2 meses
A expansão de carteira funciona assim, sob o total de clientes ativos em executar (advindos direto da ativação ou da conversão de saber > executar) teremos a conversão mês a mês da carteira ativa de 5% sob total de clientes ativos no momento distribuindo entre os tiers e produtos:
| LARGE / ENTERPRISE | Meta |
| --- | --- |
| % [Saber] | 5% |
| % [Ter] | 25% |
| % [Executar-no loyalty] | 70% |
| % [Executar-loyalty] | 0% |
| % [Potencializar] | 0% |

| MEDIUM |  |
| --- | --- |
| % [Saber] | 5% |
| % [Ter] | 40% |
| % [Executar-no loyalty] | 55% |
| % [Executar-loyalty] | 0% |
| % [Potencializar] | 0% |

| SMALL/TINY |  |
| --- | --- |
| % [Saber] | 20% |
| % [Ter] | 80% |
| % [Executar-no loyalty] | 0% |
| % [Executar-loyalty] | 0% |
| % [Potencializar] | 0% |

---

## Base legada:
Além de tudo isso, teremos adicionar uma base legada com regras próprias:
| *tier* | SUM de Fee | n° de clientes |
| --- | --- | --- |
|  | R$ 86.080,42 | 12 |
| ENTERPRISE | R$ 329.176,85 | 13 |
| LARGE | R$ 351.936,00 | 23 |
| MEDIUM | R$ 854.159,25 | 98 |
| SMALL | R$ 242.719,38 | 40 |
| TINY | R$ 211.102,04 | 42 |
| **Total geral** | **R$ 2.075.173,94** | **228** |

Essa base terá alguns comportamentos diferentes:
Terá uma regrassão de 7% mês por mês (churn da base legada)
E terá uma expansão de 5% mês a mês nos produtos com base na distribuição acima.

---

# Direção visual
Idealmente quero uma planilhona visualmente falando e nada mais.
Quero que você extraia e deixe próximo visualmente as premissas mutáveis (taxas de conversão etc).
Mas a estrutura deve 'imitar' o sheets, deixando editar as taxas mas os resultados não, e tudo deve ser dinamico e interligado, cada taxa ao ser alterada no front deve refletir em toda a 'planilha'.
Com linhas na horizontal de jan a dez de 2026 como uma 'projeção' de tudo que irá acontecer ao longo do ano.
Sendo 1 linha para cada informação.
 1 linha não só para os resultados, mas também para as taxas utilizadas nas fórmulas.

 Cores essencialmente preto e tons de vermelho.

O fluxo deve ser:
Gerar nova simulação, dar um nome para essa simulação, ao abrir ela deve vir com as métricas 'defalt' que te passei e poderá ser modificada e essa simulação deve ser 'salva' e armazenada na lista de simulações, que pode ser aberta e revisitada.

---

Cada linha deve ter um typpy que explica o que é e pra que serve a linha.