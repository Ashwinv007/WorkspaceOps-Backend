/**
 * UNIT TEST: CreateEntity use case
 *
 * What is a unit test?
 *   - Tests ONE class/function in complete isolation
 *   - No real database, no real network, no running server
 *   - All dependencies are replaced with "mocks" (fake versions we control)
 *
 * Why mocks?
 *   - The use case depends on entityRepo and workspaceRepo (database calls)
 *   - We don't want a real DB in unit tests — too slow, too much setup
 *   - jest.fn() creates a fake function we can control and inspect
 *
 * Structure of every test (the AAA pattern):
 *   Arrange  — set up mocks and inputs
 *   Act      — call the function being tested
 *   Assert   — verify the output or error
 */

import { CreateEntity } from '../../../modules/entity/application/use-cases/CreateEntity';
import { EntityRole } from '../../../modules/entity/domain/entities/Entity';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../../../shared/domain/errors/AppError';

// ─────────────────────────────────────────────────────────────────────────────
// TEST DATA
//
// The use case calls isValidObjectId() on workspaceId before anything else.
// isValidObjectId() checks if the string is a 24-character hex value (MongoDB format).
// If we pass a fake string like 'ws1' it will throw ValidationError immediately.
// So we always use a real ObjectId-shaped string in our inputs.
// ─────────────────────────────────────────────────────────────────────────────
const WORKSPACE_ID = '507f1f77bcf86cd799439011'; // valid ObjectId format
const USER_ID      = '507f1f77bcf86cd799439012'; // valid ObjectId format
const ENTITY_ID    = '507f1f77bcf86cd799439014'; // valid ObjectId format

// What a real entity returned from the DB would look like
const mockCreatedEntity = {
  id:          ENTITY_ID,
  workspaceId: WORKSPACE_ID,
  name:        'Acme Corp',
  role:        EntityRole.CUSTOMER,
  parentId:    undefined,
  createdAt:   new Date(),
};

// What a real workspace returned from the DB would look like
const mockWorkspace = { id: WORKSPACE_ID, name: 'My Workspace' };

