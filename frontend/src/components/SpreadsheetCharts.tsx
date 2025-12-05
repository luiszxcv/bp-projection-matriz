import React, { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MONTHS, PRODUCT_LABELS } from '@/data/defaultInputs';
import { MonthlyData, Product, Tier } from '@/types/simulation';
import { formatCurrency, formatNumber } from '@/lib/calculations';

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  isAccumulated: boolean;
  onToggleAccumulated: () => void;
  showChartType?: boolean;
  isStackedBar?: boolean;
  onToggleChartType?: () => void;
}

function ChartContainer({ 
  title, 
  children, 
  isAccumulated, 
  onToggleAccumulated,
  showChartType = false,
  isStackedBar = false,
  onToggleChartType
}: ChartContainerProps) {
  return (
    <div className="bg-card/50 border border-border rounded-lg p-4 mb-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-4">
          {/* Toggle Acumulado */}
          <div className="flex items-center gap-2">
            <Label htmlFor={`toggle-${title}`} className="text-xs text-muted-foreground">
              Mês
            </Label>
            <Switch
              id={`toggle-${title}`}
              checked={isAccumulated}
              onCheckedChange={onToggleAccumulated}
            />
            <Label htmlFor={`toggle-${title}`} className="text-xs text-muted-foreground">
              Acumulado
            </Label>
          </div>
          
          {/* Toggle Tipo de Gráfico */}
          {showChartType && onToggleChartType && (
            <div className="flex items-center gap-2">
              <Label htmlFor={`chart-type-${title}`} className="text-xs text-muted-foreground">
                Linhas
              </Label>
              <Switch
                id={`chart-type-${title}`}
                checked={isStackedBar}
                onCheckedChange={onToggleChartType}
              />
              <Label htmlFor={`chart-type-${title}`} className="text-xs text-muted-foreground">
                Barras 100%
              </Label>
            </div>
          )}
        </div>
      </div>
      <div className="h-[200px]">
        {children}
      </div>
    </div>
  );
}

// Cores para os produtos
const PRODUCT_COLORS: Record<Product, string> = {
  saber: '#ef4444',
  ter: '#f97316',
  executarNoLoyalty: '#eab308',
  executarLoyalty: '#22c55e',
  potencializar: '#3b82f6',
};

// Cores para os tiers
const TIER_COLORS: Record<Tier, string> = {
  enterprise: '#8b5cf6',
  large: '#3b82f6',
  medium: '#22c55e',
  small: '#eab308',
  tiny: '#f97316',
};

const TIER_LABELS: Record<Tier, string> = {
  enterprise: 'Enterprise',
  large: 'Large',
  medium: 'Medium',
  small: 'Small',
  tiny: 'Tiny',
};

// Custom label formatter for currency
const currencyLabelFormatter = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toString();
};

// Custom label formatter for numbers
const numberLabelFormatter = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
};

const TIERS: Tier[] = ['enterprise', 'large', 'medium', 'small', 'tiny'];
const PRODUCTS: Product[] = ['saber', 'ter', 'executarNoLoyalty', 'executarLoyalty', 'potencializar'];

interface InvestmentChartProps {
  investmentMonthly: number[];
}

export function InvestmentChart({ investmentMonthly }: InvestmentChartProps) {
  const [isAccumulated, setIsAccumulated] = useState(false);
  const [isStackedBar, setIsStackedBar] = useState(false);

  const data = MONTHS.map((month, idx) => {
    const value = investmentMonthly[idx] || 0;
    return {
      month,
      value: isAccumulated 
        ? investmentMonthly.slice(0, idx + 1).reduce((sum, v) => sum + (v || 0), 0)
        : value,
    };
  });

  return (
    <ChartContainer
      title="📈 Investimento Mensal"
      isAccumulated={isAccumulated}
      onToggleAccumulated={() => setIsAccumulated(!isAccumulated)}
      showChartType={true}
      isStackedBar={isStackedBar}
      onToggleChartType={() => setIsStackedBar(!isStackedBar)}
    >
      <ResponsiveContainer width="100%" height="100%">
        {isStackedBar ? (
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
            <YAxis 
              tick={{ fill: '#888', fontSize: 10 }} 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number) => [formatCurrency(value), 'Investimento']}
            />
            <Bar dataKey="value" fill="#ef4444" />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="investmentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
          <YAxis 
            tick={{ fill: '#888', fontSize: 10 }} 
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number) => [formatCurrency(value), 'Investimento']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#ef4444"
            fill="url(#investmentGradient)"
            strokeWidth={2}
          >
            <LabelList dataKey="value" position="top" formatter={currencyLabelFormatter} fill="#888" fontSize={9} />
          </Area>
        </AreaChart>
        )}
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface MQLsChartProps {
  monthlyData: MonthlyData[];
}

