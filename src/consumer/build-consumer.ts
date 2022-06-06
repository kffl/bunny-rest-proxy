import { AuthorizedRequestHeaders, IdentityGuard } from '../auth/identity-guard';
import { ConsumerConfig } from '../config/yaml-config.types';
import { ConsumerMetricsCollector } from '../metrics/metrics-collector.interfaces';
import { AppInstance } from '../server';
import { Consumer } from './consumer';

export function registerConsumers(
    consumersConfig: Array<ConsumerConfig>,
    app: AppInstance,
    metricsCollector: ConsumerMetricsCollector
) {
    for (const cfg of consumersConfig) {
        const consumer = new Consumer(cfg.queueName, app.amqp.channel, cfg.identities);
        app.consumers.push(consumer);

        const identityGuard = new IdentityGuard(consumer, app.identities);

        app.get<{ Headers: AuthorizedRequestHeaders }>(
            `/consume/${consumer.queueName}`,
            async function (req, res) {
                const completed = metricsCollector.startConsumerTimer(consumer.queueName);
                try {
                    identityGuard.verifyRequest(req);
                    const message = await consumer.getMessage();
                    res.header('Content-Type', message.properties.contentType);
                    res.header('X-Bunny-MessageID', message.properties.messageId);
                    res.header('X-Bunny-CorrelationID', message.properties.correlationId);
                    res.header('X-Bunny-AppID', message.properties.appId);
                    res.header('X-Bunny-Message-Count', message.fields.messageCount);
                    res.status(205);
                    completed({ status: 205 });
                    return message.content;
                } catch (e) {
                    //@ts-ignore
                    if (e.statusCode) {
                        //@ts-ignore
                        completed({ status: e.statusCode });
                    } else {
                        completed({ status: 500 });
                    }
                    throw e;
                }
            }
        );
    }
}
