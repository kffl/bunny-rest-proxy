enum LogLevel {
    INFO = 'info',
    ERROR = 'error',
    DEBUG = 'debug',
    FATAL = 'fatal',
    WARN = 'warn',
    TRACE = 'trace',
    CHILD = 'child'
}

export interface EnvValues {
    BRP_LOG_LEVEL?: string;
    BRP_LOG_PRETTY?: string;
    BRP_CONN_STR?: string;
}

export interface EnvConfig {
    logLevel: LogLevel;
    prettyPrint: boolean;
    connectionString: string;
}

export function buildEnvConfig(env: EnvValues): EnvConfig {
    if (!env.BRP_CONN_STR) {
        throw new Error('AMQP connection string in BRP_CONN_STR environment value is missing');
    }
    if (env.BRP_LOG_LEVEL && !Object.values(LogLevel).includes(env.BRP_LOG_LEVEL as LogLevel)) {
        throw new Error(
            `Invalid log level: ${env.BRP_LOG_LEVEL}, allowed values: ${Object.values(
                LogLevel
            ).join(', ')}`
        );
    }
    const envConfig: EnvConfig = {
        logLevel:
            env.BRP_LOG_LEVEL && Object.values(LogLevel).includes(env.BRP_LOG_LEVEL as LogLevel)
                ? (env.BRP_LOG_LEVEL as LogLevel)
                : LogLevel.INFO,
        prettyPrint: env.BRP_LOG_PRETTY === 'true' || false,
        connectionString: env.BRP_CONN_STR
    };
    return envConfig;
}
