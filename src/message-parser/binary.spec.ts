import { BinaryMessageParser } from './binary';

describe('BinaryMessageParser class', () => {
    it('should be instantiated without an error', () => {
        const t = () => {
            new BinaryMessageParser();
        };
        expect(t).not.toThrowError();
    });

    it('should return application/octet-stream content type', () => {
        const p = new BinaryMessageParser();
        expect(p.getAllowedContentTypes()).toEqual(['application/octet-stream']);
    });

    it('should accept binary input', () => {
        const p = new BinaryMessageParser();
        expect(p.validateMessage(Buffer.from('someinput'))).toEqual(Buffer.from('someinput'));
    });
});
