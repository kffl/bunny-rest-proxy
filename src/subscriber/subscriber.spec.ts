import { Channel } from 'amqplib-as-promised/lib';
import { Message } from 'amqplib';
import { FastifyLoggerInstance } from 'fastify';
import { mock, mockClear } from 'jest-mock-extended';
import { SubscriberConfig, SubscriberConfigDefaults } from '../config/yaml-config.types';
import { sleep } from '../lifecycle';
import { PushSender } from './push-sender';
import { RetryManager } from './retry-manager';
import { Subscriber } from './subscriber';
import { SubscriberMetricsCollector } from '../metrics/metrics-collector.interfaces';

describe('Subscriber class', () => {
    const channel = mock<Channel>();
    const logger = mock<FastifyLoggerInstance>();
    const sender = mock<PushSender>();
    const retryManager = mock<RetryManager>();
    const metricsCollector = mock<SubscriberMetricsCollector>();
    const cfg = {
        queueName: 'testqueue',
        target: 'http://target.host/path',
        ...SubscriberConfigDefaults,
        prefetch: 15
    } as SubscriberConfig;

    beforeEach(() => {
        [channel, logger, sender, retryManager, metricsCollector].forEach((el) => {
            mockClear(el);
        });
    });

    it('should throw an error when instantiated with an invalid URL', () => {
        const errorCfg = {
            ...cfg,
            target: 'wrongtarget%$^?'
        };
        const t = () => {
            new Subscriber(errorCfg, channel, logger, sender, retryManager, metricsCollector);
        };
        expect(t).toThrowError('target URL');
    });

    it('should be instantiated without an error when provided with valid config', () => {
        const t = () => {
            new Subscriber(cfg, channel, logger, sender, retryManager, metricsCollector);
        };
        expect(t).not.toThrowError();
    });

    it('should be instantiated without an error when provided with valid config', () => {
        const t = () => {
            new Subscriber(cfg, channel, logger, sender, retryManager, metricsCollector);
        };
        expect(t).not.toThrowError();
    });

    it('should set prefetch value from config before starting an AMQP consumer', async () => {
        const s = new Subscriber(cfg, channel, logger, sender, retryManager, metricsCollector);
        await s.start();

        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.debug).toHaveBeenCalledTimes(1);
        expect(channel.prefetch).toHaveBeenCalledTimes(1);
        expect(channel.prefetch).toHaveBeenCalledWith(15);
        expect(channel.consume).toHaveBeenCalledTimes(1);
    });

    it('should cancel the consumer and planned delivery retries on stop', async () => {
        const s = new Subscriber(cfg, channel, logger, sender, retryManager, metricsCollector);
        await s.start();
        await s.stop(false);

        expect(retryManager.cancelPlannedDeliveryRetries).toHaveBeenCalledTimes(1);
        expect(channel.cancel).toHaveBeenCalledTimes(1);
    });

    it('should cancel planned delivery retries on stop in failure mode without writing to AMQP channel', async () => {
        const s = new Subscriber(cfg, channel, logger, sender, retryManager, metricsCollector);
        await s.start();
        await s.stop(true);

        expect(retryManager.cancelPlannedDeliveryRetries).toHaveBeenCalledTimes(1);
        expect(channel.cancel).toHaveBeenCalledTimes(0);
    });

    it('should deliver a consumed message to HTTP target and ack the message', async () => {
        const s = new Subscriber(cfg, channel, logger, sender, retryManager, metricsCollector);
        await s.start();
        const msg = mock<Message>();
        //@ts-ignore
        sender.pushMessage.mockResolvedValueOnce({ ok: true, status: 200 } as Response);

        s.handleMessage(msg);

        await sleep(1);
        await s.stop(true);

        expect(sender.pushMessage).toHaveBeenCalledTimes(1);
        expect(retryManager.planDeliveryRetry).toHaveBeenCalledTimes(0);
        expect(channel.ack).toHaveBeenCalledTimes(1);
        expect(channel.ack).toHaveBeenCalledWith(msg);
    });

    it('should do nothing when receiving a null message', async () => {
        const s = new Subscriber(cfg, channel, logger, sender, retryManager, metricsCollector);
        await s.start();
        const msg = null;

        s.handleMessage(msg);

        await sleep(1);
        await s.stop(true);

        expect(sender.pushMessage).toHaveBeenCalledTimes(0);
        expect(retryManager.plannedRetries).toHaveBeenCalledTimes(0);
    });

    it('should hand over a delivery that failed due to a fetch error to retry manager', async () => {
        const s = new Subscriber(cfg, channel, logger, sender, retryManager, metricsCollector);
        await s.start();
        const msg = mock<Message>();
        //@ts-ignore
        sender.pushMessage.mockRejectedValueOnce({ name: 'SomeError', message: 'Some message' });

        s.handleMessage(msg);

        await sleep(1);
        await s.stop(true);

        expect(retryManager.planDeliveryRetry).toHaveBeenCalledTimes(1);
        expect(retryManager.planDeliveryRetry).toHaveBeenCalledWith(msg, 1);
        expect(sender.pushMessage).toHaveBeenCalledTimes(1);
    });

    it('should hand over a delivery that failed due to a non 2XX response code to retry manager', async () => {
        const s = new Subscriber(cfg, channel, logger, sender, retryManager, metricsCollector);
        await s.start();
        const msg = mock<Message>();
        //@ts-ignore
        sender.pushMessage.mockResolvedValueOnce({ ok: false, status: 503 });

        s.handleMessage(msg);

        await sleep(1);
        await s.stop(true);

        expect(retryManager.planDeliveryRetry).toHaveBeenCalledTimes(1);
        expect(retryManager.planDeliveryRetry).toHaveBeenCalledWith(msg, 1);
        expect(sender.pushMessage).toHaveBeenCalledTimes(1);
        expect(metricsCollector.recordFailedDelivery).toHaveBeenCalledTimes(1);
    });
});
