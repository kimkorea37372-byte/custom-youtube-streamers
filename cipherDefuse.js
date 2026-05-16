/**
 * 최신 유튜브 base.js 가변 난독화 알고리즘 역추적 및 초고속 해독기
 */
function extractDecipherAlgorithm(baseJsContent) {
    try {
        const mainFuncMatch = baseJsContent.match(/([a-zA-Z0-9$_]+)\s*=\s*function\s*\(\s*a\s*\)\s*\{\s*a\s*=\s*a\.split\(\s*""\s*\)/) 
                             || baseJsContent.match(/function\s+([a-zA-Z0-9$_]+)\s*\(a\)\s*\{\s*a\s*=\s*a\.split\(\s*""\s*\)/)
                             || baseJsContent.match(/([a-zA-Z0-9$_]+)\s*=\s*function\s*\(\s*([a-zA-Z0-9$_]+)\s*\)\s*\{\s*\2\s*=\s*\2\.split\(\s*""\s*\)/);
        
        if (!mainFuncMatch) return null;
        const mainFuncName = mainFuncMatch[1];

        const funcRegex = new RegExp(`(?:function\\s+${mainFuncName.replace('$', '\\$')}\\s*\\(a\\)|${mainFuncName.replace('$', '\\$')}\\s*=\\s*function\\s*\\(a\\)|${mainFuncName.replace('$', '\\$')}\\s*=\\s*function\\s*\\([a-zA-Z0-9$_]+\\))\\s*\\{([\\s\\S]+?)\\}`);
        const funcMatch = baseJsContent.match(funcRegex);
        if (!funcMatch) return null;

        const statements = funcMatch[1].split(';');

        let objName = null;
        for (const stmt of statements) {
            const objMatch = stmt.match(/([a-zA-Z0-9$_]+)\.([a-zA-Z0-9$_]+)\s*\(\s*[a-zA-Z0-9$_]+\s*,/);
            if (objMatch) {
                objName = objMatch[1];
                break;
            }
        }
        if (!objName) return null;

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
            else if (body.includes('slice') || body.includes('splice')) functions[key] = 'slice';
            else functions[key] = 'swap';
        });

        return function(sig) {
            let arr = sig.split('');
            for (const stmt of statements) {
                if (!stmt.includes(`${objName}.`)) continue;
                const cmdMatch = stmt.match(new RegExp(`${objName.replace('$', '\\$')}\\.([a-zA-Z0-9$_]+)\\s*\\(\\s*[a-zA-Z0-9$_]+\\s*,?\\s*([0-9]*)\\s*\\)`));
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
        console.error('[CIPHER ANALYSIS CRITICAL ERROR]', e);
        return null;
    }
}

module.exports = { extractDecipherAlgorithm };
