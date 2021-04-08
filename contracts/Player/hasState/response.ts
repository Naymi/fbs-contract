import { IsBoolean } from "class-validator";
import { NContractCreator } from "../../core";
import { RPC as fb } from "./contract_generated";

export class SuccessResponseDto {
    @IsBoolean()
    result!: boolean;
}

export const successResponseContract = NContractCreator.create(
    {
        decode(buf) {
            const data = fb.Response.getRoot(buf);
            const body = data.body(new fb.SuccessResponse())!;
            return {
                result: body.result(),
            };
        },
        encode(builder, data) {
            return fb.Response.create(
                builder,
                fb.Body.SuccessResponse,
                fb.SuccessResponse.create(builder, data.result)
            );
        },
    },
    SuccessResponseDto
);
