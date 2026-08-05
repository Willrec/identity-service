import { Router, type IRouter } from 'express';
import { composeOAuthController } from '../../../infrastructure/composition/oauth/oauth.composition.js';

const oauthController = composeOAuthController();
const router: IRouter = Router();

router.get('/google', oauthController.beginGoogleAuth);

export { router as oauthRouter };
