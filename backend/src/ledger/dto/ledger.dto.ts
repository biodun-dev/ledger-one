import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from 'class-validator';
import { EntryType } from '../entities/transaction.entity';

export class CreateEntryDto {
    @IsString()
    @IsNotEmpty()
    accountId: string;

    @IsNumber()
    @Min(0.01)
    amount: number;

    @IsEnum(EntryType)
    type: EntryType;
}

export class CreateTransactionDto {
    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    reference: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateEntryDto)
    entries: CreateEntryDto[];
}
