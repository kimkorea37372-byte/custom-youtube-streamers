/**
 * YouTube JavaScript 플레이어 바이너리 파싱 및 역연산 가동기
 */
function extractDecipherAlgorithm(baseJsContent) {
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
        console.error('[CIPHER CORE EXCEPTION]', e);
        return null;
    }
}

module.exports = { extractDecipherAlgorithm };
