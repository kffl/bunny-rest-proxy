import {
    constant,
    constantRandom,
    exponential,
    exponentialRandom,
    getBackoffStrategyFn,
    linear,
    linearRandom
} from './backoff-strategy';

describe('getBackoffStrategy', () => {
    it('should return an appropriate backoff strategy', () => {
        expect(getBackoffStrategyFn('constant')).toEqual(constant);
        expect(getBackoffStrategyFn('constant-random')).toEqual(constantRandom);
        expect(getBackoffStrategyFn('linear')).toEqual(linear);
        expect(getBackoffStrategyFn('linear-random')).toEqual(linearRandom);
        expect(getBackoffStrategyFn('exponential')).toEqual(exponential);
        expect(getBackoffStrategyFn('exponential-random')).toEqual(exponentialRandom);
    });
    it('should throw an error when provided with a non-existent backoff strategy', () => {
        const t = () => {
            //@ts-ignore
            getBackoffStrategyFn('unicorn');
        };
        expect(t).toThrowError('unicorn');
    });
});

describe('linear backoff strategy', () => {
    it('should increase the timeout linearly between retries', () => {
        expect(linear(1000, 1)).toEqual(1000);
        expect(linear(1000, 2)).toEqual(2000);
        expect(linear(1000, 3)).toEqual(3000);
        expect(linear(2000, 1)).toEqual(2000);
        expect(linear(2000, 2)).toEqual(4000);
        expect(linear(3000, 3)).toEqual(9000);
    });
});

describe('constant backoff strategy', () => {
    it('should return constant timeout', () => {
        expect(constant(1000, 1)).toEqual(1000);
        expect(constant(1000, 2)).toEqual(1000);
        expect(constant(1000, 3)).toEqual(1000);
        expect(constant(3000, 3)).toEqual(3000);
    });
});

describe('exponential backoff strategy', () => {
    it('should increase the timeout exponentially between retries', () => {
        expect(exponential(1000, 1)).toEqual(1000);
        expect(exponential(1000, 2)).toEqual(2000);
        expect(exponential(1000, 3)).toEqual(4000);
        expect(exponential(2000, 3)).toEqual(8000);
    });
});
