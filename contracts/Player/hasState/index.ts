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
    PlayerResponseDto,
    typeof RPC.Response,
    typeof RPC.Body,
    typeof RPC.ErrorResponse,
    typeof RPC.SuccessResponse
>(
    PlayerMethods.hasState,
    playerHasStateRequestContract,
    successResponseContract,
    RPC.Response,
    RPC.Body,
    RPC.ErrorResponse,
    RPC.SuccessResponse
);
