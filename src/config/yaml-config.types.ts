export interface YamlConfig {
    publishers: Array<PublisherConfig>;
    consumers: Array<ConsumerConfig>;
    subscribers: Array<SubscriberConfig>;
    identities: Array<IdentityConfig>;
}

export enum PublisherContentTypes {
    JSON = 'json',
    BINARY = 'binary'
}

export interface AccessProtectedResource {
    identities: Array<string>;
}

export interface PublisherConfig extends AccessProtectedResource {
    queueName: string;
    contentType: PublisherContentTypes;
    schema?: object;
    confirm: boolean;
    identities: Array<string>;
}

export interface ConsumerConfig extends AccessProtectedResource {
    queueName: string;
}

export interface SubscriberConfig {
    queueName: string;
    target: string;
    prefetch: number;
    timeout: number;
    backoffStrategy:
        | 'exponential'
        | 'exponential-random'
        | 'linear'
        | 'linear-random'
        | 'constant'
        | 'constant-random';
    retries: number;
    retryDelay: number;
    deadLetterQueueName?: string;
}

export interface IdentityConfig {
    name: string;
    token: string;
}

export const PublisherConfigDefaults: Partial<PublisherConfig> = {
    contentType: PublisherContentTypes.BINARY,
    confirm: true,
    identities: []
};

export const ConsumerConfigDefaults: Partial<ConsumerConfig> = {
    identities: []
};

export const SubscriberConfigDefaults = {
    prefetch: 10,
    timeout: 2000,
    backoffStrategy: 'linear',
    retries: 5,
    retryDelay: 1000
};
