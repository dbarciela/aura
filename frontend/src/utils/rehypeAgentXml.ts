import { visit } from 'unist-util-visit';

export interface RehypeAgentXmlOptions {
    collapseAllButUserRequest?: boolean;
}

export default function rehypeAgentXml(options: RehypeAgentXmlOptions = {}) {
    return (tree: any) => {
        // First pass: check if userRequest exists in the tree
        let hasUserRequest = false;
        visit(tree, 'element', (node) => {
            if (node.tagName && node.tagName.toLowerCase() === 'userrequest') {
                hasUserRequest = true;
            }
        });

        const collapseAllButUserRequest = options.collapseAllButUserRequest && hasUserRequest;

        visit(tree, 'element', (node) => {
            if (!node.tagName) return;
            const tagName = node.tagName.toLowerCase();
            
            const allowed = [
                'b', 'i', 'strong', 'em', 'code', 'pre', 'br', 'hr', 'p', 'div', 
                'span', 'details', 'summary', 'a', 'img', 'ul', 'li', 'ol', 'table', 
                'tr', 'td', 'th', 'thead', 'tbody', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'
            ];
            
            if (!allowed.includes(tagName)) {
                // It's a custom XML tag. Transform into <details>
                const originalTagName = node.properties?.dataOriginalTag || node.tagName;
                const originalChildren = node.children || [];
                
                node.tagName = 'details';
                node.properties = node.properties || {};
                
                node.properties.className = ['agent-xml-block', 'my-2', 'border', 'border-gray-700', 'rounded-md', 'bg-gray-900/50'];
                
                // Determine open state
                if (collapseAllButUserRequest) {
                    if (tagName === 'userrequest') {
                        node.properties.open = true;
                    }
                } else {
                    // Default open if we don't have the collapseAll rule
                    node.properties.open = true;
                }
                
                node.children = [
                    {
                        type: 'element',
                        tagName: 'summary',
                        properties: { className: ['cursor-pointer', 'font-mono', 'text-xs', 'text-purple-400', 'font-bold', 'p-2', 'bg-gray-800/50', 'rounded-t-md', 'hover:bg-gray-800'] },
                        children: [{ type: 'text', value: `<${originalTagName}>` }]
                    },
                    {
                        type: 'element',
                        tagName: 'div',
                        properties: { className: ['p-3', 'text-sm', 'overflow-x-auto'] },
                        children: originalChildren
                    }
                ];
            }
        });
    };
}
