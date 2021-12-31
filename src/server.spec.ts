import 'jest';
import buildApp, { AppInstance } from './server';
import supertest from 'supertest';
import { buildEnvConfig } from './config/env-config';
import { buildYamlConfig } from './config/yaml-config';

let app: AppInstance;
const envConfig = buildEnvConfig({
    BRP_LOG_PRETTY: 'true',
    BRP_CONN_STR: 'amqp://guest:guest@localhost:5672?heartbeat=30',
    BRP_LOG_LEVEL: 'fatal'
});
const yamlConfig = buildYamlConfig();

describe('bunny-rest-proxy instance', () => {
    beforeAll(() => {
        app = buildApp(envConfig, yamlConfig);
        return app.listen(3000).then((r) => {
            expect(typeof r).toEqual('string');
        });
    });

    it('should have / endpoint', async () => {
        const response = await supertest(app.server).get('/');
        expect(response.status).toEqual(200);
    });

    it('should allow for posting JSON messages to a channel w/ publisher confirms', async () => {
        const response = await supertest(app.server)
            .post('/publish/jsonq')
            .send({ ok: true })
            .set('content-type', 'application/json');
        expect(response.status).toEqual(201);
        expect(response.body?.contentLengthBytes).toEqual(11);
    });

    it('should allow for posting binary messages to a channel w/ publisher confirms', async () => {
        const response = await supertest(app.server)
            .post('/publish/binaryq')
            .send('some payload')
            .set('content-type', 'application/octet-stream');
        expect(response.status).toEqual(201);
        expect(response.body?.contentLengthBytes).toEqual(12);
    });

    it('should allow for posting JSON messages to a channel w/o publisher confirms', async () => {
        const response = await supertest(app.server)
            .post('/publish/nonconfirm')
            .send({ ok: true })
            .set('content-type', 'application/json');
        expect(response.status).toEqual(201);
        expect(response.body?.contentLengthBytes).toEqual(11);
    });

    it('should reject binary data sent to JSON producer', async () => {
        const response = await supertest(app.server)
            .post('/publish/jsonq')
            .send('binarystuff')
            .set('content-type', 'application/octet-stream');
        expect(response.status).toEqual(415);
    });

    it('should reject invalid JSON sent to JSON producer', async () => {
        const response = await supertest(app.server)
            .post('/publish/jsonq')
            .send("{ouch, this doesn't look like json")
            .set('content-type', 'application/json');
        expect(response.status).toEqual(400);
    });

    it('should retrieve a message from a channel via GET', async () => {
        const response = await supertest(app.server).get('/consume/nonconfirm');
        expect(response.status).toEqual(205);
        expect(response.body).toBeDefined();
        expect(response.headers['content-length']).toEqual('11');
        expect(response.headers['x-bunny-message-count']).toEqual('0');
    });

    it('should return a 423 code when the queue is empty', async () => {
        const response = await supertest(app.server).get('/consume/nonconfirm');
        expect(response.status).toEqual(423);
        expect(response.body).toBeDefined();
    });

    it('should retrieve a binary message from a channel via GET', async () => {
        const response = await supertest(app.server).get('/consume/binaryq');
        expect(response.status).toEqual(205);
        expect(response.body).toBeDefined();
        expect(response.headers['content-length']).toEqual('12');
        expect(response.headers['x-bunny-message-count']).toEqual('0');
    });

    afterAll(async () => {
        await app.close();
    });
});
