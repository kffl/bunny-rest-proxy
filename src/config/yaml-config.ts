export interface YamlConfig {
    publishers: Array<PublisherConfig>;
}

export enum PublisherContentTypes {
    JSON = 'json',
    BINARY = 'binary'
}

export interface PublisherConfig {
    queueName: string;
    contentType: PublisherContentTypes;
    schema?: object;
    confirm: boolean;
}

// TODO - parse input yaml file and build config
export function buildYamlConfig(): YamlConfig {
    return {
        publishers: [
            {
                queueName: 'binaryq',
                contentType: PublisherContentTypes.BINARY,
                confirm: true
            },
            {
                queueName: 'jsonq',
                contentType: PublisherContentTypes.JSON,
                schema: {},
                confirm: true
            },
            {
                queueName: 'nonconfirm',
                contentType: PublisherContentTypes.JSON,
                schema: {},
                confirm: false
            }
        ]
    };
}
