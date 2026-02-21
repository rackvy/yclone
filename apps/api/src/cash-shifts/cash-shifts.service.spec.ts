import { Test, TestingModule } from '@nestjs/testing';
import { CashShiftsService } from './cash-shifts.service';

describe('CashShiftsService', () => {
  let service: CashShiftsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CashShiftsService],
    }).compile();

    service = module.get<CashShiftsService>(CashShiftsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
