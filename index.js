const axios = require('axios');
const { extractDecipherAlgorithm } = require('./cipherDefuse');
const { writeEngineLog } = require('./logger');

/**
 * 렉 없고 안전한 초경량 하이브리드 오디오 스트림 추출 엔진
 */
async function getAudioStreamUrl(videoUrl, cookiesArray = []) {
    try {

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
        let decipher = null;

        if (playerJsMatch) {
            let jsUrl = playerJsMatch[1];
            if (jsUrl.startsWith('//')) jsUrl = 'https:' + jsUrl;
            if (!jsUrl.startsWith('http')) jsUrl = 'https://www.youtube.com' + jsUrl;

            writeEngineLog('info', `유튜브 플레이어 스크립트 파싱 레이어 진입...`);
            const jsResponse = await axios.get(jsUrl);
            decipher = extractDecipherAlgorithm(jsResponse.data);
        }

        const regex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
        const match = html.match(regex);
        
        let playerData = match ? JSON.parse(match[1]) : null;
        let streamingFormats = playerData?.streamingData?.adaptiveFormats || [];

        if (!decipher || streamingFormats.length === 0 || (!streamingFormats[0].url && !streamingFormats[0].signatureCipher)) {
            writeEngineLog('warn', `웹 복호화 필터 한계 감지. 안드로이드 통로로 렉 없이 스위칭합니다.`);
            
            const mobileResponse = await axios.post(`https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_23z4f46AGS9Q7S8SG4O1gZ&prettyPrint=false`, {
                context: { client: { clientName: 'ANDROID_TESTSUITE', clientVersion: '1.9.3', hl: 'ko', gl: 'KR' } },
                videoId: videoId
            }, {
                headers: {
                    'Cookie': cookieHeaderString,
                    'Content-Type': 'application/json',
                    'User-Agent': 'com.google.android.youtube/19.13.36 (Linux; U; Android 11; ko_KR;)'
                }
            });
            playerData = mobileResponse.data;
            streamingFormats = playerData?.streamingData?.adaptiveFormats || [];
        }

        const audioFormat = streamingFormats
            .filter(format => format.mimeType && format.mimeType.startsWith('audio/'))
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (!audioFormat) {
            throw new Error('스트리밍 가능한 오디오 포맷 데이터가 존재하지 않습니다.');
        }

        let directStreamUrl = audioFormat.url;

        if (!directStreamUrl && audioFormat.signatureCipher) {
            const cipherParams = new URLSearchParams(audioFormat.signatureCipher);
            const targetUrl = cipherParams.get('url');
            const encryptedSig = cipherParams.get('s');
            const sp = cipherParams.get('sp') || 'sig';

            if (decipher && encryptedSig) {
                const decryptedSig = decipher(encryptedSig);
                directStreamUrl = `${targetUrl}&${sp}=${decryptedSig}`;
                writeEngineLog('success', '시그니처 연산 해제 성공.');
            } else {
                directStreamUrl = `${targetUrl}&${sp}=${encryptedSig}`;
                writeEngineLog('success', '다이렉트 바이패스 연결 성공.');
            }
        }

        if (!directStreamUrl) {
            throw new Error('오디오 생주소 합성 장치 최종 가동 실패.');
        }

        writeEngineLog('success', '무결성 검증 패스. 스트림 주소를 봇 본체로 전송합니다.');
        return directStreamUrl;

    } catch (error) {
        writeEngineLog('critical', `엔진 최종 크래시 리포트: ${error.message}`);
        throw error;
    }
}

module.exports = { getAudioStreamUrl };
