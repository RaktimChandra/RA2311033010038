import { NextFunction, Request, Response } from 'express';
import { Log } from '@affordmed/logging-middleware';
import { OptimizationService } from '../services/optimizationService';
import { parseDepotId } from '../validators/depotValidator';

/**
 * HTTP-facing controller. Keeps Express types out of the service layer.
 */
export class OptimizationController {
  constructor(private readonly service = new OptimizationService()) {}

  public optimizeAll = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await Log('backend', 'info', 'controller', 'GET /optimize received');
      const result = await this.service.optimizeAll();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public optimizeOne = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const depotId = parseDepotId(req.params);
      await Log(
        'backend',
        'info',
        'controller',
        `GET /optimize/depots/${depotId} received`,
      );
      const plan = await this.service.optimizeOne(depotId);
      res.status(200).json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  };

  public health = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: { status: 'ok', service: 'vehicle-maintenance-scheduler' },
    });
  };
}
