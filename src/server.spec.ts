import 'jest';
import buildApp, { AppInstance } from './server';
import supertest from 'supertest';
import { buildEnvConfig } from './config/env-config';
import { buildYamlConfig } from './config/yaml-config';
import fastify, { FastifyInstance } from 'fastify';
import { sleep } from './lifecycle';

let app: AppInstance;
const envConfig = buildEnvConfig({
    BRP_LOG_PRETTY: 'true',
    BRP_CONN_STR: 'amqp://guest:guest@localhost:5672?heartbeat=30',
    BRP_LOG_LEVEL: 'fatal'
});
const yamlConfig = buildYamlConfig();

let testTarget: FastifyInstance;
let shouldRetry = false;
let shouldTimeout = false;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const targetReqHandler = jest.fn((a, b) => true);

function buildTestTarget() {
    const testApp = fastify();
    testApp.addContentTypeParser('*', { parseAs: 'buffer' }, function (request, payload, done) {
        done(null, payload);
    });
    testApp.post('/target', (req, res) => {
        targetReqHandler(req.body, req.headers);
        if (shouldRetry) {
            shouldRetry = false;
            res.status(500);
        } else if (shouldTimeout) {
            setTimeout(() => {
                res.status(200);
                res.send();
            }, 1200);
            shouldTimeout = false;
        } else {
            res.status(200);
            res.send();
        }
    });
    return testApp;
}

describe('bunny-rest-proxy instance', () => {
    beforeAll(() => {
        app = buildApp(envConfig, yamlConfig);
        return app.listen(3000);
    });

    beforeEach(() => {
        targetReqHandler.mockClear();
        testTarget = buildTestTarget();
        return testTarget.listen(5555);
    });

    afterEach(() => {
        return testTarget.close();
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

    it('should push a message to a subscriber via HTTP POST', async () => {
        const response = await supertest(app.server)
            .post('/publish/binarytest')
            .send('some payload')
            .set('content-type', 'application/octet-stream')
            .set('X-Bunny-CorrelationID', 'distributedtransactionseatbrains');
        await sleep(1000);
        expect(response.status).toEqual(201);
        expect(targetReqHandler).toHaveBeenCalledTimes(1);
        expect(targetReqHandler.mock.calls[0][0]).toEqual(Buffer.from('some payload'));
        expect(targetReqHandler.mock.calls[0][1]).toMatchObject({
            'content-type': 'application/octet-stream',
            'x-bunny-correlationid': 'distributedtransactionseatbrains'
        });
    });

    it('should retry message delivery that failed with non-2XX code', async () => {
        shouldRetry = true;
        const response = await supertest(app.server)
            .post('/publish/jsontest')
            .send('{"ok": true}')
            .set('content-type', 'application/json');
        await sleep(3000);
        expect(response.status).toEqual(201);
        expect(targetReqHandler).toHaveBeenCalledTimes(2);
        expect(targetReqHandler.mock.calls[0][0]).toEqual({ ok: true });
        expect(targetReqHandler.mock.calls[0][1]).toMatchObject({
            'content-type': 'application/json',
            'x-bunny-redelivered': 'false'
        });
    });

    it('should retry message delivery that failed with a timeout', async () => {
        shouldTimeout = true;
        const response = await supertest(app.server)
            .post('/publish/jsontest')
            .send('{"hello": "world"}')
            .set('content-type', 'application/json');
        await sleep(3000);
        expect(response.status).toEqual(201);
        expect(targetReqHandler).toHaveBeenCalledTimes(2);
        expect(targetReqHandler.mock.calls[0][0]).toEqual({ hello: 'world' });
        expect(targetReqHandler.mock.calls[0][1]).toMatchObject({
            'content-type': 'application/json',
            'x-bunny-redelivered': 'false'
        });
    });

    it('should nack and requeue message after exceeding the delivery attempts limit', async () => {
        shouldRetry = true;
        const response = await supertest(app.server)
            .post('/publish/binarytest')
            .send('payload')
            .set('content-type', 'application/octet-stream')
            .set('X-Bunny-CorrelationID', 'fail-dont-retry-nack-reprocess');
        await sleep(3000);
        expect(response.status).toEqual(201);
        expect(targetReqHandler).toHaveBeenCalledTimes(2);
        expect(targetReqHandler.mock.calls[1][0]).toEqual(Buffer.from('payload'));
        expect(targetReqHandler.mock.calls[1][1]).toMatchObject({
            'content-type': 'application/octet-stream',
            'x-bunny-correlationid': 'fail-dont-retry-nack-reprocess',
            'x-bunny-redelivered': 'true'
        });
    });

    it('should exit gracefully', async () => {
        await app.close();
        await sleep(3000);
    });

    afterAll(async () => {
        await app.close();
    });
});
