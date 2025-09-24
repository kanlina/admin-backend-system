import { Router } from 'express';
import { ApiPartnerController } from '../controllers/apiPartnerController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const apiPartnerController = new ApiPartnerController();

// 获取所有启用的API合作伙伴配置（无需认证）- 必须在 /:id 之前
router.get('/enabled', apiPartnerController.getAllEnabledPartners.bind(apiPartnerController));

// 根据应用ID获取API合作伙伴配置（无需认证）- 必须在 /:id 之前
router.get('/app/:appId', apiPartnerController.getApiPartnerConfigByAppId.bind(apiPartnerController));

// 获取API合作伙伴配置列表
router.get('/', authenticateToken, apiPartnerController.getApiPartnerConfigs.bind(apiPartnerController));

// 根据ID获取API合作伙伴配置
router.get('/:id', authenticateToken, apiPartnerController.getApiPartnerConfigById.bind(apiPartnerController));

// 创建API合作伙伴配置
router.post('/', authenticateToken, apiPartnerController.createApiPartnerConfig.bind(apiPartnerController));

// 更新API合作伙伴配置
router.put('/:id', authenticateToken, apiPartnerController.updateApiPartnerConfig.bind(apiPartnerController));

// 删除API合作伙伴配置
router.delete('/:id', authenticateToken, apiPartnerController.deleteApiPartnerConfig.bind(apiPartnerController));

export default router;
