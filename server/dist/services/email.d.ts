/** Generate a 6-digit OTP code */
export declare function generateOTP(): string;
export declare function sendVerificationEmail(to: string, otp: string): Promise<boolean>;
export declare function sendPasswordResetEmail(to: string, otp: string): Promise<boolean>;
export declare function sendTwoFactorEmail(to: string, otp: string): Promise<boolean>;
export declare function sendPinSetupEmail(to: string, otp: string): Promise<boolean>;
export declare function sendPinResetEmail(to: string, otp: string): Promise<boolean>;
export declare function sendDepositConfirmation(to: string, amount: number): Promise<boolean>;
export declare function sendWithdrawalAlert(to: string, amount: number, dest: string): Promise<boolean>;
export declare function sendPriceAlert(to: string, symbol: string, direction: string, price: number): Promise<boolean>;
export declare function sendEmailChangeEmail(to: string, otp: string): Promise<boolean>;
