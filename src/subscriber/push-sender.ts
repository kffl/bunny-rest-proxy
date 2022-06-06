import { Message } from 'amqplib';
import fetch from 'node-fetch';
import { SubscriberMetricsCollector } from '../metrics/metrics-collector.interfaces';

export class PushSender {
    constructor(
        protected readonly queueName: string,
        protected readonly target: string,
        protected readonly timeout: number,
        protected readonly metricsCollector: SubscriberMetricsCollector
    ) {}
    public async pushMessage(msg: Message) {
        const completed = this.metricsCollector.startSubscriberTimer(this.queueName, this.target);
        const r = await fetch(this.target, {
            timeout: this.timeout,
            method: 'POST',
            headers: {
                'Content-Type': msg.properties.contentType,
                'X-Bunny-MessageID': msg.properties.messageId,
                'X-Bunny-CorrelationID': msg.properties.correlationId,
                'X-Bunny-Redelivered': msg.fields.redelivered.toString(),
                'X-Bunny-Message-Count': (msg.fields.messageCount === undefined
                    ? -1
                    : msg.fields.messageCount
                ).toString(),
                'X-Bunny-AppID': msg.properties.appId,
                'X-Bunny-From-Queue': this.queueName
            },
            body: msg.content
        });
        completed({ status: r.status });
        return r;
    }
}
