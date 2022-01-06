# Consuming messages

Consuming messages is done by sending a HTTP GET request to the following endpoint:

`http://bunny-rest-proxy.host:3672/consume/<queueName>`

## HTTP Request Headers

- `X-Bunny-Identity`: optional identity name
- `X-Bunny-Token`: optional identity token

## Possible Response Codes

- `205`: Message retrieved successfully. Note that the `205`/Reset Content HTTP code indicates that consuming messages is a destructive operation, as they are auto-acknowledged upon retrieval.
- `403`: Identity authorization failed or required credentials not provided request headers
- `423`: Queue is empty.
- `500`: Something unexpected and rather bad happened.
- `502`: An AMQP error occurred when getting the message from the queue.
- `503`: Bunny REST Proxy is during the graceful shutdown process.

## Response Headers

- `Content-Type`: content type of the message.
- `X-Bunny-MessageID`: ID of the consumed message.
- `X-Bunny-CorrelationID`: ID of the consumed message.
- `X-Bunny-AppID`: app ID of the program that sent the message to the queue.
- `X-Bunny-Message-Count`: number of messages that are remaining in the queue.

## Response Body

In case of the message being retrieved successfully, the response body will contain the message content.