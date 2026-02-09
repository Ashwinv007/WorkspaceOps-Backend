import { SignupResponseDTO } from '../../application/dto/SignupDTO';
import { LoginResponseDTO } from '../../application/dto/LoginDTO';

/**
 * User Presenter (Interfaces Layer)
 * 
 * Formats domain/application responses for HTTP clients.
 * Ensures consistent API response structure.
 */
export class UserPresenter {
    toSignupResponse(data: SignupResponseDTO) {
        return {
            success: true,
            data: {
                userId: data.userId,
                workspaceId: data.workspaceId,
                token: data.token
            },
            message: 'User registered successfully'
        };
    }

    toLoginResponse(data: LoginResponseDTO) {
        return {
            success: true,
            data: {
                userId: data.userId,
                token: data.token
            },
            message: 'Login successful'
        };
    }

    toErrorResponse(message: string, statusCode: number = 400) {
        return {
            success: false,
            error: {
                message,
                statusCode
            }
        };
    }
}
