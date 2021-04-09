require("dotenv").config();
import "reflect-metadata";
import { flatbuffers } from "flatbuffers";
globalThis.flatbuffers = flatbuffers;
import "./dispatcher/Player";
import { PlayerController } from "./controllers/Player";
import Transport from "common/lib/modules/Transport";

const main = async () => {
    const a = await PlayerController.hasState({ state: 1 });
    console.log(a.result);
    Transport.close();
};

main();
