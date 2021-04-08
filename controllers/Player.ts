import { ContractService } from "../contracts/core";
import { playerHasStateContract } from "./../contracts/Player/hasState";

export class PlayerController {
    static hasState(payload: any) {
        return ContractService.call(playerHasStateContract, payload);
    }
}
