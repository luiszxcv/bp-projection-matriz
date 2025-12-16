# Validação do Processo de Topline e WTP

## Objetivo
Validar a consistência do cálculo de Topline (divisão por tier e produto) e adesão às premissas de WTP (Willingness to Pay) para os meses de Janeiro e Fevereiro de 2026.

**Fontes de Dados:**
- `frontend/thesys/moredefaults.md` (Representação do BP Plan Completo - 2026-01 e 2026-02)
- `frontend/thesys/premissas-WTP` (Premisas de Expansão e Ativação)

---

## 1. Validação Lógica do Topline (Funnel)
A lógica do funil em `moredefaults.md` apresenta consistência matemática interna para Janeiro e Fevereiro.

### Janeiro 2026
*   **Conversão Geral:**
    *   Leads (13.826) $\rightarrow$ MQL (80%) = 11.058 (Math: ~11.060 - OK)
    *   MQL (11.058) $\rightarrow$ SQL (29,27%) = 3.237 (Math: ~3.236,7 - OK, arredondamento)
    *   SQL (3.237) $\rightarrow$ SAL (107%*) = 3.476 (*Inbound + Outbound boost - OK)
    *   SAL (3.476) $\rightarrow$ WON (29,97%) = 1.042 (Math: ~1.041,7 - OK)
*   **Consistência por Tier:**
    *   Soma dos Wons por Tier (32 Ent + 45 Lrg + 216 Med + 509 Sml + 240 Thy) = **1.042**. (Exato)
    *   Receita Total Won: R$ 21.834.800 (Soma das receitas por tier confere).

### Fevereiro 2026
*   **Conversão Geral:**
    *   Leads (13.488) $\rightarrow$ MQL (80%) = 10.788 (Math: ~10.790 - OK)
    *   MQL $\rightarrow$ SQL $\rightarrow$ SAL $\rightarrow$ WON segue as mesmas taxas ajustadas mensalmente, mantendo a consistência.
    *   Total Wons: 1.018 (Soma dos tiers: 32 + 44 + 211 + 497 + 234 = 1.018 - OK).

---

## 2. Divisão por Produto e Tier (Topline Breakdown)
A distribuição dos produtos dentro de cada Tier foi validada cálculo a cálculo (Quantidade $\times$ Ticket Médio).

**Exemplo: Enterprise (Jan)**
*   **Qtd Won:** 32
*   **Mix de Produtos (Input):**
    *   Saber (60%): 20 clientes (OK)
    *   Ter (10%): 3 clientes (OK)
    *   Executar-Loyalty (20%): 6 clientes (OK)
    *   Potencializar (10%): 3 clientes (OK)
*   **Receita Bruta (Checking):**
    *   $(20 \times 30k) + (3 \times 31.6k) + (6 \times 145k) + (3 \times 0)$
    *   $600k + 94.8k + 870k + 0 = 1.564.8k$
    *   **Resultado:** Confere com o valor "Revenue Won" (R$ 1.564.800) em `moredefaults.md`.

*Conclusão:* As fórmulas de extração de receita baseadas no mix de produtos e tickets estão funcionando corretamente no plano atual (`moredefaults.md`).

---

## 3. Validação Contra Premissas WTP (`premissas-WTP`)
Existe uma **discrepância significativa** entre os valores praticados no Plano (`moredefaults.md` / Excel) e as premissas definidas no arquivo de WTP.

### Comparativo de Preços Unitários (Jan 2026)

A planilha **não está apenas vinculando o ticket maior**, ela está utilizando base de preços **completamente distinta (e muito mais alta)** para certos produtos em relação à premissa WTP.

| Produto | Tier | Preço na Planilha (`moredefaults`) | Preço na Premissa WTP | Diferença |
| :--- | :--- | :--- | :--- | :--- |
| **[Ter]** | Enterprise | **R$ 31.600** | R$ 8.000 | **+295%** |
| **[Ter]** | Large | **R$ 18.000** | R$ 8.000 | **+125%** |
| **[Ter]** | Medium | **R$ 15.000** | R$ 8.000 | **+87%** |
| **[Executar-Loyalty]** | Enterprise | **R$ 145.000** | ~R$ 40.000 | **+262%** |
| **[Executar-Loyalty]** | Large | **R$ 99.000** | ~R$ 40.000 | **+147%** |
| **[Executar-Loyalty]** | Medium | **R$ 49.000** | ~R$ 40.000 | **+22%** |
| **[Saber]** | Enterprise | R$ 30.000 | R$ 30.000 | ✅ Igual |

### Análise da Pergunta "Está vinculando o ticket maior?"
Não é apenas uma questão de escolha entre opções.
1.  **Ticket Médio Final:** O Ticket Médio Enterprise da planilha (R$ 48.900) é resultado matemático (= Receita Total / Qtd Clientes) desses preços unitários inflacionados e do mix escolhido.
2.  **Origem da Divergência:** A planilha atribui preços variáveis ao produto (ex: Ter custa 31k para Enterprise e 15k para Medium), enquanto a premissa WTP tende a fixar o preço do produto (ex: Ter custa 8k independente do Tier, ou com variações menores).

**Conclusão:** A planilha está configurada com uma tabela de preços **ad-hoc muito mais agressiva** do que o documento de premissas WTP sugere.
