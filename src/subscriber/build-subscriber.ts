import { SubscriberConfig } from '../config/yaml-config.types';
import { AppInstance } from '../server';
import { Subscriber } from './subscriber';

function buildSubscriber(config: SubscriberConfig, app: AppInstance): Subscriber {
    return new Subscriber(config, app.amqp.channel, app.log);
}

export async function registerSubscribers(
    subscribersConfig: Array<SubscriberConfig>,
    app: AppInstance
) {
    for (const cfg of subscribersConfig) {
        const subscriber = buildSubscriber(cfg, app);
        app.subscribers.push(subscriber);
    }
}
