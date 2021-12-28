import 'jest';
import buildApp, { AppInstance } from './server';
import supertest from 'supertest';

let app: AppInstance;

describe('bunny-rest-proxy instance', () => {
    beforeEach(() => {
        app = buildApp();
        return app.listen(3000).then((r) => {
            expect(typeof r).toEqual('string');
        });
    });

    it('should have / endpoint', async () => {
        const response = await supertest(app.server).get('/');
        expect(response.status).toEqual(200);
    });

    afterEach(async () => {
        await app.close();
    });
});
