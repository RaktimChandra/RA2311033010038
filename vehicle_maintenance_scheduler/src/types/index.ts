/* ------------------------------------------------------------------ */
/* Upstream contracts (mirror of AffordMed evaluation API responses)   */
/* ------------------------------------------------------------------ */

export interface Depot {
  ID: number;
  MechanicHours: number;
}

export interface DepotsResponse {
  depots: Depot[];
}

export interface VehicleTask {
  TaskID: string;
  Duration: number;
  Impact: number;
  /** Some payloads attach a depot id to a task; we tolerate either field. */
  DepotID?: number;
  depotId?: number;
}

export interface VehiclesResponse {
  vehicles: VehicleTask[];
}

/* ------------------------------------------------------------------ */
/* Domain DTOs returned by this service                                */
/* ------------------------------------------------------------------ */

export interface DepotPlan {
  depotId: number;
  mechanicHours: number;
  selectedTasks: string[];
  totalImpact: number;
  totalDuration: number;
  consideredTaskCount: number;
}

export interface OptimizationResult {
  generatedAt: string;
  plans: DepotPlan[];
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export class UpstreamFetchError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'UpstreamFetchError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
