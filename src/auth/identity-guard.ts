import { FastifyRequest } from 'fastify';
import { AccessProtectedResource, IdentityConfig } from '../config/yaml-config.types';
import { AuthErrors } from './errors';

export type AuthorizedRequestHeaders = { 'x-bunny-identity'?: string; 'x-bunny-token': string };

export class IdentityGuard {
    constructor(
        private readonly resource: AccessProtectedResource,
        private readonly identities: Array<IdentityConfig>
    ) {}
    public verifyRequest(req: FastifyRequest<{ Headers: AuthorizedRequestHeaders }>): void {
        if (this.resource.identities.length > 0) {
            if (!req.headers['x-bunny-identity'] || !req.headers['x-bunny-token']) {
                throw new AuthErrors.ERR_MISSING_CREDENTIALS();
            }
            const claimedName = req.headers['x-bunny-identity'];
            const claimedIdentity: IdentityConfig | undefined = this.identities.find(
                (i) => i.name === claimedName
            );
            if (!claimedIdentity) {
                throw new AuthErrors.ERR_UNAUTHORIZED();
            }
            const claimedToken = req.headers['x-bunny-token'];
            if (claimedToken !== claimedIdentity.token) {
                throw new AuthErrors.ERR_UNAUTHORIZED();
            }
            if (!this.resource.identities.includes(claimedIdentity.name)) {
                throw new AuthErrors.ERR_UNAUTHORIZED();
            }
        }
    }
}
