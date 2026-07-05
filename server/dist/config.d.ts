export declare const config: {
    readonly port: number;
    readonly corsOrigin: string[];
    readonly databaseUrl: string;
    readonly jwtSecret: string;
    readonly jwtExpiresIn: string;
    readonly adminEmail: string;
    readonly adminPassword: string;
    readonly adminId: "00000000-0000-0000-0000-000000000000";
    readonly demoEmail: "demo@coinnova.io";
    readonly demoPassword: "demo123";
    readonly email: {
        readonly resendApiKey: string;
        readonly resendFrom: string;
    };
    readonly stripe: {
        readonly secretKey: string;
        readonly webhookSecret: string;
        readonly successUrl: string;
        readonly cancelUrl: string;
    };
    readonly razorpay: {
        readonly keyId: string;
        readonly keySecret: string;
    };
    readonly google: {
        readonly clientId: string;
        readonly clientSecret: string;
        readonly redirectUri: string;
        readonly frontendUrl: string;
    };
    readonly groqApiKey: string;
    readonly portfolioHealth: {
        readonly HHI_LIMIT: number;
        readonly IDEAL_STABLE_RATIO_MIN: number;
        readonly IDEAL_STABLE_RATIO_MAX: number;
        readonly MAX_CONCENTRATION: number;
    };
};
