# Configuring Identities

Bunny REST Proxy supports ACL-style authorization via identities that are declared in the `identities` block of `config.yml`. Referencing a defined identity in publisher or consumer configuration will result in their corresponding HTTP endpoints requiring authorization via appropriate request headers containing identity name and token. Below is an example of `identities` block with two entries:

```yaml
identities:
  - name: Bob
  - name: Alice
    token: SuperSecretToken123
```

Since unlike Alice's identity, Bob's doesn't supply a token, Bunny REST Proxy will attempt to read it from `BRP_TOKEN_Bob` environment variable at startup.

## Referencing identities

Both publisher and consumer configuration blocks support `identities` key containing an array of authorized identity names. Below is an example of a single publisher granting access to its HTTP endpoint only to Alice:

```yaml
  - queueName: json-with-auth
    contentType: json
    identities:
      - Alice
```

In order to publish messages to the `json-with-auth` queue via HTTP POST requests sent to `/publish/json-with-auth` endpoint, the following request headers will have to be supplied:

- `X-Bunny-Identity: Alice`
- `X-Bunny-Token: SuperSecretToken123`