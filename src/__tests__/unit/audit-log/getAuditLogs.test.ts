import { GetAuditLogs } from '../../../modules/audit-log/application/use-cases/GetAuditLogs';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';

describe('GetAuditLogs use case', () => {
    let mockAuditLogRepo: any;
    let useCase: GetAuditLogs;

    beforeEach(() => {
        mockAuditLogRepo = {
            findByWorkspace: jest.fn().mockResolvedValue([]),
            countByWorkspace: jest.fn().mockResolvedValue(0),
        };
        useCase = new GetAuditLogs(mockAuditLogRepo);
    });

    it('should return logs and total count', async () => {
        const result = await useCase.execute(WORKSPACE_ID, {});

        expect(result).toHaveProperty('logs');
        expect(result).toHaveProperty('total');
        expect(mockAuditLogRepo.findByWorkspace).toHaveBeenCalledTimes(1);
        expect(mockAuditLogRepo.countByWorkspace).toHaveBeenCalledTimes(1);
    });
});
