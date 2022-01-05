import { Message } from 'amqplib';
import { Channel, ConfirmChannel } from 'amqplib-as-promised/lib';
import { SubscriberConfig } from '../config/yaml-config.types';
import { AppInstance } from '../server';

export interface DeadLetterPolicy {
    handleDeadMessage: (msg: Message) => void | Promise<void>;
    describeBehavior: string;
}

class DiscardDLP implements DeadLetterPolicy {
    constructor(protected readonly channel: Channel) {}
    public get describeBehavior() {
        return 'discarding (acking) message';
    }
    public handleDeadMessage(msg: Message) {
        return this.channel.ack(msg);
    }
}

class RequeueDLP implements DeadLetterPolicy {
    constructor(protected readonly channel: Channel) {}
    public get describeBehavior() {
        return 'requeuing (nacking) message';
    }
    public handleDeadMessage(msg: Message) {
        return this.channel.nack(msg);
    }
}

class DeadLetterQueueDLP implements DeadLetterPolicy {
    constructor(
        protected readonly channel: Channel,
        protected readonly confirmChannel: ConfirmChannel,
        protected readonly deadLetterQueueName: string
    ) {}
    public get describeBehavior() {
        return 'sending message to DLQ and discarding (acking)';
    }
    public async handleDeadMessage(msg: Message): Promise<void> {
        try {
            await this.confirmChannel.sendToQueue(this.deadLetterQueueName, msg.content, {
                ...msg.properties
            });
        } catch (e) {
            return this.channel.nack(msg);
        }
        return this.channel.ack(msg);
    }
}

export function getDeadLetterPolicy(
    config: SubscriberConfig,
    amqp: AppInstance['amqp']
): DeadLetterPolicy {
    switch (config.deadLetterPolicy) {
        case 'requeue':
            return new RequeueDLP(amqp.channel);
        case 'discard':
            return new DiscardDLP(amqp.channel);
        case 'dlq':
            return new DeadLetterQueueDLP(
                amqp.channel,
                amqp.confirmChannel,
                config.deadLetterQueueName
            );
    }
}
