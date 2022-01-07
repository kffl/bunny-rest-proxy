# Configuration

## `config.yml` file

Configuration of a Bunny REST Proxy instance is almost entirely stored in a single YAML file that is expected to be located in `/app/config.yml` when using the official Docker container image.

The `config.yml` may contain four block types declaring the following entities:

- [Publishers](publishers/publisher-config.md), which are used used in order to send messages to RabbitMQ queues over HTTP.
- [Consumers](consumers/consumer-config.md) used for pull-based retrieval of messages one-by-one from queues using HTTP GET requests.
- [Subscribers](subscribers/subscriber-config.md) that allow for pushing messages from a given queue to a specified target via HTTP POST requests.
- [Identities](identities/configuring-identities.md) used for ACL-based authorization of publisher and consumer HTTP endpoints.

Below is a simple example of a `config.yml` file declaring a publisher and a  consumer working on a single RabbitMQ queue:

```yaml
---
publishers:
  - queueName: json-queue
    contentType: json

consumers:
  - queueName: json-queue
```

## Environment variables 

The following configuration parameters can be specified via environment variables:

- `BRP_CONN_STR` (**required**) - RabbitMQ connection string.
- `BRP_LOG_LEVEL` - log level to be used by Bunny REST Proxy. Possible values are: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `child`. Defaults to `info`.
- `BRP_LOG_PRETTY` - whether or not to print logs in pretty format. Defaults to `false` (using pino's default JSON log format).
- `BRP_TOKEN_<identityName>` - authentication token for a given [identity](identities/configuring-identities.md).