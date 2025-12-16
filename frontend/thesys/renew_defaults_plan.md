**Plano de Ajuste — Defaults WTP e Renovações**

**Objetivo**: alinhar os defaults (`wtpConfig`, `tierMetrics`, tickets e durations`) à lógica da planilha, remover ambiguidade e evitar erros de indexação/dupla contagem em renovações.

**Escopo**:
- Arquivos principais: [frontend/src/data/defaultInputs.ts](frontend/src/data/defaultInputs.ts), [frontend/src/lib/calculations.ts](frontend/src/lib/calculations.ts)
- Validações e testes: runner `run_sim_wtp.cjs`, extração/compare com `frontend/thesys/wtp meses.md` (valores esperados).

**Passos (alta prioridade)**
- **Validar arrays mensais**: garantir que todas as arrays mensais tenham exatamente 12 elementos (ex.: `shareOfWalletDesired`, `productTickets`, `mqlDistribution`). Corrigir/truncar/preencher conforme necessário.
- **Padronizar Janeiro=0**: normalizar  índice 0 como 0% em `wtpConfig.[tier].shareOfWalletDesired` (remover uso de `shareOfWalletDesiredJan` e tratar exceções no engine apenas se necessário).
- **Separar tickets de aquisição e expansão e expor no frontend**: `tierMetrics.productTickets` (aquisição) e `wtpConfig.expansionTickets` (expansão) são diferentes por design; manter ambos no defaults, ajustar a engine (`calculations.ts`) para usar `expansionTickets` ao computar revenue de expansão e `productTickets` para aquisição. Além disso, adicionar campos e linhas no frontend para permitir edição independente de `acquisitionTickets` e `expansionTickets` por tier/product.
- **Corrigir distribution sums**: verificar que `productDistribution` e `expansionDistribution` somem ~1.0; ajustar valores inválidos.
- **Confirmar `annualWTP` por tier**: revisar mudanças (ex.: `medium` = 1.000.000) e validar com a planilha.
- **Renovação — comportamento**: manter `remainingClients` por cohort (já implementado) e garantir que renovações decrementem essa base; ajustar se quiser comportamento diferente.

**Passos (validação e testes)**
- **Runtime validation**: adicionar checagens em `calculateMonthlyData` que falhem rápido (throw/warn) quando arrays mensais não tiverem 12 itens ou quando somatórios de distribuição ≠ 1.
- **Simulação comparativa**: rodar `node run_sim_wtp.cjs`, salvar `frontend/temp_test/wtp_engine_output.json` e comparar com `frontend/temp_test/wtp_expected.json` (gerar CSV de diferença por mês/tier).
- **Spot-check Jan/Fev**: validar que `Expansion Goal` e `Revenue Expansion` por tier batam com a planilha (ou justificar divergência).

**Critérios de aceitação**
- Nenhum erro de indexação em runtime (arrays com tamanho incorreto).
- Renovações não contam os mesmos clientes múltiplas vezes (verificado por decrescimento de `remainingClients`).
- Jan/Fev: diferenças <= 1% ou explicado e documentado.

**Risco / Observações**
- Ajustar tickets (aquisição vs expansão) pode alterar resultados historicamente esperados — documentar decisão.
- Existem campos duplicados (ex.: `shareOfWalletDesiredJan`) que aumentam complexidade; preferir única matriz e regra no engine.

**Deploy / Rollout**
- Criar branch `fix/wtp-defaults`.
- Aplicar mudanças e testes localmente (rodar `node run_sim_wtp.cjs`).
- Commit + PR com descrição e CSV de comparação antes/depois.

**Próximo passo sugerido**: se aprovar, eu aplico as correções automáticas (array lengths + Jan=0 + runtime validation) e executo a simulação e a comparação.

---
Se aprovar o plano, responda apenas `APROVAR` e eu começo as alterações.