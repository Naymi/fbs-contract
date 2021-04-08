import { PlayerMethods } from "../playerMethods";
import { ContractCreator } from "../../core";
import { successResponseContract, SuccessResponseDto } from "./response";
import { playerHasStateRequestContract, RequestDto } from "./request";
import { RPC } from "./contract_generated";

export const playerHasStateContract = ContractCreator.create<
    SuccessResponseDto,
    RequestDto
>(
    PlayerMethods.hasState,
    playerHasStateRequestContract,
    successResponseContract,
    RPC.Response,
    RPC.Body,
    RPC.ErrorResponse,
    RPC.SuccessResponse
);
