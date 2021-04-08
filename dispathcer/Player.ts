import { ContractServiceDecorator } from "../contracts/core";
import { playerHasStateContract } from "../contracts/Player/hasState";
import { RequestDto } from "../contracts/Player/hasState/request";

export class PlayerDispatcher {
    @ContractServiceDecorator.handler(playerHasStateContract)
    hasState(payload: RequestDto) {
        if (0) {
            throw new Error("hasState error");
        }
        return { result: true };
    }
}
