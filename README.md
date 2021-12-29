<div align="center">
  <img alt="Bunny REST Proxy logo" src="https://github.com/kffl/bunny-rest-proxy/raw/HEAD/assets/bunny-rest-proxy-logo-dark.svg" width="400" height="auto"/>
</div>

<div align="center">

[![CI Workflow](https://github.com/kffl/bunny-rest-proxy/actions/workflows/ci.yml/badge.svg)](https://github.com/kffl/bunny-rest-proxy/actions/workflows/ci.yml)

</div>

# Bunny REST Proxy

HTTP message broker built on top of RabbitMQ inspired by Confluent REST Proxy for Kafka.

## Motivation

While RabbitMQ is commonly used as a means of asynchronous communication between microservices, sometimes you need to publish messages or consume messages using a much simpler REST API without compromising on message delivery guarantees.

## Features (Planned)

- Publishing messages into RabbitMQ queues over REST API implementing **reliable message delivery** using channels with publisher confirms
- Pushing messages to defined subscribers over HTTP ensuring **at-least-once** delivery semantics
- Consuming messages from the queue over HTTP