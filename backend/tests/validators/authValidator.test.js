const { validationResult } = require('express-validator');
const { registerValidator, loginValidator } = require('../../src/validators/authValidator');

const runValidation = async (validators, body) => {
  const req = { body };
  await Promise.all(validators.map((validator) => validator.run(req)));
  return validationResult(req).array();
};

describe('authValidator', () => {
  it('rejects role and isRootAdmin in register payload', async () => {
    const errors = await runValidation(registerValidator, {
      name: 'User Test',
      email: 'user@test.com',
      password: 'Abc123',
      role: 'admin',
      isRootAdmin: true,
    });

    const messages = errors.map((error) => error.msg);
    expect(messages).toContain('role is not allowed in register request');
    expect(messages).toContain('isRootAdmin is not allowed in register request');
  });

  it('accepts valid register payload', async () => {
    const errors = await runValidation(registerValidator, {
      name: 'User Test',
      email: 'user@test.com',
      password: 'Abc123',
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects invalid login payload', async () => {
    const errors = await runValidation(loginValidator, {
      email: 'invalid-email',
      password: '',
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
