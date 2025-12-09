import path from 'path';
import { promises as fs } from 'fs';

(async () => {
  // Use ts-node runtime when executed via npx in the project root
  // This file uses project TS config and path aliases; run with:
  // npx ts-node -r tsconfig-paths/register scripts/check-dre.ts

  const inputsModule = await import('../src/data/defaultInputs');
  const calcModule = await import('../src/lib/calculations');

  const { defaultInputs } = inputsModule;
  const { calculateMonthlyData } = calcModule;

  for (const usar of [true, false]) {
    const inputs = JSON.parse(JSON.stringify(defaultInputs));
    inputs.dreConfig.usarLinhasGerenciais = usar;

    const months = calculateMonthlyData(inputs);

    const totals = {
      receitaBrutaRecebida: months.reduce((s: number, m: any) => s + m.dre.receitaBrutaRecebida, 0),
      receitaLiquida: months.reduce((s: number, m: any) => s + m.dre.receitaLiquida, 0),
      cspTotal: months.reduce((s: number, m: any) => s + m.dre.cspTotal, 0),
      margemOperacional: months.reduce((s: number, m: any) => s + m.dre.margemOperacional, 0),
      totalMarketingVendas: months.reduce((s: number, m: any) => s + m.dre.totalMarketingVendas, 0),
      margemContribuicao: months.reduce((s: number, m: any) => s + m.dre.margemContribuicao, 0),
    };

    console.log('--- usarLinhasGerenciais =', usar, '---');
    console.log(totals);

    // Print breakdown of marketing/vendas components for month totals
    const comps = months.reduce((acc: any, m: any) => {
      acc.comissaoVendasActivation = (acc.comissaoVendasActivation || 0) + m.dre.salesMetrics.comissaoVendasActivation;
      acc.comissaoFarmerExpansion = (acc.comissaoFarmerExpansion || 0) + m.dre.salesMetrics.comissaoFarmerExpansion;
      acc.comissaoOperacao = (acc.comissaoOperacao || 0) + m.dre.salesMetrics.comissaoOperacao;
      acc.remuneracaoCloser = (acc.remuneracaoCloser || 0) + m.dre.salesMetrics.remuneracaoCloser;
      acc.remuneracaoSDR = (acc.remuneracaoSDR || 0) + m.dre.salesMetrics.remuneracaoSDR;
      acc.remuneracaoFarmer = (acc.remuneracaoFarmer || 0) + m.dre.salesMetrics.remuneracaoFarmer;
      acc.bonusCampanhasActivation = (acc.bonusCampanhasActivation || 0) + m.dre.salesMetrics.bonusCampanhasActivation;
      acc.bonusCampanhasExpansion = (acc.bonusCampanhasExpansion || 0) + m.dre.salesMetrics.bonusCampanhasExpansion;
      acc.estruturaSuporte = (acc.estruturaSuporte || 0) + m.dre.salesMetrics.estruturaSuporte;
      acc.despesasVisitasActivation = (acc.despesasVisitasActivation || 0) + m.dre.salesMetrics.despesasVisitasActivation;
      acc.despesasVisitasExpansion = (acc.despesasVisitasExpansion || 0) + m.dre.salesMetrics.despesasVisitasExpansion;
      acc.folhaGestaoComercial = (acc.folhaGestaoComercial || 0) + m.dre.salesMetrics.folhaGestaoComercial;
      return acc;
    }, {});

    console.log('Marketing & Vendas breakdown:', comps);
  }
})();
