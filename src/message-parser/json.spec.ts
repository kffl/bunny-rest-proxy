import { PublisherErrors } from '../publisher/errors';
import { JSONMessageParser } from './json';

describe('JSONMessageParser class', () => {
    it('should throw an error when instantiated with invalid schema', () => {
        const t = () => {
            new JSONMessageParser({ wrongSchema: true });
        };
        expect(t).toThrow(Error);
    });

    it('should be instantiated properly with default (empty) schema', () => {
        const t = () => {
            new JSONMessageParser();
        };
        expect(t).not.toThrowError();
    });

    it('should return application/json content type', () => {
        const p = new JSONMessageParser();
        expect(p.getAllowedContentTypes()).toEqual(['application/json']);
    });

    it('should accept valid JSON input', () => {
        const p = new JSONMessageParser({
            properties: { foo: { type: 'string' } },
            additionalProperties: false
        });
        expect(p.validateMessage(Buffer.from('{"foo": "bar"}'))).toEqual(
            Buffer.from('{"foo": "bar"}')
        );
    });

    it('should throw an error on invalid valid JSON input', () => {
        const t = () => {
            const p = new JSONMessageParser({
                properties: { foo: { type: 'string' } },
                additionalProperties: false
            });
            p.validateMessage(Buffer.from('{nope'));
        };
        expect(t).toThrowError(PublisherErrors.ERR_SCHEMA_VALIDATION);
    });
});
