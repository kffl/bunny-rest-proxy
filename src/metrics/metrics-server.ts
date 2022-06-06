import fastify, { FastifyInstance } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';
import client from 'prom-client';

export type MetricsServerInstance = FastifyInstance<Server, IncomingMessage, ServerResponse>;

export function buildMetricsServer(): MetricsServerInstance {
    const metricsServer = fastify({});
    const collectDefaultMetrics = client.collectDefaultMetrics;

    collectDefaultMetrics();

    metricsServer.get('/metrics', (_req, res) => {
        res.header('Content-Type', client.register.contentType);
        return client.register.metrics();
    });

    return metricsServer;
}
