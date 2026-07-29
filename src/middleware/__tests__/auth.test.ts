// src/middleware/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../../models/UserModel';
import { authenticate } from '../auth';
import { AuthenticationError } from '../../utils/errors';

// 👇 Mockeamos el módulo completo de jsonwebtoken
vi.mock('jsonwebtoken');
// 👇 Mockeamos el modelo de User (aún no tocamos DB real)
vi.mock('../../models/UserModel');

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // limpia el estado de los mocks entre cada test
  });

  it('debe retornar 401 si no hay header de Authorization', async () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('No autorizado');
  });

  it('debe retornar 401 si el token es inválido o la firma fue alterada', async () => {
    const req = {
      headers: { authorization: 'Bearer token-invalido' },
    } as Request;
    const res = {} as Response;
    const next = vi.fn();

    // Simulamos que jwt.verify lanza el error que lanza en la vida real
    // cuando el token está mal firmado o expirado
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('invalid signature');
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Token no válido');
  });

  it('debe retornar 401 si el usuario del JWT ya no existe en la BD', async () => {
    const req = {
      headers: { authorization: 'Bearer token-valido' },
    } as Request;
    const res = {} as Response;
    const next = vi.fn();

    // El token "decodifica" correctamente, con un id...
    vi.mocked(jwt.verify).mockReturnValue({ id: 'usuario-borrado-id' } as any);
    // ...pero la búsqueda en la BD no encuentra a nadie
    vi.mocked(User.findById).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as any);

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.statusCode).toBe(401);
  });
});