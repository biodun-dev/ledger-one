import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { CreateTransactionDto } from './ledger.dto';
import { LedgerService } from './ledger.service';

@Controller('ledger')
export class LedgerController {
    constructor(private readonly ledgerService: LedgerService) { }

    @Post('/transactions')
    async createTransaction(
        @Body() dto: CreateTransactionDto,
        @Headers('idempotency-key') idempotencyKey: string,
    ) {
        return this.ledgerService.createTransaction(dto, idempotencyKey);
    }

    @Post('/accounts')
    async createAccount(@Body('name') name: string) {
        return this.ledgerService.createAccount(name);
    }

    @Get('/accounts')
    async getAccounts() {
        return this.ledgerService.getBalances();
    }

    @Get('/transactions')
    async getTransactions() {
        return this.ledgerService.getTransactions();
    }
}
