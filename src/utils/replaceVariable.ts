export type VariableType = {
    [key: string]: string
}

export default function replaceVariable(text: string, variables: { [type: string]: VariableType }) {
    const flatVars: {[key: string]: string} = {};
    Object.values(variables).forEach(variable => {
        Object.entries(variable).forEach(([key, value]) => {
            if (!(key in flatVars)) {
                flatVars[key] = value;
            }
        });
    });
    
    // 변수 값들도 재귀적으로 치환
    const resolvedVars: {[key: string]: string} = {};
    const resolveVariable = (key: string, visited = new Set<string>()): string => {
        if (visited.has(key)) {
            // 순환 참조 방지
            return flatVars[key] ?? '';
        }
        
        if (key in resolvedVars) {
            return resolvedVars[key];
        }
        
        if (!(key in flatVars)) {
            return '';
        }
        
        visited.add(key);
        const value = flatVars[key];
        const resolved = value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, refKey) => {
            return resolveVariable(refKey, visited);
        });
        visited.delete(key);
        
        resolvedVars[key] = resolved;
        return resolved;
    };
    
    // 모든 변수를 해결
    Object.keys(flatVars).forEach(key => {
        resolveVariable(key);
    });
    
    // ${VAR_NAME} 형태로 치환
    return String(text).replace(/\$\{([A-Z0-9_]+)\}/g, (_, key) => resolvedVars[key] ?? '');
}