# Análise: Linha "potencializar" (SpreadsheetView)

Data: 2025-12-12

Resumo
- Problema: a linha `potencializar` não aparece nos totais do `SpreadsheetView`. Provavelmente não foi adicionada nas seções Toplines, Distribuição (por tier/produto) e Totais onde outros WTP/monetization métricas existem.
- Objetivo: definir a métrica `potencializar`, indicar onde inseri-la (`Toplines`, `Distribuição`, `Totais`) e fornecer instruções mínimas de implementação (sem alterar código agora).

1) Contexto técnico
- Arquivo principal: `src/components/SpreadsheetView.tsx` ([arquivo inteiro](src/components/SpreadsheetView.tsx#L1-L3208)).
- Fonte de dados usada por outras métricas WTP: cada mês em `monthlyData[]` contém `wtpData` por `tier` (ex.: `m.wtpData[tier].goLiveClients`, `m.wtpData[tier].monetizationPotential`, `m.wtpData[tier].shareOfWallet`, etc.).
- Padrão atual de exibição: as linhas usam `monthlyData.map((m, i) => <SpreadsheetCell value={...} />)` e os totais usam `monthlyData.reduce(...)` ou `monthlyData[11]` para total ano.

2) Propostas de definição da métrica `potencializar`
Opções (escolha a que fizer sentido de produto/negócio):

Opção A (recomendada): "Potencializar" = soma mensal da propriedade `monetizationPotential` do WTP por tier.
- Fórmula por mês: potencializar(m) = TIERS.reduce((sum, tier) => sum + (m.wtpData?.[tier]?.monetizationPotential ?? 0), 0)
- Racional: existe já o campo `monetizationPotential` e reflete potencial econômico imediato.

Opção B (alternativa): multiplicar potencial por clientes go-live
- Fórmula: TIERS.reduce((sum, tier) => sum + ((m.wtpData?.[tier]?.monetizationPotential ?? 0) * (m.wtpData?.[tier]?.goLiveClients ?? 0)), 0)
- Racional: considera tanto potencial por cliente quanto número de clientes em go-live.

Opção C (combinação com shareOfWallet): usar `shareOfWallet` para ponderar
- Fórmula: TIERS.reduce((sum, tier) => sum + ((m.wtpData?.[tier]?.shareOfWallet ?? 0) * (m.wtpData?.[tier]?.goLiveClients ?? 0)), 0)

Recomendação: começar por Opção A (simples, consistente com campos já existentes). Se o time quiser um indicador mais operacional, migrar para Opção B.

3) Pontos exatos de inserção em `SpreadsheetView`
- Toplines (resumo inicial / WTP): inserir uma linha `potencializar` logo abaixo das linhas WTP existentes (por exemplo, após linhas `saturationIndex` / `monetizationPotential` se já existirem). Use `format="currency"` ou `format="number"` conforme unidade do campo.
- Distribuição (por tier / produto): adicionar uma linha por `tier` exibindo a contribuição `potencializar` daquele tier; ou uma linha por produto se for relevante (usar `m.wtpData?.[tier]?.monetizationPotentialByProduct` se existir).
- Totais (seção Totais / Receitas): adicionar uma linha `$ Potencializar` próxima a `$ Receita Saber` / `$ Receita Executar` e ao lado dos totais anuais (usar `monthlyData.reduce` para coluna final).

Exemplo de snippet (para Toplines / Totais) — inserir seguindo o padrão existente:

```tsx
// dentro do render, alinhado com outras linhas que usam monthlyData.map
<div className="flex row-hover">
  <RowHeader label="$ Potencializar" tooltip="Potencial de monetização" className="pl-6" />
  {monthlyData.map((m, i) => {
    const val = TIERS.reduce((s, tier) => s + (m.wtpData?.[tier]?.monetizationPotential ?? 0), 0);
    return <SpreadsheetCell key={i} value={val} format="currency" />;
  })}
  <SpreadsheetCell
    value={monthlyData.reduce((sum, m) => sum + TIERS.reduce((s, tier) => s + (m.wtpData?.[tier]?.monetizationPotential ?? 0), 0), 0)}
    format="currency"
    className="bg-primary/10"
  />
</div>
```

Para inserção por `tier` (Distribuição):

```tsx
{TIERS.map(tier => (
  <div key={`potencial-${tier}`} className="flex row-hover">
    <RowHeader label={`Potencial ${TIER_LABELS[tier]}`} className="pl-6" />
    {monthlyData.map((m, i) => (
      <SpreadsheetCell key={i} value={m.wtpData?.[tier]?.monetizationPotential ?? 0} format="currency" />
    ))}
    <SpreadsheetCell value={monthlyData.reduce((s, m) => s + (m.wtpData?.[tier]?.monetizationPotential ?? 0), 0)} format="currency" className="bg-primary/10" />
  </div>
))}
```

4) Boas práticas de implementação (recomendadas)
- Centralizar cálculo: adicionar um helper no topo do componente (ou em `lib/utils.ts`) como `function sumWtpField(m, field){ return TIERS.reduce(...); }` para reduzir duplicação e evitar erros de `undefined`.
- Segurança: usar optional chaining (`?.`) e fallback `?? 0` (padrão já adotado no arquivo) para evitar `TypeError` quando um mês não tiver `wtpData` preenchido.
- Export: incluir a linha `potencializar` também em `exportToExcel()` (no bloco que adiciona linhas ao workbook), para que a exportação reflita o novo campo.
- Labels/UA: confirmar com produto se o label deve ser `$ Potencializar`, `Potencializar` ou outro termo; e se unidade é `currency` ou `number`.

5) Validação e testes
- Typecheck: rodar `npx tsc --noEmit` para garantir compatibilidade de tipos.
- Dev server: `npm run dev` e navegar até a página do `Spreadsheet` para checar visualmente os valores mensais e total anual.
- Export: testar a função de exportação (botão export) para confirmar inclusão em XLSX/CSV.
- Teste de borda: testar quando `monthlyData` tem meses vazios (usar `?.` e `?? 0`).

6) Impacto esperado
- Mudança não invasiva: apenas leitura de novos campos `wtpData` e renderização; nenhum cálculo core existente é alterado.
- Se `monetizationPotential` estiver ausente, valores aparecem como 0.

7) Próximo passo sugerido
- Implementar a adição nas 3 áreas (`Toplines`, `Distribuição`, `Totais`) conforme o snippet acima; centralizar a lógica em um helper; ajustar `exportToExcel()`.

---

Arquivo de referência no repositório:
- `src/components/SpreadsheetView.tsx` — render das linhas e totais ([ver arquivo](src/components/SpreadsheetView.tsx#L1-L3208)).

Se desejar, implemento agora as alterações no código e testo localmente (typecheck + start dev). Quer que eu prossiga com a implementação?