import { Module } from '@nestjs/common';
import { TalentProfilesController } from './talent-profiles.controller.js';
import { TalentProfilesService } from './talent-profiles.service.js';

// PrismaModule is global, so nothing to import here. Modules that need profiles (search, contact
// reveal, moderation) import this module and call the service; they never touch the tables directly.
@Module({
  controllers: [TalentProfilesController],
  providers: [TalentProfilesService],
  exports: [TalentProfilesService],
})
export class TalentProfilesModule {}
