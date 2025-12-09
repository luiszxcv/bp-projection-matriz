# Por que as contratações sobem e descem mês a mês

Breve explicação das principais causas (resumido):

- **Variação de investimento / CPL → MQLs → ativações:** se o investimento mensal aumenta (ou o CPL diminui), geram-se mais MQLs → mais SALs/WONs → mais ativações de clientes. Mais clientes novos aumentam a demanda por horas (Saber/Executar), aumentando squads e, consequentemente, o headcount necessário (contratações sobem).

- **Rampa de preço (ticket) e mix de produto:** variações trimestrais nos tickets (ex.: tickets maiores em Q3/Q4) mudam a receita, mas as contratações seguem principalmente o número de clientes e horas necessárias — não só a receita.

- **Conversões com delay (Saber → Executar):** conversões ocorrem após prazo (ex.: 60 dias). isso provoca picos de demanda em meses futuros (lag). Ex.: muitos projetos Saber em Jan só geram necessidade de mais Executar em Mar.

- **Turnover mensal (ex.: 7%):** toda mês há reposição necessária para substituir saídas. Isso gera uma demanda constante de contratações mesmo sem crescimento.

- **Realocação interna (redeploy):** se há excesso de HC em Executar, parte deste pool pode ser realocada para Saber, reduzindo contratações líquidas para Saber — isso faz cair contratações mesmo que a demanda de projetos suba.

- **Contratações de vendas (SDR / Closers):** são calculadas a partir de MQLs / SALs (ex.: 200 MQL por SDR, 50 SAL por Closer). Como o headcount de vendas persiste entre meses, aumentos rápidos de MQLs geram contratações até atingir o novo patamar; quedas de demanda normalmente resultam em ZERO novas contratações (não há demissões automáticas no modelo), então as contratações mês a mês podem oscilar muito.


Exemplos simples e curtos:

- Exemplo 1 — pico seguido de queda sem demissões:
  - Jan: precisa-se de 2 squads (18 pessoas).
  - Feb: demanda sobe → agora precisa-se de 3 squads (27 pessoas).
  - Turnover Feb (7% do HC anterior): ~1 pessoa.
  - Contratações em Feb = (27 - 18) + 1 ≈ 10 → contratações altas em Feb.
  - Mar: demanda volta para 2 squads (18 pessoas). Model não prevê demissões automáticas → Contratações em Mar = max(0, 18 - 27 + turnover) = 0. Resultado: sobe muito em Feb, cai para zero em Mar.

- Exemplo 2 — efeito de conversão com lag:
  - Muitos clientes contratam `Saber` em Jan. Conversão para `Executar` acontece em Mar (delay 2 meses).
  - Em Jan contrata-se pessoal para executar projetos `Saber` (projetos pontuais); em Mar, quando as conversões entram na base, aumenta-se a demanda recorrente de horas em `Executar` → picos de contratações aparecem em Mar, não em Jan.


Resumo prático (o que olhar no spreadsheet / código):

- `src/lib/calculations.ts`: contratações calculadas a partir de squads → `hc = squads * headcount`;
- Turnover fixo (7%) é aplicado sobre HC do mês anterior; é somado às necessidades de crescimento para definir `hires`;
- Há lógica de realocação (`redeployableFromExecutar`) que reduz contratações de `Saber` quando há excedente em `Executar`;
- Variação mensal de `investmentMonthly`, `cplMonthly` e tickets por produto geram oscilações em MQLs/ativações → impacto em contratações com delays.

Se quiser, eu:

- mostro os meses onde o modelo está contratando mais/menos (tabela resumida);
- explico passo-a-passo um mês específico do `calculateMonthlyData`.

Arquivo gerado a partir da análise de `src/lib/calculations.ts` e `src/data/defaultInputs.ts`.