// ─────────────────────────────────────────────────────────────────────────────
// describe() = a labelled GROUP of related tests.
// All tests inside share the same topic: "CreateEntity use case".
// You can nest describe() blocks for sub-groups.
// ─────────────────────────────────────────────────────────────────────────────
describe('CreateEntity use case', () => {

  // Declare mocks and the use case instance at the describe level
  // so every it() block can access them.
  let mockEntityRepo: any;
  let mockWorkspaceRepo: any;
  let useCase: CreateEntity;

  // beforeEach() runs BEFORE every single it() block below.
  // We reset the mocks here so each test starts clean — previous test
  // calls don't accidentally bleed into the next one.
  beforeEach(() => {
    mockEntityRepo = {
      // jest.fn() creates a fake function.
      // .mockResolvedValue(x) means: when called, return a Promise that resolves to x.
      create:                   jest.fn().mockResolvedValue(mockCreatedEntity),
      findByWorkspaceIdFiltered: jest.fn().mockResolvedValue([]),  // default: no SELF entity exists
      findById:                 jest.fn().mockResolvedValue(null), // default: no parent found
    };

    mockWorkspaceRepo = {
      findById: jest.fn().mockResolvedValue(mockWorkspace), // default: workspace exists
    };

    // Create a fresh use case before each test, injecting our fake repos.
    // No auditLogService — we're not testing audit logging here.
    useCase = new CreateEntity(mockEntityRepo, mockWorkspaceRepo);
  });

  // ─── HAPPY PATH ───────────────────────────────────────────────────────────

  // it() = ONE test scenario. The string should read like a sentence:
  // "it should create and return an entity with valid input"
  it('should create and return an entity with valid input', async () => {
    // ARRANGE — already done in beforeEach (mocks return happy values by default)

    // ACT — call the use case
    const result = await useCase.execute({
      workspaceId: WORKSPACE_ID,
      userId:      USER_ID,
      name:        'Acme Corp',
      role:        EntityRole.CUSTOMER,
    });

    // ASSERT — verify what came back
    expect(result.name).toBe('Acme Corp');
    expect(result.role).toBe(EntityRole.CUSTOMER);
    expect(result.workspaceId).toBe(WORKSPACE_ID);

    // Also verify the repo was called with the right arguments
    // This ensures the use case is passing trimmed name, correct role, etc.
    expect(mockEntityRepo.create).toHaveBeenCalledTimes(1);
    expect(mockEntityRepo.create).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      name:        'Acme Corp',  // trimmed
      role:        EntityRole.CUSTOMER,
      parentId:    undefined,
    });
  });

  // ─── VALIDATION ERRORS ────────────────────────────────────────────────────

  it('should throw ValidationError when workspaceId is not a valid ObjectId', async () => {
    // rejects.toThrow() is how we assert that an async function throws.
    // We can pass the error CLASS to check the exact type.
    await expect(
      useCase.execute({
        workspaceId: 'not-a-valid-id', // not 24-char hex
        userId:      USER_ID,
        name:        'Acme Corp',
        role:        EntityRole.CUSTOMER,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when name is empty', async () => {
    await expect(
      useCase.execute({
        workspaceId: WORKSPACE_ID,
        userId:      USER_ID,
        name:        '   ', // whitespace-only — treated as empty after trim()
        role:        EntityRole.CUSTOMER,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when name exceeds 255 characters', async () => {
    await expect(
      useCase.execute({
        workspaceId: WORKSPACE_ID,
        userId:      USER_ID,
        name:        'A'.repeat(256), // one character too long
        role:        EntityRole.CUSTOMER,
      })
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when role is not a valid EntityRole', async () => {
    await expect(
      useCase.execute({
        workspaceId: WORKSPACE_ID,
        userId:      USER_ID,
        name:        'Acme Corp',
        role:        'INVALID_ROLE' as EntityRole, // cast needed to bypass TypeScript
      })
    ).rejects.toThrow(ValidationError);
  });

  // ─── NOT FOUND ERRORS ─────────────────────────────────────────────────────

  it('should throw NotFoundError when workspace does not exist', async () => {
    // ARRANGE — override the default mock: workspace is missing
    mockWorkspaceRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        workspaceId: WORKSPACE_ID,
        userId:      USER_ID,
        name:        'Acme Corp',
        role:        EntityRole.CUSTOMER,
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('should NOT call entityRepo.create when workspace does not exist', async () => {
    // This tests that the use case exits early — it shouldn't even try
    // to create the entity if the workspace check fails.
    mockWorkspaceRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        workspaceId: WORKSPACE_ID,
        userId:      USER_ID,
        name:        'Acme Corp',
        role:        EntityRole.CUSTOMER,
      })
    ).rejects.toThrow();

    // The key assertion: create() was never called
    expect(mockEntityRepo.create).not.toHaveBeenCalled();
  });

  // ─── CONFLICT ERRORS ──────────────────────────────────────────────────────

  it('should throw ConflictError when a SELF entity already exists in the workspace', async () => {
    // ARRANGE — pretend a SELF entity already exists
    mockEntityRepo.findByWorkspaceIdFiltered.mockResolvedValue([
      { id: 'existing-id', role: EntityRole.SELF },
    ]);

    await expect(
      useCase.execute({
        workspaceId: WORKSPACE_ID,
        userId:      USER_ID,
        name:        'My Company',
        role:        EntityRole.SELF, // trying to create a second SELF
      })
    ).rejects.toThrow(ConflictError);
  });

  it('should allow creating a SELF entity when none exists yet', async () => {
    // findByWorkspaceIdFiltered already returns [] by default (set in beforeEach)
    const result = await useCase.execute({
      workspaceId: WORKSPACE_ID,
      userId:      USER_ID,
      name:        'My Company',
      role:        EntityRole.SELF,
    });

    expect(result).toBeDefined();
    expect(mockEntityRepo.create).toHaveBeenCalledTimes(1);
  });
});
