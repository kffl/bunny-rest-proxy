# Bunny REST Proxy documentation

![Bunny REST Proxy logo](./assets/bunny-rest-proxy-logo-dark.svg){: .center}

Bunny REST Proxy is a HTTP message broker built on top of RabbitMQ. It allows services to easily publish messages into RabbitMQ queues over HTTP as well as to consume messages utilizing both pull (HTTP GET) and push (HTTP POST to a subscriber) delivery modes.

## Overview

![Bunny REST Proxy diagram](./assets/bunny-rest-proxy-diagram.svg){: .center}

## Design principles

Bunny REST Proxy design is based on the following four principles:

### Simplicity and ease of use

Bunny REST Proxy was built with simplicity and ease of use in mind. All of the important configuration is stored in a single YAML file. You can try it yourself by following the [quickstart guide](getting-started.md) which takes about 5 minutes to complete.

### Message delivery guarantees

At-least-once delivery semantics are supported out of the box thanks to the usage of channels with publishers confirms. By default, Bunny REST Proxy won't sent back a successful response to an HTTP publish request unless the message was durably persisted in the broker. Messages unsuccessfully pushed to subscribers over HTTP won't be lost either thanks to a configurable retry mechanism (with various [backoff strategies](subscribers/retry-backoff-strategies.md)) and [dead letter policies](subscribers/dead-letter-policies.md).

### Flexible integration into existing systems

Bunny REST Proxy doesn't force you to rewrite your existing distributed system that uses RabbitMQ. Instead, it allows for incremental adoption by only using a subset of its features, while leaving the rest of your AMQP-based architecture untouched.

### Horizontal scalability

Multiple instances of Bunny REST Proxy can be running against a single RabbitMQ cluster without even knowing about one other. Having zero state shared between them eliminates the need for implementing distributed consensus protocols and allows each instance to be disposable/ephemeral. Consequently, Bunny REST Proxy can be painlessly scaled horizontally i.e. as a deployment in a Kubernetes cluster.

## License

Copyright © 2021-2022 Paweł Kuffel, licensed under the Apache 2.0 license.