import { buildEnvConfig } from './env-config';

describe('Environment variables config', () => {
    it('should throw an error if RabbitMQ connection string is not provided', () => {
        const t = () => {
            buildEnvConfig({ BRP_LOG_LEVEL: 'info' });
        };
        expect(t).toThrowError('connection string');
    });

    it('should throw an error if an invalid log level is provided', () => {
        const t = () => {
            buildEnvConfig({
                BRP_CONN_STR: 'amqp://guest:guest@localhost:5672?heartbeat=30',
                BRP_LOG_LEVEL: 'nope',
                BRP_LOG_PRETTY: 'true'
            });
        };
        expect(t).toThrowError('log level');
    });

    it('should assign default values', () => {
        const cfg = buildEnvConfig({
            BRP_CONN_STR: 'amqp://guest:guest@localhost:5672?heartbeat=30'
        });
        expect(cfg.logLevel).toEqual('info');
        expect(cfg.prettyPrint).toEqual(false);
    });
});
