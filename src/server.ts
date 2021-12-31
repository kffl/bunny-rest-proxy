import { fastify, FastifyInstance } from 'fastify';
import fastifyAmqpAsync from 'fastify-amqp-async';
import fastifyGracefulShutdown from 'fastify-graceful-shutdown';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { EnvConfig } from './config/env-config';
import { YamlConfig } from './config/yaml-config';
import { gracefullyHandleConsumerShutdown } from './lifecycle';
import { registerPublishers } from './publisher/build-publisher';
import { Publisher } from './publisher/publisher';

export type AppInstance = FastifyInstance<Server, IncomingMessage, ServerResponse>;

declare module 'fastify' {
    export interface FastifyInstance {
        publishers: Array<Publisher>;
        /**
         * In pendingShutdown state, the server is handling a graceful shutdown during which
         * all incoming requests will receive 503 HTTP code while all the existing ones will
         * continue processing. It will also wait for consumers to finish processing messages.
         */
        pendingShutdown: boolean;
        /**
         * Error shutdown occurs when an AMQP channel or connection is closed unexpectedly.
         */
        errorShutdown: boolean;
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
    app.decorate('pendingShutdown', false);
    app.decorate('errorShutdown', false);

    app.get('/', (req, res) => {
        res.send(`Hello from Bunny REST Proxy`);
    });

    app.removeAllContentTypeParsers();

    app.addContentTypeParser('*', { parseAs: 'buffer' }, function (_req, body, done) {
        done(null, body);
    });

    app.register(fastifyGracefulShutdown);

    app.register(fastifyAmqpAsync, {
        connectionString: envConfig.connectionString,
        useConfirmChannel: true,
        useRegularChannel: true,
        ignoreOnClose: true
    }).after((err) => {
        if (err) {
            app.log.fatal(`Error connecting to RabbitMQ, message: ${(err as Error)?.message}`);
            process.exit(1);
        }
        registerPublishers(yamlConfig.publishers, app);
    });

    app.addHook('onReady', async () => {
        app.amqp.connection.on('close', () => {
            if (app.pendingShutdown) {
                app.log.info('AMQP connection was closed.');
            } else if (!app.errorShutdown) {
                app.errorShutdown = true;
                app.log.fatal('AMQP connection was closed unexpectedly. BRP is shutting down');
                app.close();
            }
        });
        app.amqp.confirmChannel.on('close', () => {
            if (app.pendingShutdown) {
                app.log.info('AMQP channel was closed.');
            } else if (!app.errorShutdown) {
                app.errorShutdown = true;
                app.log.fatal('AMQP channel was closed unexpectedly. BRP is shutting down');
                app.amqp.connection.close();
                app.close();
            }
        });

        for (const publisher of app.publishers) {
            await publisher.assertQueue();
        }
    });

    app.addHook('onClose', async () => {
        await gracefullyHandleConsumerShutdown(app);
    });

    app.after(() => {
        app.gracefulShutdown((signal, next) => {
            app.log.info('Starting graceful shutdown sequence.');
            app.pendingShutdown = true;
            next();
        });
    });

    return app;
}

export default buildApp;
