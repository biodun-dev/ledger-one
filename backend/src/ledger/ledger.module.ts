import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyKey } from '../common/idempotency.entity';
import { Account } from './entities/account.entity';
import { Entry, Transaction } from './entities/transaction.entity';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';

import { BullModule } from '@nestjs/bullmq';
import { LedgerProcessor } from './ledger.processor';

@Module({
    imports: [
        TypeOrmModule.forFeature([Transaction, Entry, Account, IdempotencyKey]),
        BullModule.registerQueue({
            name: 'ledger_transactions',
        }),
    ],
    controllers: [LedgerController],
    providers: [LedgerService, LedgerProcessor],
})
export class LedgerModule { }
