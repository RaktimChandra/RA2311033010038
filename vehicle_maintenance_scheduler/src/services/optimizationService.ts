import { Log } from '@affordmed/logging-middleware';
import { solveKnapsack } from '../algorithms/knapsack';
import { DepotClient } from '../clients/depotClient';
import { VehicleClient } from '../clients/vehicleClient';
import {
  Depot,
  DepotPlan,
  OptimizationResult,
  VehicleTask,
} from '../types';

/**
 * OptimizationService is the domain core of this app.
 * It orchestrates upstream fetches, partitions tasks per depot, and runs
 * the knapsack solver to produce a maintenance plan.
 *
 * Task → depot mapping rule:
 *   1. If the upstream payload tags a task with `DepotID` (or lowercase
 *      `depotId`), respect it and only consider it for that depot.
 *   2. Otherwise the task is depot-agnostic and is considered for every
 *      depot. This is a deliberate choice because the AffordMed spec does
 *      not guarantee a depot link on every task.
 */
export class OptimizationService {
  constructor(
    private readonly depots: DepotClient = new DepotClient(),
    private readonly vehicles: VehicleClient = new VehicleClient(),
  ) {}

  public async optimizeAll(): Promise<OptimizationResult> {
    await Log('backend', 'info', 'domain', 'Starting full optimisation run');

    const [depots, tasks] = await Promise.all([
      this.depots.listDepots(),
      this.vehicles.listVehicleTasks(),
    ]);

    const plans: DepotPlan[] = depots.map((depot) =>
      this.optimizeForDepot(depot, tasks),
    );

    const totalImpact = plans.reduce((acc, p) => acc + p.totalImpact, 0);
    await Log(
      'backend',
      'info',
      'domain',
      `Optimisation complete: ${plans.length} depots, aggregate impact=${totalImpact}`,
    );

    return {
      generatedAt: new Date().toISOString(),
      plans,
    };
  }

  public async optimizeOne(depotId: number): Promise<DepotPlan> {
    const [depots, tasks] = await Promise.all([
      this.depots.listDepots(),
      this.vehicles.listVehicleTasks(),
    ]);

    const depot = depots.find((d) => d.ID === depotId);
    if (!depot) {
      await Log('backend', 'warn', 'domain', `Depot ${depotId} not found in upstream`);
      throw new Error(`Depot ${depotId} not found.`);
    }

    return this.optimizeForDepot(depot, tasks);
  }

  private optimizeForDepot(depot: Depot, allTasks: VehicleTask[]): DepotPlan {
    const candidates = allTasks.filter((t) => {
      const tagged = t.DepotID ?? t.depotId;
      return tagged === undefined || tagged === depot.ID;
    });

    const { selectedTasks, totalImpact, totalDuration } = solveKnapsack(
      candidates,
      depot.MechanicHours,
    );

    void Log(
      'backend',
      'info',
      'domain',
      `Depot ${depot.ID}: picked ${selectedTasks.length}/${candidates.length} tasks, impact=${totalImpact}, duration=${totalDuration}/${depot.MechanicHours}`,
    );

    return {
      depotId: depot.ID,
      mechanicHours: depot.MechanicHours,
      selectedTasks: selectedTasks.map((t) => t.TaskID),
      totalImpact,
      totalDuration,
      consideredTaskCount: candidates.length,
    };
  }
}
