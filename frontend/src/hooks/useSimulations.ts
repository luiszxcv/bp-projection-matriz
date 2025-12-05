import { useState, useEffect, useCallback } from 'react';
import { Simulation, SimulationInputs } from '@/types/simulation';
import { defaultInputs } from '@/data/defaultInputs';
import { calculateMonthlyData } from '@/lib/calculations';

const STORAGE_KEY = 'business-plan-simulations';
const API_BASE = (import.meta.env.VITE_URL_BACKEND || import.meta.env.URL_BACKEND || '') as string;

async function fetchSimulationsFromApi(): Promise<Simulation[]> {
  const res = await fetch(`${API_BASE}/simulations`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

async function postSimulationToApi(sim: Simulation) {
  await fetch(`${API_BASE}/simulations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: sim.id, name: sim.inputs.name, inputs: sim.inputs, monthlyData: sim.monthlyData }),
  });
}

async function putSimulationToApi(sim: Simulation) {
  await fetch(`${API_BASE}/simulations/${sim.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: sim.inputs.name, inputs: sim.inputs, monthlyData: sim.monthlyData }),
  });
}

async function deleteSimulationFromApi(id: string) {
  await fetch(`${API_BASE}/simulations/${id}`, { method: 'DELETE' });
}

export function useSimulations() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [currentSimulation, setCurrentSimulation] = useState<Simulation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load simulations from API if configured, otherwise localStorage
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (API_BASE) {
        try {
          const rows = await fetchSimulationsFromApi();
          if (!mounted) return;
          // Ensure monthlyData exists
          const sims: Simulation[] = rows.map((r: any) => ({
            id: r.id,
            inputs: r.inputs,
            monthlyData: r.monthlyData || calculateMonthlyData(r.inputs),
            createdAt: r.createdAt || new Date().toISOString(),
            updatedAt: r.updatedAt || new Date().toISOString(),
          }));
          setSimulations(sims);
        } catch (err) {
          console.error('Failed to load from API, falling back to localStorage', err);
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try { setSimulations(JSON.parse(stored)); } catch (e) { console.error(e); }
          }
        }
      } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try { setSimulations(JSON.parse(stored)); } catch (e) { console.error(e); }
        }
      }
      if (mounted) setIsLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, []);

  // Save simulations to localStorage (always keep fallback copy)
  const saveToStorage = useCallback((sims: Simulation[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sims)); } catch (e) { console.error(e); }
  }, []);

  const createSimulation = useCallback((name: string): Simulation => {
    const inputs: SimulationInputs = { ...defaultInputs, name };
    const simulation: Simulation = {
      id: crypto.randomUUID(),
      inputs,
      monthlyData: calculateMonthlyData(inputs),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newSimulations = [...simulations, simulation];
    setSimulations(newSimulations);
    saveToStorage(newSimulations);
    setCurrentSimulation(simulation);

    if (API_BASE) {
      // fire-and-forget to backend
      postSimulationToApi(simulation).catch((err) => console.error('Failed to post simulation', err));
    }

    return simulation;
  }, [simulations, saveToStorage]);

  const updateSimulation = useCallback((id: string, inputs: SimulationInputs) => {
    const simulation: Simulation = {
      id,
      inputs,
      monthlyData: calculateMonthlyData(inputs),
      createdAt: simulations.find(s => s.id === id)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newSimulations = simulations.map(s => s.id === id ? simulation : s);
    setSimulations(newSimulations);
    saveToStorage(newSimulations);
    setCurrentSimulation(simulation);

    if (API_BASE) {
      putSimulationToApi(simulation).catch((err) => console.error('Failed to update simulation', err));
    }
  }, [simulations, saveToStorage]);

  const deleteSimulation = useCallback((id: string) => {
    const newSimulations = simulations.filter(s => s.id !== id);
    setSimulations(newSimulations);
    saveToStorage(newSimulations);
    if (currentSimulation?.id === id) setCurrentSimulation(null);

    if (API_BASE) {
      deleteSimulationFromApi(id).catch((err) => console.error('Failed to delete simulation', err));
    }
  }, [simulations, currentSimulation, saveToStorage]);

  const selectSimulation = useCallback((id: string) => {
    const simulation = simulations.find(s => s.id === id);
    if (simulation) setCurrentSimulation(simulation);
  }, [simulations]);

  const duplicateSimulation = useCallback((id: string): Simulation | null => {
    const original = simulations.find(s => s.id === id);
    if (!original) return null;

    const newInputs: SimulationInputs = {
      ...JSON.parse(JSON.stringify(original.inputs)),
      name: `${original.inputs.name} (Cópia)`,
    };

    const simulation: Simulation = {
      id: crypto.randomUUID(),
      inputs: newInputs,
      monthlyData: calculateMonthlyData(newInputs),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newSimulations = [...simulations, simulation];
    setSimulations(newSimulations);
    saveToStorage(newSimulations);

    if (API_BASE) {
      postSimulationToApi(simulation).catch((err) => console.error('Failed to post duplicate', err));
    }

    return simulation;
  }, [simulations, saveToStorage]);

  return {
    simulations,
    currentSimulation,
    isLoading,
    createSimulation,
    updateSimulation,
    deleteSimulation,
    selectSimulation,
    duplicateSimulation,
    setCurrentSimulation,
  };
}

