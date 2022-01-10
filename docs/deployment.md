# Deployment

!!! warning
    
    Bunny REST Proxy is still under development and should not be considered production-ready at this point in time.

This section is under construction.

Bunny REST Proxy is a stateless application that can be scaled horizontally i.e. as a deployment in a Kubernetes cluster.

## Docker

## Kubernetes

## Logging

## Metrics

## Performance

Bunny REST Proxy performance depends heavily on the performance offered by the underlying RabbitMQ queues. In some preliminary load tests conducted using [gocannon](https://github.com/kffl/gocannon), when running a single instance of Bunny REST Proxy against a RabbitMQ broker located on the same host, the following results were obtained on a Skylake-based machine with a relatively high CPU clock:

- Maximum publisher throughput of 14k HTTP POST req/s
- Maximum consumer throughput of 7k HTTP GET req/s
- Maximum subscriber throughput of 3.5k HTTP POST req/s sent its target

While the figures listed above are sensitive to a wide variety of additional factors such as network latency, subscriber target endpoint latency or the performance of the underlying RabbitMQ broker, ratios close to 4:2:1 (publisher:consumer:subscriber throughput) were observed when repeating the tests on less performant hardware. It is worth noting that publishers, consumers and subscribers were tested in isolation and therefore lower performance metrics should be expected when running a mixed workload.