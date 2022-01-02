import yaml from 'js-yaml';
import Ajv from 'ajv';
import YamlConfigSchema from './yaml-config.schema.json';
import {
    ConsumerConfigDefaults,
    PublisherConfigDefaults,
    SubscriberConfigDefaults,
    YamlConfig
} from './yaml-config.types';

const ajv = new Ajv();
const validateConfig = ajv.compile(YamlConfigSchema);

function isValidConfig(parsedYaml: unknown): parsedYaml is YamlConfig {
    return validateConfig(parsedYaml);
}

export function assignConfigDefaults(cfg: YamlConfig): YamlConfig {
    return {
        publishers: cfg.publishers
            ? cfg.publishers.map((c) => Object.assign({}, PublisherConfigDefaults, c))
            : [],
        consumers: cfg.consumers
            ? cfg.consumers.map((c) => Object.assign({}, ConsumerConfigDefaults, c))
            : [],
        subscribers: cfg.subscribers
            ? cfg.subscribers.map((c) => Object.assign({}, SubscriberConfigDefaults, c))
            : []
    };
}

export function buildYamlConfig(fileContents: string): YamlConfig {
    let parsedYaml: unknown;
    try {
        parsedYaml = yaml.load(fileContents);
    } catch (e: any) {
        throw new Error(
            `Error converting config.yml file to JSON: name ${e?.name}, message ${e.message}`
        );
    }
    if (isValidConfig(parsedYaml)) {
        return assignConfigDefaults(parsedYaml);
    } else {
        validateConfig.errors?.forEach((err) => {
            console.error(`${err.schemaPath}: ${err.message}`);
        });
        throw new Error(
            'Some errors occurred when validating config file against the schema. See the output above.'
        );
    }
}
