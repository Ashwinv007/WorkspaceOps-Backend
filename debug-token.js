"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TokenServiceImpl_1 = require("./src/modules/auth/infrastructure/jwt/TokenServiceImpl");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env vars manually for the script
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '.env') });
async function testToken() {
    console.log('--- Testing Token Service ---');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Wait, let me not print secret' : 'MISSING');
    const service = new TokenServiceImpl_1.TokenServiceImpl();
    try {
        console.log('\nTesting INVALID_TOKEN verification...');
        const result = service.verifyToken('INVALID_TOKEN');
        console.log('WARNING: Verification SUCCESS unexpectedly!', result);
    }
    catch (error) {
        console.log('SUCCESS: Verification failed as expected.');
        console.log('Error:', error);
    }
    // Also test generating a token and verifying it to make sure that works
    try {
        console.log('\nTesting generated token verification...');
        const token = service.generateToken('user123', 'test@example.com');
        console.log('Generated token:', token);
        const result = service.verifyToken(token);
        console.log('Verification SUCCESS:', result);
    }
    catch (error) {
        console.log('ERROR: Failed to verify valid token.');
        console.error(error);
    }
}
testToken();
