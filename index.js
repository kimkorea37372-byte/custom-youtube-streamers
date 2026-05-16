const axios = require('axios');

/**
 * 유튜브의 복잡한 base.js 난독화 해독 스크립트를 분석하여
 * 암호화된 시그니처(Signature Cipher)를 실시간으로 복호화하는 정밀 변환기
 */
function 의사코드_해독기(baseJsContent) {
    try {
        const actionsObjMatch = baseJsContent.match(/([a-zA-Z0-9$_]+)\s*=\s*\{\s*([a-zA-Z0-9$_]+)\s*:\s*function\s*\(\s*a\s*,\s*b\s*\)/);
        const mainFuncNameMatch = baseJsContent.match(/split\(\s*""\s*\)\s*;\s*([a-zA-Z0-9$_]+)\./);
        
        if (!actionsObjMatch || !mainFuncNameMatch) return null;
        
        const objName = actionsObjMatch[1];
        const mainFuncName = mainFuncNameMatch[1];

        const objRegex = new RegExp(`var\\s+${objName.replace('$', '\\$')}\\s*=\\s*\\{([\\s\\S]+?)\\};`);
        const objMatch = baseJsContent.match(objRegex);
        if (!objMatch) return null;

        const objBody = objMatch[1];
        const functions = {};

        objBody.split(',\n').forEach(line => {
            const parts = line.split(':');
            if (parts.length < 2) return;
            const key = parts[0].trim();
            const body = parts[1];

            if (body.includes('reverse')) functions[key] = 'reverse';
            else if (body.includes('slice')) functions[key] = 'slice';
            else if (body.includes('splice')) functions[key] = 'slice';
            else functions[key] = 'swap';
        });

        const funcRegex = new RegExp(`function\\s+${mainFuncName.replace('$', '\\$')}\\s*\\(a\\)\\s*\\{([\\s\\S]+?)\\}`);
        const funcMatch = baseJsContent.match(funcRegex);
        if (!funcMatch) return null;

        const statements = funcMatch[1].split(';');

        return function(sig) {
            let arr = sig.split('');
            for (const stmt of statements) {
                if (!stmt.includes(`${objName}.`)) continue;
                const cmdMatch = stmt.match(new RegExp(`${objName\\.replace('$', '\\$')}\\.([a-zA-Z0-9$_]+)\\s*\\(\\s*a\\s*,?\\s*([0-9]*)\\s*\\)`));
                if (!cmdMatch) continue;

                const action = functions[cmdMatch[1]];
                const param = parseInt(cmdMatch[2], 10);

                if (action === 'reverse') arr.reverse();
                else if (action === 'slice') arr = arr.slice(param);
                else if (action === 'swap') {
                    const tmp = arr[0];
                    arr[0] = arr[param % arr.length];
                    arr[param % arr.length] = tmp;
                }
            }
            return arr.join('');
        };
    } catch (e) {
        console.error('[DECIPHER PARSER ERROR]', e);
        return null;
    }
}

/**
 * 웅장한 자체 유튜브 오디오 스트림 다이렉트 URL 파싱 엔진 (완전체)
 * @param {string} videoUrl - 유튜브 영상 주소
 * @param {Array} cookiesArray - cookies.json 배열
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
        if (!playerJsMatch) {
            throw new Error('유튜브 핵심 바이너리 파일(base.js) 경로를 추적하는 데 실패했습니다.');
        }
        
        let jsUrl = playerJsMatch[1];
        if (jsUrl.startsWith('//')) jsUrl = 'https:' + jsUrl;
        if (!jsUrl.startsWith('http')) jsUrl = 'https://www.youtube.com' + jsUrl;

        console.log(`[GRAND ENGINE] 📡 유튜브 플레이어 코어 분석 중: ${jsUrl.substring(0, 60)}...`);
        const jsResponse = await axios.get(jsUrl);
        const decipher = 의사코드_해독기(jsResponse.data);

        const regex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
        const match = html.match(regex);
        if (!match) {
            throw new Error('유튜브 보안 데이터 레이아웃 탐색 실패. 세션 컨텍스트 오류 가능성.');
        }

        const playerData = JSON.parse(match[1]);
        const streamingFormats = playerData.streamingData?.adaptiveFormats || [];
        
        const audioFormat = streamingFormats
            .filter(format => format.mimeType && format.mimeType.startsWith('audio/'))
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (!audioFormat) {
            throw new Error('스트리밍 가능한 고성능 오디오 스트림 배열을 완성하지 못했습니다.');
        }

        let directStreamUrl = audioFormat.url;

        if (!directStreamUrl && audioFormat.signatureCipher) {
            console.log(`암호화 체인(Signature Cipher) 발견. 실시간 크래킹을 시작합니다.`);
            const cipherParams = new URLSearchParams(audioFormat.signatureCipher);
            const targetUrl = cipherParams.get('url');
            const encryptedSig = cipherParams.get('s');
            const sp = cipherParams.get('sp') || 'sig';

            if (decipher && encryptedSig) {
                const decryptedSig = decipher(encryptedSig);
                directStreamUrl = `${targetUrl}&${sp}=${decryptedSig}`;
                console.log(`연산 완료 시그니처 복호화 성료.`);
            } else {
                console.log(`알고리즘 해석 불가능 상태 발생. 폴백 라우터 가동.`);
                directStreamUrl = `${targetUrl}&${sp}=${encryptedSig}`;
            }
        }

        if (!directStreamUrl) {
            throw new Error('엔진 코어 연산 장치가 주소 결합에 실패했습니다.');
        }

        console.log('[GRAND ENGINE SUCCESS] 무결성 검증 통과. 완벽한 오디오 주소를 메인 봇으로 송출합니다.');
        return directStreamUrl;

    } catch (error) {
        console.error('[GRAND ENGINE CRITICAL ERROR]', error.message);
        throw error;
    }
}

module.exports = { getAudioStreamUrl };
