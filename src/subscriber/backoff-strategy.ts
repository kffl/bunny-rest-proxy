import { SubscriberConfig } from '../config/yaml-config.types';

export type BackoffStrategy = (baseDelay: number, retryNumber: number) => number;

const randomIntegerFromInterval = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1) + min);

export const constant: BackoffStrategy = (baseDelay: number) => baseDelay;

export const constantRandom: BackoffStrategy = (baseDelay: number) =>
    randomIntegerFromInterval(0.5 * baseDelay, 1.5 * baseDelay);

export const linear: BackoffStrategy = (baseDelay: number, retryNumber: number) =>
    baseDelay * retryNumber;

export const linearRandom: BackoffStrategy = (baseDelay: number, retryNumber: number) =>
    randomIntegerFromInterval(
        linear(baseDelay, retryNumber - 1),
        linear(baseDelay, retryNumber + 1)
    );

export const exponential: BackoffStrategy = (baseDelay: number, retryNumber: number) =>
    baseDelay * Math.pow(2, retryNumber - 1);

export const exponentialRandom: BackoffStrategy = (baseDelay: number, retryNumber: number) =>
    randomIntegerFromInterval(
        exponential(baseDelay, retryNumber - 1),
        exponential(baseDelay, retryNumber + 1)
    );

export const getBackoffStrategyFn = (
    strategyName: SubscriberConfig['backoffStrategy']
): BackoffStrategy => {
    switch (strategyName) {
        case 'linear':
            return linear;
        case 'linear-random':
            return linearRandom;
        case 'constant':
            return constant;
        case 'constant-random':
            return constantRandom;
        case 'exponential':
            return exponential;
        case 'exponential-random':
            return exponentialRandom;
        default:
            throw new Error(`Invalid backoff strategy: ${strategyName}`);
    }
};
