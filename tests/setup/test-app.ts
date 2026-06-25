import supertest from 'supertest';
import { createApp } from '../../src/app.js';

// The Express application instance is completely decoupled from the server port
const app = createApp();

// Wrap the application in supertest
export const request = supertest(app);
