import { Message } from 'amqplib';
import { Channel } from 'amqplib-as-promised/lib';
import { FastifyLoggerInstance } from 'fastify';
import { SubscriberConfig } from '../config/yaml-config.types';
import { BackoffStrategy } from './backoff-strategy';
import { PushSender } from './push-sender';

interface PlannedRetry {
    msg: Message;
    timer: NodeJS.Timer;
    attempt: number;
}

export class RetryManager {
    public plannedRetries = new Set<PlannedRetry>();
    public inFlightPushRetries = 0;
    constructor(
        protected readonly config: SubscriberConfig,
        protected readonly channel: Channel,
        protected readonly pushSender: PushSender,
        protected readonly logger: FastifyLoggerInstance,
        protected calculateBackoff: BackoffStrategy
    ) {}
    public planDeliveryRetry(msg: Message, attempt = 1) {
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
                }, this.calculateBackoff(this.config.retryDelay, attempt)),
                attempt
            };
            this.plannedRetries.add(plannedRetry);
        }
    }
    public cancelPlannedDeliveryRetries(isConnectionFailure: boolean) {
        for (const plannedRetry of this.plannedRetries) {
            clearTimeout(plannedRetry.timer);
            if (!isConnectionFailure) this.channel.nack(plannedRetry.msg);
        }
        this.plannedRetries.clear();
    }
    protected handleRetry(retry: PlannedRetry) {
        this.plannedRetries.delete(retry);
        this.logger.info(
            `retrying message delivery: queue ${this.config.queueName}, attempt #${retry.attempt}, message ID: ${retry.msg.properties.messageId}`
        );
        this.inFlightPushRetries++;
        this.pushSender
            .pushMessage(retry.msg)
            .then((res) => {
                this.inFlightPushRetries--;
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
                this.inFlightPushRetries--;
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
}
