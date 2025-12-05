import React, { useState } from 'react';
import { useSimulations } from '@/hooks/useSimulations';
import { SimulationList } from '@/components/SimulationList';
import { SpreadsheetView } from '@/components/SpreadsheetView';
import { CreateSimulationDialog } from '@/components/CreateSimulationDialog';
import { EmptyState } from '@/components/EmptyState';
import { toast } from 'sonner';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Index = () => {
  const {
    simulations,
    currentSimulation,
    isLoading,
    createSimulation,
    updateSimulation,
    deleteSimulation,
    selectSimulation,
    duplicateSimulation,
  } = useSimulations();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleCreate = (name: string) => {
    createSimulation(name);
    toast.success('Simulação criada com sucesso!');
  };

  const handleDelete = (id: string) => {
    deleteSimulation(id);
    toast.success('Simulação excluída');
  };

  const handleDuplicate = (id: string) => {
    duplicateSimulation(id);
    toast.success('Simulação duplicada');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          'w-72 flex-shrink-0 transition-all duration-300 ease-in-out',
          'fixed lg:relative h-full z-40',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0'
        )}
      >
        <SimulationList
          simulations={simulations}
          currentSimulation={currentSimulation}
          onSelect={selectSimulation}
          onCreate={() => setCreateDialogOpen(true)}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentSimulation ? (
          <SpreadsheetView
            simulation={currentSimulation}
            onUpdate={(inputs) => updateSimulation(currentSimulation.id, inputs)}
          />
        ) : (
          <EmptyState onCreate={() => setCreateDialogOpen(true)} />
        )}
      </div>

      <CreateSimulationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
      />
    </div>
  );
};

export default Index;
