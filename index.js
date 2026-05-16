const axios = require('axios');

/**
 * 유튜브 오디오 스트림 다이렉트 URL 추출 엔진 (시그니처 사이퍼 보정판)
 * @param {string} videoUrl - 유튜브 영상 주소
 * @param {Array} cookiesArray - cookies.json 배열
 */
async function getAudioStreamUrl(videoUrl, cookiesArray = []) {
    try {
        const videoIdMatch = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        const cookieHeaderString = cookiesArray
            .map(c => `${c.name}=${c.value}`)
            .join('; ');

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

        let playerData = null;
        if (match) {
            playerData = JSON.parse(match[1]);
        }

        if (!playerData || (!playerData.streamingData?.adaptiveFormats?.[0]?.url && videoId)) {
            const mobileResponse = await axios.post(`https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_23z4f46AGS9Q7S8SG4O1gZ&prettyPrint=false`, {
                context: {
                    client: {
                        clientName: 'ANDROID_TESTSUITE',
                        clientVersion: '1.9.3',
                        hl: 'ko',
                        gl: 'KR'
                    }
                },
                videoId: videoId
            }, {
                headers: {
                    'Cookie': cookieHeaderString,
                    'Content-Type': 'application/json',
                    'User-Agent': 'com.google.android.youtube/19.13.36 (Linux; U; Android 11; ko_KR;)'
                }
            });
            
            playerData = mobileResponse.data;
        }

        const streamingFormats = playerData?.streamingData?.adaptiveFormats || [];

        const audioFormat = streamingFormats
            .filter(format => format.mimeType && format.mimeType.startsWith('audio/'))
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (!audioFormat) {
            throw new Error('재생 가능한 오디오 스트림 포맷이 존재하지 않습니다.');
        }

        let directStreamUrl = audioFormat.url;

        if (!directStreamUrl && audioFormat.signatureCipher) {
            const cipherParams = new URLSearchParams(audioFormat.signatureCipher);
            directStreamUrl = `${cipherParams.get('url')}&sig=${cipherParams.get('s')}`;
        }

        if (!directStreamUrl) {
            throw new Error('안드로이드 우회 트랙마저 유튜브 시그니처 락을 해제하지 못했습니다.');
        }

        console.log('유튜브 안드로이드 우회망 통과! 생오디오 개통 완료.');
        return directStreamUrl;

    } catch (error) {
        console.error('엔진 최종 구동 실패:', error.message);
        throw error;
    }
}

module.exports = { getAudioStreamUrl };
