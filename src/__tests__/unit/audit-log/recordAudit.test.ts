import { RecordAudit } from '../../../modules/audit-log/application/use-cases/RecordAudit';
import { AuditAction } from '../../../modules/audit-log/domain/enums/AuditAction';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const USER_ID      = '507f1f77bcf86cd799439012';
const TARGET_ID    = '507f1f77bcf86cd799439013';

describe('RecordAudit use case', () => {
    let mockAuditLogRepo: any;
    let useCase: RecordAudit;

    beforeEach(() => {
        mockAuditLogRepo = {
            create: jest.fn().mockResolvedValue({
                id: '507f1f77bcf86cd799439014',
                workspaceId: WORKSPACE_ID,
                userId: USER_ID,
                action: AuditAction.ENTITY_CREATED,
                targetType: 'Entity',
                targetId: TARGET_ID,
                createdAt: new Date(),
            }),
        };
        useCase = new RecordAudit(mockAuditLogRepo);
    });

    it('should record an audit log and return it', async () => {
        const result = await useCase.execute({
            workspaceId: WORKSPACE_ID,
            userId: USER_ID,
            action: AuditAction.ENTITY_CREATED,
            targetType: 'Entity',
            targetId: TARGET_ID,
        });

        expect(result).toBeDefined();
        expect(mockAuditLogRepo.create).toHaveBeenCalledTimes(1);
    });
});
