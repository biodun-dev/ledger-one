import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { LedgerProcessor } from './ledger.processor';
import { LedgerService } from './ledger.service';

describe('LedgerProcessor', () => {
    let processor: LedgerProcessor;
    let service: LedgerService;

    const mockJob = {
        id: 'job_1',
        data: {
            dto: {
                description: 'Test',
                reference: 'ref',
                entries: []
            },
            idempotencyKey: 'key_1'
        }
    } as unknown as Job;

    beforeEach(async () => {
        service = {
            createTransaction: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LedgerProcessor,
                { provide: LedgerService, useValue: service },
            ],
        }).compile();

        processor = module.get<LedgerProcessor>(LedgerProcessor);
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    it('should call ledgerService.createTransaction with correct data', async () => {
        const mockResult = { id: 'tx_1' };
        (service.createTransaction as jest.Mock).mockResolvedValue(mockResult);

        const result = await processor.process(mockJob as any);

        expect(service.createTransaction).toHaveBeenCalledWith(
            mockJob.data.dto,
            mockJob.data.idempotencyKey
        );
        expect(result).toEqual(mockResult);
    });

    it('should throw error if service fails', async () => {
        (service.createTransaction as jest.Mock).mockRejectedValue(new Error('Process failed'));

        await expect(processor.process(mockJob as any)).rejects.toThrow('Process failed');
    });
});
