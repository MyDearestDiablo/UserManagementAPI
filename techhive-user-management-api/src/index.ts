import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('🚀 TechHive User Management API v2.0.0');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API docs: http://localhost:${PORT}/api`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/users/test`);
    console.log(`🔐 Login: POST http://localhost:${PORT}/api/auth/login`);
});