import { Router } from 'express';
import path from 'path';
import express from 'express';

const router = Router();

// تقديم ملفات التطبيق المصغر لتلجرام كملفات ساكنة
router.use('/', express.static(path.join(process.cwd(), 'client', 'public', 'telegram-mini-app')));

// توجيه جميع الطلبات إلى index.html (للتطبيق المصغر)
router.get('/*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client', 'public', 'telegram-mini-app', 'index.html'));
});

export default router;