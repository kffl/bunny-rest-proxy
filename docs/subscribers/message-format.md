# Message PUSH format

This section describes the format of HTTP POST requests sent by Bunny REST Proxy to subscribers' targets.

## Request Headers

- `Content-Type`: content type of the incoming message.
- `X-Bunny-MessageID`: ID of the incoming message.
- `X-Bunny-CorrelationID`: correlation ID of the incoming message.
- `X-Bunny-Redelivered`: whether or not the message was marked as redelivered by the broker (not BRP subscriber).
- `X-Bunny-Message-Count`: Approximate number of messages left in the queue.
- `X-Bunny-Message-AppID`: ID of the program that sent the original message to the queue.
- `X-Bunny-Message-From-Queue`: the name of the queue from which the message was retrieved.

## Request Body

The request body contains the content of the retrieved message.