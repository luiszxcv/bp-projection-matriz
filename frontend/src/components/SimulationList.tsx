import React from 'react';
import { Simulation } from '@/types/simulation';
import { Button } from '@/components/ui/button';
import { Plus, FileSpreadsheet, Trash2, Copy, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/calculations';

interface SimulationListProps {
  simulations: Simulation[];
  currentSimulation: Simulation | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function SimulationList({
  simulations,
  currentSimulation,
  onSelect,
  onCreate,
  onDelete,
  onDuplicate,
}: SimulationListProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTotalAnnualRevenue = (sim: Simulation) => {
    return sim.monthlyData.reduce((sum, m) => sum + m.totalRevenue, 0);
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3">Simulações</h2>
        <Button onClick={onCreate} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Simulação
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {simulations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma simulação criada.</p>
            <p className="mt-1">Clique em "Nova Simulação" para começar.</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {simulations.map((sim) => (
              <div
                key={sim.id}
                className={cn(
                  'group p-3 rounded-lg cursor-pointer transition-all duration-200',
                  'border border-transparent',
                  currentSimulation?.id === sim.id
                    ? 'bg-primary/20 border-primary/50'
                    : 'hover:bg-secondary/50 hover:border-border'
                )}
                onClick={() => onSelect(sim.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {sim.inputs.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(sim.updatedAt)}</span>
                    </div>
                    <div className="mt-2 text-sm font-mono text-currency">
                      {formatCurrency(getTotalAnnualRevenue(sim))}
                      <span className="text-xs text-muted-foreground ml-1">/ano</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(sim.id);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(sim.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
