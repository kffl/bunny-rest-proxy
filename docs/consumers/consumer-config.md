# Consumer configuration

Consumer are used for pull-based consuming of messages one-by-one from queues using HTTP GET requests. Unlike subscribers, which support reliable message delivery with retries and dead letter policy, consumers auto-acknowledge each retrieved message (via AMQP RPC-based GET operation) so that it won't be re-delivered. For that reason, getting messages from a queue via a consumer HTTP GET requests shall not be used when at-least-once delivery semantics are desired.

Consumers are declared in the `consumers` block of the `config.yml` file:

```yaml
consumers:
  - queueName: json-queue
  - queueName: binary-queue
    identities:
      - Bob
```

The example YAML configuration provided above creates two consumers. The first one allows anyone to consume messages from `json-queue`, whereas the other consumer only allows identity named `Bob` to consume messages from `binary-queue`.

## Consumer configuration reference

!!! warning

    When `identities` field is not provided or contains an empty array, the consumer endpoint authentication is bypassed.

The following keys can be specified in the consumer configuration block:

- `queueName` (**required**): the name of the queue, from which the consumer will be getting messages upon each HTTP GET request.
- `identities`: a list of identity names permitted to consume messages via a given consumer.