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

describe('linear-random backoff strategy', () => {
    it('should pick a random value between n-1 and n+1 linear retry', () => {
        const retry1 = linearRandom(1000, 1);
        const retry2 = linearRandom(1000, 2);
        expect(retry1).toBeGreaterThanOrEqual(0);
        expect(retry1).toBeLessThanOrEqual(2000);
        expect(retry2).toBeGreaterThanOrEqual(1000);
        expect(retry2).toBeLessThanOrEqual(3000);
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

describe('constant-random backoff strategy', () => {
    it('it should return a timeout between 50% and 150% of base timeout', () => {
        const v = constantRandom(1000, 1);
        expect(v).toBeGreaterThanOrEqual(500);
        expect(v).toBeLessThanOrEqual(1500);
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

describe('exponential-random backoff strategy', () => {
    it('should pick a random value between n-1 and n+1 exponential retry', () => {
        const retry1 = exponentialRandom(1000, 1);
        const retry2 = exponentialRandom(1000, 2);
        expect(retry1).toBeGreaterThanOrEqual(500);
        expect(retry1).toBeLessThanOrEqual(2000);
        expect(retry2).toBeGreaterThanOrEqual(1000);
        expect(retry2).toBeLessThanOrEqual(4000);
    });
});
