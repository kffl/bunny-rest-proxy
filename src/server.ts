import { fastify, FastifyInstance } from 'fastify';
import fastifyAmqpAsync from 'fastify-amqp-async';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { EnvConfig } from './config/env-config';
import { YamlConfig } from './config/yaml-config';
import buildPublisher from './publisher/build-publisher';
import { Publisher, PublishRequestHeaders } from './publisher/publisher';

export type AppInstance = FastifyInstance<Server, IncomingMessage, ServerResponse>;

declare module 'fastify' {
    export interface FastifyInstance {
        publishers: Array<Publisher>;
    }
}

function buildApp(envConfig: EnvConfig, yamlConfig: YamlConfig): AppInstance {
    const app: FastifyInstance<Server, IncomingMessage, ServerResponse> = fastify({
        logger: {
            prettyPrint: envConfig.prettyPrint
                ? {
                      translateTime: 'HH:MM:ss Z'
                  }
                : false,
            level: envConfig.logLevel
        }
    });

    app.decorate('publishers', [] as Array<Publisher>);

    app.get('/', (req, res) => {
        res.send(`Hello from Bunny REST Proxy`);
    });

    app.removeAllContentTypeParsers();

    app.addContentTypeParser('*', { parseAs: 'buffer' }, function (_req, body, done) {
        done(null, body);
    });

    app.register(fastifyAmqpAsync, {
        connectionString: envConfig.connectionString,
        useConfirmChannel: true
    }).after((err) => {
        if (err) {
            app.log.fatal(`Error connecting to RabbitMQ, message: ${(err as Error)?.message}`);
            process.exit(1);
        }
        for (const publisherConfig of yamlConfig.publishers) {
            const publisher = buildPublisher(publisherConfig, app.amqp.confirmChannel);
            app.publishers.push(publisher);

            app.post<{ Headers: PublishRequestHeaders; Body: Buffer }>(
                `/publish/${publisher.queueName}`,
                async function (req, res) {
                    const result = publisher.sendMessage(req.headers, req.body, req.log);
                    res.status(201);
                    return result;
                }
            );
        }
    });

    app.addHook('onReady', async () => {
        app.amqp.connection.on('close', () => {
            app.log.info('AMQP connection closed. Shutting down...');
            app.close();
        });
        app.amqp.confirmChannel.on('close', () => {
            app.log.info('AMQP channel closed. Shutting down...');
            app.close();
        });

        for (const publisher of app.publishers) {
            await publisher.assertQueue();
        }
    });

    return app;
}

export default buildApp;
