import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Label } from './label.entity';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(
    @InjectRepository(Label)
    private readonly labelsRepository: Repository<Label>,
  ) {}

  async create(userId: string, dto: CreateLabelDto) {
    const label = this.labelsRepository.create({
      name: dto.name,
      color: dto.color,
      user: { id: userId },
    });
    await this.labelsRepository.save(label);

    return {
      data: this.toResponse(label),
      message: 'Label created',
      statusCode: 201,
    };
  }

  async findAll(userId: string) {
    const labels = await this.labelsRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'ASC' },
    });

    return {
      data: labels.map((l) => this.toResponse(l)),
      message: 'Labels retrieved',
      statusCode: 200,
    };
  }

  async update(userId: string, labelId: string, dto: UpdateLabelDto) {
    const label = await this.findOwned(userId, labelId);

    if (dto.name !== undefined) label.name = dto.name;
    if (dto.color !== undefined) label.color = dto.color;
    await this.labelsRepository.save(label);

    return {
      data: this.toResponse(label),
      message: 'Label updated',
      statusCode: 200,
    };
  }

  async remove(userId: string, labelId: string) {
    const label = await this.findOwned(userId, labelId);
    await this.labelsRepository.remove(label);

    return {
      data: null,
      message: 'Label deleted',
      statusCode: 200,
    };
  }

  private async findOwned(userId: string, labelId: string): Promise<Label> {
    const label = await this.labelsRepository.findOne({
      where: { id: labelId },
      relations: ['user'],
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }
    if (label.user.id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return label;
  }

  private toResponse(label: Label) {
    return {
      id: label.id,
      name: label.name,
      color: label.color,
      createdAt: label.createdAt,
    };
  }
}
