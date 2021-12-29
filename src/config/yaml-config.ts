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
}

// TODO - parse input yaml file and build config
export function buildYamlConfig(): YamlConfig {
    return {
        publishers: [
            { queueName: 'binaryq', contentType: PublisherContentTypes.BINARY },
            {
                queueName: 'jsonq',
                contentType: PublisherContentTypes.JSON,
                schema: {}
            }
        ]
    };
}
