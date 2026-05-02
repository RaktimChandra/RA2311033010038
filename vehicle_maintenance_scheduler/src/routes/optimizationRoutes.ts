import { Router } from 'express';
import { OptimizationController } from '../controllers/optimizationController';

const router = Router();
const controller = new OptimizationController();

/**
 * GET /api/v1/optimize
 *   → returns plans for every depot.
 *
 * GET /api/v1/optimize/depots/:depotId
 *   → returns the plan for a single depot.
 *
 * GET /api/v1/health
 *   → liveness probe.
 */
router.get('/health', controller.health);
router.get('/optimize', controller.optimizeAll);
router.get('/optimize/depots/:depotId', controller.optimizeOne);

export default router;
