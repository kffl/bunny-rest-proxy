import { buildYamlConfig } from './yaml-config';

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
