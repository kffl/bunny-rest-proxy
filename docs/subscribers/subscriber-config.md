# Subscriber configuration

Subscribers are are used in order to push messages from a given RabbitMQ queues over HTTP to a specified target URL in a webhook-like fashion. They are defined in the `subscribers` block of the `config.yml` file. Below is an example of `subscribers` block defining two subscribers:

```yaml
subscribers:
  - queueName: demo-queue
    target: http://somewhere.tld/handle-demo
    prefetch: 3
    backoffStrategy: linear
    retries: 4
    retryDelay: 1000
    deadLetterPolicy: requeue
  - queueName: another-queue
    target: http://somewhere.tld/handle-another
    backoffStrategy: exponential-random
    retries: 5
    retryDelay: 2000
    deadLetterPolicy: dlq
    deadLetterQueueName: another-queue-dlq
```

## Subscriber configuration reference

The following keys can be specified in the publisher configuration block:

- `queueName` (**required**): the name of the queue, from which the subscriber will be consuming messages.
- `target` (**required**): HTTP target to which the messages will be pushed via HTTP POST requests.
- `prefetch`: The maximum number of unacknowledged messages being processed by the subscriber. Defaults to 10.
- `timeout`: HTTP POST (PUSH) request timeout in milliseconds. Defaults to 2000.
- `backoffStrategy`: The name of the [backoff strategy](/subscribers/retry-backoff-strategies/) to be used when retrying a failed HTTP POST message delivery attempt. Possible values are: `constant`, `constant-random`, `linear`, `linear-random`, `exponential` and `exponential-random`. Defaults to `linear`.
- `retries`: The maximum number of failed message delivery retry attempts. Defaults to 5.
- `retryDelay`: Base retry timeout in milliseconds between delivery retry attempts. Its value is used to calculate actual delays before n-th delivery attempt depending on the specified backoff strategy. Defaults to 1000.
- `deadLetterPolicy`: The name of [dead letter policy](/subscribers/dead-letter-policies/) to be applied when a given message exceeds the maximum number of failed message delivery retries. Possible values are `requeue`, `discard` and `dql`. Defaults to `requeue`.
- `deadLetterQueueName`: The name of dead letter queue to which a message will be sent after exceeding the maximum number of failed message delivery retries provided that the `deadLetterPolicy` is set to `dlq`.