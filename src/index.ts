import path from 'path';
import fs from 'fs';
import { buildEnvConfig, EnvValues } from './config/env-config';
import { buildYamlConfig } from './config/yaml-config';
import buildApp from './server';

async function start() {
    const envConfig = buildEnvConfig(process.env as EnvValues);
    const configFile = fs.readFileSync(path.resolve(__dirname, '../config.yml'), 'utf8');
    const yamlConfig = buildYamlConfig(configFile);
    const app = buildApp(envConfig, yamlConfig);
    try {
        await app.listen(3672, '0.0.0.0');
    } catch (err) {
        app.log.error('An error occurred when starting BRP server: ' + err);
        process.exit(1);
    }
}

start();
