# Deployment

!!! warning
    
    Bunny REST Proxy is still under development and should not be considered production-ready at this point in time.

Bunny REST Proxy is a stateless application that can be scaled horizontally i.e. as a deployment in a Kubernetes cluster and doesn't require persistent storage. Consequently, the majority of operational complexity comes from deploying and maintaining the underlying RabbitMQ cluster, not the Bunny REST Proxy instances themselves.

## Docker-compose

Below is a sample `docker-compose.yml` file describing a development setup that consists of RabbitMQ and Bunny REST Proxy containers (it assumes that config.yml file is located in the working directory from which `docker-compose` stack is created):

```docker-compose
version: "3.2"
services:
  rabbitmq:
    image: rabbitmq:3-management
    container_name: 'rabbitmq'
    ports:
      - 5672:5672
      - 15672:15672
    volumes:
      - "./data:/var/lib/rabbitmq/mnesia/"
    networks:
      - bunny_net
  bunny-rest-proxy:
    image: kffl/bunny-rest-proxy
    container_name: 'bunny-rest-proxy'
    ports:
      - 3672:3672
      - 9672:9672
    environment:
      - BRP_LOG_PRETTY=true
      - BRP_CONN_STR=amqp://guest:guest@rabbitmq:5672?heartbeat=30
    volumes:
      - ${PWD}/config.yml:/app/config.yml
    restart: on-failure
    networks:
      - bunny_net

networks:
  bunny_net:
    driver: bridge
```

## Kubernetes

A config file can be mounted inside Bunny REST Proxy containers running in a deployment via a config map:

```bash
kubectl create configmap bunny-config --from-file=./config.yml
```

Example deployment definition:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bunny-rest-proxy
spec:
  selector:
    matchLabels:
      app: bunny-rest-proxy
  replicas: 3
  template:
    metadata:
      labels:
        app: bunny-rest-proxy
    spec:
      containers:
        - name: bunny-rest-proxy
          image: kffl/bunny-rest-proxy:0.1.0-rc3
          env:
            - name: BRP_CONN_STR 
              # in a real-world scenario, a secret should be used instead
              value: "amqp://guest:guest@rabbitmq:5672?heartbeat=30"
          volumeMounts:
              - mountPath: '/app/config.yml'
                name: config-volume
                readOnly: true
                subPath: config.yml
      volumes:
        - name: config-volume
          configMap:
            name: bunny-config
```

Example service definition:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: bunny-service
  labels:
    app: bunny-rest-proxy
spec:
  ports:
    - port: 3672
      protocol: TCP
      name: rest-api
    - port: 9672
      protocol: TCP
      name: metrics
  selector:
    app: bunny-rest-proxy
```

Example service monitor definition that instructs `prometheus-operator` to scrape metrics from Bunny REST Proxy:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: bunny-monitor
spec:
  selector:
    matchLabels:
      app: bunny-rest-proxy
  endpoints:
  - port: metrics
```

## Logging

By default, Bunny REST Proxy prints logs at `info` verbosity level in JSON format:

```json
{"level":30,"time":1654594153537,"pid":1,"hostname":"bunny-rest-proxy-bf9d996d6-z26hr","reqId":"req-ikyv","req":{"method":"GET","url":"/consume/json-queue","hostname":"bunny-service:3672","remoteAddress":"10.244.0.37","remotePort":45112},"msg":"incoming request"}
```

Log level can be changed by specifying the `BRP_LOG_LEVEL` environment variable (possible values are: `fatal`, `error`, `warn`, `info`, `debug`, `trace` and `child`).

### Pretty format

Logger can be optionally configured to print logs in pretty format (provided by `pino-pretty`) by setting the `BRP_LOG_PRETTY` environment variable to `true`:

```
[06:53:57 UTC] INFO (1 on d9ee0a4a95b8): request completed
    res: {
      "statusCode": 205
    }
    responseTime: 0.6390420002862811
    reqId: "req-m"
```

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

## Application lifecycle

### Graceful shutdown

Upon receiving `SIGINT` or `SIGTERM` signal, Bunny REST Proxy instance performs a graceful shutdown procedure. When the app is in a graceful shutdown state, the following changes occur:

- AMQP consumers are stopped so as not to receive new messages.
- Pending publisher and consumer HTTP requests that were received prior to receiving the signal are processed without interruptions.
- New publisher and consumer HTTP requests (incoming after the app went into graceful shutdown mode) receive HTTP status code `503`.
- Subscriber messages that failed the first delivery attempt and were placed in the in-memory retry queue of a given instance are nacked (marked for re-delivery at the RabbitMQ level).
- Subscriber messages that have their corresponding HTTP POST (PUSH) requests in-flight are allowed to continue. Bunny REST Proxy will check for existence of in-flight messages every second up to 5 times before forcefully closing the process. 

When all of the AMQP consumers are closed, there are no in-flight subscriber message deliveries and all of the incoming HTTP requests are responded to, Bunny REST Proxy will close both of its AMQP channels (regular channel as well as channel with publisher confirms) and the AMQP connection. Following that, the process will exit.

### Error shutdown

When either one of the application instance's AMQP channels or the AMQP connection is closed unexpectedly (which may happen as a result of an AMQP error), Bunny REST Proxy performs a simplified shutdown procedure, during which no communication is performed with the RabbitMQ cluster (AMQP consumers aren't stopped, messages placed in the in-memory retry queue aren't nacked and neither the channels nor the AMQP connection are closed).