import "reflect-metadata";
import { PlayerMethods } from "../playerMethods";
import {
    Contract,
    ErrorResponseContractCreator,
    ResponseContract,
} from "../../core";
import { successResponseContract } from "./response";
import { playerHasStateRequestContract } from "./request";
import { RPC } from "./contract_generated";

export const playerHasStateContract = new Contract(
    PlayerMethods.hasState,
    playerHasStateRequestContract,
    new ResponseContract(
        successResponseContract,
        ErrorResponseContractCreator.create(
            RPC.Response,
            RPC.ErrorResponse,
            RPC.Body
        )
    ),
    RPC.Response,
    RPC.Body,
    RPC.ErrorResponse,
    RPC.SuccessResponse
);
