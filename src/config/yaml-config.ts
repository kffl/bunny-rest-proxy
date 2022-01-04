import yaml from 'js-yaml';
import Ajv from 'ajv';
import YamlConfigSchema from './yaml-config.schema.json';
import {
    ConsumerConfigDefaults,
    IdentityConfig,
    PublisherConfigDefaults,
    SubscriberConfigDefaults,
    YamlConfig
} from './yaml-config.types';

const ajv = new Ajv();
const validateConfig = ajv.compile(YamlConfigSchema);

function isValidConfig(parsedYaml: unknown): parsedYaml is YamlConfig {
    return validateConfig(parsedYaml);
}

function parseIdentityTokensFromEnv(identityConfig: IdentityConfig, env: object): IdentityConfig {
    if (!identityConfig.token) {
        const envName = 'BRP_TOKEN_' + identityConfig.name;
        if (!(envName in env)) {
            throw new Error(
                `Could not find identity token in ${
                    'BRP_TOKEN_' + identityConfig.name
                } environment variable`
            );
        } else {
            //@ts-ignore
            const tokenFromEnv = env[envName];
            return {
                name: identityConfig.name,
                token: tokenFromEnv
            };
        }
    }
    return identityConfig;
}

function ensureNoMissingIdentities(cfg: YamlConfig) {
    for (const consumer of cfg.consumers) {
        for (const identity of consumer.identities) {
            if (!cfg.identities.some((i) => i.name === identity)) {
                throw new Error(
                    `Unknown identity ${identity} referenced in consumer ${consumer.queueName} config`
                );
            }
        }
    }
    for (const publisher of cfg.publishers) {
        for (const identity of publisher.identities) {
            if (!cfg.identities.some((i) => i.name === identity)) {
                throw new Error(
                    `Unknown identity ${identity} referenced in publisher ${publisher.queueName} config`
                );
            }
        }
    }
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
            : [],
        identities: cfg.identities
            ? cfg.identities.map((c) => parseIdentityTokensFromEnv(c, process.env))
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
        const config = assignConfigDefaults(parsedYaml);
        ensureNoMissingIdentities(config);
        return config;
    } else {
        validateConfig.errors?.forEach((err) => {
            console.error(`${err.schemaPath}: ${err.message}`);
        });
        throw new Error(
            'Some errors occurred when validating config file against the schema. See the output above.'
        );
    }
}
