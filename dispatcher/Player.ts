import { ContractServiceDecorator } from "../contracts/core";
import { playerHasStateContract } from "../contracts/Player/hasState";
import {
    CommunicationContractRequest,
    CommunicationContractResponse,
} from "./../infra/communication";
export class PlayerDispatcher {
    @ContractServiceDecorator.handler(playerHasStateContract)
    async hasState(
        payload: CommunicationContractRequest<typeof playerHasStateContract>
    ): Promise<CommunicationContractResponse<typeof playerHasStateContract>> {
        if (1) {
            throw new Error("hasState error");
        }
        // @ts-ignore
        return { result: "" };
    }
}
