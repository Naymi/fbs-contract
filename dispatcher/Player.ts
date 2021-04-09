import { ContractServiceDecorator } from "../contracts/core";
import { playerHasStateContract } from "../contracts/Player/hasState";
export class PlayerDispatcher {
    @ContractServiceDecorator.handler(playerHasStateContract)
    hasState(payload: typeof playerHasStateContract[]) {
        if (0) {
            throw new Error("hasState error");
        }
        return { result: true };
    }
}
