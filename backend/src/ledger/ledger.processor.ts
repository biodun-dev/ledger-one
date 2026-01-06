import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CreateTransactionDto } from './ledger.dto';
import { LedgerService } from './ledger.service';

@Processor('ledger_transactions')
export class LedgerProcessor extends WorkerHost {
    private readonly logger = new Logger(LedgerProcessor.name);

    constructor(private readonly ledgerService: LedgerService) {
        super();
    }

    async process(job: Job<{ dto: CreateTransactionDto, idempotencyKey: string }>) {
        this.logger.log(`Processing transaction job ${job.id}`);
        const { dto, idempotencyKey } = job.data;

        try {
            const result = await this.ledgerService.createTransaction(dto, idempotencyKey);
            this.logger.log(`Transaction processed successfully: ${result.id}`);
            return result;
        } catch (error) {
            this.logger.error(`Transaction processing failed: ${error.message}`);
            throw error;
        }
    }
}
