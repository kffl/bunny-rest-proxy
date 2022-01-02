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
    backoffStrategy: 'exponential' | 'linear' | 'constant';
    retries: number;
    retryDelay: number;
    deadLetterQueueName?: string;
}

export const PublisherConfigDefaults = {
    contentType: 'binary',
    confirm: true
};

export const ConsumerConfigDefaults = {};

export const SubscriberConfigDefaults = {
    prefetch: 10,
    timeout: 2000,
    backoffStrategy: 'linear',
    retries: 5,
    retryDelay: 1000
};
