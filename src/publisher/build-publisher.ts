import { ConfirmChannel } from 'amqplib-as-promised/lib';
import { PublisherConfig, PublisherContentTypes } from '../config/yaml-config';
import { BinaryMessageParser } from '../message-parser/binary';
import { JSONMessageParser } from '../message-parser/json';
import { MessageParser } from '../message-parser/message-parser';
import { Publisher } from './publisher';

export default function buildPublisher(
    config: PublisherConfig,
    channel: ConfirmChannel
): Publisher {
    let messageParser: MessageParser;
    if (config.contentType === PublisherContentTypes.BINARY) {
        messageParser = new BinaryMessageParser();
    } else {
        messageParser = new JSONMessageParser();
    }
    return new Publisher(config.queueName, channel, messageParser);
}
