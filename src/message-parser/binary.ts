import { MessageContentType } from './content-types';
import { MessageParser } from './message-parser';

export class BinaryMessageParser extends MessageParser {
    constructor() {
        super();
    }
    public getAllowedContentTypes() {
        return [MessageContentType.binary];
    }
    public validateMessage(body: Buffer): Buffer {
        return body;
    }
}
