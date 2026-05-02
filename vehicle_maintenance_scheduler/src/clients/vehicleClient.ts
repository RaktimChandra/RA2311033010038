import { Log } from '@affordmed/logging-middleware';
import { ValidationError, VehicleTask, VehiclesResponse } from '../types';
import { getJson } from './baseClient';

/**
 * Thin wrapper around GET /evaluation-service/vehicles.
 * Returns the full task list; per-depot bucketing is done by the optimisation
 * service, not the client.
 */
export class VehicleClient {
  public async listVehicleTasks(): Promise<VehicleTask[]> {
    const data = await getJson<VehiclesResponse>('/vehicles', 'vehicles');
    if (!data || !Array.isArray(data.vehicles)) {
      await Log('backend', 'error', 'repository', 'Vehicles response missing "vehicles" array');
      throw new ValidationError('Upstream vehicles response is malformed.');
    }

    const cleaned = data.vehicles.filter(
      (t) =>
        typeof t.TaskID === 'string' &&
        typeof t.Duration === 'number' &&
        typeof t.Impact === 'number',
    );

    if (cleaned.length !== data.vehicles.length) {
      await Log(
        'backend',
        'warn',
        'repository',
        `Discarded ${data.vehicles.length - cleaned.length} malformed vehicle tasks`,
      );
    }

    await Log(
      'backend',
      'info',
      'repository',
      `Vehicle tasks loaded (count=${cleaned.length})`,
    );
    return cleaned;
  }
}
