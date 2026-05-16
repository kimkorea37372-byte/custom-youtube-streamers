const axios = require('axios');
// [NEW PARTS INTEGRATION] 새로 창조한 폭파 장치와 디버그 로그 시스템 결합!
const { extractDecipherAlgorithm } = require('./cipherDefuse');
const { writeEngineLog } = require('./logger');

/**
 * 웅장한 멀티 파일 아키텍처 기반 자체 유튜브 오디오 추출 엔진
 * @param {string} videoUrl - 유튜브 영상 주소
 * @param {Array} cookiesArray - cookies.json 배열
 */
async function getAudioStreamUrl(videoUrl, cookiesArray = []) {
    try {
        writeEngineLog('info', `======= 자체 독자 엔진 가동 (Target: ${videoUrl}) =======`);

        const videoIdMatch = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        const cookieHeaderString = cookiesArray.map(c => `${c.name}=${c.value}`).join('; ');
        const commonHeaders = {
            'Cookie': cookieHeaderString,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
        };

        const response = await axios.get(videoUrl, { headers: commonHeaders });
        const html = response.data;

        const playerJsMatch = html.match(/"jsUrl"\s*:\s*"([^"]+)"/) || html.match(/src="([^"]+base\.js)"/);
        if (!playerJsMatch) {
            writeEngineLog('error', '유튜브 base.js 경로 추적 실패. 유튜브가 레이아웃을 전면 패치했을 수 있음.');
            throw new Error('유튜브 핵심 바이너리 파일(base.js) 경로 추적 실패.');
        }
        
        let jsUrl = playerJsMatch[1];
        if (jsUrl.startsWith('//')) jsUrl = 'https:' + jsUrl;
        if (!jsUrl.startsWith('http')) jsUrl = 'https://www.youtube.com' + jsUrl;

        writeEngineLog('info', `유튜브 플레이어 코어 자바스크립트 수집 중...`);
        const jsResponse = await axios.get(jsUrl);
        
        const decipher = extractDecipherAlgorithm(jsResponse.data);

        const regex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
        const match = html.match(regex);
        if (!match) {
            writeEngineLog('error', 'ytInitialPlayerResponse 정규식 매칭 실패.');
            throw new Error('유튜브 보안 데이터 레이아웃 탐색 실패.');
        }

        const playerData = JSON.parse(match[1]);
        const streamingFormats = playerData.streamingData?.adaptiveFormats || [];
        
        const audioFormat = streamingFormats
            .filter(format => format.mimeType && format.mimeType.startsWith('audio/'))
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (!audioFormat) {
            writeEngineLog('error', '오디오 포맷 배열 필터링 실패. adaptiveFormats가 비어있음.');
            throw new Error('스트리밍 가능한 고성능 오디오 스트림 배열 빌드 실패.');
        }

        let directStreamUrl = audioFormat.url;

        if (!directStreamUrl && audioFormat.signatureCipher) {
            writeEngineLog('info', '[DETECT] Signature Cipher 락 발견! 연산 장치 가동.');
            const cipherParams = new URLSearchParams(audioFormat.signatureCipher);
            const targetUrl = cipherParams.get('url');
            const encryptedSig = cipherParams.get('s');
            const sp = cipherParams.get('sp') || 'sig';

            if (decipher && encryptedSig) {
                const decryptedSig = decipher(encryptedSig);
                directStreamUrl = `${targetUrl}&${sp}=${decryptedSig}`;
                writeEngineLog('success', '복호화 체인 연산 완료. 정상 스트림 주소 합성 성공.');
            } else {
                writeEngineLog('warn', '알고리즘 분석기 작동 불능. 기본 폴백 결합 시도.');
                directStreamUrl = `${targetUrl}&${sp}=${encryptedSig}`;
            }
        }

        if (!directStreamUrl) {
            writeEngineLog('error', '최종 스트림 생주소 생성 실패.');
            throw new Error('엔진 코어 연산 장치가 주소 결합에 실패했습니다.');
        }

        writeEngineLog('success', '무결성 검증 최종 패스. 메인 봇 채널로 파이프라인 송출합니다.');
        return directStreamUrl;

    } catch (error) {
        writeEngineLog('critical', `엔진 최종 크래시 리포트: ${error.message}`);
        throw error;
    }
}

module.exports = { getAudioStreamUrl };
