import { ContractService } from "../contracts/core";
import { PlayerHasStateRequestDto } from "../contracts/Player/hasState/request";
import { PlayerResponseDto } from "../contracts/Player/hasState/response";
import { playerHasStateContract } from "./../contracts/Player/hasState";

export class PlayerController {
    static async hasState(
        payload: PlayerHasStateRequestDto
    ): Promise<PlayerResponseDto> {
        return await ContractService.call<
            PlayerHasStateRequestDto,
            PlayerResponseDto
        >(playerHasStateContract, payload);
    }
}
