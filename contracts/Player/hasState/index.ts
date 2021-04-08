import "reflect-metadata";
import { PlayerMethods } from "../playerMethods";
import { Contract, ErrorResponseContract, ResponseContract } from "../../core";
import { SuccessResponseContract } from "./response";
import { PlayerHasStateRequestContract } from "./request";
import { RPC } from "./contract_generated";

class PlayerHasStateResponseContract extends ResponseContract {
    success = new SuccessResponseContract();
    error = new ErrorResponseContract(
        RPC.Response,
        RPC.ErrorResponse,
        RPC.Body
    );
}

export const playerHasStateContract = new Contract(
    PlayerMethods.hasState,
    new PlayerHasStateRequestContract(),
    new PlayerHasStateResponseContract(),
    RPC.Response,
    RPC.Body,
    RPC.ErrorResponse,
    RPC.SuccessResponse
);
