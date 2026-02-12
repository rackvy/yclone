import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type JwtPayload = {
    sub: string;       // userId
    companyId: string; // companyId
};

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): JwtPayload => {
        const req = ctx.switchToHttp().getRequest();
        return req.user as JwtPayload;
    },
);
