import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

@UseGuards(JwtAuthGuard)
@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  create(@Body() dto: CreateLinkDto, @CurrentUser() user: User) {
    return this.linksService.create(dto, user.id);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('archived') archived?: string,
    @Query('q') q?: string,
    @Query('tag') tag?: string,
  ) {
    return this.linksService.findAll(user.id, {
      page: page ? parseInt(page, 10) : 1,
      archived: archived === 'true',
      q,
      tag,
    });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLinkDto,
    @CurrentUser() user: User,
  ) {
    return this.linksService.update(id, dto, user.id);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: User) {
    return this.linksService.archive(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.linksService.remove(id, user.id);
  }

  @Post(':id/tags/:tagId')
  @HttpCode(HttpStatus.OK)
  addTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @CurrentUser() user: User,
  ) {
    return this.linksService.addTag(id, tagId, user.id);
  }

  @Delete(':id/tags/:tagId')
  removeTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @CurrentUser() user: User,
  ) {
    return this.linksService.removeTag(id, tagId, user.id);
  }
}
