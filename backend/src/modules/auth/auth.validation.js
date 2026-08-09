const { z } = require('zod');

const register = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const login = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPassword = z.object({ email: z.string().email() });

const resetPassword = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const refreshToken = z.object({ refreshToken: z.string().min(1) });

const changePassword = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const updateProfile = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

module.exports = { register, login, forgotPassword, resetPassword, refreshToken, changePassword, updateProfile };
