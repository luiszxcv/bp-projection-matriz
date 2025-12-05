import React from 'react';
import { FileSpreadsheet, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreate: () => void;
}

export function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="h-full flex items-center justify-center bg-background p-8">
      <div className="max-w-2xl text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-primary/10 animate-pulse" />
          </div>
          <FileSpreadsheet className="relative h-20 w-20 mx-auto text-primary" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Business Plan 2026
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
          Crie simulações cohortizadas e produtizadas com projeções mensais completas. 
          Ajuste taxas de conversão, distribuição por tier e produtos em tempo real.
        </p>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="p-4 rounded-lg bg-card border border-border">
            <TrendingUp className="h-8 w-8 text-primary mb-2 mx-auto" />
            <h3 className="font-semibold text-foreground">Funil Completo</h3>
            <p className="text-sm text-muted-foreground">MQL → SQL → SAL → WON → Ativação</p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <Users className="h-8 w-8 text-primary mb-2 mx-auto" />
            <h3 className="font-semibold text-foreground">5 Tiers</h3>
            <p className="text-sm text-muted-foreground">Enterprise, Large, Medium, Small, Tiny</p>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <DollarSign className="h-8 w-8 text-primary mb-2 mx-auto" />
            <h3 className="font-semibold text-foreground">4 Produtos</h3>
            <p className="text-sm text-muted-foreground">Saber, Ter, Executar, Potencializar</p>
          </div>
        </div>

        <Button size="lg" onClick={onCreate} className="animate-fade-in">
          <FileSpreadsheet className="h-5 w-5 mr-2" />
          Criar Primeira Simulação
        </Button>
      </div>
    </div>
  );
}
