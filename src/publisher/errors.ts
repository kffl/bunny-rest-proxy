import createError from 'fastify-error';

export const PublisherErrors = {
    ERR_CONTENT_TYPE: createError('ERR_CONTENT_TYPE', 'Unsupported content type: %s', 415),
    ERR_QUEUE_DOWN: createError('ERR_QUEUE_DOWN', 'Could not publish message to queue', 503),
    ERR_SCHEMA_VALIDATION: createError(
        'ERR_SCHEMA_VALIDATION',
        'Payload schema validation failed: %s',
        400
    )
};
