import { Channel } from 'amqplib-as-promised/lib';
import { Consumer } from './consumer';
import { ConsumerErrors } from './errors';
import { Message } from 'amqplib';
import { mock, mockClear } from 'jest-mock-extended';

describe('Consumer class', () => {
    const channel = mock<Channel>();
    beforeEach(() => {
        mockClear(channel);
    });

    it('should return a message if get succeeds', async () => {
        channel.get.mockResolvedValue({ content: Buffer.from('some payload') } as Message);
        const c = new Consumer('somequeue', channel, []);
        const message = await c.getMessage();
        expect(message.content).toEqual(Buffer.from('some payload'));
        expect(channel.get).toHaveBeenCalledTimes(1);
        expect(channel.get).toHaveBeenCalledWith('somequeue', { noAck: true });
    });

    it('should throw an error if queue is empty', async () => {
        channel.get.mockResolvedValue(false);
        const c = new Consumer('somequeue', channel, []);
        const t = async () => {
            await c.getMessage();
        };
        expect(t()).rejects.toThrowError(ConsumerErrors.ERR_QUEUE_EMPTY);
    });

    it('should throw an error if queue is unavailable', async () => {
        channel.get.mockRejectedValue('some error');
        const c = new Consumer('somequeue', channel, []);
        const t = async () => {
            await c.getMessage();
        };
        expect(t()).rejects.toThrowError(ConsumerErrors.ERR_QUEUE_DOWN_GET);
    });
});
