import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from "@nestjs/swagger";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { ClientsService } from "./clients.service";

@ApiTags("Clients")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: "Create client" })
  @ApiResponse({ status: 201, description: "Client created" })
  @ApiResponse({ status: 400, description: "Validation error" })
  async create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List clients (paginated, searchable)" })
  @ApiResponse({ status: 200, description: "Paginated clients" })
  @ApiQuery({ name: "page", required: false, example: "1" })
  @ApiQuery({ name: "limit", required: false, example: "20" })
  @ApiQuery({
    name: "search",
    required: false,
    example: "Amina",
    description: "Search by firstName, lastName, phone or email",
  })
  async list(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    return this.clientsService.list(page, limit, search);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get client by id" })
  @ApiResponse({ status: 200, description: "Client" })
  @ApiResponse({ status: 404, description: "Not found" })
  async findOne(@Param("id") id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update client" })
  @ApiResponse({ status: 200, description: "Client updated" })
  @ApiResponse({ status: 404, description: "Not found" })
  async update(@Param("id") id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }
}
