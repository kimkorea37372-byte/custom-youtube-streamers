const axios = require('axios');

/**
 * 유튜브 링크에서 차단막을 뚫고 오디오 다이렉트 스트림 URL을 추출하는 전용 엔진
 * @param {string} videoUrl - 유튜브 영상 full URL
 * @param {Array} cookiesArray - cookies.json에서 읽어온 원본 JSON 배열
 */
async function getAudioStreamUrl(videoUrl, cookiesArray = []) {
    try {
        // 1. [쿠키 포맷 이식] 원본 JSON 쿠키 배열을 브라우저 헤더 규격 문자열로 변환
        const cookieHeaderString = cookiesArray
            .map(c => `${c.name}=${c.value}`)
            .join('; ');

        console.log(`[ENGINE] 🎯 주입된 세션 쿠키를 탑재하고 유튜브에 접속을 시도합니다...`);

        // 2. 유튜브 HTML 소스코드 통째로 긁어오기 (완벽한 크롬 브라우저인 척 기만)
        const response = await axios.get(videoUrl, {
            headers: {
                'Cookie': cookieHeaderString,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        const html = response.data;

        // 3. [보물찾기] 유튜브 내부 특수 스크립트 데이터 영역(ytInitialPlayerResponse) 강제 캡처
        const regex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
        const match = html.match(regex);

        if (!match) {
            throw new Error('유튜브 보안 JSON 데이터(ytInitialPlayerResponse)를 찾을 수 없습니다. 완전히 차단된 IP 유효성 검사 실패일 수 있습니다.');
        }

        // 4. 추출한 문자열을 조작 가능한 JSON 객체로 파싱
        const playerData = JSON.parse(match[1]);

        // 5. 복잡한 미디어 포맷 중에서 오직 오디오(audio) 포맷 스트림만 필터링
        const streamingFormats = playerData.streamingData?.adaptiveFormats || [];
        
        // mimeType이 audio/webm 또는 audio/mp4인 포맷 중 가장 음질이 높은 것 추출
        const audioFormat = streamingFormats
            .filter(format => format.mimeType && format.mimeType.startsWith('audio/'))
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (!audioFormat) {
            throw new Error('재생 가능한 오디오 스트림 포맷을 찾지 못했습니다.');
        }

        // 6. [최종 관문] 암호화 시그니처 우회 검증 및 다이렉트 URL 반환
        let directStreamUrl = audioFormat.url;

        // 만약 url이 없고 signatureCipher로 꼬여있다면 1차 경고 (복합 파싱 필요 단계)
        if (!directStreamUrl && audioFormat.signatureCipher) {
            console.warn('[ENGINE WARNING] 유튜브가 주소를 암호화 시그니처로 꼬아놓았습니다. 기본 우회 처리를 시도합니다.');
            const cipherParams = new URLSearchParams(audioFormat.signatureCipher);
            // 디코딩 후 결합
            directStreamUrl = `${cipherParams.get('url')}&sig=${cipherParams.get('s')}`;
        }

        if (!directStreamUrl) {
            throw new Error('다이렉트 URL 추출 실패 (Signature Cipher 락 발생)');
        }

        console.log('[ENGINE SUCCESS] 🎉 유튜브 검증 통과! 오디오 주소 개통 완료.');
        return directStreamUrl;

    } catch (error) {
        console.error('[ENGINE CRITICAL ERROR] 자체 엔진 구동 실패:', error.message);
        throw error;
    }
}

module.exports = { getAudioStreamUrl };
