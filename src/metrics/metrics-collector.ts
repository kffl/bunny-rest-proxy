import { MetricsServerInstance } from './metrics-server';
import client from 'prom-client';
import {
    ConsumerMetricsCollector,
    PublisherMetricsCollector,
    SubscriberMetricsCollector
} from './metrics-collector.interfaces';

const publisherConsumerLabels = ['status', 'queue'] as const;
const subscriberLabels = ['status', 'queue', 'target'] as const;
const counterLabels = ['queue', 'target'] as const;

export class MetricsCollector
    implements PublisherMetricsCollector, SubscriberMetricsCollector, ConsumerMetricsCollector
{
    protected publisherHistogram;
    protected consumerHistogram;
    protected subscriberHistogram;
    protected subscriberFailedCounter;
    protected subscriberDeadCounter;
    constructor(public readonly server: MetricsServerInstance) {
        this.publisherHistogram = new client.Histogram({
            name: 'publisher_latency',
            help: 'latency of HTTP publisher requests',
            labelNames: publisherConsumerLabels,
            buckets: client.exponentialBuckets(0.001, 2, 12)
        });
        this.consumerHistogram = new client.Histogram({
            name: 'consumer_latency',
            help: 'latency of HTTP consumer requests',
            labelNames: publisherConsumerLabels,
            buckets: client.exponentialBuckets(0.001, 2, 12)
        });
        this.subscriberHistogram = new client.Histogram({
            name: 'subscriber_latency',
            help: 'latency of subscriber HTTP PUSH requests',
            labelNames: subscriberLabels,
            buckets: client.exponentialBuckets(0.001, 2, 12)
        });
        this.subscriberFailedCounter = new client.Counter({
            name: 'subscriber_failed_messages',
            help: 'number of messages that failed the initial delivery attempt',
            labelNames: counterLabels
        });
        this.subscriberDeadCounter = new client.Counter({
            name: 'subscriber_dead_messages',
            help: 'number of messages that exceeded the max number of delivery retries',
            labelNames: counterLabels
        });
    }
    public start(port = 9672) {
        return this.server.listen(port, '0.0.0.0');
    }
    public close() {
        return this.server.close();
    }
    public reset() {
        client.register.resetMetrics();
    }
    public startPublisherTimer(queueName: string) {
        return this.publisherHistogram.startTimer({ queue: queueName });
    }
    public startConsumerTimer(queueName: string) {
        return this.consumerHistogram.startTimer({ queue: queueName });
    }
    public startSubscriberTimer(queueName: string, target: string) {
        return this.subscriberHistogram.startTimer({ queue: queueName, target });
    }
    public recordFailedDelivery(queueName: string, target: string) {
        this.subscriberFailedCounter.inc({ queue: queueName, target });
    }
    public recordDeadMessage(queueName: string, target: string) {
        this.subscriberDeadCounter.inc({ queue: queueName, target });
    }
}
