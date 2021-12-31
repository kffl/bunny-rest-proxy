import createError from 'fastify-error';

export const ConsumerErrors = {
    ERR_QUEUE_EMPTY: createError('ERR_QUEUE_EMPTY', 'Queue is empty', 423),
    ERR_QUEUE_DOWN_GET: createError(
        'ERR_QUEUE_DOWN_GET',
        'Could not retrieve message from queue',
        500
    )
};
