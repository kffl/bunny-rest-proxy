# Getting started

In this guide you will spin up a Bunny REST Proxy instance with one JSON publisher and one consumer working on a single RabbitMQ queue.

## Step 1: Create a configuration file

Entire configuration of Bunny REST Proxy is declared in a single file named `config.yml`. Let's create one defining a publisher and a consumer:

```bash
cat <<EOT >> config.yml
---
publishers:
  - queueName: json-queue
    contentType: json

consumers:
  - queueName: json-queue
EOT
```

## Step 2: Spin up Docker containers

Since we will have to spin up both Bunny REST Proxy and RabbitMQ, let's create a new Docker network for both containers to communicate in:

```bash
docker network create bunny
```

After that, let's run a new RabbitMQ container named `rabbitmq` connected to the `bunny` network:

```bash
docker run -d --hostname rabbit --net bunny --name rabbitmq rabbitmq:3-management
```

And finally, let's start a new Bunny REST Proxy container:

```bash
docker run -p 3672:3672 -v $(pwd)/config.yml:/app/config.yml --net bunny \
   --env BRP_CONN_STR="amqp://guest:guest@rabbitmq:5672?heartbeat=30" -d \
   kffl/bunny-rest-proxy
```

As you can see, we are providing Bunny REST Proxy with a connection string to the RabbitMQ instance via `BRP_CONN_STR` environment variable, binding its port 3672 to the same port number on the host machine and mounting our local `config.yml` file as `/app/config.yml` inside the container.

## Step 3: Send and receive some messages

Once we have both Bunny REST Proxy and RabbitMQ up and running, let's test it by publishing a single message via HTTP POST request:

```bash
curl --request POST \
  --url http://localhost:3672/publish/json-queue \
  --header 'Content-Type: application/json' \
  --data '{"hello": "bunny"}'
```

You should obtain a result looking something like this:

```json
{"contentLengthBytes":18, "messageId":"ea34c68d-f6eb-2c44-aa4e-8d85ee46dd26"}
```

Now, let's consume the previously published message using a GET request:

```bash
curl --request GET \
  --url http://localhost:3672/consume/json-queue
```

And voila, you should have received your JSON message:

```json
{"hello": "bunny"}
```

## Wrapping up

While this guide was supposed to give you a basic understanding of what Bunny REST Proxy can be used for, we are barely scratching the surface in terms of the functionality it has to offer. We haven't even touched on [subscribers](/subscribers/subscriber-config), which allow for pushing messages from a queue to specified HTTP targets with retry backoff strategies and dead letter policies. Publishers also offer additional functionalities such as server-side JSON schema validation or ACL-based authorization.