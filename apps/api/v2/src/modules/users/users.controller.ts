import type { AuthenticatedUser } from "@ecom/features/auth/services/ApiAuthService";
import { UserTransformer } from "@ecom/features/rbac/transformers/UserTransformer";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiAuthGuard } from "../auth/api-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  @Get("me")
  @UseGuards(ApiAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  me(@CurrentUser() user: AuthenticatedUser) {
    const transformed = new UserTransformer().transformItem(user);
    return {
      data: {
        ...transformed,
        authMethod: user.authMethod,
      },
    };
  }
}
