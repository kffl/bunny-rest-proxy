import { MetricsServerInstance } from './metrics/metrics-server';
import { Publisher } from './publisher/publisher';
import { AppInstance } from './server';
import { Subscriber } from './subscriber/subscriber';

export function totalMessagesInFlight(publishers: Array<Publisher>): number {
    let messagesInFlight = 0;
    for (const publisher of publishers) {
        messagesInFlight += publisher.messagesInFlight;
    }
    return messagesInFlight;
}

function subscriberDeliveriesInFlight(subscribers: Array<Subscriber>): number {
    let inFlightPushRequests = 0;
    for (const subscriber of subscribers) {
        inFlightPushRequests += subscriber.inFlightPushRequests;
    }
    return inFlightPushRequests;
}

export function shutdownMetricsServer(app: AppInstance) {
    app.log.info('Closing prometheus metrics server');
    return app.metrics.close();
}

export async function gracefullyHandleSubscriberShutdown(app: AppInstance, retryDelay = 1000) {
    app.pendingShutdown = true;

    if (!app.errorShutdown) {
        app.log.info('Cancelling all subscribers');
        await Promise.all(app.subscribers.map((s) => s.stop(false)));

        app.log.info('Checking for subscribers with HTTP push messages in-flight');

        let retries = 0;
        while (retries < 5) {
            retries++;
            const deliveriesInFlight = subscriberDeliveriesInFlight(app.subscribers);
            if (deliveriesInFlight === 0) {
                app.log.info(
                    'No subscribers with in-flight HTTP push message deliveries detected. Closing the AMQP connection.'
                );
                await app.amqp.connection.close();
                return;
            } else {
                app.log.warn(
                    `Some subscribers are pushing messages that are still in-flight (${deliveriesInFlight}). Waiting 1s for retry #${retries}`
                );
                await sleep(retryDelay);
            }
        }

        app.log.warn('Maximum number of retries exceeded. Forcefully closing the connection.');
        await app.amqp.connection.close();
    } else {
        app.subscribers.forEach((s) => s.stop(true));
    }
}

export function handleConnectionClose(app: AppInstance) {
    if (app.pendingShutdown) {
        app.log.info('AMQP connection was closed.');
    } else if (!app.errorShutdown) {
        app.errorShutdown = true;
        app.log.fatal('AMQP connection was closed unexpectedly. BRP is shutting down');
        app.close();
    }
}

export function handleChannelClose(app: AppInstance, isConfirmChannel: boolean) {
    if (app.pendingShutdown) {
        app.log.info(`AMQP ${isConfirmChannel ? 'confirm ' : ''}channel was closed.`);
    } else if (!app.errorShutdown) {
        app.errorShutdown = true;
        app.log.fatal('AMQP channel was closed unexpectedly. BRP is shutting down');
        app.amqp.connection.close();
        app.close();
    }
}

export const sleep = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));
