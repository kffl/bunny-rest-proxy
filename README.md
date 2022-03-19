<div align="center">
  <img alt="Bunny REST Proxy logo" src="https://github.com/kffl/bunny-rest-proxy/raw/HEAD/docs/assets/bunny-rest-proxy-logo-dark.svg" width="400" height="auto"/>
</div>

<div align="center">

[![CI Workflow](https://github.com/kffl/bunny-rest-proxy/actions/workflows/ci.yml/badge.svg)](https://github.com/kffl/bunny-rest-proxy/actions/workflows/ci.yml) [![Docker Pulls](https://img.shields.io/docker/pulls/kffl/bunny-rest-proxy)](https://hub.docker.com/r/kffl/bunny-rest-proxy) [![Docker Image Version](https://img.shields.io/docker/v/kffl/bunny-rest-proxy)](https://hub.docker.com/r/kffl/bunny-rest-proxy) [![Known Vulnerabilities](https://snyk.io/test/github/kffl/bunny-rest-proxy/badge.svg)](https://snyk.io/test/github/kffl/bunny-rest-proxy)

</div>

# Bunny REST Proxy :rabbit: :incoming_envelope:

[Documentation](https://kffl.github.io/bunny-rest-proxy/), [Quickstart Guide](https://kffl.github.io/bunny-rest-proxy/getting-started/), [Docker Hub](https://hub.docker.com/r/kffl/bunny-rest-proxy)


<div align="center">
  <img alt="Bunny REST Proxy logo" src="https://github.com/kffl/bunny-rest-proxy/raw/HEAD/docs/assets/bunny-rest-proxy-diagram.svg" width="820" height="auto"/>
</div>

Bunny REST Proxy is a HTTP message broker built on top of RabbitMQ. It allows services to easily publish messages into RabbitMQ queues over HTTP as well as to consume messages utilizing both pull (HTTP GET) and push (HTTP POST to a subscriber) delivery modes.

## Motivation

While RabbitMQ is commonly used as a means of asynchronous communication between microservices, sometimes you need to publish messages or consume messages using a much simpler REST API without compromising on message delivery guarantees.

## Features

- Publishing messages into RabbitMQ queues over REST API implementing **reliable message delivery** using channels with publisher confirms
- Support for binary and JSON messages (with server-side schema validation)
- Pushing messages to defined subscribers over HTTP ensuring **at-least-once** delivery semantics with configurable backoff strategies and dead letter policies
- Consuming messages from the queue HTTP GET requests
- Straight-forward configuration based on a single YAML file