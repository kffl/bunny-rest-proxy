import {
    buildYamlConfig,
    ensureNoMissingDLQNames,
    ensureNoMissingIdentities,
    parseIdentityTokenFromEnv
} from './yaml-config';
import {
    IdentityConfig,
    PublisherContentTypes,
    SubscriberConfigDefaults,
    YamlConfig
} from './yaml-config.types';

const singlePublisherCfgBasic = `
---
  publishers:
    - queueName: demo
      contentType: binary
`;

const complexCfg = `
---
  publishers:
    - queueName: demo
      contentType: binary
      confirm: true
    - queueName: demo-json
      contentType: json
      confirm: false
      schema:
        properties:
          id:
            type: string
          eventStatus:
            enum:
              - IN_PROGRESS
              - PENDING
              - PLANNED
        optionalProperties:
          notes:
            type: string

  consumers:
    - queueName: demo
    - queueName: demo-json
  subscribers:
    - queueName: demo
      target: http://localhost:5555/target
      prefetch: 1
      retries: 4
      retryDelay: 1000
  identities:
    - name: Bob
      token: BobsToken
`;

const incompleteCfg = `
---
  subscribers:
    - queueName: demo
      prefetch: 1
      retries: 4
      retryDelay: 1000
`;

const invalidYAML = `
---
  subscribers:
    - queueName: demo
      queueName: duplicate
`;

describe('YAML config parser', () => {
    it('should parse a config with a single publisher', () => {
        const cfg = buildYamlConfig(singlePublisherCfgBasic);
        expect(cfg.publishers).toHaveLength(1);
        expect(cfg.publishers[0].queueName).toEqual('demo');
        expect(cfg.publishers[0].confirm).toEqual(true);
        expect(cfg.publishers[0].contentType).toEqual('binary');
        expect(cfg.consumers).toHaveLength(0);
        expect(cfg.subscribers).toHaveLength(0);
    });

    it('should parse a config with a single publisher', () => {
        const cfg = buildYamlConfig(complexCfg);
        expect(cfg.publishers).toHaveLength(2);
        expect(cfg.publishers[1].queueName).toEqual('demo-json');
        expect(cfg.publishers[1].confirm).toEqual(false);
        expect(cfg.publishers[1].contentType).toEqual('json');
        expect(cfg.consumers).toHaveLength(2);
        expect(cfg.consumers[1].queueName).toEqual('demo-json');
        expect(cfg.subscribers).toHaveLength(1);
        expect(cfg.subscribers[0].backoffStrategy).toEqual('linear');
    });

    it("should throw an error it the config doesn't contain a required field", () => {
        const t = () => {
            buildYamlConfig(incompleteCfg);
        };
        expect(t).toThrowError();
    });

    it('should throw an error if the input YAML is invalid', () => {
        const t = () => {
            buildYamlConfig(invalidYAML);
        };
        expect(t).toThrowError();
    });
});

describe('parseIdentityTokenFromEnv function', () => {
    it('should throw an error if a missing identity token is not found in env', () => {
        //@ts-ignore
        const identityConfig: IdentityConfig = { name: 'Alice' };
        const t = () => {
            parseIdentityTokenFromEnv(identityConfig, { SOME_OTHER_VALUE: 'YUP' });
        };
        expect(t).toThrowError('identity token');
    });

    it('should read a missing identity token from env', () => {
        //@ts-ignore
        const identityConfig: IdentityConfig = { name: 'Alice' };
        const r = parseIdentityTokenFromEnv(identityConfig, { BRP_TOKEN_Alice: 'SomeToken' });
        expect(r.token).toEqual('SomeToken');
    });

    it('should do nothing if the token was already provided', () => {
        const identityConfig: IdentityConfig = { name: 'Alice', token: 'TokenFromYAML' };
        const r = parseIdentityTokenFromEnv(identityConfig, { BRP_TOKEN_Alice: 'SomeToken' });
        expect(r.token).toEqual('TokenFromYAML');
    });
});

describe('ensureNoMissingIdentities function', () => {
    it('should throw an error if a consumer references a non-existent identity', () => {
        const cfg: YamlConfig = {
            publishers: [],
            consumers: [{ queueName: 'json-queue', identities: [`non-existent`] }],
            subscribers: [],
            identities: []
        };
        const t = () => {
            ensureNoMissingIdentities(cfg);
        };
        expect(t).toThrowError('Unknown identity non-existent');
    });

    it('should throw an error if a publisher references a non-existent identity', () => {
        const cfg: YamlConfig = {
            publishers: [
                {
                    queueName: 'json-queue',
                    confirm: true,
                    contentType: PublisherContentTypes.JSON,
                    identities: ['nope']
                }
            ],
            consumers: [{ queueName: 'json-queue', identities: ['Bob'] }],
            subscribers: [],
            identities: [{ name: 'Bob', token: 'BobsToken' }]
        };
        const t = () => {
            ensureNoMissingIdentities(cfg);
        };
        expect(t).toThrowError('Unknown identity nope');
    });
});

describe('ensureNoMissingDLQNames function', () => {
    it("should throw an error if a subscriber with DLQ policy doesn't specify a DLQ name", () => {
        const cfg: YamlConfig = {
            publishers: [],
            consumers: [],
            subscribers: [
                //@ts-ignore
                {
                    queueName: 'json-queue',
                    target: 'http://test-target.host/',
                    ...SubscriberConfigDefaults,
                    deadLetterPolicy: 'dlq'
                }
            ]
        };

        const t = () => {
            ensureNoMissingDLQNames(cfg);
        };
        expect(t).toThrowError('Missing dead letter queue name in subscriber json-queue');
    });
});
