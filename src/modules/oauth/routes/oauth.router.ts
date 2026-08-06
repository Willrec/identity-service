import { Router, type IRouter } from 'express';
import { composeOAuthController } from '../../../infrastructure/composition/oauth/oauth.composition.js';

const oauthController = composeOAuthController();
const router: IRouter = Router();

router.get('/google', oauthController.beginGoogleAuth);
router.get('/google/callback', oauthController.callbackGoogle);

export { router as oauthRouter };
