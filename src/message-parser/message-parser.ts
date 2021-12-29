import { MessageContentType } from './content-types';

export class MessageParser {
    constructor() {
        if (this.constructor == MessageParser) {
            throw new Error('MessageParser is an abstract class and cannot be instantiated');
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public validateMessage(body: Buffer): Buffer {
        throw new Error("Method 'validateBody()' must be implemented.");
    }
    public getAllowedContentTypes(): Array<MessageContentType> {
        return [];
    }
}
