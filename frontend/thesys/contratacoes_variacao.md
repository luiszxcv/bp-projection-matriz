# Por que as contratações sobem e descem mês a mês — análise + mês a mês

Resumo curto das causas (rápido):

- **Investimento / CPL → MQLs → ativações:** o volume de investimento mensal dividido pelo CPL define MQLs; mais MQLs → mais SALs/WONs → mais ativações → mais clientes a atender → mais horas/squads → mais HC (contratações).
- **Rampa de tickets e mix de produtos:** tickets maiores em determinados trimestres aumentam receita por cliente, mas as contratações são mais sensíveis ao número de clientes e às horas necessárias por cliente do que à receita por cliente.
- **Conversões com delay (Saber → Executar):** aquisições de `Saber` têm conversão para `Executar` com lag (ex.: 60 dias). isso desloca a necessidade de contratações de execução para meses futuros.
- **Turnover (7% no modelo):** gera reposição recorrente (p.ex. com HC inicial `Executar` = 160, o turnover mensal inicial é ≈11 pessoas). mesmo sem crescimento, o modelo prevê hires para repor saídas.
- **Realocação interna (redeploy):** excedente em `Executar` pode reduzir contratações em `Saber` ao realocar pessoas, baixando contratações líquidas.
- **Vendas (SDR / Closers):** calculadas a partir de MQLs / SALs (200 MQL/SDR; 50 SAL/Closer). headcount de vendas persiste entre meses → aumentos rápidos geram picos de contratações até atingir o novo patamar; quedas não geram demissões automáticas no modelo, logo as contratações podem cair para 0 meses após um pico.


Dados usados para a análise (origem: `src/data/defaultInputs.ts`):

- `investmentMonthly` (R$): [400k, 600k, 900k, 1.0M, 1.0M, 1.1M, 1.0M, 1.0M, 1.0M, 900k, 800k, 600k]
- `cplMonthly`: constante R$ 900
- HC inicial: `saber` = 3, `executar` = 160
- Turnover: 7% ao mês
- Delay Saber → Executar: 60 dias (conversões processadas no mês N+2)


Estimativas rápidas por mês (MQLs e SDRs) e impacto esperado nas contratações

Observação sobre cálculos abaixo:
- `MQLs` = round(investment / CPL)
- `SDRs required` = ceil(MQLs / 200)
- `Turnover inicial` (mês 1): `Saber` ≈ round(3*0.07)=0, `Executar` ≈ round(160*0.07)=11 — esse é um exemplo de reposição mensal típica até o HC mudar.

- Mês 1 (Janeiro)
  - Investimento: R$400.000 → MQLs ≈ 444
  - SDRs requeridos ≈ 3
  - Impacto: baixa pressão de contratação de vendas (subir de 1 SDR inicial para ~3 ao longo do mês, gerando hires de SDR). Em `Executar` há reposição por turnover (~11 hires) mesmo sem crescimento. Aquisições `Saber` iniciam projetos pontuais cuja conversão para `Executar` acontecerá em Mar.

- Mês 2 (Fevereiro)
  - Investimento: R$600.000 → MQLs ≈ 667
  - SDRs requeridos ≈ 4 (aumento 1 SDR sobre mês 1)
  - Impacto: aumento de hires de vendas (SDR) para acompanhar MQLs; mais SALs/WONs esperados → mais ativações à frente. Ainda não vemos o efeito das conversões de `Saber` (lag).

- Mês 3 (Março)
  - Investimento: R$900.000 → MQLs ≈ 1.000
  - SDRs requeridos ≈ 5
  - Impacto: novo salto em necessidade de SDRs/Closers; além disso, conversões de clientes `Saber` iniciados em Jan começam a entrar em `Executar` (efeito de 60 dias) — isto cria pressão adicional por HC de `Executar` (squads/contas) neste mês.

- Mês 4 (Abril)
  - Investimento: R$1.000.000 → MQLs ≈ 1.111
  - SDRs requeridos ≈ 6
  - Impacto: mantém alta necessidade de vendas; tickets em Q2 começam a subir para alguns tiers (default tem rampa trimestral), aumentando receita por ativação — porém contratações de operação dependem do número de clientes (horas), então efeito direto nas contratações operacionais é mais pelo volume de clientes que pela receita.

