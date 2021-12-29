import { MessageParser } from './message-parser';

describe('MessageParser class', () => {
    it('should throw an error when instantiated', () => {
        const t = () => {
            new MessageParser();
        };
        expect(t).toThrow(Error);
    });
});
