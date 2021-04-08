import { IsIn } from "class-validator";
import { NContractCreator } from "../../core";
import { RPC as fb } from "./contract_generated";

export class RequestDto {
    @IsIn(Object.values(fb.PlayerState))
    state!: fb.PlayerState;
}

export const playerHasStateRequestContract = NContractCreator.create<RequestDto>(
    {
        decode(buf: flatbuffers.ByteBuffer) {
            const data = fb.Request.getRoot(buf);
            return {
                state: data.state(),
            };
        },

        encode(builder: flatbuffers.Builder, data: RequestDto): number {
            return fb.Request.create(builder, data.state);
        },
    },
    RequestDto
);
