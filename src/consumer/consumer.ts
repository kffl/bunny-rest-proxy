import { Channel, Message } from 'amqplib-as-promised/lib';
import { ConsumerErrors } from './errors';

export class Consumer {
    constructor(
        public readonly queueName: string,
        private readonly channel: Channel,
        public readonly identities: Array<string>
    ) {}
    public messagesCurrentlyAwaitedOn = 0;
    public async getMessage(): Promise<Message> {
        let message: Message | false;
        try {
            this.messagesCurrentlyAwaitedOn++;
            message = await this.channel.get(this.queueName, { noAck: true });
        } catch (e) {
            this.messagesCurrentlyAwaitedOn--;
            throw new ConsumerErrors.ERR_QUEUE_DOWN_GET();
        }
        this.messagesCurrentlyAwaitedOn--;
        if (message === false) {
            throw new ConsumerErrors.ERR_QUEUE_EMPTY();
        }
        return message;
    }
}
