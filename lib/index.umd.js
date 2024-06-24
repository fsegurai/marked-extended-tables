(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.markedExtendedTables = factory());
})(this, (function () { 'use strict';

  function index() {
    return {
      extensions: [
        {
          name: 'spanTable',
          level: 'block',
          start(src) { return src.match(/^\n *([^\n ].*\|.*)\n/)?.index; },
          tokenizer(src, tokens) {
            const regex = new RegExp(
              '^ *([^\\n ].*\\|.*\\n(?: *[^\\s].*\\n)*?)' // Header
              + ' {0,3}(?:\\| *)?(:?-+:? *(?:\\| *:?-+:? *)*)(?:\\| *)?' // Align
              + '(?:\\n((?:(?! *\\n| {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})' // Cells
              + '(?:\\n+|$)| {0,3}#{1,6} | {0,3}>| {4}[^\\n]| {0,3}(?:`{3,}'
              + '(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n| {0,3}(?:[*+-]|1[.)]) |'
              + '<\\/?(?:address|article|aside|base|basefont|blockquote|body|'
              + 'caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:script|pre|style|textarea|!--)).*(?:\\n|$))*)\\n*|$)'
            );
            const cap = regex.exec(src);

            if (cap) {
              const item = {
                type: 'spanTable',
                header: cap[1].replace(/\n$/, '').split('\n'),
                align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
                rows: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : []
              };

              item.header[0] = splitCells(item.header[0]);
              const colCount = item.header[0].reduce((length, header) => length + header.colspan, 0);

              if (colCount === item.align.length) {
                item.raw = cap[0];

                item.align = item.align.map(align => {
                  if (/^ *-+: *$/.test(align)) return 'right';
                  if (/^ *:-+: *$/.test(align)) return 'center';
                  if (/^ *:-+ *$/.test(align)) return 'left';
                  return null;
                });

                item.header = item.header.map((row, i) => i === 0 ? row : splitCells(row, colCount, item.header[i - 1]));
                item.rows = item.rows.map(row => splitCells(row, colCount, item.rows[item.rows.indexOf(row) - 1]));

                item.header.forEach(row => row.forEach(cell => {
                  cell.tokens = [];
                  this.lexer.inline(cell.text, cell.tokens);
                }));

                item.rows.forEach(row => row.forEach(cell => {
                  cell.tokens = [];
                  this.lexer.inline(cell.text, cell.tokens);
                }));

                return item;
              }
            }
          },
          renderer(token) {
            const renderRow = (row, type) => {
              return row.map(cell => {
                const text = this.parser.parseInline(cell.tokens);
                return getTableCell(text, cell, type, token.align[col]);
              }).join('');
            };

            const col = 0;
            let output = '<table><thead>';
            output += token.header.map(row => `<tr>${renderRow(row, 'th')}</tr>`).join('');
            output += '</thead>';

            if (token.rows.length) {
              output += '<tbody>';
              output += token.rows.map(row => `<tr>${renderRow(row, 'td')}</tr>`).join('');
              output += '</tbody>';
            }
            output += '</table>';
            return output;
          }
        }
      ]
    };
  }

  const getTableCell = (text, cell, type, align) => {
    if (!cell.rowspan) return '';
    return `<${type}${cell.colspan > 1 ? ` colspan=${cell.colspan}` : ''}${cell.rowspan > 1 ? ` rowspan=${cell.rowspan}` : ''}${align ? ` align=${align}` : ''}>${text}</${type}>\n`;
  };

  const splitCells = (tableRow, count, prevRow = []) => {
    if (!Array.isArray(prevRow)) {
      prevRow = [];
    }

    const cells = [...tableRow.matchAll(/(?:[^|\\]|\\.?)+(?:\|+|$)/g)].map(x => x[0].split(/\|+$/)[0].trim().replace(/\\\|/g, '|')).filter(Boolean);

    let numCols = 0;

    cells.forEach((cell, i) => {
      const colspan = Math.max(cell.length - cell.trim().length, 1);
      cells[i] = { rowspan: 1, colspan, text: cell };

      if (cell.endsWith('^') && prevRow.length) {
        const prevCols = prevRow.reduce((acc, prevCell) => acc + prevCell.colspan, 0);
        for (const prevCell of prevRow) {
          if (prevCols === numCols && prevCell.colspan === colspan) {
            cells[i].rowSpanTarget = prevCell.rowSpanTarget ?? prevCell;
            cells[i].rowSpanTarget.text += ` ${cell.slice(0, -1)}`;
            cells[i].rowSpanTarget.rowspan += 1;
            cells[i].rowspan = 0;
            break;
          }
        }
      }
      numCols += colspan;
    });

    while (numCols < count) {
      cells.push({ colspan: 1, text: '' });
      numCols += 1;
    }

    return cells.slice(0, count);
  };

  return index;

}));
