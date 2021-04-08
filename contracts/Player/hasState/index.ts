import "reflect-metadata";
import { PlayerMethods } from "../playerMethods";
import { Contract, ErrorResponseContract, ResponseContract } from "../../core";
import { successResponseContract } from "./response";
import { playerHasStateRequestContract } from "./request";
import { RPC } from "./contract_generated";

export const playerHasStateContract = new Contract(
    PlayerMethods.hasState,
    playerHasStateRequestContract,
    new PlayerHasStateResponseContract(),
    RPC.Response,
    RPC.Body,
    RPC.ErrorResponse,
    RPC.SuccessResponse
);
