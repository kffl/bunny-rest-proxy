# Publisher configuration

Publishers are are used in order to send messages to RabbitMQ queues over HTTP. They are defined in the `publishers` block of the `config.yml` file. Below is an example of `publishers` block defining two publishers:

```yaml
publishers:
  - queueName: binary-queue
    contentType: binary
    confirm: true
  - queueName: json-queue
    contentType: json
    confirm: false
    schema:
      properties:
        id:
          type: string
        eventStatus:
          enum:
            - IN_PROGRESS
            - PENDING
            - PLANNED
      optionalProperties:
        notes:
          type: string
```

The first publisher in the example provided above will publish binary messages into `binary-queue` RabbitMQ queue. Messages will be published using a channel with publisher confirms so as to ensure that the message is persisted in the broker prior to sending the response back to the publisher's client. The other publisher will only accept JSON message payload adhering to a specified schema.

## Publisher configuration reference

!!! warning

    When `identities` field is not provided or contains an empty array, the publisher endpoint authorization is bypassed.

The following keys can be specified in the publisher configuration block:

- `queueName` (**required**): the name of the queue, to which the messages will be published.
- `contentType`: content type accepted by the publisher - either `binary` or `json`. Defaults to `binary`.
- `confirm`: whether or not a channel with publisher confirms be used for sending messages to the queue. Defaults to `true`.
- `schema`: schema to validate the message against before sending it to the queue. Supports both JSON Schema `draft-07` specification and JSON Type Definition.
- `identities`: a list of identity names permitted to publish messages via a given publisher.