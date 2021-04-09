import { Contract, ErrRsDto } from "../../contracts/core";

export class ResponseContract<
    RqDto extends object,
    ErRsDto extends object = ErrRsDto
> {
    constructor(
        public success: Contract<RqDto>,
        public error: Contract<ErRsDto>
    ) {}
}
