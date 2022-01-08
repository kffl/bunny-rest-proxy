import { Connection } from 'amqplib-as-promised/lib';
import { FastifyLoggerInstance } from 'fastify';
import { mock, mockClear, mockDeep } from 'jest-mock-extended';
import { gracefullyHandleSubscriberShutdown, totalMessagesInFlight } from './lifecycle';
import { Publisher } from './publisher/publisher';
import { AppInstance } from './server';
import { Subscriber } from './subscriber/subscriber';

describe('totalMessagesInFlight function', () => {
    it('should sum the number of messages in-flight of all publishers', () => {
        const publisherOne = mock<Publisher>();
        const publisherTwo = mock<Publisher>();

        publisherOne.messagesInFlight = 5;
        publisherTwo.messagesInFlight = 7;

        const result = totalMessagesInFlight([publisherOne, publisherTwo]);

        expect(result).toEqual(12);
    });
});

describe('gracefullyHandleSubscriberShutdown function', () => {
    const logger = mock<FastifyLoggerInstance>();
    const subscriberOne = mock<Subscriber>();
    const subscriberTwo = mock<Subscriber>();
    const connection = mock<Connection>();

    beforeEach(() => {
        mockClear(logger);
        mockClear(subscriberOne);
        mockClear(subscriberTwo);
        mockClear(connection);
    });

    it('should stop all subscribers in connection error mode if the shutdown results from an AMQP channel/connection error', async () => {
        const app = mock<AppInstance>({
            log: logger,
            errorShutdown: true,
            subscribers: [subscriberOne, subscriberTwo]
        });
        await gracefullyHandleSubscriberShutdown(app);

        expect(subscriberOne.stop).toHaveBeenCalledTimes(1);
        expect(subscriberTwo.stop).toHaveBeenCalledTimes(1);
        expect(subscriberTwo.stop).toHaveBeenCalledWith(true);
        expect(subscriberTwo.stop).toHaveBeenCalledWith(true);
        expect(logger.info).not.toHaveBeenCalled();
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should stop all subscribers in connection error mode if the shutdown results from an AMQP channel/connection error', async () => {
        const app = mock<AppInstance>({
            log: logger,
            errorShutdown: true,
            subscribers: [subscriberOne, subscriberTwo],
            amqp: {
                connection: connection
            }
        });
        await gracefullyHandleSubscriberShutdown(app);

        expect(subscriberOne.stop).toHaveBeenCalledTimes(1);
        expect(subscriberTwo.stop).toHaveBeenCalledTimes(1);
        expect(subscriberTwo.stop).toHaveBeenCalledWith(true);
        expect(subscriberTwo.stop).toHaveBeenCalledWith(true);
        expect(logger.info).not.toHaveBeenCalled();
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should cancel all subscribers before closing the AMQP connection', async () => {
        const app = mockDeep<AppInstance>({
            log: logger,
            errorShutdown: false,
            subscribers: [subscriberOne, subscriberTwo],
            amqp: {
                connection: connection
            }
        });

        subscriberOne.inFlightPushRequests = 0;
        subscriberTwo.inFlightPushRequests = 0;

        await gracefullyHandleSubscriberShutdown(app, 0);

        expect(subscriberOne.stop).toHaveBeenCalledTimes(1);
        expect(subscriberTwo.stop).toHaveBeenCalledTimes(1);
        expect(subscriberTwo.stop).toHaveBeenCalledWith(false);
        expect(subscriberTwo.stop).toHaveBeenCalledWith(false);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    it('should wait for all in-flight subscriber message deliveries to complete before closing the amqp connection', async () => {
        const mockGetter = jest.fn();

        const subscriber1 = mock<Subscriber>({ inFlightPushRequests: 0 });
        const subscriber2 = mock<Subscriber>({ inFlightPushRequests: 1 });

        const app = mockDeep<AppInstance>({
            log: logger,
            errorShutdown: false,
            subscribers: [subscriber1, subscriber2]
        });

        Object.defineProperty(subscriber2, 'inFlightPushRequests', {
            get: mockGetter
        });

        mockGetter.mockReturnValue(0);
        mockGetter.mockReturnValueOnce(1);

        await gracefullyHandleSubscriberShutdown(app, 0);

        expect(app.log.warn).toHaveBeenCalledTimes(1);
        expect(app.amqp.connection.close).toHaveBeenCalledTimes(1);
        expect(app.log.warn).toHaveBeenCalledWith(
            expect.stringMatching('subscribers are pushing messages')
        );
    });

    it('should forcefully close the AMQP after exceeding the maximum number of retries waiting for subscribers to finish in-flight push deliveries', async () => {
        const app = mockDeep<AppInstance>({
            log: logger,
            errorShutdown: false,
            subscribers: [subscriberOne, subscriberTwo],
            amqp: {
                connection: connection
            }
        });

        subscriberOne.inFlightPushRequests = 0;
        subscriberTwo.inFlightPushRequests = 1;

        await gracefullyHandleSubscriberShutdown(app, 0);

        expect(app.log.warn).toHaveBeenCalledWith(
            expect.stringMatching('Maximum number of retries exceeded')
        );
        expect(app.amqp.connection.close).toHaveBeenCalledTimes(1);
    });
});