- Mês 5 (Maio)
  - Investimento: R$1.000.000 → MQLs ≈ 1.111
  - SDRs requeridos ≈ 6
  - Impacto: estabilização do pico de vendas (já com mais SDRs contratados nos meses anteriores). Dependendo de quantos WONS foram convertidos, squads adicionais podem ser necessários para `Saber` (projetos) e, daqui a 2 meses, para `Executar`.

- Mês 6 (Junho)
  - Investimento: R$1.100.000 → MQLs ≈ 1.222
  - SDRs requeridos ≈ 7
  - Impacto: novo aumento de pressão em vendas; potencial para novas contratações de operação se ativações efetivas aumentarem. Turnover continua exigindo reposição em `Executar` (~11 por mês, enquanto HC não reduzir).

- Mês 7 (Julho)
  - Investimento: R$1.000.000 → MQLs ≈ 1.111
  - SDRs requeridos ≈ 6
  - Impacto: leve recuo do pico de Junho — menos pressão incremental, mas hires feitos em meses anteriores persistem (modelo não demite automaticamente), logo contratações mensais podem cair para zero em relação ao pico anterior.

- Mês 8 (Agosto)
  - Investimento: R$1.000.000 → MQLs ≈ 1.111
  - SDRs requeridos ≈ 6
  - Impacto: situação similar a Julho; conversões de `Saber` de Maio/Junho podem gerar demandas adicionais de `Executar` neste período (lag contínuo). Redeploy entre `Executar` → `Saber` pode reduzir contratações líquidas para `Saber` se houver excedente.

- Mês 9 (Setembro)
  - Investimento: R$1.000.000 → MQLs ≈ 1.111
  - SDRs requeridos ≈ 6
  - Impacto: tickets costumam estar mais altos em Q3 em alguns tiers — isso aumenta receita e pode justificar manutenção de squads; contratações operacionais seguem sensíveis ao número acumulado de clientes ativos.

- Mês 10 (Outubro)
  - Investimento: R$900.000 → MQLs ≈ 1.000
  - SDRs requeridos ≈ 5
  - Impacto: redução moderada em MQLs → menos pressão imediata para hires de SDR; contudo hires realizados nos meses anteriores permanecem. Se a base acumulada de clientes aumentar nos meses anteriores, ainda teremos pressão por squads/HC.

- Mês 11 (Novembro)
  - Investimento: R$800.000 → MQLs ≈ 889
  - SDRs requeridos ≈ 5
  - Impacto: continuação da desaceleração de investimento; vendas podem não requerer novas contratações, e mensais de hires podem cair. Turnover continua exigindo reposições regulares.

- Mês 12 (Dezembro)
  - Investimento: R$600.000 → MQLs ≈ 667
  - SDRs requeridos ≈ 4
  - Impacto: menor pressão de aquisição; modelo provavelmente não realizará contratações significativas de vendas (já tem o estoque de hires dos meses anteriores). Em operação, ainda haverá necessidade de repor turnover e de ajustar squads conforme base ativa acumulada durante o ano.


Principais aprendizados práticos (conclusão)

- Picos de investimento (Mar–Jun) criam MQLs que aumentam vendas (SDR/Closers) e, com lag, pressão sobre `Executar` (contratações operacionais) — por isso vê-se aumentos fortes em meses de alta e quedas subsequentes.
- O turnover (7%) gera uma linha constante de hires; no caso `Executar` com HC inicial 160, isso representa ≈11 hires/mês de reposição até o HC se ajustar.
- O modelo evita demissões automáticas, então picos de contratações (vendas ou operação) tendem a produzir meses com hires altos seguidos de meses com hires baixos/zero (quando a demanda recua).
- A realocação (`redeployableFromExecutar`) pode reduzir contratações líquidas para `Saber` ao usar excesso de HC de `Executar`.


Quer que eu:

- gere uma tabela numérica dos 12 meses com `investment`, `MQLs`, `SDRs required`, `turnover inicial (Saber/Executar)` e uma coluna qualitativa de `pressão de hires` — pronta para revisão, ou
- execute a simulação completa e gere os números exatos de `hc`, `turnover`, `hires` e `hires com redeploy` por mês (se quiser o output numérico exato eu preciso rodar o cálculo no ambiente — quer que eu rode e entregue a tabela?).

