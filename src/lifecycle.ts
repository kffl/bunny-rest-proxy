import { Publisher } from './publisher/publisher';
import { AppInstance } from './server';

export function totalMessagesInFlight(publishers: Array<Publisher>): number {
    let messagesInFlight = 0;
    for (const publisher of publishers) {
        messagesInFlight += publisher.messagesInFlight;
    }
    return messagesInFlight;
}

// TODO
function totalConsumerMessagesProcessed(): number {
    return 0;
}

export async function gracefullyHandleConsumerShutdown(app: AppInstance) {
    app.pendingShutdown = true;
    if (!app.errorShutdown) {
        app.log.info('Checking for consumers with un-processed messages');

        let retries = 0;
        while (retries < 5) {
            retries++;
            // TODO - check if consumers have messages that are being processed
            if (totalConsumerMessagesProcessed() === 0) {
                app.log.info(
                    'No consumer messages in processing detected. Closing the AMQP connection.'
                );
                await app.amqp.connection.close();
                return;
            } else {
                app.log.warn(
                    `Some consumers have messages that are still being processed. Waiting 1s for retry #${retries}`
                );
                await sleep(1000);
            }
        }

        app.log.warn('Maximum number of retries exceeded. Forcefully closing the connection.');
        await app.amqp.connection.close();
    }
}

export const sleep = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));
