import { Channel } from 'amqplib-as-promised/lib';
import { Consumer } from './consumer';
import { ConsumerErrors } from './errors';

const mockGet = jest.fn(() => Promise.resolve({ content: Buffer.from('some payload') }));
const mockGetEmpty = jest.fn(() => Promise.resolve(false));
const mockGetFail = jest.fn(() => Promise.reject());

//@ts-ignore
const mockChannel = {
    get: mockGet
} as Channel;

//@ts-ignore
const mockChannelEmpty = {
    get: mockGetEmpty
} as Channel;

//@ts-ignore
const mockChannelFailing = {
    get: mockGetFail
} as Channel;

describe('Consumer class', () => {
    beforeEach(() => {
        mockGet.mockClear();
        mockGetFail.mockClear();
    });

    it('should return a message if get succeeds', async () => {
        const c = new Consumer('somequeue', mockChannel);
        const message = await c.getMessage();
        expect(message.content).toEqual(Buffer.from('some payload'));
        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockGet).toHaveBeenCalledWith('somequeue', { noAck: true });
    });

    it('should throw an error if queue is empty', async () => {
        const c = new Consumer('somequeue', mockChannelEmpty);
        const t = async () => {
            await c.getMessage();
        };
        expect(t()).rejects.toThrowError(ConsumerErrors.ERR_QUEUE_EMPTY);
    });

    it('should throw an error if queue is unavailable', async () => {
        const c = new Consumer('somequeue', mockChannelFailing);
        const t = async () => {
            await c.getMessage();
        };
        expect(t()).rejects.toThrowError(ConsumerErrors.ERR_QUEUE_DOWN_GET);
    });
});
