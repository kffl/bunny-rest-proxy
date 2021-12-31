import { Channel, Message } from 'amqplib-as-promised/lib';
import { ConsumerErrors } from './errors';

export class Consumer {
    constructor(public readonly queueName: string, private readonly channel: Channel) {}
    public async getMessage(): Promise<Message> {
        let message: Message | false;
        try {
            message = await this.channel.get(this.queueName, { noAck: true });
        } catch (e) {
            throw new ConsumerErrors.ERR_QUEUE_DOWN_GET();
        }
        if (message === false) {
            throw new ConsumerErrors.ERR_QUEUE_EMPTY();
        }
        return message;
    }
}
