import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        statusCode,
        message,
        error: 'Business Error',
      },
      statusCode,
    );
  }
}

export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(message: string = 'Unauthorized access') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenException extends BusinessException {
  constructor(message: string = 'Access forbidden') {
    super(message, HttpStatus.FORBIDDEN);
  }
}

export class ConflictException extends BusinessException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT);
  }
}
