export interface YamlConfig {
    publishers: Array<PublisherConfig>;
    consumers: Array<ConsumerConfig>;
    subscribers: Array<SubscriberConfig>;
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

export interface ConsumerConfig {
    queueName: string;
}

export interface SubscriberConfig {
    queueName: string;
    target: string;
    prefetch: number;
    timeout: number;
    retries: number;
    retryDelay: number;
    deadLetterQueueName?: string;
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
                queueName: 'binarytest',
                contentType: PublisherContentTypes.BINARY,
                confirm: true
            },
            {
                queueName: 'jsontest',
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
        ],
        consumers: [{ queueName: 'nonconfirm' }, { queueName: 'binaryq' }],
        subscribers: [
            {
                queueName: 'binarytest',
                target: 'http://localhost:5555/target',
                prefetch: 1,
                timeout: 1000,
                retries: 0,
                retryDelay: 1000
            },
            {
                queueName: 'jsontest',
                target: 'http://localhost:5555/target',
                prefetch: 2,
                timeout: 1000,
                retries: 5,
                retryDelay: 1000
            }
        ]
    };
}
