import { flatbuffers } from "flatbuffers";
import "reflect-metadata";
import "./dispathcer/Player";
import { PlayerController } from "./controllers/Player";

globalThis.flatbuffers = flatbuffers;
const main = async () => {
    const a = await PlayerController.hasState({ state: 1 });
    console.log(a);
};

main();
