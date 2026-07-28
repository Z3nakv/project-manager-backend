import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { Request, Response } from "express";
import { AuthController } from "../AuthController";
import User from "../../models/UserModel";
import Token from "../../models/TokenModel";
import {
  connectTestDB,
  closeTestDB,
  clearTestDB,
} from "../../__tests__/setup/db";
import { AuthEmail } from "../../emails/authEmail";
import { hashPassword } from "../../utils/auth";

vi.mock("../../emails/authEmail", () => ({
  AuthEmail: {
    sendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetToken: vi.fn().mockResolvedValue(undefined),
  },
}));

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
  } as unknown as Response;
}

describe("AuthController", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();
  });

  describe("createAccount", () => {
    it("debe crear un usuario nuevo y enviar email de confirmación", async () => {
      const req = {
        body: {
          name: "Adrian Test",
          email: "nuevo@test.com",
          password: "password123",
        },
      } as Request;
      const res = mockRes();

      await AuthController.createAccount(req, res);

      const userInDb = await User.findOne({ email: "nuevo@test.com" });
      expect(userInDb).not.toBeNull();
      expect(userInDb?.password).not.toBe("password123"); // debe estar hasheado, no en texto plano

      const tokenInDb = await Token.findOne({ user: userInDb?._id });
      expect(tokenInDb).not.toBeNull();

      expect(AuthEmail.sendConfirmationEmail).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message : expect.stringContaining("Cuenta creada!, Revisa tu email para confirmarla")
        }),
      );
    });

    it("debe rechazar el registro si el email ya existe (409)", async () => {
      await User.create({
        name: "Existente",
        email: "duplicado@test.com",
        password: "algo-hasheado",
      });

      const req = {
        body: {
          name: "Otro",
          email: "duplicado@test.com",
          password: "password123",
        },
      } as Request;
      const res = mockRes();

      await AuthController.createAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "El usuario ya esta registrado!",
      });

      // Confirmamos que NO se creó un segundo usuario
      const count = await User.countDocuments({ email: "duplicado@test.com" });
      expect(count).toBe(1);
    });
  });

  describe("confirmAccount", () => {
    it("debe confirmar la cuenta con un token válido", async () => {
      const user = await User.create({
        name: "Sin Confirmar",
        email: "pendiente@test.com",
        password: "algo-hasheado",
        confirmed: false,
      });
      const token = await Token.create({
        token: "123456",
        user: user._id,
      });

      const req = { body: { token: token.token } } as Request;
      const res = mockRes();

      await AuthController.confirmAccount(req, res);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.confirmed).toBe(true);

      const tokenStillExists = await Token.findById(token._id);
      expect(tokenStillExists).toBeNull(); // el token debe borrarse tras usarse

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("confirmada correctamente")}),
      );
    });

    it("debe retornar 404 si el token no existe", async () => {
      const req = { body: { token: "token-inexistente" } } as Request;
      const res = mockRes();

      await AuthController.confirmAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Token no valido" });
    });

    it("debe retornar 404 si el usuario asociado al token ya no existe (bug corregido)", async () => {
      // Creamos un token que apunta a un usuario que NUNCA existió/fue borrado
      const fakeUserId = new (await import("mongoose")).Types.ObjectId();
      const token = await Token.create({
        token: "654321",
        user: fakeUserId,
      });

      const req = { body: { token: token.token } } as Request;
      const res = mockRes();

      await AuthController.confirmAccount(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      // Este es el caso que corregimos — antes esto respondía 200 falsamente
    });
  });

  describe("login", () => {
    it("debe hacer login correctamente y devolver un JWT", async () => {
      const hashedPassword = await hashPassword("miPassword123");
      await User.create({
        name: "Usuario Confirmado",
        email: "confirmado@test.com",
        password: hashedPassword,
        confirmed: true,
      });

      const req = {
        body: { email: "confirmado@test.com", password: "miPassword123" },
      } as Request;
      const res = mockRes();

      await AuthController.login(req, res);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.any(String));
    });

    it("debe retornar 404 si el usuario no existe", async () => {
      const req = {
        body: { email: "noexiste@test.com", password: "cualquiera" },
      } as Request;
      const res = mockRes();

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Usuario no encontrado" });
    });

    it("debe retornar 401 y reenviar email si el usuario no está confirmado", async () => {
      const hashedPassword = await hashPassword("miPassword123");
      await User.create({
        name: "Usuario Sin Confirmar",
        email: "sinconfirmar@test.com",
        password: hashedPassword,
        confirmed: false,
      });

      const req = {
        body: { email: "sinconfirmar@test.com", password: "miPassword123" },
      } as Request;
      const res = mockRes();

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(AuthEmail.sendConfirmationEmail).toHaveBeenCalledTimes(1);

      // Confirmamos que además se creó un nuevo token en la BD
      const user = await User.findOne({ email: "sinconfirmar@test.com" });
      const tokenInDb = await Token.findOne({ user: user?._id });
      expect(tokenInDb).not.toBeNull();
    });

    it("debe retornar 401 si el password es incorrecto", async () => {
      const hashedPassword = await hashPassword("passwordCorrecto");
      await User.create({
        name: "Usuario Test",
        email: "test@test.com",
        password: hashedPassword,
        confirmed: true,
      });

      const req = {
        body: { email: "test@test.com", password: "passwordIncorrecto" },
      } as Request;
      const res = mockRes();

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Password incorrecto" });
    });
  });

  describe("requestConfirmationCode", () => {
    it("debe generar un nuevo token si el usuario existe y no está confirmado", async () => {
      const user = await User.create({
        name: "Sin Confirmar",
        email: "pendiente2@test.com",
        password: "hash-cualquiera",
        confirmed: false,
      });

      const req = { body: { email: "pendiente2@test.com" } } as Request;
      const res = mockRes();

      await AuthController.requestConfirmationCode(req, res);

      const tokenInDb = await Token.findOne({ user: user._id });
      expect(tokenInDb).not.toBeNull();
      expect(AuthEmail.sendConfirmationEmail).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Se envio un nuevo token, Revisa tu email para confirmarla")
        }),
      );
    });

    it("debe retornar 404 si el usuario no existe", async () => {
      const req = { body: { email: "noexiste2@test.com" } } as Request;
      const res = mockRes();

      await AuthController.requestConfirmationCode(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("debe retornar 409 si el usuario ya está confirmado", async () => {
      await User.create({
        name: "Ya Confirmado",
        email: "yaconfirmado@test.com",
        password: "hash-cualquiera",
        confirmed: true,
      });

      const req = { body: { email: "yaconfirmado@test.com" } } as Request;
      const res = mockRes();

      await AuthController.requestConfirmationCode(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "El usuario ya esta confirmado!",
      });
    });
  });

  describe("forgotPassword", () => {
    it("debe generar un token de reseteo si el usuario existe", async () => {
      const user = await User.create({
        name: "Olvido Password",
        email: "olvido@test.com",
        password: "hash-cualquiera",
        confirmed: true,
      });

      const req = { body: { email: "olvido@test.com" } } as Request;
      const res = mockRes();

      await AuthController.forgotPassword(req, res);

      const tokenInDb = await Token.findOne({ user: user._id });
      expect(tokenInDb).not.toBeNull();
      expect(AuthEmail.sendPasswordResetToken).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Revisa tu email para instrucciones")
        }),
      );
    });

    it("debe retornar 404 si el usuario no existe", async () => {
      const req = { body: { email: "noexiste3@test.com" } } as Request;
      const res = mockRes();

      await AuthController.forgotPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("validateToken", () => {
    it("debe validar un token existente", async () => {
      const user = await User.create({
        name: "Reseteo Password",
        email: "reseteo@test.com",
        password: "hash-cualquiera",
        confirmed: true,
      });
      const token = await Token.create({ token: "111222", user: user._id });

      const req = { body: { token: token.token } } as Request;
      const res = mockRes();

      await AuthController.validateToken(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({message: "Token valido, Define tu nuevo password"}),
      );
      expect(res.status).not.toHaveBeenCalled();
    });

    it("debe retornar 404 si el token no existe", async () => {
      const req = { body: { token: "token-fantasma" } } as Request;
      const res = mockRes();

      await AuthController.validateToken(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updatePasswordWithToken", () => {
    it("debe actualizar el password y borrar el token usado", async () => {
      const oldHashed = await hashPassword("passwordViejo");
      const user = await User.create({
        name: "Cambio Password",
        email: "cambio@test.com",
        password: oldHashed,
        confirmed: true,
      });
      const token = await Token.create({ token: "333444", user: user._id });

      const req = {
        params: { token: token.token },
        body: { password: "passwordNuevo123" },
      } as unknown as Request;
      const res = mockRes();

      await AuthController.updatePasswordWithToken(req, res);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.password).not.toBe(oldHashed); // cambió el hash
      expect(updatedUser?.password).not.toBe("passwordNuevo123"); // sigue hasheado, no en texto plano

      const tokenStillExists = await Token.findById(token._id);
      expect(tokenStillExists).toBeNull(); // se borró tras usarse

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("El password se modifico correctamente")
        }),
      );
    });

    it("debe retornar 404 si el token no existe", async () => {
      const req = {
        params: { token: "token-inexistente" },
        body: { password: "nuevoPassword" },
      } as unknown as Request;
      const res = mockRes();

      await AuthController.updatePasswordWithToken(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("debe retornar 404 si el usuario asociado al token ya no existe (bug corregido)", async () => {
      const fakeUserId = new (await import("mongoose")).Types.ObjectId();
      const token = await Token.create({ token: "555666", user: fakeUserId });

      const req = {
        params: { token: token.token },
        body: { password: "nuevoPassword" },
      } as unknown as Request;
      const res = mockRes();

      await AuthController.updatePasswordWithToken(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updateProfile", () => {
    it("debe actualizar nombre y email correctamente", async () => {
      const user = await User.create({
        name: "Nombre Viejo",
        email: "viejo@test.com",
        password: "hash-cualquiera",
        confirmed: true,
      });

      const req = {
        body: { name: "Nombre Nuevo", email: "nuevo@test.com" },
        user, // 👈 documento real de Mongoose, simulando lo que pondría el middleware
      } as unknown as Request;
      const res = mockRes();

      await AuthController.updateProfile(req, res);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.name).toBe("Nombre Nuevo");
      expect(updatedUser?.email).toBe("nuevo@test.com");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Perfil actualizado correctamente")
        }),
      );
    });

    it("debe retornar 409 si el email ya lo usa otro usuario", async () => {
      const user = await User.create({
        name: "Mi Usuario",
        email: "mio@test.com",
        password: "hash-cualquiera",
        confirmed: true,
      });

      const req = {
        body: { name: "Mi Usuario", email: "ocupado@test.com" }, // intenta tomar el email de otroUsuario
        user,
      } as unknown as Request;
      const res = mockRes();

      await AuthController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(409);

      // Confirmamos que el email del usuario NO cambió
      const userNotChanged = await User.findById(user._id);
      expect(userNotChanged?.email).toBe("mio@test.com");
    });

    it("NO debe fallar si el usuario mantiene su propio email actual", async () => {
      const user = await User.create({
        name: "Nombre Viejo",
        email: "mismo@test.com",
        password: "hash-cualquiera",
        confirmed: true,
      });

      const req = {
        body: { name: "Nombre Actualizado", email: "mismo@test.com" }, // mismo email de siempre
        user,
      } as unknown as Request;
      const res = mockRes();

      await AuthController.updateProfile(req, res);

      expect(res.status).not.toHaveBeenCalled();
      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.name).toBe("Nombre Actualizado");
    });
  });

  describe("updateCurrentUserPassword", () => {
    it("debe actualizar el password si el actual es correcto", async () => {
      const oldHashed = await hashPassword("passwordActual");
      const user = await User.create({
        name: "Usuario Test",
        email: "cambiopass@test.com",
        password: oldHashed,
        confirmed: true,
      });

      const req = {
        body: {
          current_password: "passwordActual",
          password: "passwordNuevo123",
        },
        user,
      } as unknown as Request;
      const res = mockRes();

      await AuthController.updateCurrentUserPassword(req, res);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.password).not.toBe(oldHashed);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("El password se modifico correctamente")
        }),
      );
    });

    it("debe retornar 401 si el password actual es incorrecto", async () => {
      const hashed = await hashPassword("passwordCorrecto");
      const user = await User.create({
        name: "Usuario Test",
        email: "passincorrecto@test.com",
        password: hashed,
        confirmed: true,
      });

      const req = {
        body: {
          current_password: "passwordIncorrecto",
          password: "nuevoPassword",
        },
        user,
      } as unknown as Request;
      const res = mockRes();

      await AuthController.updateCurrentUserPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("checkPassword", () => {
    it("debe confirmar que el password es correcto", async () => {
      const hashed = await hashPassword("miPasswordActual");
      const user = await User.create({
        name: "Usuario Test",
        email: "checkpass@test.com",
        password: hashed,
        confirmed: true,
      });

      const req = {
        body: { password: "miPasswordActual" },
        user,
      } as unknown as Request;
      const res = mockRes();

      await AuthController.checkPassword(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Password Correcto")
        }),
      );
    });

    it("debe retornar 401 si el password es incorrecto", async () => {
      const hashed = await hashPassword("miPasswordActual");
      const user = await User.create({
        name: "Usuario Test",
        email: "checkpass2@test.com",
        password: hashed,
        confirmed: true,
      });

      const req = {
        body: { password: "passwordEquivocado" },
        user,
      } as unknown as Request;
      const res = mockRes();

      await AuthController.checkPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("googleAuth", () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it("debe crear un usuario nuevo si no existe y el token de Google es válido", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          email: "nuevo-google@test.com",
          name: "Usuario Google",
          sub: "google-id-123",
          email_verified: true,
        }),
      } as any);

      const req = { body: { token: "token-de-google-valido" } } as Request;
      const res = mockRes();

      await AuthController.googleAuth(req, res);

      const userInDb = await User.findOne({ email: "nuevo-google@test.com" });
      expect(userInDb).not.toBeNull();
      expect(userInDb?.confirmed).toBe(true);
      expect(userInDb?.authProvider).toBe("google");
      expect(userInDb?.googleId).toBe("google-id-123");

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
        }),
      );
    });

    it("debe reutilizar el usuario existente si el email ya está registrado", async () => {
      const existingUser = await User.create({
        name: "Ya Existe",
        email: "existente-google@test.com",
        confirmed: true,
        authProvider: "google",
        googleId: "google-id-viejo",
      });

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          email: "existente-google@test.com",
          name: "Ya Existe",
          sub: "google-id-viejo",
          email_verified: true,
        }),
      } as any);

      const req = { body: { token: "token-de-google-valido" } } as Request;
      const res = mockRes();

      await AuthController.googleAuth(req, res);

      // No debe haberse creado un segundo usuario
      const count = await User.countDocuments({
        email: "existente-google@test.com",
      });
      expect(count).toBe(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ _id: existingUser._id }),
        }),
      );
    });

    it("debe retornar 401 si el token de Google es inválido (fetch no ok)", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
      } as any);

      const req = { body: { token: "token-invalido" } } as Request;
      const res = mockRes();

      await AuthController.googleAuth(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Token de Google inválido",
      });
    });

    it("debe retornar 400 si el email de Google no está verificado", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          email: "sinverificar@test.com",
          name: "Sin Verificar",
          sub: "google-id-sinverificar",
          email_verified: false,
        }),
      } as any);

      const req = { body: { token: "token-de-google" } } as Request;
      const res = mockRes();

      await AuthController.googleAuth(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Email de Google no verificado",
      });

      // Confirmamos que NO se creó un usuario
      const userInDb = await User.findOne({ email: "sinverificar@test.com" });
      expect(userInDb).toBeNull();
    });

    it("debe retornar 401 si la llamada a la API de Google lanza una excepción", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      const req = { body: { token: "token-cualquiera" } } as Request;
      const res = mockRes();

      await AuthController.googleAuth(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "No se pudo verificar el token de Google",
      });
    });

    it('debe retornar 409 si el email ya está registrado con authProvider distinto', async () => {
    await User.create({
      name: 'Registrado Normal',
      email: 'compartido@test.com',
      password: 'hash-cualquiera',
      authProvider: 'local',
      confirmed: true,
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        email: 'compartido@test.com',
        name: 'Registrado Normal',
        sub: 'google-id-nuevo',
        email_verified: true,
      }),
    } as any);

    const req = { body: { token: 'token-de-google' } } as Request;
    const res = mockRes();

    await AuthController.googleAuth(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Este email ya está registrado con otro método. Inicia sesión con tu contraseña.',
    });

    const userInDb = await User.findOne({ email: 'compartido@test.com' });
    expect(userInDb?.googleId).toBeUndefined();
  });
  });
});
