import path from 'path';
import fs from 'fs';
import { buildEnvConfig, EnvValues } from './config/env-config';
import { buildYamlConfig } from './config/yaml-config';
import buildApp from './server';
import { buildMetricsServer } from './metrics/metrics-server';
import { MetricsCollector } from './metrics/metrics-collector';

async function start() {
    const envConfig = buildEnvConfig(process.env as EnvValues);
    const configFile = fs.readFileSync(path.resolve(__dirname, '../config.yml'), 'utf8');
    const yamlConfig = buildYamlConfig(configFile);
    const metricsServer = buildMetricsServer();
    const metricsCollector = new MetricsCollector(metricsServer);
    const app = buildApp(envConfig, yamlConfig, metricsCollector);
    try {
        await metricsServer.listen(9672, '0.0.0.0');
    } catch (err) {
        app.log.error('An error occurred when starting prometheus metrics server: ' + err);
        process.exit(1);
    }
    try {
        await app.listen(3672, '0.0.0.0');
    } catch (err) {
        app.log.error('An error occurred when starting BRP server: ' + err);
        process.exit(1);
    }
}

start();
