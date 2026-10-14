import { Module } from '@nestjs/common';
import { ConsentsController } from './consents.controller.js';
import { ConsentsService } from './consents.service.js';

// Exported so `auth` (pendingConsents in the session) and `talent-profiles` (visa disclaimer) can
// record and read consents inside their own flows.
@Module({
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}
