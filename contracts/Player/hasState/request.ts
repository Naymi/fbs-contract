import { IsIn } from "class-validator";
import { FlatBufContractCreator } from "../../core";
import { RPC as fb } from "./contract_generated";

export class PlayerHasStateRequestDto {
    @IsIn(Object.values(fb.PlayerState))
    state!: fb.PlayerState;
}

export const playerHasStateRequestContract = FlatBufContractCreator.create<PlayerHasStateRequestDto>(
    {
        decode(buf: flatbuffers.ByteBuffer) {
            const data = fb.Request.getRoot(buf);
            return {
                state: data.state(),
            };
        },

        encode(
            builder: flatbuffers.Builder,
            data: PlayerHasStateRequestDto
        ): number {
            return fb.Request.create(builder, data.state);
        },
    },
    PlayerHasStateRequestDto
);
