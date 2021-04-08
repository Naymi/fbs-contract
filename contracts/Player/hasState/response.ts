import { IsBoolean } from "class-validator";
import { SubContract } from "../../core";
import { RPC as fb } from "./contract_generated";

export class SuccessResponseDto {
    @IsBoolean()
    result!: boolean;
}

export class SuccessResponseContract extends SubContract<SuccessResponseDto> {
    Dto = SuccessResponseDto;
    decodeFB(buf: flatbuffers.ByteBuffer) {
        const data = fb.Response.getRoot(buf);
        const body = data.body(new fb.SuccessResponse())!;
        return {
            result: body.result(),
        };
    }

    encodeFB(builder: flatbuffers.Builder, data: SuccessResponseDto): number {
        return fb.Response.create(
            builder,
            fb.Body.SuccessResponse,
            fb.SuccessResponse.create(builder, data.result)
        );
    }
}
