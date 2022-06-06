export interface PublisherMetricsCollector {
    startPublisherTimer: (queueName: string) => ({ status }: { status: number }) => void;
}

export interface ConsumerMetricsCollector {
    startConsumerTimer: (queueName: string) => ({ status }: { status: number }) => void;
}

export interface SubscriberMetricsCollector {
    startSubscriberTimer: (
        queueName: string,
        target: string
    ) => ({ status }: { status: number }) => void;
    recordFailedDelivery: (queueName: string, target: string) => void;
    recordDeadMessage: (queueName: string, target: string) => void;
}
