import { Router } from 'express';
import optimizationRoutes from './optimizationRoutes';

const apiRouter = Router();
apiRouter.use('/v1', optimizationRoutes);

export default apiRouter;
