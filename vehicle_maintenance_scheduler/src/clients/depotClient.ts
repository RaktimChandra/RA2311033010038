import { Log } from '@affordmed/logging-middleware';
import { Depot, DepotsResponse, ValidationError } from '../types';
import { getJson } from './baseClient';

/**
 * Thin wrapper around GET /evaluation-service/depots.
 * Validates the upstream shape so a malformed payload fails loudly here
 * rather than corrupting downstream optimisation.
 */
export class DepotClient {
  public async listDepots(): Promise<Depot[]> {
    const data = await getJson<DepotsResponse>('/depots', 'depots');
    if (!data || !Array.isArray(data.depots)) {
      await Log('backend', 'error', 'repository', 'Depots response missing "depots" array');
      throw new ValidationError('Upstream depots response is malformed.');
    }
    const cleaned = data.depots.filter((d) =>
      typeof d.ID === 'number' && typeof d.MechanicHours === 'number',
    );
    await Log(
      'backend',
      'info',
      'repository',
      `Depot list loaded (count=${cleaned.length})`,
    );
    return cleaned;
  }
}
