const fs = require('fs');
const path = require('path');

// Read the project report markdown file
const markdownContent = fs.readFileSync('project_report/INTERNSHIP_PROJECT_REPORT.md', 'utf8');

// Simple markdown to HTML converter
function markdownToHtml(markdown) {
    let html = markdown;
    
    // Convert headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Convert bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Convert inline code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Convert images
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 20px 0; border: 1px solid #ddd; border-radius: 5px;">');
    
    // Convert lists
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Convert numbered lists
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    
    // Convert tables (basic)
    html = html.replace(/\|(.+)\|/g, function(match, content) {
        const cells = content.split('|').map(cell => cell.trim()).filter(cell => cell);
        if (content.includes('---')) {
            return ''; // Skip separator rows
        }
        return '<tr>' + cells.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
    });
    
    // Wrap table rows in table tags
    html = html.replace(/(<tr>.*<\/tr>)/s, '<table style="border-collapse: collapse; width: 100%; margin: 20px 0;">$1</table>');
    
    // Convert line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

// Create a professional HTML template
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chronos: Academic Meeting Scheduler - Internship Project Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
            color: #333;
            background-color: white;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 40px;
            margin-bottom: 20px;
        }
        h1 { 
            font-size: 2.8em; 
            border-bottom: 4px solid #4E2A84; 
            padding-bottom: 15px;
            text-align: center;
            color: #4E2A84;
        }
        h2 { 
            font-size: 2.2em; 
            border-bottom: 2px solid #4E2A84; 
            padding-bottom: 10px;
            color: #4E2A84;
        }
        h3 { 
            font-size: 1.6em; 
            color: #34495e;
            margin-top: 35px;
        }
        h4 { 
            font-size: 1.4em; 
            color: #7f8c8d;
        }
        code {
            background-color: #f8f9fa;
            padding: 3px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
            color: #e74c3c;
        }
        pre {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            border-left: 5px solid #4E2A84;
            margin: 20px 0;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        pre code {
            background-color: transparent;
            padding: 0;
            color: #333;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 25px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        th, td {
            border: 1px solid #ddd;
            padding: 15px;
            text-align: left;
        }
        th {
            background-color: #4E2A84;
            color: white;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        blockquote {
            border-left: 5px solid #4E2A84;
            margin: 25px 0;
            padding: 15px 25px;
            background-color: #f8f9fa;
            font-style: italic;
            border-radius: 0 5px 5px 0;
        }
        ul, ol {
            padding-left: 25px;
            margin: 15px 0;
        }
        li {
            margin: 8px 0;
        }
        img {
            max-width: 100%;
            height: auto;
            margin: 25px 0;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .figure-caption {
            text-align: center;
            font-style: italic;
            color: #666;
            margin-top: 10px;
            font-size: 0.9em;
        }
        hr {
            border: none;
            height: 2px;
            background-color: #4E2A84;
            margin: 40px 0;
        }
        .toc {
            background-color: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
            border-left: 5px solid #4E2A84;
        }
        .toc ul {
            list-style-type: none;
            padding-left: 0;
        }
        .toc li {
            margin: 8px 0;
        }
        .toc a {
            text-decoration: none;
            color: #4E2A84;
            font-weight: 500;
        }
        .toc a:hover {
            text-decoration: underline;
        }
        .page-break {
            page-break-before: always;
        }
        @media print {
            body { 
                margin: 0; 
                padding: 20px; 
                font-size: 12pt;
                line-height: 1.4;
            }
            h1, h2, h3 { 
                page-break-after: avoid; 
            }
            pre, table, img { 
                page-break-inside: avoid; 
            }
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    ${markdownToHtml(markdownContent)}
</body>
</html>
`;

// Write the HTML file
fs.writeFileSync('INTERNSHIP_PROJECT_REPORT.html', htmlTemplate);

console.log('✅ HTML file created: INTERNSHIP_PROJECT_REPORT.html');
console.log('📖 You can now:');
console.log('   1. Open the HTML file in your browser');
console.log('   2. Press Cmd+P (Mac) or Ctrl+P (Windows)');
console.log('   3. Select "Save as PDF"');
console.log('   4. Choose your preferred settings and save');
console.log('');
console.log('🎯 The HTML file includes:');
console.log('   • Professional styling with Northwestern colors');
console.log('   • All your screenshots and diagrams');
console.log('   • Print-optimized layout');
console.log('   • Table of contents and proper formatting');
