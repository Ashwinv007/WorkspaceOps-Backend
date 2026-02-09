/**
 * Signup Data Transfer Object
 * 
 * Defines the input shape for user signup.
 * Used by the application layer to receive data from the interface layer.
 */
export interface SignupDTO {
    email: string;
    password: string;
    name?: string;
}

/**
 * Signup Response DTO
 */
export interface SignupResponseDTO {
    userId: string;
    workspaceId: string;
    token: string;
}
