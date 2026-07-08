export function parseLlamaResponse(resStr: string) {
    if (resStr.includes('data: ')) {
        let assistantContent = "";
        let toolCalls: any[] = [];
        
        const lines = resStr.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6);
                if (jsonStr.trim() === '[DONE]') continue;
                try {
                    const chunk = JSON.parse(jsonStr);
                    if (chunk.choices && chunk.choices[0].delta) {
                        const delta = chunk.choices[0].delta;
                        if (delta.content) {
                            assistantContent += delta.content;
                        }
                        if (delta.tool_calls) {
                            for (const tc of delta.tool_calls) {
                                const index = tc.index;
                                if (!toolCalls[index]) {
                                    toolCalls[index] = {
                                        id: tc.id,
                                        type: tc.type || 'function',
                                        function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' }
                                    };
                                } else {
                                    if (tc.function?.arguments) {
                                        toolCalls[index].function.arguments += tc.function.arguments;
                                    }
                                }
                            }
                        }
                    }
                } catch { /* ignore */ }
            }
        }
        
        const msg: any = { role: 'assistant', content: assistantContent };
        if (toolCalls.length > 0) {
            msg.tool_calls = toolCalls.filter(tc => tc !== undefined);
        }
        return msg;
    } else {
        try {
            const resJson = JSON.parse(resStr);
            if (resJson.choices && resJson.choices[0].message) {
                return resJson.choices[0].message;
            }
        } catch { /* ignore */ }
    }
    return null;
}

export function parseMarkdownChat(payload: string) {
    if (!payload) return [];
    const parts = payload.split("RESPONSE:\n");
    if (parts.length !== 2) return [];

    const reqStr = parts[0].replace("REQUEST:\n", "").trim();
    const resStr = parts[1].trim();

    const messages: any[] = [];

    try {
        const reqJson = JSON.parse(reqStr);
        if (reqJson.messages) {
            messages.push(...reqJson.messages);
        }
    } catch { /* ignore */ }

    const assistantMsg = parseLlamaResponse(resStr);
    if (assistantMsg) {
        messages.push(assistantMsg);
    }

    return messages;
}
