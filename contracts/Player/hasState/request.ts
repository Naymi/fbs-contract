import { IsIn } from "class-validator";
import { SubContract } from "../../core";
import { RPC as fb } from "./contract_generated";

export class RequestDto {
    @IsIn(Object.values(fb.PlayerState))
    state!: fb.PlayerState;
}

export class PlayerHasStateRequestContract extends SubContract<RequestDto> {
    Dto = RequestDto;
    decodeFB(buf: flatbuffers.ByteBuffer) {
        const data = fb.Request.getRoot(buf);
        return {
            state: data.state(),
        };
    }

    encodeFB(builder: flatbuffers.Builder, data: RequestDto): number {
        return fb.Request.create(builder, data.state);
    }
}
