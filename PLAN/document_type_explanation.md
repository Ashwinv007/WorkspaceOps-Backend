# Document Type Module: Detailed Data Flow Analysis

This document provides a detailed, file-by-file, and line-by-line explanation of the **Document Type Configuration Module** in the WorkspaceOps backend.

We will follow the lifecycle of a real-world scenario: **Creating a "Passport" Document Type**.

---

## Scenario: Create "Passport" Document Type

**Objective:** A Workspace Admin wants to define a new document type called "Passport" with metadata fields (Passport Number, Expiry Date) and expiry tracking enabled.

**Request Payload:**
```json
POST /workspaces/workspace_123/document-types
{
  "name": "Passport",
  "hasMetadata": true,
  "hasExpiry": true,
  "fields": [
    {
      "fieldKey": "passport_number",
      "fieldType": "text",
      "isRequired": true
    },
    {
      "fieldKey": "expiry_date",
      "fieldType": "date",
      "isRequired": true,
      "isExpiryField": true
    }
  ]
}
```

---

## 1. Network & Routing Layer

### `infrastructure/routes/documentType.routes.ts`

This file is the entry point for the module. It handles Dependency Injection (DI) and defines HTTP routes.

**Key responsibilities:**
1.  Instantiates Repositories, Use Cases, Controller, and Presenter.
2.  Maps HTTP paths to Controller methods.
3.  Applies Middleware (Auth, RBAC).

**Line-by-Line Analysis:**

*   **Lines 34-35:** Repository Implementation instantiation.
    ```typescript
    const documentTypeRepo = new DocumentTypeRepositoryImpl();
    const workspaceRepo = new WorkspaceRepositoryImpl();
    ```
    *The route file acts as the Composition Root for this module.*

*   **Lines 38-41:** Use Case instantiation with dependencies injected.
    ```typescript
    const createDocumentTypeUseCase = new CreateDocumentType(
        documentTypeRepo,
        workspaceRepo
    );
    ```
    *`CreateDocumentType` receives the repositories it needs to function.*

*   **Lines 67-75:** Controller instantiation.
    ```typescript
    const documentTypeController = new DocumentTypeController(
        createDocumentTypeUseCase,
        // ... other use cases
        presenter
    );
    ```
    *The controller receives all use cases and the presenter.*

*   **Lines 81-86:** Route Definition.
    ```typescript
    router.post(
        '/workspaces/:workspaceId/document-types',
        authMiddleware,
        requireAdmin,
        documentTypeController.createDocumentType
    );
    ```
    *   **`authMiddleware`**: Verifies JWT token.
    *   **`requireAdmin`**: Ensures the user has 'admin' or 'owner' role in the workspace.
    *   **`createDocumentType`**: The method that handles the logic.

---

## 2. Interface Layer (HTTP Controller)

### `interfaces/http/DocumentTypeController.ts`

The controller acts as an adapter, converting HTTP requests into Use Case inputs.

**Line-by-Line Analysis (`createDocumentType` method):**

*   **Lines 42-43:** Extraction.
    ```typescript
    const workspaceId = req.params.workspaceId as string;
    const { name, hasMetadata, hasExpiry, fields } = req.body;
    ```
    *Extracts `workspaceId` from URL params and the rest from the JSON body.*

*   **Lines 46-55:** Input Validation (Pre-Use Case).
    ```typescript
    if (fields && Array.isArray(fields)) {
        for (const field of fields) {
            if (!Object.values(FieldType).includes(field.fieldType)) {
                 // returns 400 Bad Request
            }
        }
    }
    ```
    *Basic validation ensures data integrity before engaging business logic.*

*   **Lines 57-63:** Use Case Execution.
    ```typescript
    const result = await this.createDocumentTypeUseCase.execute({
        workspaceId,
        name,
        hasMetadata: hasMetadata || false,
        hasExpiry: hasExpiry || false,
        fields: fields || []
    });
    ```
    *Calls the application layer. The Controller is "humble" - it contains no business logic.*

*   **Line 65:** Response Formatting.
    ```typescript
    res.status(201).json(this.presenter.presentDocumentType(result.documentType, result.fields));
    ```
    *Delegates response formatting to the Presenter and returns **201 Created**.*

---

## 3. Application Layer (Use Case)

### `application/use-cases/CreateDocumentType.ts`

This contains the application-specific business rules and orchestrates the flow.

**Line-by-Line Analysis (`execute` method):**

*   **Lines 37-39:** ID Validation.
    *Validates that `workspaceId` is a valid MongoDB ObjectId.*

