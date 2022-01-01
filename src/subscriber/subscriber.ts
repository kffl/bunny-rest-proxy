import { Channel, Options, Message } from 'amqplib-as-promised/lib';
import { randomUUID } from 'crypto';
import { URL } from 'url';
import fetch from 'node-fetch';
import { FastifyLoggerInstance } from 'fastify';
import { SubscriberConfig } from '../config/yaml-config';

const isURLValid = (u: string) => {
    try {
        new URL(u);
        return true;
    } catch (err) {
        return false;
    }
};

interface PlannedRetry {
    msg: Message;
    timer: NodeJS.Timer;
    attempt: number;
}

/**
 * Subscriber consumes messages from a single queue and pushes them to the specified target
 * via HTTP post requests. It also handles retries of failed HTTP deliveries.
 */
export class Subscriber {
    protected consumerTag: string;
    /** Number of node-fetch HTTP POST requests currently delivering messages to the target */
    public inFlightPushRequests = 0;
    public plannedRetries = new Set<PlannedRetry>();
    constructor(
        public readonly config: SubscriberConfig,
        protected channel: Channel,
        protected logger: FastifyLoggerInstance
    ) {
        this.onDeliverySuccess = this.onDeliverySuccess.bind(this);
        this.onDeliveryFailure = this.onDeliveryFailure.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleRetry = this.handleRetry.bind(this);
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
        this.cancelPlannedDeliveryRetries(isConnectionFailure);
        if (!isConnectionFailure) await this.channel.cancel(this.consumerTag);
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
        this.planDeliveryRetry(msg, 1);
    }
    protected deliverMessage(msg: Message) {
        return fetch(this.config.target, {
            timeout: this.config.timeout,
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
                'X-Bunny-From-Queue': this.config.queueName
            },
            body: msg.content
        });
    }
    protected handleMessage(msg: Message | null) {
        if (msg === null) {
            return;
        }
        this.logger.trace(`Received ${msg.fields.redelivered}`);
        this.inFlightPushRequests++;
        this.deliverMessage(msg)
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
    protected handleRetry(retry: PlannedRetry) {
        this.plannedRetries.delete(retry);
        this.logger.info(
            `retrying message delivery: queue ${this.config.queueName}, attempt #${retry.attempt}, message ID: ${retry.msg.properties.messageId}`
        );
        this.inFlightPushRequests++;
        this.deliverMessage(retry.msg)
            .then((res) => {
                this.inFlightPushRequests--;
                if (res.ok) {
                    this.onDeliveryRetrySuccess(retry);
                } else {
                    this.onDeliveryRetryFailure(
                        retry,
                        `target responded with HTTP code ${res.status}`
                    );
                }
            })
            .catch((error) => {
                this.inFlightPushRequests--;
                this.onDeliveryRetryFailure(
                    retry,
                    `HTTP request failed with error: ${error?.name}, message: ${error?.message}`
                );
            });
    }
    protected onDeliveryRetryFailure(retry: PlannedRetry, reason: string) {
        this.logger.warn(
            `Message delivery retry failed: queue ${this.config.queueName}, attempt #${retry.attempt}, message ID: ${retry.msg.properties.messageId}, reason: ${reason}`
        );
        this.planDeliveryRetry(retry.msg, retry.attempt + 1);
    }
    protected onDeliveryRetrySuccess(retry: PlannedRetry) {
        this.logger.info(
            `Message delivery retry succeeded: queue ${this.config.queueName}, attempt #${retry.attempt}, message ID: ${retry.msg.properties.messageId}`
        );
        this.channel.ack(retry.msg);
    }
    protected planDeliveryRetry(msg: Message, attempt = 1) {
        if (attempt > this.config.retries) {
            this.logger.warn(
                `Maximum number of delivery retries exceeded for message ID: ${msg.properties.messageId}, nacking message`
            );
            this.channel.nack(msg);
        } else {
            const plannedRetry: PlannedRetry = {
                msg,
                timer: setTimeout(() => {
                    this.handleRetry(plannedRetry);
                }, this.config.retryDelay * attempt),
                attempt
            };
            this.plannedRetries.add(plannedRetry);
        }
    }
    protected cancelPlannedDeliveryRetries(isConnectionFailure: boolean) {
        for (const plannedRetry of this.plannedRetries) {
            clearTimeout(plannedRetry.timer);
            if (!isConnectionFailure) this.channel.nack(plannedRetry.msg);
        }
        this.plannedRetries.clear();
    }
}
