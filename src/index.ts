import { buildEnvConfig, EnvValues } from './config/env-config';
import { buildYamlConfig } from './config/yaml-config';
import buildApp from './server';

async function start() {
    const envConfig = buildEnvConfig(process.env as EnvValues);
    const yamlConfig = buildYamlConfig();
    const app = buildApp(envConfig, yamlConfig);
    try {
        await app.listen(3000);
    } catch (err) {
        app.log.error('An error occurred when starting BRP server: ' + err);
        process.exit(1);
    }
}

start();
