# Deployment

!!! warning
    
    Bunny REST Proxy is still under development and should not be considered production-ready at this point in time.

This section is under construction.

Bunny REST Proxy is a stateless application that can be scaled horizontally i.e. as a deployment in a Kubernetes cluster.

## Docker

## Kubernetes

## Logging

## Metrics

Bunny REST Proxy provides a built-in Prometheus exporter which exposes metrics on port 9672 (`/metrics` endpoint).

The following metrics are collected:

- `publisher_latency` _histogram_ - latency of HTTP POST publisher requests labeled with: `queue` - the name of a queue and `status` - response HTTP status code
- `consumer_latency` _histogram_ - latency of HTTP GET consumer requests labeled with: `queue` - the name of a queue and `status` - response HTTP status code
- `subscriber_latency` _histogram_ - latency of HTTP POST (PUSH) subscriber requests sent to the subscriber's target labeled wit: `queue` - the name of a queue, `target` - URL of the subscriber target and `status` - response HTTP status code
- `subscriber_failed_messages` _counter_ - number of messages that failed the initial delivery attempt (and might have been scheduled for retry depending on subscriber config) labeled with: `queue` - the name of a queue and `target` - URL of the subscriber target
- `subscriber_dead_messages` _counter_ - number of messages that exceeded the maximum number of delivery retries (and were dealt with according to the specified dead letter policy) labeled with: `queue` - the name of a queue and `target` - URL of the subscriber target
- a suite of standard Node.js metrics collected by the `prom-client` library

## Performance

Bunny REST Proxy performance depends heavily on the performance offered by the underlying RabbitMQ queues. In some preliminary load tests conducted using [gocannon](https://github.com/kffl/gocannon), when running a single instance of Bunny REST Proxy against a RabbitMQ broker located on the same host, the following results were obtained on a Skylake-based machine with a relatively high CPU clock:

- Maximum publisher throughput of 14k HTTP POST req/s
- Maximum consumer throughput of 7k HTTP GET req/s
- Maximum subscriber throughput of 3.5k HTTP POST req/s sent its target

While the figures listed above are sensitive to a wide variety of additional factors such as network latency, subscriber target endpoint latency or the performance of the underlying RabbitMQ broker, ratios close to 4:2:1 (publisher:consumer:subscriber throughput) were observed when repeating the tests on less performant hardware. It is worth noting that publishers, consumers and subscribers were tested in isolation and therefore lower performance metrics should be expected when running a mixed workload.