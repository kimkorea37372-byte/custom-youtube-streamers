const axios = require('axios');

/**
 * 유튜브 오디오 스트림 다이렉트 URL 추출 엔진
 * @param {string} videoUrl - 유튜브 영상 주소
 * @param {Array} cookiesArray - cookies.json 배열
 */
async function getAudioStreamUrl(videoUrl, cookiesArray = []) {
    try {
        const cookieHeaderString = cookiesArray
            .map(c => `${c.name}=${c.value}`)
            .join('; ');

        console.log(`[ENGINE] 🎯 주입된 세션 쿠키 탑재 완료. 유튜브 스크래핑 시작...`);

        // 진짜 크롬 브라우저인 척 위장 헤더 날리기
        const response = await axios.get(videoUrl, {
            headers: {
                'Cookie': cookieHeaderString,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        const html = response.data;

        const regex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
        const match = html.match(regex);

        if (!match) {
            throw new Error('유튜브 보안 데이터(ytInitialPlayerResponse)를 찾지 못했습니다. IP 차단 상태일 수 있습니다.');
        }

        const playerData = JSON.parse(match[1]);
        const streamingFormats = playerData.streamingData?.adaptiveFormats || [];
        
        const audioFormat = streamingFormats
            .filter(format => format.mimeType && format.mimeType.startsWith('audio/'))
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (!audioFormat) {
            throw new Error('재생 가능한 오디오 스트림 포맷이 없습니다.');
        }

        let directStreamUrl = audioFormat.url;

        if (!directStreamUrl && audioFormat.signatureCipher) {
            const cipherParams = new URLSearchParams(audioFormat.signatureCipher);
            directStreamUrl = `${cipherParams.get('url')}&sig=${cipherParams.get('s')}`;
        }

        if (!directStreamUrl) {
            throw new Error('다이렉트 URL 추출 실패 (Signature Cipher 락 발생)');
        }

        console.log('[ENGINE SUCCESS] 🎉 유튜브 오디오 생 주소 개통 완료!');
        return directStreamUrl;

    } catch (error) {
        console.error('[ENGINE ERROR] 엔진 구동 실패:', error.message);
        throw error;
    }
}

module.exports = { getAudioStreamUrl };
