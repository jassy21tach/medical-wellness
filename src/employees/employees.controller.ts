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
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { EmployeesService } from "./employees.service";

@ApiTags("Employees")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("employees")
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: "Create employee" })
  @ApiResponse({ status: 201, description: "Employee created" })
  async create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List employees" })
  @ApiResponse({ status: 200, description: "Employees" })
  @ApiQuery({
    name: "active",
    required: false,
    example: "true",
    description: "Filter by active flag",
  })
  async list(@Query("active") active?: string) {
    return this.employeesService.list(active);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get employee by id" })
  @ApiResponse({ status: 200, description: "Employee" })
  @ApiResponse({ status: 404, description: "Not found" })
  async findOne(@Param("id") id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update employee (including activate/deactivate)" })
  @ApiResponse({ status: 200, description: "Employee updated" })
  @ApiResponse({ status: 404, description: "Not found" })
  async update(@Param("id") id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }
}
