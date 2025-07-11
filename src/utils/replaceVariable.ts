export type VariableType = {
    [key: string]: string
}

export default function replaceVariable(text: string, variables: { [type: string]: VariableType }) {
    // 모든 변수 타입(V, P 등)을 합쳐서 하나의 flat map으로 만듦
    const flatVars: {[key: string]: string} = {};
    Object.values(variables).forEach(variable => {
        Object.entries(variable).forEach(([key, value]) => {
            flatVars[key] = value;
        });
    });
    // ${VAR_NAME} 형태로 치환
    return String(text).replace(/\$\{([A-Z0-9_]+)\}/g, (_, key) => flatVars[key] ?? '');
}