import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: '请求参数验证失败',
      details: errors.array(),
    });
  }
  next();
};

export const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('用户名不能为空')
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6个字符'),
];

export const validateRegister = [
  body('username')
    .notEmpty()
    .withMessage('用户名不能为空')
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字'),
];


export const validateTag = [
  body('name')
    .notEmpty()
    .withMessage('标签名称不能为空')
    .isLength({ min: 1, max: 20 })
    .withMessage('标签名称长度必须在1-20个字符之间'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('颜色必须是有效的十六进制颜色值'),
];