*   **Lines 42-45:** Workspace Existence Check.
    ```typescript
    const workspace = await this.workspaceRepo.findById(input.workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');
    ```
    *Ensures we aren't creating a document type for a non-existent workspace.*

*   **Lines 48-60:** Basic Validations.
    *   Name required and max length checks.
    *   If `hasMetadata` is true, ensures at least one field exists.

*   **Lines 62-75:** Business Logic: Expiry Tracking.
    ```typescript
    if (input.hasExpiry) {
        // ...
        if (!hasExpiryField) throw new ValidationError('...');
        // ...
        if (invalidExpiryFields.length > 0) throw new ValidationError('Expiry fields must be of type date');
    }
    ```
    *Critical Rule: To track expiry, you must have a date field marked as the expiry field.*

*   **Lines 85-90:** Domain Entity Creation.
    ```typescript
    const documentType = DocumentType.create(
        input.workspaceId,
        // ...
    );
    ```
    *Delegates creation logic to the static factory method on the Domain Entity.*

*   **Lines 93-98:** Field Preparation.
    *Prepares field data objects. Note: `documentTypeId` is not yet available, so it's handled by the repository.*

*   **Line 101:** Persistence.
    ```typescript
    const createdDocType = await this.documentTypeRepo.create(documentType, fieldData);
    ```
    *Calls the repository to save data. The repository handles the complexity of saving parent and child records.*

---

## 4. Domain Layer (Entities)

### `domain/entities/DocumentType.ts`

Represents the core business object.

*   **Lines 18-28:** Class Definition & Constructor.
    *Includes `validate()` call in constructor to ensure valid state always.*
*   **Lines 31-44:** `validate()` Method.
    *Enforces invariants: Validation of Name length, requirements, etc.*
*   **Lines 49-69:** `create()` Factory Method.
    *Creates a new instance for the first time (without an ID). Returns data ready for persistence.*

### `domain/entities/DocumentTypeField.ts`

Represents individual metadata fields.

*   **Lines 31-63:** Validation Rules.
    *   Field Key must be alphanumeric.
    *   Field Type must be valid Enum (`text`, `date`).
    *   **Rule:** `isExpiryField` is only allowed if `fieldType` is `date`.

---

## 5. Infrastructure Layer (Repository)

### `infrastructure/mongoose/DocumentTypeRepositoryImpl.ts`

Handles concrete data access using Mongoose.

**Line-by-Line Analysis (`create` method):**

*   **Lines 28-33:** Create Parent Document.
    ```typescript
    const docTypeDoc = await DocumentTypeModel.create({ ... });
    ```
    *Inserts the `DocumentType` into MongoDB.*

*   **Lines 36-46:** Create Child Documents.
    ```typescript
    if (fields.length > 0) {
        await DocumentTypeFieldModel.insertMany(
            fields.map(f => ({
                documentTypeId: docTypeDoc._id, // Links fields to parent
                // ...
            }))
        );
    }
    ```
    *Inserts all fields in bulk, linking them via `documentTypeId`.*

*   **Line 49:** Domain Conversion.
    ```typescript
    return this.toDomainDocumentType(docTypeDoc);
    ```
    *Converts the raw Mongoose document back into a Domain Entity so the upper layers remain decoupled from Mongoose.*

---

## 6. Interface Layer (Presenter)

### `interfaces/presenters/DocumentTypePresenter.ts`

Formats the output for the client. The core principle here is that the Domain Entities should not be serialized directly to the API response.

**Line-by-Line Analysis (`presentDocumentType` method):**

*   **Lines 13-25:** Formatting.
    ```typescript
    return {
        success: true,
        data: {
            id: documentType.id,
            // ...
            createdAt: documentType.createdAt?.toISOString()
        }
    };
    ```
    *Ensures consistent API structure (`success`, `data`) and formats Dates to ISO strings.*

---

## Summary of Flow

1.  **Request** hits Router.
2.  **Router** checks Auth & RBAC -> calls Controller.
3.  **Controller** extracts JSON -> calls Use Case.
4.  **Use Case** validates rules -> creates Domain Entity -> calls Repository.
5.  **Repository** saves to MongoDB (Parent + Children) -> returns Domain Entity.
6.  **Use Case** returns Entity to Controller.
7.  **Controller** passes Entity to Presenter.
8.  **Presenter** formats JSON.
9.  **Controller** sends JSON response (201 Created).

This strict separation ensures that business logic is isolated, database details are hidden, and the API contract is consistent.
