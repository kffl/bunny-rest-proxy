import { fastify, FastifyInstance } from 'fastify';
import { IncomingMessage, Server, ServerResponse } from 'http';

export type AppInstance = FastifyInstance<Server, IncomingMessage, ServerResponse>;

function buildApp(): AppInstance {
    const app: FastifyInstance<Server, IncomingMessage, ServerResponse> = fastify({
        logger: {
            prettyPrint: process.env.BRP_LOG_PRETTY
                ? {
                      translateTime: 'HH:MM:ss Z'
                  }
                : false,
            level: process.env.BRP_LOG_LEVEL || 'info'
        }
    });

    app.get('/', (req, res) => {
        res.send('hello bunny');
    });

    return app;
}

export default buildApp;
