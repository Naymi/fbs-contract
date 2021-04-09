require("dotenv").config();
import "reflect-metadata";
import { flatbuffers } from "flatbuffers";
globalThis.flatbuffers = flatbuffers;
import "./dispatcher/Player";
import { PlayerController } from "./controllers/Player";
import Transport from "common/lib/modules/Transport";

const main = async () => {
    try {
        const a = await PlayerController.hasState({ state: 1 });
        console.log("success: ", a.result);
    } catch (error) {
        console.error("error: ", error);
    }
    Transport.close();
};

main();
