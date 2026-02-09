"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPresenter = void 0;
/**
 * User Presenter (Interfaces Layer)
 *
 * Formats domain/application responses for HTTP clients.
 * Ensures consistent API response structure.
 */
class UserPresenter {
    toSignupResponse(data) {
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
    toLoginResponse(data) {
        return {
            success: true,
            data: {
                userId: data.userId,
                token: data.token
            },
            message: 'Login successful'
        };
    }
    toErrorResponse(message, statusCode = 400) {
        return {
            success: false,
            error: {
                message,
                statusCode
            }
        };
    }
}
exports.UserPresenter = UserPresenter;
