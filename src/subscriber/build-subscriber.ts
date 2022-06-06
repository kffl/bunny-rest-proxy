import { SubscriberConfig } from '../config/yaml-config.types';
import { SubscriberMetricsCollector } from '../metrics/metrics-collector.interfaces';
import { AppInstance } from '../server';
import { getBackoffStrategyFn } from './backoff-strategy';
import { getDeadLetterPolicy } from './dead-letter-policy';
import { PushSender } from './push-sender';
import { RetryManager } from './retry-manager';
import { Subscriber } from './subscriber';

function buildSubscriber(
    config: SubscriberConfig,
    app: AppInstance,
    metricsCollector: SubscriberMetricsCollector
): Subscriber {
    const sender = new PushSender(
        config.queueName,
        config.target,
        config.timeout,
        metricsCollector
    );
    const backoffStrategy = getBackoffStrategyFn(config.backoffStrategy);
    const deadLetterPolicy = getDeadLetterPolicy(config, app.amqp);
    const retryManager = new RetryManager(
        config,
        app.amqp.channel,
        sender,
        app.log,
        backoffStrategy,
        deadLetterPolicy,
        metricsCollector
    );
    return new Subscriber(
        config,
        app.amqp.channel,
        app.log,
        sender,
        retryManager,
        metricsCollector
    );
}

export async function registerSubscribers(
    subscribersConfig: Array<SubscriberConfig>,
    app: AppInstance,
    metricsCollector: SubscriberMetricsCollector
) {
    for (const cfg of subscribersConfig) {
        const subscriber = buildSubscriber(cfg, app, metricsCollector);
        app.subscribers.push(subscriber);
    }
}
