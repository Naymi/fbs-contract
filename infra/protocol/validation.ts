import { ClassType, transformAndValidate } from "class-transformer-validator";

export class ValidationProtocol<Dto extends object> {
    constructor(private readonly DTO: ClassType<Dto>) {}

    async validate(data: any): Promise<Dto> {
        return (await transformAndValidate(this.DTO, data)) as Dto;
    }
}
