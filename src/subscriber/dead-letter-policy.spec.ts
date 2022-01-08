import { DeadLetterQueueDLP, DiscardDLP, RequeueDLP } from './dead-letter-policy';
import { mock } from 'jest-mock-extended';
import { Channel, ConfirmChannel } from 'amqplib-as-promised/lib';
import { Message } from 'amqplib';

describe('discard dead letter policy', () => {
    it('should ack a message so that it wont be requeued', () => {
        const mockChannel = mock<Channel>();
        const mockMessage = mock<Message>();
        const policy = new DiscardDLP(mockChannel);
        policy.handleDeadMessage(mockMessage);
        expect(mockChannel.ack).toHaveBeenCalledTimes(1);
        expect(mockChannel.nack).toHaveBeenCalledTimes(0);
        expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });
});

describe('requeue dead letter policy', () => {
    it('should nack a message so that it will be requeued', () => {
        const mockChannel = mock<Channel>();
        const mockMessage = mock<Message>();
        const policy = new RequeueDLP(mockChannel);
        policy.handleDeadMessage(mockMessage);
        expect(mockChannel.nack).toHaveBeenCalledTimes(1);
        expect(mockChannel.ack).toHaveBeenCalledTimes(0);
        expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage);
    });
});

describe('dead letter queue policy', () => {
    it('should send a dead message to a dead letter queue', async () => {
        const mockChannel = mock<Channel>();
        const mockConfirmChannel = mock<ConfirmChannel>();
        const mockMessage = mock<Message>();
        const policy = new DeadLetterQueueDLP(mockChannel, mockConfirmChannel, 'dlq');

        await policy.handleDeadMessage(mockMessage);

        expect(mockChannel.nack).toHaveBeenCalledTimes(0);
        expect(mockChannel.ack).toHaveBeenCalledTimes(1);
        expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
        expect(mockConfirmChannel.sendToQueue).toHaveBeenCalledTimes(1);
        expect(mockConfirmChannel.sendToQueue).toHaveBeenCalledWith(
            'dlq',
            expect.anything(),
            expect.anything()
        );
    });

    it('should nack a message if sending to dlq fails', async () => {
        const mockChannel = mock<Channel>();
        const mockConfirmChannel = mock<ConfirmChannel>();
        const mockMessage = mock<Message>();
        mockConfirmChannel.sendToQueue.mockRejectedValueOnce(null);

        const policy = new DeadLetterQueueDLP(mockChannel, mockConfirmChannel, 'dlq');

        await policy.handleDeadMessage(mockMessage);

        expect(mockChannel.nack).toHaveBeenCalledTimes(1);
        expect(mockChannel.ack).toHaveBeenCalledTimes(0);
        expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage);
        expect(mockConfirmChannel.sendToQueue).toHaveBeenCalledTimes(1);
        expect(mockConfirmChannel.sendToQueue).toHaveBeenCalledWith(
            'dlq',
            expect.anything(),
            expect.anything()
        );
    });
});
