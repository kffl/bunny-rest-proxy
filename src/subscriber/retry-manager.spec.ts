import { Channel } from 'amqplib-as-promised/lib';
import { Message } from 'amqplib';
import { FastifyLoggerInstance } from 'fastify';
import { mock, mockClear } from 'jest-mock-extended';
import { SubscriberConfig, SubscriberConfigDefaults } from '../config/yaml-config.types';
import { DeadLetterPolicy } from './dead-letter-policy';
import { PushSender } from './push-sender';
import { RetryManager } from './retry-manager';
import { sleep } from '../lifecycle';

describe('retry manager', () => {
    const config = {
        queueName: 'testqueue',
        target: 'http://mock-target/',
        ...SubscriberConfigDefaults
    } as SubscriberConfig;
    const backoffStrategy = () => 0;
    const deadLetterPolicy = mock<DeadLetterPolicy>();
    const logger = mock<FastifyLoggerInstance>();
    const channel = mock<Channel>();
    const sender = mock<PushSender>();

    beforeEach(() => {
        mockClear(deadLetterPolicy);
        mockClear(logger);
        mockClear(channel);
        mockClear(sender);
    });

    it('should add planned delivery retries to its set', () => {
        const retryManager = new RetryManager(
            config,
            channel,
            sender,
            logger,
            backoffStrategy,
            deadLetterPolicy
        );
        const message = mock<Message>();
        retryManager.planDeliveryRetry(message);

        expect(retryManager.plannedRetries.size).toEqual(1);
        const [firstRetry] = retryManager.plannedRetries;
        expect(firstRetry.attempt).toEqual(1);
        expect(firstRetry.msg).toEqual(message);
        expect(firstRetry.timer).toBeDefined();

        retryManager.cancelPlannedDeliveryRetries(true);
    });

    it('should remove the retry attempt from the set if it succeeded', async () => {
        const retryManager = new RetryManager(
            config,
            channel,
            sender,
            logger,
            backoffStrategy,
            deadLetterPolicy
        );
        const message = mock<Message>();
        //@ts-ignore
        sender.pushMessage.mockResolvedValue({ ok: true, status: 200 } as Response);

        retryManager.planDeliveryRetry(message);
        await sleep(1000);

        expect(retryManager.plannedRetries.size).toEqual(0);
    });

    it('should retry again after a failed attempt (network error)', async () => {
        const retryManager = new RetryManager(
            config,
            channel,
            sender,
            logger,
            backoffStrategy,
            deadLetterPolicy
        );
        const message = mock<Message>();
        sender.pushMessage.mockRejectedValueOnce({ name: 'SomeError', message: 'Some message' });

        retryManager.planDeliveryRetry(message);
        await sleep(100);

        expect(retryManager.plannedRetries.size).toEqual(0);
        expect(sender.pushMessage).toHaveBeenCalledTimes(2);
    });

    it('should retry again after a failed attempt (response 500 from target)', async () => {
        const retryManager = new RetryManager(
            config,
            channel,
            sender,
            logger,
            backoffStrategy,
            deadLetterPolicy
        );
        const message = mock<Message>();
        //@ts-ignore
        sender.pushMessage.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

        retryManager.planDeliveryRetry(message);
        await sleep(100);

        expect(retryManager.plannedRetries.size).toEqual(0);
        expect(sender.pushMessage).toHaveBeenCalledTimes(2);
    });
});
