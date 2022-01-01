import { ConsumerConfig } from '../config/yaml-config';
import { AppInstance } from '../server';
import { Consumer } from './consumer';

export function registerConsumers(consumersConfig: Array<ConsumerConfig>, app: AppInstance) {
    for (const cfg of consumersConfig) {
        const consumer = new Consumer(cfg.queueName, app.amqp.channel);
        app.consumers.push(consumer);

        app.get(`/consume/${consumer.queueName}`, async function (req, res) {
            const message = await consumer.getMessage();
            res.header('Content-Type', message.properties.contentType);
            res.header('X-Bunny-MessageID', message.properties.messageId);
            res.header('X-Bunny-CorrelationID', message.properties.correlationId);
            res.header('X-Bunny-AppID', message.properties.appId);
            res.header('X-Bunny-Message-Count', message.fields.messageCount);
            res.status(205);
            return message.content;
        });
    }
}
