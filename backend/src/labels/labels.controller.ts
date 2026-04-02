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
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

interface AuthRequest {
  user: { userId: string };
}

@Controller('labels')
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateLabelDto) {
    return this.labelsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.labelsService.findAll(req.user.userId);
  }

  @Patch(':id')
  update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateLabelDto,
  ) {
    return this.labelsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.labelsService.remove(req.user.userId, id);
  }
}
