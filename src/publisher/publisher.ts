import { ConfirmChannel } from 'amqplib-as-promised';
import { randomUUID } from 'crypto';
import { FastifyLoggerInstance } from 'fastify';
import { MessageContentType } from '../message-parser/content-types';
import { MessageParser } from '../message-parser/message-parser';
import { PublisherErrors } from './errors';

interface MessageHeaders {
    'x-bunny-persistent'?: string;
}

export type PublishRequestHeaders = MessageHeaders & { 'content-type': MessageContentType };

export interface MessagePublishResult {
    contentLengthBytes: number;
    messageId: string;
}

export class Publisher {
    constructor(
        public readonly queueName: string,
        protected readonly channel: ConfirmChannel,
        protected readonly messageParser: MessageParser
    ) {}
    public messagesInFlight = 0;
    public assertQueue() {
        return this.channel.assertQueue(this.queueName, { durable: true });
    }
    protected isContentTypeAllowed(contentType: string): boolean {
        return this.messageParser
            .getAllowedContentTypes()
            .includes(contentType as MessageContentType);
    }
    public async sendMessage(
        headers: PublishRequestHeaders,
        payload: Buffer,
        log: FastifyLoggerInstance
    ): Promise<MessagePublishResult> {
        if (!this.isContentTypeAllowed(headers['content-type'])) {
            throw new PublisherErrors.ERR_CONTENT_TYPE(headers['content-type']);
        }
        const uuid = randomUUID();
        const validatedMessage = this.messageParser.validateMessage(payload);
        try {
            this.messagesInFlight++;
            await this.channel.sendToQueue(this.queueName, validatedMessage, {
                persistent: headers['x-bunny-persistent'] !== 'false',
                contentType: headers['content-type'],
                messageId: uuid
            });
            this.messagesInFlight--;
            return { contentLengthBytes: validatedMessage.length, messageId: uuid };
        } catch (e) {
            log.error(`publishing to queue ${this.queueName} failed: ${(e as Error)?.message}`);
            throw new PublisherErrors.ERR_QUEUE_DOWN();
        }
    }
}