export function MQLsChart({ monthlyData }: MQLsChartProps) {
  const [isAccumulated, setIsAccumulated] = useState(false);
  const [isStackedBar, setIsStackedBar] = useState(false);

  const data = MONTHS.map((month, idx) => {
    const monthData = monthlyData[idx];
    const mqls = monthData ? Object.values(monthData.mqls).reduce((s, v) => s + v, 0) : 0;
    return {
      month,
      value: isAccumulated
        ? monthlyData.slice(0, idx + 1).reduce((sum, m) => 
            sum + Object.values(m.mqls).reduce((s, v) => s + v, 0), 0)
        : mqls,
    };
  });

  return (
    <ChartContainer
      title="📊 MQLs Gerados"
      isAccumulated={isAccumulated}
      onToggleAccumulated={() => setIsAccumulated(!isAccumulated)}
      showChartType={true}
      isStackedBar={isStackedBar}
      onToggleChartType={() => setIsStackedBar(!isStackedBar)}
    >
      <ResponsiveContainer width="100%" height="100%">
        {isStackedBar ? (
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
            <YAxis tick={{ fill: '#888', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number) => [formatNumber(value), 'MQLs']}
            />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="mqlsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
          <YAxis tick={{ fill: '#888', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number) => [formatNumber(value), 'MQLs']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            fill="url(#mqlsGradient)"
            strokeWidth={2}
          >
            <LabelList dataKey="value" position="top" formatter={numberLabelFormatter} fill="#888" fontSize={9} />
          </Area>
        </AreaChart>
        )}
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface TotalRevenueChartProps {
  monthlyData: MonthlyData[];
}

export function TotalRevenueChart({ monthlyData }: TotalRevenueChartProps) {
  const [isAccumulated, setIsAccumulated] = useState(false);
  const [isStackedBar, setIsStackedBar] = useState(false);

  const data = MONTHS.map((month, idx) => {
    const monthData = monthlyData[idx];
    const revenue = monthData?.totalRevenue || 0;
    return {
      month,
      value: isAccumulated
        ? monthlyData.slice(0, idx + 1).reduce((sum, m) => sum + m.totalRevenue, 0)
        : revenue,
    };
  });

  return (
    <ChartContainer
      title="💰 Receita Total"
      isAccumulated={isAccumulated}
      onToggleAccumulated={() => setIsAccumulated(!isAccumulated)}
      showChartType={true}
      isStackedBar={isStackedBar}
      onToggleChartType={() => setIsStackedBar(!isStackedBar)}
    >
      <ResponsiveContainer width="100%" height="100%">
        {isStackedBar ? (
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
            <YAxis 
              tick={{ fill: '#888', fontSize: 10 }} 
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number) => [formatCurrency(value), 'Receita']}
            />
            <Bar dataKey="value" fill="#22c55e" />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
          <YAxis 
            tick={{ fill: '#888', fontSize: 10 }} 
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number) => [formatCurrency(value), 'Receita']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            fill="url(#revenueGradient)"
            strokeWidth={2}
          >
            <LabelList dataKey="value" position="top" formatter={currencyLabelFormatter} fill="#888" fontSize={9} />
          </Area>
        </AreaChart>
        )}
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface RevenueByProductChartProps {
  monthlyData: MonthlyData[];
}

export function RevenueByProductChart({ monthlyData }: RevenueByProductChartProps) {
  const [isAccumulated, setIsAccumulated] = useState(false);
  const [isStackedBar, setIsStackedBar] = useState(false);

  const data = MONTHS.map((month, idx) => {
    const monthData = monthlyData[idx];
    
    const getProductRevenue = (product: Product) => {
      if (!monthData) return 0;
      return TIERS.reduce((sum, tier) => {
        return sum + 
          monthData.revenueByTierProduct[tier][product] + 
          monthData.renewalRevenue[tier][product] + 
          monthData.expansionRevenue[tier][product];
      }, 0);
    };

    const getAccumulatedProductRevenue = (product: Product) => {
      return monthlyData.slice(0, idx + 1).reduce((sum, m) => {
        return sum + TIERS.reduce((s, tier) => {
          return s + 
            m.revenueByTierProduct[tier][product] + 
            m.renewalRevenue[tier][product] + 
            m.expansionRevenue[tier][product];
        }, 0);
      }, 0);
    };

    const result: Record<string, string | number> = { month };
    PRODUCTS.forEach(product => {
      result[product] = isAccumulated 
        ? getAccumulatedProductRevenue(product) 
        : getProductRevenue(product);
    });
    return result;
  });

  return (
    <ChartContainer
      title="📊 Receita por Produto"
      isAccumulated={isAccumulated}
      onToggleAccumulated={() => setIsAccumulated(!isAccumulated)}
      showChartType={true}
      isStackedBar={isStackedBar}
      onToggleChartType={() => setIsStackedBar(!isStackedBar)}
    >
      <ResponsiveContainer width="100%" height="100%">
        {isStackedBar ? (
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} stackOffset="expand">
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
            <YAxis 
              tick={{ fill: '#888', fontSize: 10 }} 
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number, name: string, props: any) => {
                const total = PRODUCTS.reduce((sum, p) => sum + (props.payload[p] as number || 0), 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return [`${formatCurrency(value)} (${percentage}%)`, PRODUCT_LABELS[name as Product] || name];
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: 10 }}
              formatter={(value) => PRODUCT_LABELS[value as Product] || value}
            />
            {PRODUCTS.map(product => (
              <Bar
                key={product}
                dataKey={product}
                stackId="a"
                fill={PRODUCT_COLORS[product]}
              />
            ))}
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
            <YAxis 
              tick={{ fill: '#888', fontSize: 10 }} 
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number, name: string) => [
                formatCurrency(value), 
                PRODUCT_LABELS[name as Product] || name
              ]}
            />
            <Legend 
              wrapperStyle={{ fontSize: 10 }}
              formatter={(value) => PRODUCT_LABELS[value as Product] || value}
            />
            {PRODUCTS.map(product => (
              <Line
                key={product}
                type="monotone"
                dataKey={product}
                stroke={PRODUCT_COLORS[product]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// ============================================
// REVENUE BY TIER CHART
// ============================================
interface RevenueByTierChartProps {
  monthlyData: MonthlyData[];
}

export function RevenueByTierChart({ monthlyData }: RevenueByTierChartProps) {
  const [isAccumulated, setIsAccumulated] = useState(false);
  const [isStackedBar, setIsStackedBar] = useState(false);

  const data = MONTHS.map((month, idx) => {
    const monthData = monthlyData[idx];
    
    const getTierRevenue = (tier: Tier) => {
      if (!monthData) return 0;
      // Receita de novos clientes + renovações + expansões + legados
      return PRODUCTS.reduce((sum, product) => {
        return sum + 
          monthData.revenueByTierProduct[tier][product] + 
          monthData.renewalRevenue[tier][product] + 
          monthData.expansionRevenue[tier][product];
      }, 0) + monthData.legacyRevenue[tier];
    };

    const getAccumulatedTierRevenue = (tier: Tier) => {
      return monthlyData.slice(0, idx + 1).reduce((sum, m) => {
        return sum + PRODUCTS.reduce((s, product) => {
          return s + 
            m.revenueByTierProduct[tier][product] + 
            m.renewalRevenue[tier][product] + 
            m.expansionRevenue[tier][product];
        }, 0) + m.legacyRevenue[tier];
      }, 0);
    };

    const result: Record<string, string | number> = { month };
    TIERS.forEach(tier => {
      result[tier] = isAccumulated 
        ? getAccumulatedTierRevenue(tier) 
        : getTierRevenue(tier);
    });
    return result;
  });

  return (
    <ChartContainer
      title="🏢 Receita por Tier"
      isAccumulated={isAccumulated}
      onToggleAccumulated={() => setIsAccumulated(!isAccumulated)}
      showChartType={true}
      isStackedBar={isStackedBar}
      onToggleChartType={() => setIsStackedBar(!isStackedBar)}
    >
      <ResponsiveContainer width="100%" height="100%">
        {isStackedBar ? (
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} stackOffset="expand">
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
            <YAxis 
              tick={{ fill: '#888', fontSize: 10 }} 
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number, name: string, props: any) => {
                const total = TIERS.reduce((sum, t) => sum + (props.payload[t] as number || 0), 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return [`${formatCurrency(value)} (${percentage}%)`, TIER_LABELS[name as Tier] || name];
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: 10 }}
              formatter={(value) => TIER_LABELS[value as Tier] || value}
            />
            {TIERS.map(tier => (
              <Bar
                key={tier}
                dataKey={tier}
                stackId="a"
                fill={TIER_COLORS[tier]}
              />
            ))}
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
            <YAxis 
              tick={{ fill: '#888', fontSize: 10 }} 
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number, name: string) => [
                formatCurrency(value), 
                TIER_LABELS[name as Tier] || name
              ]}
            />
            <Legend 
              wrapperStyle={{ fontSize: 10 }}
              formatter={(value) => TIER_LABELS[value as Tier] || value}
            />
            {TIERS.map(tier => (
              <Line
                key={tier}
                type="monotone"
                dataKey={tier}
                stroke={TIER_COLORS[tier]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface TotalClientsChartProps {
  monthlyData: MonthlyData[];
}

export function TotalClientsChart({ monthlyData }: TotalClientsChartProps) {
  const [isAccumulated, setIsAccumulated] = useState(true); // Default acumulado para clientes
  const [isStackedBar, setIsStackedBar] = useState(false);

  const data = MONTHS.map((month, idx) => {
    const monthData = monthlyData[idx];
    
    // Clientes novos do mês
    const newClients = monthData ? TIERS.reduce((sum, tier) => {
      return sum + PRODUCTS.reduce((s, product) => s + monthData.activeClients[tier][product], 0);
    }, 0) : 0;
    
    // Clientes legados
    const legacyClients = monthData ? TIERS.reduce((sum, tier) => sum + monthData.legacyClients[tier], 0) : 0;
    
    if (isAccumulated) {
      // Total acumulado de clientes ativos
      const totalActive = monthData?.totalActiveClients || 0;
      return { month, value: totalActive };
    } else {
      // Novos clientes apenas deste mês
      return { month, value: newClients };
    }
  });

  return (
    <ChartContainer
      title="👥 Clientes Totais"
      isAccumulated={isAccumulated}
      onToggleAccumulated={() => setIsAccumulated(!isAccumulated)}
      showChartType={true}
      isStackedBar={isStackedBar}
      onToggleChartType={() => setIsStackedBar(!isStackedBar)}
    >
      <ResponsiveContainer width="100%" height="100%">
        {isStackedBar ? (
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
            <YAxis tick={{ fill: '#888', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number) => [formatNumber(value), isAccumulated ? 'Total Clientes' : 'Novos Clientes']}
            />
            <Bar dataKey="value" fill="#8b5cf6" />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="clientsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
          <YAxis tick={{ fill: '#888', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
            formatter={(value: number) => [formatNumber(value), isAccumulated ? 'Total Clientes' : 'Novos Clientes']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#8b5cf6"
            fill="url(#clientsGradient)"
            strokeWidth={2}
          >
            <LabelList dataKey="value" position="top" formatter={numberLabelFormatter} fill="#888" fontSize={9} />
          </Area>
        </AreaChart>
        )}
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// ============================================
// CAPACITY CHART - Headcount Evolution
// ============================================
interface CapacityChartProps {
  monthlyData: MonthlyData[];
}

export function CapacityChart({ monthlyData }: CapacityChartProps) {
  const [isStackedBar, setIsStackedBar] = useState(false);
  
  const data = monthlyData.map((m, i) => ({
    month: MONTHS[i],
    hcSaber: m.capacityPlan.hcSaber,
    hcExecutar: m.capacityPlan.hcExecutar,
    totalHC: m.capacityPlan.totalHC,
    squadsSaber: m.capacityPlan.squadsSaber,
    squadsExecutar: m.capacityPlan.squadsExecutar,
  }));

  return (
    <div className="bg-card/50 border border-border rounded-lg p-4 mb-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">👥 Headcount por Tipo</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="capacity-chart-type" className="text-xs">Tipo:</Label>
          <Switch
            id="capacity-chart-type"
            checked={isStackedBar}
            onCheckedChange={setIsStackedBar}
            className="h-5 w-9"
          />
          <span className="text-xs text-muted-foreground w-16 text-right">
            {isStackedBar ? 'Barras 100%' : 'Linhas'}
          </span>
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          {isStackedBar ? (
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} stackOffset="expand">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis 
                tick={{ fill: '#888', fontSize: 10 }} 
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number, name: string, props: any) => {
                  const total = (props.payload.hcSaber as number || 0) + (props.payload.hcExecutar as number || 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                  const labels: Record<string, string> = {
                    hcSaber: 'HC Saber',
                    hcExecutar: 'HC Executar',
                  };
                  return [`${formatNumber(value)} (${percentage}%)`, labels[name] || name];
                }}
              />
              <Legend 
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    hcSaber: 'HC Saber',
                    hcExecutar: 'HC Executar',
                  };
                  return labels[value] || value;
                }}
              />
              <Bar dataKey="hcSaber" stackId="1" fill="#3b82f6" />
              <Bar dataKey="hcExecutar" stackId="1" fill="#22c55e" />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="hcSaberGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="hcExecutarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
            <YAxis tick={{ fill: '#888', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  hcSaber: 'HC Saber',
                  hcExecutar: 'HC Executar',
                  totalHC: 'Total HC',
                };
                return [formatNumber(value), labels[name] || name];
              }}
            />
            <Legend 
              formatter={(value) => {
                const labels: Record<string, string> = {
                  hcSaber: 'HC Saber',
                  hcExecutar: 'HC Executar',
                };
                return labels[value] || value;
              }}
            />
            <Area
              type="monotone"
              dataKey="hcSaber"
              stackId="1"
              stroke="#3b82f6"
              fill="url(#hcSaberGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="hcExecutar"
              stackId="1"
              stroke="#22c55e"
              fill="url(#hcExecutarGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
