import { InjectQueue } from '@nestjs/bullmq';
import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CreateTransactionDto } from './dto/ledger.dto';
import { LedgerService } from './ledger.service';

@Controller('ledger')
export class LedgerController {
    constructor(
        private readonly ledgerService: LedgerService,
        @InjectQueue('ledger_transactions') private readonly transactionQueue: Queue
    ) { }

    @Post('/transactions')
    @HttpCode(202)
    async createTransaction(
        @Body() dto: CreateTransactionDto,
        @Headers('idempotency-key') idempotencyKey: string,
    ) {
        const job = await this.transactionQueue.add('process', {
            dto,
            idempotencyKey
        });

        return {
            status: 'ACCEPTED',
            message: 'Transaction queued for processing',
            jobId: job.id
        };
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
