# Backoff strategies

A subscriber backoff strategy specifies after what delay should a failed message delivery (one that ended with a result other than subscriber target responding with HTTP 2XX code) be retried. A total of 6 backoff strategies are supported.

## Constant backoff strategy (`constant`)

Delivery of each message will be retried after a constant timeout specified as `retryDelay`.

## Linear backoff strategy (`linear`)

The *n*-th message delivery attempt will be performed after *n* * *retryDelay* milliseconds.

## Exponential backoff strategy (`exponential`)

The *n*-th message delivery attempt will be performed after *2*<sup>*n-1*</sup> * *retryDelay* milliseconds.

## Randomized backoff strategy variants (`*-random`)

Backoff strategies, names of which are suffixed with `-random` will for each *n*-th retry draw a random delay value that is between the value of *n-1* attempt of the underlying backoff strategy and *n+1* attempt of the underlying backoff strategy.

!!! note
    
    One exception to the rule described above is the `constant-random` backoff strategy, which upon each retry produces a random value between 50% and 150% of `retryDelay`.

**Example:**

A linear backoff strategy with a base delay of 1000ms will produce a delay of 3000ms before the 3rd delivery attempt, 4000ms before the 4th delivery attempt and 5000ms before the 5th delivery attempt. Consequently, a randomized linear backoff strategy will during the 4th delivery attempt produce a random value between that of the 3rd attempt and 5th attempt of the linear backoff strategy, that is between 3000ms and 5000ms. 
