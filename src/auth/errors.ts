import createError from 'fastify-error';

export const AuthErrors = {
    ERR_MISSING_CREDENTIALS: createError(
        'ERR_MISSING_CREDENTIALS',
        'Missing credentials in headers',
        403
    ),
    ERR_UNAUTHORIZED: createError('ERR_FORBIDDEN', 'Forbidden', 403)
};
