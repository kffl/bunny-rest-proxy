# Dead letter policies

A dead letter policy specifies what happens to a particular message when it exceeds the maximum number of delivery retries.

A total of three dead letter policies are supported:

## Nack/requeue message (`requeue`)

When a message exceeds the maximum number of HTTP POST delivery attempts, it will be negatively acknowledged by the underlying consumer and consequently requeued by RabbitMQ so that it can be redelivered again.

## Ack/discard message (`discard`)

When a message exceeds the maximum number of HTTP POST delivery attempts, it will be acknowledged by the underlying consumer and thus discarded (no other consumer will be able to retrieve that message in the future).

## Send a message to dead letter queue (`dlq`)

After exceeding the maximum number of delivery attempts, the message will be sent to a dead letter queue specified in the subscriber configuration (`deadLetterQueueName`). After having received publisher confirm regarding that message being placed in DLQ, Bunny REST Proxy will then acknowledge the message in the original queue.