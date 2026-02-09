/**
 * Login Data Transfer Object
 */
export interface LoginDTO {
    email: string;
    password: string;
}

/**
 * Login Response DTO
 */
export interface LoginResponseDTO {
    userId: string;
    token: string;
}
