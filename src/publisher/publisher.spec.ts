import { ConfirmChannel } from 'amqplib-as-promised/lib';
import { Publisher } from './publisher';
import { BinaryMessageParser } from '../message-parser/binary';
import { FastifyLoggerInstance } from 'fastify';
import { MessageContentType } from '../message-parser/content-types';
import { PublisherErrors } from './errors';
import { mock } from 'jest-mock-extended';

const mockAssertQueue = jest.fn(() => Promise.resolve());
const mockSendToQueue = jest.fn(() => Promise.resolve());

jest.mock('amqplib-as-promised/lib', () => {
    return {
        ConfirmChannel: jest.fn().mockImplementation(() => {
            return {
                assertQueue: mockAssertQueue,
                sendToQueue: mockSendToQueue
            };
        })
    };
});

describe('Publisher', () => {
    beforeEach(() => {
        mockAssertQueue.mockClear();
        mockSendToQueue.mockClear();
    });

    it('should assert a durable queue with specified name', async () => {
        //@ts-ignore
        const p = new Publisher('testqueue', new ConfirmChannel(), new BinaryMessageParser());
        await p.assertQueue();
        expect(mockAssertQueue).toHaveBeenCalledTimes(1);
        expect(mockAssertQueue).toHaveBeenCalledWith('testqueue', { durable: true });
    });

    it('should return result upon sending a message', async () => {
        const mockLogger = mock<FastifyLoggerInstance>();
        //@ts-ignore
        const p = new Publisher('testqueue', new ConfirmChannel(), new BinaryMessageParser());
        const response = await p.sendMessage(
            { 'content-type': MessageContentType.binary },
            Buffer.from('testmessage'),
            mockLogger
        );

        expect(mockSendToQueue.mock.calls.length).toBe(1);
        // @ts-ignore
        expect(mockSendToQueue.mock.calls[0][1]).toEqual(Buffer.from('testmessage'));
        const expectedCallParam = { contentType: MessageContentType.binary, persistent: true };
        // @ts-ignore
        expect(mockSendToQueue.mock.calls[0][2]).toMatchObject(expectedCallParam);

        expect(response.contentLengthBytes).toBe(11);
        const uuidRegex =
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        expect(response.messageId).toMatch(uuidRegex);
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should throw an error if message sending fails', async () => {
        const mockLogger = mock<FastifyLoggerInstance>();
        mockSendToQueue.mockRejectedValueOnce('some error');
        //@ts-ignore
        const p = new Publisher('testqueue', new ConfirmChannel(), new BinaryMessageParser());
        const t = async () => {
            await p.sendMessage(
                { 'content-type': MessageContentType.binary },
                Buffer.from('testmessage'),
                mockLogger
            );
        };

        await expect(t()).rejects.toThrow(PublisherErrors.ERR_QUEUE_DOWN);
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
});
