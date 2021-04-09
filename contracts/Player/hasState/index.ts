import { PlayerMethods } from "../playerMethods";
import { ContractCreator } from "../../core";
import { successResponseContract, PlayerResponseDto } from "./response";
import {
    playerHasStateRequestContract,
    PlayerHasStateRequestDto,
} from "./request";
import { RPC } from "./contract_generated";

export const playerHasStateContract = ContractCreator.create<
    PlayerHasStateRequestDto,
    PlayerResponseDto
>(
    PlayerMethods.hasState,
    playerHasStateRequestContract,
    successResponseContract,
    RPC.Response,
    RPC.Body,
    RPC.ErrorResponse,
    RPC.SuccessResponse
);
