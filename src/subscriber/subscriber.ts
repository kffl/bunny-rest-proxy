import { Channel, Options, Message } from 'amqplib-as-promised/lib';
import { randomUUID } from 'crypto';
import { URL } from 'url';
import { FastifyLoggerInstance } from 'fastify';
import { SubscriberConfig } from '../config/yaml-config.types';
import { PushSender } from './push-sender';
import { RetryManager } from './retry-manager';
import { SubscriberMetricsCollector } from '../metrics/metrics-collector.interfaces';

const isURLValid = (u: string) => {
    try {
        new URL(u);
        return true;
    } catch (err) {
        return false;
    }
};

/**
 * Subscriber consumes messages from a single queue and pushes them to the specified target
 * via HTTP post requests. It also handles retries of failed HTTP deliveries.
 */
export class Subscriber {
    protected consumerTag: string;
    /** Number of node-fetch HTTP POST requests currently delivering messages to the target */
    public inFlightPushRequests = 0;
    public get inFlightPushRetries() {
        return this.retryManager.inFlightPushRetries;
    }
    constructor(
        public readonly config: SubscriberConfig,
        protected channel: Channel,
        protected logger: FastifyLoggerInstance,
        protected pushSender: PushSender,
        protected retryManager: RetryManager,
        protected metricsCollector: SubscriberMetricsCollector
    ) {
        this.onDeliverySuccess = this.onDeliverySuccess.bind(this);
        this.onDeliveryFailure = this.onDeliveryFailure.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        if (!isURLValid(config.target)) {
            throw new Error('Invalid subscriber target URL: ' + config.target);
        }
        this.consumerTag = randomUUID();
    }
    /**
     * Starts listening for messages by creating an AMQP consumer.
     */
    public async start() {
        const consumeOptions: Options.Consume = {
            consumerTag: this.consumerTag
        };
        this.logger.info(
            `Starting subscriber - queue: ${this.config.queueName}, target: ${this.config.target}, consumer tag: ${this.consumerTag}`
        );
        // since prefetch value is assigned to a consumer at creation time,
        // individual invocations of Subscriber.start() must happen one-by-one
        await this.channel.prefetch(this.config.prefetch);
        await this.channel.consume(this.config.queueName, this.handleMessage, consumeOptions);
        this.logger.debug(`Subscriber started`);
    }
    /**
     * Cancels all timeouts of scheduled delivery retries (also nacking their messages)
     * and instructs RabbitMQ not to push any new messages to the underlying consumer.
     * @param isConnectionFailure instruct the method not to communicate with RabbitMQ (i.e. in case of channel failure)
     */
    public async stop(isConnectionFailure: boolean) {
        this.logger.info(
            `Stopping subscriber - queue: ${this.config.queueName}, target: ${this.config.target}, consumer tag: ${this.consumerTag}`
        );
        this.retryManager.cancelPlannedDeliveryRetries(isConnectionFailure);
        if (!isConnectionFailure) await this.channel.cancel(this.consumerTag);
    }
    public handleMessage(msg: Message | null) {
        if (msg === null) {
            return;
        }
        this.logger.trace(`Received message with ID ${msg.properties.messageId}`);
        this.inFlightPushRequests++;
        this.pushSender
            .pushMessage(msg)
            .then((res) => {
                this.inFlightPushRequests--;
                if (res.ok) {
                    this.onDeliverySuccess(msg);
                } else {
                    this.onDeliveryFailure(msg, `target responded with HTTP code ${res.status}`);
                }
            })
            .catch((error) => {
                this.inFlightPushRequests--;
                this.onDeliveryFailure(
                    msg,
                    `HTTP request failed with error: ${error?.name}, message: ${error?.message}`
                );
            });
    }
    protected onDeliverySuccess(msg: Message) {
        this.logger.debug(
            `Delivered message ${msg.properties.messageId} from queue ${this.config.queueName}, acknowledging`
        );
        this.channel.ack(msg);
    }
    protected onDeliveryFailure(msg: Message, reason: string) {
        this.logger.warn(
            `Message delivery failed, target: ${this.config.target}, message ID: ${msg.properties.messageId}, reason: ${reason}`
        );
        this.metricsCollector.recordFailedDelivery(this.config.queueName, this.config.target);
        this.retryManager.planDeliveryRetry(msg, 1);
    }
}
