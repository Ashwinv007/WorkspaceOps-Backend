import { IWorkspaceRepository } from '../../domain/repositories/IWorkspaceRepository';
import { IWorkspaceMemberRepository } from '../../domain/repositories/IWorkspaceMemberRepository';
import { ITenantRepository } from '../../domain/repositories/ITenantRepository';
import { Workspace } from '../../domain/entities/Workspace';
import { WorkspaceMember, WorkspaceRole } from '../../domain/entities/WorkspaceMember';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';

/**
 * Create Workspace Use Case (Application Layer)
 * 
 * Allows users to create additional workspaces within their tenant.
 * The creator is automatically added as the OWNER.
 */

export interface CreateWorkspaceDTO {
    tenantId: string;
    name: string;
    createdByUserId: string;
}

export class CreateWorkspace {
    constructor(
        private readonly tenantRepo: ITenantRepository,
        private readonly workspaceRepo: IWorkspaceRepository,
        private readonly workspaceMemberRepo: IWorkspaceMemberRepository
    ) { }

    async execute(dto: CreateWorkspaceDTO): Promise<{ workspace: Workspace; membership: WorkspaceMember }> {
        // 1. Validate tenant ID format
        if (!isValidObjectId(dto.tenantId)) {
            throw new ValidationError('Invalid tenant ID format');
        }

        // 2. Validate tenant exists
        const tenant = await this.tenantRepo.findById(dto.tenantId);
        if (!tenant) {
            throw new NotFoundError('Tenant not found');
        }

        // 3. Validate workspace name
        if (!dto.name || dto.name.trim().length === 0) {
            throw new ValidationError('Workspace name is required');
        }

        // 3. Create workspace
        const workspace = await this.workspaceRepo.create({
            tenantId: dto.tenantId,
            name: dto.name.trim()
        });

        // 4. Create workspace membership (creator is OWNER)
        const membership = await this.workspaceMemberRepo.create({
            workspaceId: workspace.id,
            userId: dto.createdByUserId,
            role: 'OWNER' as WorkspaceRole
        });

        return {
            workspace,
            membership
        };
    }
}
