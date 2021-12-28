# Bunny REST Proxy

HTTP message broker built on top of RabbitMQ inspired by Confluent REST Proxy for Kafka.

## Motivation

While RabbitMQ is commonly used as a means of asynchronous communication between microservices, sometimes you need to publish messages to or consume message from using a much simpler, REST API without compromising on message delivery guarantees.

## Features (Planned)

- Publishing messages over REST API implementing **reliable message delivery** using channels with publisher confirms
- Pushing messages to defined subscribers over HTTP ensuring **at-least-once** semantics
- Consuming messages from the queue over HTTP