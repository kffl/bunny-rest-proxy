import { SubscriberConfig } from '../config/yaml-config.types';
import { AppInstance } from '../server';
import { getBackoffStrategyFn } from './backoff-strategy';
import { PushSender } from './push-sender';
import { RetryManager } from './retry-manager';
import { Subscriber } from './subscriber';

function buildSubscriber(config: SubscriberConfig, app: AppInstance): Subscriber {
    const sender = new PushSender(config.queueName, config.target, config.timeout);
    const backoffStrategy = getBackoffStrategyFn(config.backoffStrategy);
    const retryManager = new RetryManager(
        config,
        app.amqp.channel,
        sender,
        app.log,
        backoffStrategy
    );
    return new Subscriber(config, app.amqp.channel, app.log, sender, retryManager);
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
