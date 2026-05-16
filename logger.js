const fs = require('fs');
const path = require('path');

/**
 * 엔진 구동 중 발생하는 로그를 실시간 파일로 기록하는 커스텀 디버거
 */
function writeEngineLog(level, message) {
    try {
        const logPath = path.join(process.cwd(), 'engine_debug.log');
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
        
        fs.appendFileSync(logPath, logLine, 'utf8');
        console.log(`[ENGINE_${level.toUpperCase()}] ${message}`);
    } catch (err) {
        console.error('로그 파일 쓰기 실패:', err);
    }
}

module.exports = { writeEngineLog };
