import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { AdminCompaniesController } from './admin-companies.controller';
import { AdminUsersController } from './admin-users.controller';

@Module({
  imports: [CompaniesModule, UsersModule],
  controllers: [AdminCompaniesController, AdminUsersController],
})
export class AdminModule {}
