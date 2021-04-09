import { PlayerMethods } from "../playerMethods";
import { successResponseContract, PlayerResponseDto } from "./response";
import {
    playerHasStateRequestContract,
    PlayerHasStateRequestDto,
} from "./request";
import { RPC } from "./contract_generated";
import { CommunicationContractCreator } from "../../../infra/communication";

export const playerHasStateContract = CommunicationContractCreator.create<
    PlayerHasStateRequestDto,
    PlayerResponseDto
>(
    PlayerMethods.hasState,
    playerHasStateRequestContract,
    successResponseContract,
    RPC.Response,
    RPC.Body,
    RPC.ErrorResponse
);
