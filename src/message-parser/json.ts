import Ajv from 'ajv/dist/jtd';
import { JTDParser } from 'ajv/dist/types';
import { PublisherErrors } from '../publisher/errors';
import { MessageContentType } from './content-types';
import { MessageParser } from './message-parser';

const ajv = new Ajv();

export class JSONMessageParser extends MessageParser {
    constructor(schema: object = {}) {
        super();
        this.ajvParser = ajv.compileParser(schema);
    }
    private ajvParser: JTDParser<unknown>;
    public getAllowedContentTypes() {
        return [MessageContentType.JSON];
    }
    public validateMessage(body: Buffer): Buffer {
        const valid = this.ajvParser(body.toString());
        if (valid === undefined) {
            throw new PublisherErrors.ERR_SCHEMA_VALIDATION(
                `position: ${this.ajvParser.position}; ajv message: ${this.ajvParser.message}`
            );
        }
        return body;
    }
}
