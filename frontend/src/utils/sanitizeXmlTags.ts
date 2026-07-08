export const sanitizeXmlTags = (content: string) => {
    if (!content) return "";
    
    const allowedHtml = ['b', 'i', 'strong', 'em', 'code', 'pre', 'br', 'hr', 'p', 'div', 'span', 'details', 'summary', 'a', 'img', 'ul', 'li', 'ol', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'];

    return content.replace(/<(\/?)([a-zA-Z0-9_]+)([^>]*)>/g, (match, slash, tagName, rest) => {
        const lowerTag = tagName.toLowerCase();
        if (allowedHtml.includes(lowerTag)) {
            return match; // Do not touch standard HTML tags
        }
        
        let replacement = match;
        if (tagName.includes('_')) {
            const newTagName = tagName.replace(/_/g, '-');
            if (slash) {
                replacement = `</${newTagName}>`;
            } else {
                replacement = `<${newTagName} data-original-tag="${tagName}"${rest}>`;
            }
        }
        
        // Inject blank lines around custom tags to ensure Markdown is parsed inside
        return `\n\n${replacement}\n\n`;
    });
};
